import json
import re
from typing import Dict, List, Any, Optional
from langchain_ollama import ChatOllama
from app.config import OLLAMA_BASE_URL, LLM_MODEL
from app.vector_store import retrieve_claim_context

def get_llm():
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

def generate_copilot_response(
    message: str,
    claim: Optional[Any] = None,
    current_step: int = 2,
    chat_history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Executes the AI Claim Pilot chain grounded with local ChromaDB vector retrieval
    and local Ollama Qwen 2.5:7b.
    """
    claim_id = claim.claim_number if claim else "MOT-8841-IN"
    vehicle = claim.vehicle if claim else "2022 Hyundai Creta SX(O) • KA-05-MK-9284"
    policy_num = claim.policy_number if claim else "HDFC-MOT-2024-88419"
    policy_type = claim.policy_type if claim else "Comprehensive Motor (Zero Depreciation)"
    insurer = getattr(claim, "insurer", "HDFC ERGO General Insurance Co.")
    damages = ", ".join(claim.damages) if (claim and claim.damages) else "Front Bumper, Right Headlamp Unit"
    estimated = claim.estimated_amount if claim else 84500

    # Retrieve statutory RAG context from local ChromaDB
    rag_context = retrieve_claim_context(message, k=2)

    system_prompt = f"""You are "AI Claim Pilot", an expert IRDAI certified Senior Insurance Adjudicator running locally on ClaimEase.
You guide the policyholder through their active motor/health claim journey without insurance jargon, ensuring maximum approval speed.

ACTIVE CLAIM CONTEXT:
- Claim Number: {claim_id}
- Insured Vehicle: {vehicle}
- Policy: {policy_num} ({policy_type})
- Insurer: {insurer}
- Damages Recorded: {damages}
- Repair Estimate: ₹{estimated:,.0f}
- Current Stage: Step {current_step}

STATUTORY GROUNDING (RETRIEVED FROM LOCAL CHROMADB):
{rag_context}

INSTRUCTIONS:
1. Ground your answer in the specific details above and cited IRDAI circulars / Indian Motor Tariff rules.
2. If the user asks about FIR requirements: explain why collisions with third-party or commercial vehicles trigger Section 154 CrPC / BNS General Diary (GD) entry, how to get a police GD entry without hassle (online e-FIR or local police station GD book), and differentiate between a Police GD and Hospital Medico-Legal Case (MLC).
3. If the user asks about cashless garage repairs: explain that ClaimEase dispatches the digitized surveyor estimate docket directly to the cashless network workshop, leaving only the compulsory deductible (₹1,000).
4. Provide actionable, concise advice in clean markdown.
5. Return JSON with format:
{{
  "answer": "Clear markdown answer...",
  "groundingDetails": "1-2 sentence regulatory note...",
  "suggestedQueries": ["Question 1?", "Question 2?", "Question 3?"]
}}
"""

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
                        "details": parsed.get("groundingDetails", f"Grounded in local ChromaDB for claim {claim_id}."),
                        "claimId": claim_id,
                        "stepNumber": current_step
                    },
                    "suggestedQueries": parsed.get("suggestedQueries", [
                        "Does zero depreciation cover my bumper replacement?",
                        "How do I clear the police GD entry discrepancy?",
                        "What are the next steps for surveyor inspection?"
                    ]),
                    "actionableItem": parsed.get("actionableItem")
                }
            elif raw_text:
                return {
                    "text": raw_text,
                    "groundingContext": {
                        "title": "ChromaDB Grounded Copilot Verification",
                        "details": f"Grounded in IRDAI statutory guidelines from local ChromaDB for claim {claim_id}.",
                        "claimId": claim_id,
                        "stepNumber": current_step
                    },
                    "suggestedQueries": [
                        "Does zero depreciation apply to my bumper?",
                        "How do I clear the station stamp discrepancy?",
                        "What documents are needed for surveyor sign-off?"
                    ]
                }
        except Exception as e:
            print(f"Ollama pilot_chain invoke note: {e}")

    # Fallback response
    return {
        "text": f"Based on your active claim **{claim_id}** for **{vehicle}**, your policy includes comprehensive zero-depreciation coverage with {insurer}. For your current **Step {current_step}**, ensure your documents are verified before surveyor inspection.\n\n**Regulatory Finding:**\n{rag_context}",
        "groundingContext": {
            "title": "ChromaDB Grounding Ledger",
            "details": f"Retrieved from local vector store for claim {claim_id}.",
            "claimId": claim_id,
            "stepNumber": current_step
        },
        "suggestedQueries": [
            "Does zero depreciation apply to my bumper?",
            "How do I clear the station stamp discrepancy?",
            "What documents are needed for surveyor sign-off?"
        ]
    }
