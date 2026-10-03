import json
import re
from typing import Dict, List, Any, Optional
from langchain_ollama import ChatOllama
from app.config import OLLAMA_BASE_URL, LLM_MODEL
from app.vector_store import retrieve_claim_context, is_ollama_reachable

def get_llm():
    if not is_ollama_reachable():
        return None
    try:
        return ChatOllama(
            base_url=OLLAMA_BASE_URL,
            model=LLM_MODEL,
            temperature=0.3
        )
    except Exception as e:
        print(f"Error initializing ChatOllama LLM: {e}")
        return None

def parse_json_from_response(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    match2 = re.search(r"(\{.*\})", text, re.DOTALL)
    if match2:
        try:
            return json.loads(match2.group(1))
        except Exception:
            pass
    return None

def build_knowledge_response(
    message: str,
    claim: Optional[Any] = None,
    policy: Optional[Any] = None,
    rag_context: str = ""
) -> Dict[str, Any]:
    """
    Intelligent IRDAI Adjudication Knowledge Engine.
    Provides deep, contextual, and accurate responses grounded in IRDAI mandates
    when LLM is initializing, offline, or as a fast local rule response.
    """
    msg_lower = message.lower().strip()

    # 1. Greetings & Capabilities
    if re.search(r"\b(hi|hello|hey|greetings|help|who are you|assist)\b", msg_lower) and len(msg_lower.split()) <= 4:
        if claim:
            text = (
                f"Hello! I am your **AI Claim Pilot**, actively monitoring your claim **{claim.claim_number}** "
                f"for the **{claim.vehicle}** ({claim.policy_type}).\n\n"
                f"• **Current Status**: Step {claim.current_step} — {claim.status.replace('_', ' ').title()}\n"
                f"• **Insurer**: {claim.insurer}\n"
                f"• **Registered Damages**: {', '.join(claim.damages) if claim.damages else 'Pending assessment'}\n\n"
                f"You can ask me about document requirements, surveyor inspection, cashless garage approvals, or how zero-depreciation applies to your repair estimate."
            )
            return {
                "text": text,
                "groundingDetails": f"Grounded in active claim telemetry for {claim.claim_number} with {claim.insurer}.",
                "suggestedQueries": [
                    "What documents are still required for my claim?",
                    "How does zero-depreciation apply to my damages?",
                    "What happens during surveyor inspection?"
                ]
            }
        elif policy:
            vehicle_info = ""
            if getattr(policy, "vehicle", None) and isinstance(policy.vehicle, dict):
                vehicle_info = f" ({policy.vehicle.get('makeModel', '')})"
            text = (
                f"Hello! I am your **AI Claim Pilot**, grounded in your active policy **{policy.policy_number}** "
                f"— *{policy.product_name}*{vehicle_info} issued by **{policy.carrier}**.\n\n"
                f"• **Coverage Tier**: {policy.coverage_tier}\n"
                f"• **Compulsory Deductible**: {policy.deductible}\n"
                f"• **Zero Depreciation**: {'Active (100% parts covered)' if getattr(policy, 'has_zero_dep', False) else 'Standard Tariff Depreciation'}\n\n"
                f"How can I assist you today? You can ask coverage questions, clarify deductible clauses, or start filing an incident claim."
            )
            return {
                "text": text,
                "groundingDetails": f"Grounded in statutory terms of policy {policy.policy_number} ({policy.carrier}).",
                "suggestedQueries": [
                    f"What is covered under my {policy.coverage_tier} plan?",
                    "How do I initiate a cashless claim under this policy?",
                    "What are the mandatory documents to file a claim?"
                ]
            }
        else:
            text = (
                "Hello! I am **AI Claim Pilot**, an IRDAI-compliant insurance adjudication copilot.\n\n"
                "You are currently in **General Insurance Mode** (No specific policy or claim linked). I can assist you with:\n\n"
                "• **Motor Insurance**: Accident claims, FIR vs General Diary (GD) rules, zero-depreciation endorsements, and cashless garage workflows.\n"
                "• **Health Insurance**: Cashless hospital pre-authorization, TPA turnaround SLAs, room rent capping, and reimbursement claims.\n"
                "• **IRDAI Guidelines**: Section 64-VB compliance, Claim Turnaround Times (Master Circular 2024), and Insurance Ombudsman escalation.\n\n"
                "Feel free to ask any insurance question, or select an active policy/claim from the switcher above to ground the conversation in your specific policy."
            )
            return {
                "text": text,
                "groundingDetails": "IRDAI General Insurance Adjudication Knowledge Base & Statutory Guidelines.",
                "suggestedQueries": [
                    "What are the mandatory documents for an accident claim?",
                    "When is a Police FIR mandatory vs a Station GD entry?",
                    "How does cashless hospital pre-authorization work?",
                    "Can an insurer reject a claim due to delayed filing?"
                ]
            }

    # 2. FIR & Police Requirements (Section 154 CrPC / BNS)
    if any(k in msg_lower for k in ["fir", "police", "gd entry", "general diary", "station dairy", "cctns", "police report"]):
        fir_text = (
            "### ⚖️ Police Documentation Guidelines under Indian Motor Tariff\n\n"
            "Under IRDAI Motor Guidelines and Indian Motor Tariff regulations:\n\n"
            "1. **When is a Police FIR / GD Entry NOT Mandatory?**\n"
            "   • **Single-Vehicle Self-Damage**: If your vehicle hit a pole, tree, divider, or sustained minor scratches with **no third-party property damage or bodily injuries**, an FIR is **not legally mandatory**.\n"
            "   • Insurers cannot deny an Own Damage (OD) claim solely for lack of an FIR if there is no third-party liability involved.\n\n"
            "2. **When is a Police Entry Legally Required?**\n"
            "   • **Third-Party Collision**: When another vehicle or third-party person/property is damaged or injured.\n"
            "   • **Vehicle Theft / Total Loss / Fire**: Mandatory under Section 154 CrPC / Bharatiya Nagarik Suraksha Sanhita (BNSS).\n\n"
            "3. **FIR vs Station General Diary (GD) Entry**:\n"
            "   • Most insurers accept a simple **Police Station General Diary (GD) Entry** or **Online e-FIR / Lost Article Report** without filing a formal penal charge.\n"
            "   • You can obtain a GD extract from your local police station jurisdiction or your state's citizen police web portal (e.g., CCTNS / State Police App)."
        )
        if claim:
            fir_text += f"\n\n*For your active claim **{claim.claim_number}**: Ensure your incident date matches the GD entry timestamp before surveyor final approval.*"
        return {
            "text": fir_text,
            "groundingDetails": "Indian Motor Tariff Section 154 & IRDAI Claim Settlement Circular Ref: IRDA/NL/GD/021.",
            "suggestedQueries": [
                "How do I file an online police GD entry?",
                "What if the police refuse to give a GD entry copy?",
                "What other documents are mandatory besides the police report?"
            ]
        }

    # 3. Zero Depreciation & Parts Depreciation (GR-33)
    if any(k in msg_lower for k in ["zero dep", "depreciation", "bumper", "plastic", "fiber", "paint", "glass", "rubber"]):
        dep_text = (
            "### 🛡️ Zero Depreciation vs Standard Motor Tariff (GR-33)\n\n"
            "Under Indian Motor Tariff **General Regulation 33 (GR-33)**, standard motor policies deduct substantial depreciation on replacement parts:\n\n"
            "| Component Material | Standard Policy Deduction | With Zero-Depreciation Endorsement |\n"
            "| :--- | :--- | :--- |\n"
            "| **Rubber / Nylon / Plastic Parts** (Bumpers, headlights, dashboard) | **50% Depreciation** | **0% (100% Insurer Covered)** |\n"
            "| **Fiber Glass Components** | **30% Depreciation** | **0% (100% Insurer Covered)** |\n"
            "| **Glass Parts** (Windshield, mirrors) | **0% Depreciation** | **0% Insurer Covered** |\n"
            "| **Metal Panels** (Doors, bonnet, quarter panels) | **Age-graded: 0% to 50%** | **0% (100% Insurer Covered)** |\n"
            "| **Paint Material** | **Up to 25% or 50%** | **Covered under Paint Add-on** |\n\n"
            "**Key Takeaway**: Without Zero-Depreciation, on an ₹80,000 plastic bumper & headlight repair, you would have to pay ~₹40,000 out of pocket! With Zero Dep, you only pay the statutory compulsory deductible (₹1,000 for private cars up to 1500cc)."
        )
        if policy and getattr(policy, "has_zero_dep", False):
            dep_text += f"\n\n✅ **Good news for your policy ({policy.policy_number})**: You have an active **Zero-Depreciation rider**, protecting you from parts depreciation deductions."
        elif claim:
            dep_text += f"\n\n*Claim {claim.claim_number} is registered with a Zero Depreciation policy schedule with {claim.insurer}.*"
        return {
            "text": dep_text,
            "groundingDetails": "Indian Motor Tariff General Regulation GR-33 & Tariff Advisory Committee schedules.",
            "suggestedQueries": [
                "Does zero depreciation cover consumable items like engine oil and nuts?",
                "How many zero-dep claims can I make in a policy year?",
                "What is the compulsory deductible amount?"
            ]
        }

    # 4. Cashless Settlement & Workshop / Garage Flow
    if any(k in msg_lower for k in ["cashless", "garage", "network", "workshop", "reimbursement", "deposit", "out of pocket"]):
        cashless_text = (
            "### 🚗 Cashless Claim Settlement Workflow\n\n"
            "In a cashless settlement, the insurer settles repair invoices directly with the authorized network garage:\n\n"
            "1. **Intimation & Docket Dispatch**: The claim is registered with your policy number. ClaimEase generates a digital preliminary loss docket.\n"
            "2. **Surveyor Physical/Digital Inspection**: An IRDAI empanelled surveyor inspects vehicle damage at the workshop and verifies parts against the estimate.\n"
            "3. **Initial Cashless Approval**: Insurer issues a pre-authorization approval letter to the workshop, permitting dismantling and repairs.\n"
            "4. **Post-Repair Re-inspection**: Surveyor validates installed parts and checks roadworthiness.\n"
            "5. **Final Settlement**: Insurer pays the workshop directly. You only pay:\n"
            "   • **Compulsory Deductible** (₹1,000 - ₹2,000 depending on vehicle engine capacity)\n"
            "   • **Voluntary Deductible** (if opted in policy)\n"
            "   • **Non-covered consumables** (unless covered under Consumables Add-on)."
        )
        return {
            "text": cashless_text,
            "groundingDetails": "IRDAI Master Circular on Cashless Claims Settlement & Surveyor Assessment Code.",
            "suggestedQueries": [
                "Can I get cashless repair at a non-network garage?",
                "What happens if the surveyor estimate is lower than the garage quotation?",
                "How long does the surveyor have to complete the assessment?"
            ]
        }

    # 5. Health Insurance & Hospitalization Pre-Authorization
    if any(k in msg_lower for k in ["health", "hospital", "mediclaim", "tpa", "discharge", "opd", "room rent", "cashless hospital", "doctor"]):
        health_text = (
            "### 🏥 Health Insurance & Cashless Hospitalization Guidelines\n\n"
            "Under the **IRDAI Master Circular on Health Insurance (2024)**:\n\n"
            "1. **Mandatory 1-Hour Cashless Pre-Authorization**:\n"
            "   • Insurers and Third-Party Administrators (TPAs) must grant cashless pre-authorization decision **within 1 hour** of receiving request from the hospital desk.\n\n"
            "2. **3-Hour Discharge Authorization SLA**:\n"
            "   • Final cashless authorization upon hospital discharge summary submission must be completed **within 3 hours**. In case of delay, the hospital cannot hold the patient, and any extra room rent is borne by the insurer.\n\n"
            "3. **Room Rent Capping Impact**:\n"
            "   • If your policy has a room rent cap (e.g., 1% of Sum Insured) and you opt for a higher category room, **proportionate deductions** apply across all associated medical expenses (doctor fees, surgery charges).\n\n"
            "4. **Essential Documents for Reimbursement Claims**:\n"
            "   • Original Discharge Summary & Hospital Bill with itemized breakdown\n"
            "   • Payment receipts with revenue stamp\n"
            "   • Diagnostic investigation reports (Blood test, CT, MRI, ECG)\n"
            "   • Treating Doctor's prescription slips for all medicines billed."
        )
        if policy and "care" in policy.carrier.lower():
            health_text += f"\n\n*Your linked Care Health policy ({policy.policy_number}) features **Zero Co-Pay** with pre-authorized cashless access across 21,000+ empanelled hospitals.*"
        return {
            "text": health_text,
            "groundingDetails": "IRDAI Health Master Circular 2024 / Ref: IRDAI/HLT/REG/CIR/06/2024.",
            "suggestedQueries": [
                "What is proportionate deduction in room rent capping?",
                "How do I claim pre and post-hospitalization expenses?",
                "What is the waiting period for pre-existing diseases?"
            ]
        }

    # 6. Rejection, Delayed Claims & Insurance Ombudsman
    if any(k in msg_lower for k in ["reject", "repudiat", "denied", "delay", "ombudsman", "dispute", "bima bharosa", "complaint", "grievance"]):
        rejection_text = (
            "### ⚖️ Challenging Claim Rejections & Delays under IRDAI Mandates\n\n"
            "Insurers frequently issue technical query notices or repudiation letters. Here is your statutory protection:\n\n"
            "1. **Delay Cannot Be Sole Grounds for Repudiation**:\n"
            "   • Under IRDAI Circular **Ref: IRDA/HLTH/MISC/CIR/216/09/2011**, an insurer **cannot reject a genuine claim** solely due to delayed intimation or submission if the delay was due to unavoidable circumstances (medical emergency, post-collision shock).\n\n"
            "2. **Mandatory 30-Day Adjudication SLA**:\n"
            "   • Insurers must settle or repudiate a claim within 30 days of receiving the surveyor report. If delayed beyond 30 days, the insurer is liable to pay **penal interest at 2% above the bank repo rate**.\n\n"
            "3. **Tiered Escalation Route**:\n"
            "   • **Step 1: Grievance Redressal Officer (GRO)**: Written formal representation to the insurer's internal GRO (Mandatory 15-day SLA).\n"
            "   • **Step 2: IRDAI Bima Bharosa Portal**: Online token registration on `bimabharosa.irdai.gov.in`.\n"
            "   • **Step 3: Insurance Ombudsman**: Quasi-judicial authority with power to award **up to ₹50 Lakhs**. Proceedings are free of cost for policyholders, and rulings are legally binding on the insurer!"
        )
        return {
            "text": rejection_text,
            "groundingDetails": "IRDAI (Protection of Policyholders' Interests) Regulations & Insurance Ombudsman Rules 2017.",
            "suggestedQueries": [
                "How do I file a case before the Insurance Ombudsman?",
                "Can an insurer reject my claim after cashless pre-authorization was approved?",
                "What is Section 64-VB compliance defense?"
            ]
        }

    # 7. PUC (Pollution Under Control) Certificate Inquiries
    if any(k in msg_lower for k in ["puc", "pollution", "emission certificate"]):
        puc_text = (
            "### 🚫 NO, HDFC ERGO Cannot Reject Your Claim Solely for Missing PUC\n\n"
            "Under official **IRDAI Circular Ref: IRDAI/NL/CIR/MISC/215/08/2020**:\n\n"
            "1. **Clear IRDAI Mandate**:\n"
            "   • The Insurance Regulatory and Development Authority of India (IRDAI) specifically clarified that **not holding a valid PUC certificate is NOT valid grounds for denying or repudiating an accident claim**.\n"
            "   • While holding a valid PUC is required under Central Motor Vehicles Rules (CMVR) for vehicle operation and policy renewal, **an expired or missing PUC at the time of an accident cannot be cited by the insurer to reject a claim**.\n\n"
            "2. **Absence of Causal Connection**:\n"
            "   • Vehicular emissions have zero causal link to accidental collisions, bumper damage, or physical impact. The Supreme Court and National Consumer Disputes Redressal Commission (NCDRC) have consistently held that technical non-compliances unrelated to the cause of accident do not void insurance indemnity.\n\n"
            "3. **Actionable Advice**:\n"
            "   • Proceed with your claim submission providing your **Driving Licence**, **Registration Certificate (RC)**, and **Workshop Repair Estimate**.\n"
            "   • If any surveyor or claims handler attempts to deduct or reject based on PUC, formally quote **IRDAI Circular IRDAI/NL/CIR/MISC/215/08/2020**."
        )
        if policy:
            puc_text += f"\n\n*For your policy **{policy.policy_number}** ({policy.carrier}): Your comprehensive cover remains completely valid and enforceable.*"
        elif claim:
            puc_text += f"\n\n*For your active claim **{claim.claim_number}**: This will not prevent cashless authorization at your network garage.*"
        return {
            "text": puc_text,
            "groundingDetails": "IRDAI Circular Ref: IRDAI/NL/CIR/MISC/215/08/2020 (Clarification on PUC in Motor Claims).",
            "suggestedQueries": [
                "What documents are strictly mandatory for my claim?",
                "Can an insurer reject my claim if intimation is delayed?",
                "How does cashless garage pre-authorization work?"
            ]
        }

    # 8. Document Checklists
    if any(k in msg_lower for k in ["document", "checklist", "papers", "what docs", "what do i need", "required doc"]):
        doc_text = (
            "### 📁 Statutory Claim Document Dossier Checklist\n\n"
            "**Motor Own Damage (OD) Claim Checklist**:\n"
            "1. **Vehicle Registration Certificate (RC)**: Proves insurable interest and chassis verification.\n"
            "2. **Valid Driving Licence (DL)**: Of the individual driving at the time of loss.\n"
            "3. **Active Policy Schedule**: Confirms premium paid under Section 64-VB and active zero-dep cover.\n"
            "4. **Police Station Diary (GD) or e-FIR**: Mandatory only for multi-vehicle / commercial / bodily injury crashes.\n"
            "5. **Authorized Workshop Repair Estimate**: Itemized labor hours and replacement parts list.\n"
            "6. **Geo-tagged Damage Photographs**: Clear photos capturing 4 corners, odometer reading, and registration plate."
        )
        if claim and claim.documents:
            doc_text += "\n\n**Your Current Claim Documents Status**:\n"
            for doc in claim.documents:
                status_icon = "✅" if doc.get("verified") else ("⚠️" if doc.get("status") == "warning" else "⏳")
                doc_text += f"• {status_icon} **{doc.get('name')}**: {doc.get('status', 'pending').title()} ({doc.get('readiness', '0%')})\n"
        return {
            "text": doc_text,
            "groundingDetails": "IRDAI Motor Claim Documentation Verification Protocol & CMV Rules.",
            "suggestedQueries": [
                "How do I run AI forensic diagnostics on my document photos?",
                "What if my driving licence is from another state?",
                "How do I clear the police GD stamp defect?"
            ]
        }

    # 8. General Insurance Query Synthesis (RAG + Context)
    summary_context = rag_context if rag_context else "IRDAI Indian Motor Tariff Regulations and Health Claim Settlement Norms."
    fallback_text = (
        f"### 📋 IRDAI Claim Adjudication Guidance\n\n"
        f"In response to your query: *\"{message}\"*\n\n"
    )
    if claim:
        fallback_text += (
            f"**Regarding your active claim ({claim.claim_number} • {claim.vehicle})**:\n"
            f"Your claim is currently at **Step {claim.current_step}** with {claim.insurer}. "
            f"Ensure all replacement parts specified in your workshop estimate match the surveyor loss docket.\n\n"
        )
    elif policy:
        fallback_text += (
            f"**Evaluating within your policy ({policy.policy_number} • {policy.carrier})**:\n"
            f"Coverage tier: {policy.coverage_tier}. Standard compulsory deductible: {policy.deductible}.\n\n"
        )

    fallback_text += (
        f"**Statutory Regulatory Adjudication:**\n"
        f"• Under IRDAI guidelines, claim settlement relies on timely incident intimation, clear proof of insurable interest, "
        f"and certified repair/hospitalization invoices.\n"
        f"• Insurers must evaluate claims objectively and cannot apply arbitrary deductions without citing specific policy schedule endorsements or Indian Motor Tariff General Regulations.\n\n"
        f"**Relevant Regulatory Context:**\n{summary_context}"
    )

    claim_ref = claim.claim_number if claim else (policy.policy_number if policy else "General Guidance")
    return {
        "text": fallback_text,
        "groundingContext": {
            "title": "ChromaDB Grounded Adjudication Ledger",
            "details": f"Evaluated within statutory IRDAI mandates for {claim_ref}.",
            "claimId": claim.claim_number if claim else None,
            "stepNumber": claim.current_step if claim else 1
        },
        "suggestedQueries": [
            "What documents are required to finalize this step?",
            "How does zero-depreciation apply to replacement parts?",
            "What are my rights if the insurer delays settlement?"
        ]
    }


def generate_copilot_response(
    message: str,
    claim: Optional[Any] = None,
    policy: Optional[Any] = None,
    no_context: bool = False,
    current_step: int = 2,
    chat_history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Executes the AI Claim Pilot chain grounded with local ChromaDB vector retrieval
    and local Ollama Qwen 2.5:7b, with graceful local domain adjudication fallback.
    """
    # Retrieve statutory RAG context from local ChromaDB
    rag_context = retrieve_claim_context(message, k=2)

    # 1. Prepare Prompt according to Selected Context
    if no_context or (claim is None and policy is None):
        context_description = "GENERAL INSURANCE REGULATORY MODE (No specific policy or claim linked)"
        claim_ref_id = None
        system_prompt = f"""You are "AI Claim Pilot", an expert IRDAI certified Senior Insurance Adjudicator running locally on ClaimEase.
You provide clear, accurate, consumer-protective guidance on motor, health, and general insurance claims in India without legal jargon.

MODE: {context_description}

STATUTORY GROUNDING (RETRIEVED FROM LOCAL CHROMADB):
{rag_context}

INSTRUCTIONS:
1. Provide actionable, concise advice citing IRDAI circulars, Indian Motor Tariff rules, or Health Insurance Master Circulars 2024.
2. Differentiate between mandatory vs non-mandatory requirements (e.g. Police FIR vs General Diary for accident claims).
3. Format your response in clean, beautiful GitHub markdown.
4. Return JSON with format:
{{
  "answer": "Clear markdown answer...",
  "groundingDetails": "1-2 sentence regulatory note...",
  "suggestedQueries": ["Question 1?", "Question 2?", "Question 3?"]
}}
"""
    elif claim:
        claim_id = claim.claim_number
        vehicle = claim.vehicle
        policy_num = claim.policy_number
        policy_type = claim.policy_type
        insurer = getattr(claim, "insurer", "HDFC ERGO General Insurance Co.")
        damages = ", ".join(claim.damages) if (claim and claim.damages) else "Front Bumper, Headlamp"
        estimated = claim.estimated_amount or 75000.0
        claim_ref_id = claim_id

        system_prompt = f"""You are "AI Claim Pilot", an expert IRDAI certified Senior Insurance Adjudicator running locally on ClaimEase.
You guide the policyholder through their active motor/health claim journey without insurance jargon, ensuring maximum approval speed.

ACTIVE CLAIM CONTEXT:
- Claim Number: {claim_id}
- Insured Vehicle / Asset: {vehicle}
- Policy: {policy_num} ({policy_type})
- Insurer: {insurer}
- Damages Recorded: {damages}
- Repair Estimate: ₹{estimated:,.0f}
- Current Stage: Step {current_step}

STATUTORY GROUNDING (RETRIEVED FROM LOCAL CHROMADB):
{rag_context}

INSTRUCTIONS:
1. Ground your answer in the specific claim details above and cited IRDAI circulars / Indian Motor Tariff rules.
2. If the user asks about FIR requirements: explain why collisions with third-party or commercial vehicles trigger Section 154 CrPC / BNS General Diary (GD) entry, how to get a police GD entry without hassle, and differentiate between a Police GD and Hospital MLC.
3. If the user asks about cashless garage repairs: explain that ClaimEase dispatches the digitized surveyor estimate docket directly to the cashless network workshop.
4. Return JSON with format:
{{
  "answer": "Clear markdown answer...",
  "groundingDetails": "1-2 sentence regulatory note...",
  "suggestedQueries": ["Question 1?", "Question 2?", "Question 3?"]
}}
"""
    else:
        # Policy context (no claim)
        claim_ref_id = policy.policy_number
        vehicle_str = ""
        if getattr(policy, "vehicle", None) and isinstance(policy.vehicle, dict):
            vehicle_str = f"Covered Vehicle: {policy.vehicle.get('makeModel', '')} ({policy.vehicle.get('registration', '')})"
        sum_insured_str = f"Sum Insured: {policy.sum_insured}" if getattr(policy, "sum_insured", None) else ""
        system_prompt = f"""You are "AI Claim Pilot", an expert IRDAI certified Senior Insurance Adjudicator running locally on ClaimEase.
You guide the policyholder regarding their active insurance policy terms, coverage clauses, deductibles, and claim procedures.

LINKED POLICY CONTEXT:
- Policy Number: {policy.policy_number}
- Carrier: {policy.carrier}
- Product Name: {policy.product_name}
- Coverage Tier: {policy.coverage_tier}
- Deductible: {policy.deductible}
- Zero Depreciation: {'Active' if getattr(policy, 'has_zero_dep', False) else 'Not active'}
- {vehicle_str}
- {sum_insured_str}

STATUTORY GROUNDING (RETRIEVED FROM LOCAL CHROMADB):
{rag_context}

INSTRUCTIONS:
1. Answer the policyholder's questions grounded in the policy details above.
2. Provide actionable advice in clean markdown.
3. Return JSON with format:
{{
  "answer": "Clear markdown answer...",
  "groundingDetails": "1-2 sentence regulatory note...",
  "suggestedQueries": ["Question 1?", "Question 2?", "Question 3?"]
}}
"""

    # 2. Try LLM Execution with Ollama
    llm = get_llm()
    if llm:
        try:
            prompt = f"User asks: {message}\nProvide structured JSON response."
            response = llm.invoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ])
            raw_text = response.content if hasattr(response, "content") else str(response)
            parsed = parse_json_from_response(raw_text)
            if parsed and "answer" in parsed:
                return {
                    "text": parsed["answer"],
                    "groundingContext": {
                        "title": "ChromaDB Grounded Copilot Verification",
                        "details": parsed.get("groundingDetails", f"Grounded in IRDAI mandates for {claim_ref_id or 'General Consumer Mode'}."),
                        "claimId": claim_ref_id,
                        "stepNumber": current_step
                    },
                    "suggestedQueries": parsed.get("suggestedQueries", [
                        "Does zero depreciation cover my bumper replacement?",
                        "How do I clear the police GD entry discrepancy?",
                        "What are the next steps for surveyor inspection?"
                    ]),
                    "actionableItem": parsed.get("actionableItem")
                }
            elif raw_text and len(raw_text.strip()) > 20:
                return {
                    "text": raw_text.strip(),
                    "groundingContext": {
                        "title": "ChromaDB Grounded Copilot Verification",
                        "details": f"Grounded in IRDAI statutory guidelines from local ChromaDB for {claim_ref_id or 'General Mode'}.",
                        "claimId": claim_ref_id,
                        "stepNumber": current_step
                    },
                    "suggestedQueries": [
                        "What documents are required to file this claim?",
                        "How does cashless network settlement work?",
                        "What is the surveyor turnaround SLA?"
                    ]
                }
        except Exception as e:
            print(f"Ollama pilot_chain invoke note: {e}")

    # 3. Dynamic Knowledge Engine Fallback (Rule-Based Adjudicator)
    result = build_knowledge_response(
        message=message,
        claim=claim,
        policy=policy,
        rag_context=rag_context
    )
    if "groundingContext" not in result:
        result["groundingContext"] = {
            "title": "IRDAI Statutory Grounding Ledger",
            "details": result.pop("groundingDetails", f"Grounded in IRDAI Guidelines for {claim_ref_id or 'General Mode'}."),
            "claimId": claim_ref_id,
            "stepNumber": current_step
        }
    return result
