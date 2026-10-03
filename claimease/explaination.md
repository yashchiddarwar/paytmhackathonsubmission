# ClaimEase
## Autonomous Local Insurance Copilot and Pre-Audit Intelligence

ClaimEase is an offline-first insurance claim preparation platform. It helps a policyholder move from an unclear accident description to a structured claim dossier, while identifying document defects before submission and answering insurance questions with policy and regulatory context.

The core idea is simple: insurance claims are often delayed or rejected because the claimant does not know what to submit, submits a poor-quality document, or cannot understand the policy language. ClaimEase turns that confusing process into a guided, verifiable journey.

---

## 1. The Problem

A policyholder dealing with an accident must usually do several difficult things at once:

- Describe an incident accurately and determine what type of claim to file.
- Understand whether a police FIR or General Diary entry is required.
- Identify the documents required for the specific claim.
- Check whether uploaded documents are readable, complete, and legally useful.
- Understand policy clauses such as deductibles and zero-depreciation coverage.
- Track claim progress and communicate with the insurer or surveyor.

Most existing claim experiences expose forms and static FAQs, but leave the claimant to make these decisions alone. A document can be technically uploaded and still fail later because a stamp is cropped, an incident time is unreadable, or a required registration document is missing.

ClaimEase addresses the process before submission. It acts as a claim navigator, document pre-auditor, and context-aware insurance copilot in one workspace.

---

## 2. What the Evaluator Can Experience

The application is organized around a complete motor-claim journey:

1. **Sign in or use demo login.**
2. **Start from the AI Claim Pilot.** Enter a natural-language incident description, such as a collision that damaged a bumper and headlamp.
3. **Convert the narrative into a claim plan.** The system extracts damages, severity, recommended claim type, required documents, FIR guidance, estimated cost, and immediate next steps.
4. **Open the claim journey.** The claim is persisted with a claim number, incident data, progress, timeline, policy details, workshop information, and a document snapshot.
5. **Review the document library.** The seeded demo dossier includes verified, missing, and intentionally defective documents.
6. **Run document diagnostics.** Upload or inspect a document. ClaimEase checks image quality and uses local vision analysis to return a score, document type, extracted fields, checklist, discrepancies, and recommendation.
7. **Repair the dossier.** A passing document can be verified and attached to the active claim, updating both the document record and claim progress.
8. **Ask the copilot questions.** Ask about required documents, FIR versus General Diary, zero depreciation, cashless garages, health insurance, claim delays, or escalation. Responses can be grounded in the active claim, a policy, and the local regulatory knowledge base.
9. **Listen to answers.** The backend exposes local text-to-speech using Kokoro-ONNX, with Windows SAPI as a fallback.

This produces a meaningful before-and-after state: the evaluator can see a claim move from incomplete and at risk of rejection toward a more submission-ready dossier.

---

## 3. Product Capabilities

### AI Claim Pilot

The incident workflow accepts a typed natural-language narrative and converts it into structured claim data. The local model is prompted to identify:

- Incident category and recommended claim type.
- Date and location when explicitly provided.
- Damaged components.
- Severity: minor, moderate, severe, or total loss.
- Whether FIR or police documentation is required.
- Required documents.
- Estimated repair cost.
- Recommended action and policy advice.

The prompt explicitly prevents the model from inventing third parties, commercial vehicles, locations, dates, or workshops that were not supplied by the claimant. If Ollama is unavailable, a deterministic fallback still extracts common damage terms and returns a usable motor-claim plan.

### Document Pre-Audit

The document diagnostic flow combines deterministic image analysis and AI inspection:

1. The image is decoded from the request payload.
2. OpenCV calculates a blur/readability signal using Laplacian variance.
3. Readable images are passed to the local Llama 3.2 Vision model.
4. The vision response is constrained to structured JSON.
5. ClaimEase stores the score, checklist, extracted fields, discrepancies, readiness, and verification state in SQLite.
6. A passing document can be attached to the active claim.

The audit is designed to surface actionable defects, not just produce a generic confidence number. The seeded degraded FIR demonstrates issues such as low resolution, a cropped station seal, and an unreadable incident timestamp.

### Grounded Insurance Copilot

The copilot can run in three context modes:

- **Claim context:** answers using the active claim, vehicle, status, damages, and document state.
- **Policy context:** answers using carrier, coverage tier, deductible, vehicle, and zero-depreciation status.
- **General context:** answers from the general insurance knowledge base.

The backend retrieves relevant local regulatory text from ChromaDB and passes it into the copilot chain. It also has fast deterministic domain responses for common topics, including FIR requirements, GR-33 depreciation, cashless garage workflows, health pre-authorization, claim delays, PUC questions, and document checklists. Chat messages and grounding metadata are stored in SQLite for continuity.

### Persistent Claim Workspace

ClaimEase is not only a chat screen. The database stores:

- Users and profile information.
- Policies and coverage details.
- Claims and their current journey step.
- Required and uploaded documents.
- AI analysis results.
- Claim timelines.
- Copilot chat history.
- Incident conversion records.

This lets the UI resume an in-progress claim instead of treating every interaction as a new conversation.

### Local Audio

The backend provides WAV synthesis through Kokoro-ONNX when available and falls back to Windows SAPI when it is not. This makes long policy explanations and claim guidance more accessible without sending text to a hosted speech provider.

---

## 4. Architecture

```text
React 19 + TypeScript + Vite
            |
            | REST and WebSocket requests
            v
FastAPI application
  |         |          |             |
  |         |          |             +-- Local TTS: Kokoro-ONNX / Windows SAPI
  |         |          +---------------- AI chains: claim, audit, copilot
  |         +--------------------------- Auth and profile APIs
  +------------------------------------- SQLite persistence
                         |
                         +-- ChromaDB regulatory vector store
                         +-- Ollama: Qwen 2.5, Llama 3.2 Vision, Nomic embeddings
```

### Frontend

The React single-page application is composed of focused screens and reusable components:

- `HomeScreen`: dashboard and active-claim entry point.
- `ExploreClaimsScreen`: claim type discovery and document guidance.
- `DocumentLibraryScreen`: document readiness and preview.
- `CheckDocumentScreen`: AI document diagnostics.
- `AiClaimPilotScreen`: natural-language incident-to-claim conversion.
- `ClaimJourneyScreen`: step-by-step claim progress.
- `MyAccountScreen`: profile and connected data state.
- `ClaimHelperChatbot`: contextual copilot interaction.
- `Header`, `Sidebar`, and search/modal components: persistent navigation and retrieval of workspace information.

The UI reads initial claims and documents from the backend and updates its local state after claim creation, document verification, and claim progress changes.

### Backend

`backend/app/main.py` creates the FastAPI application, initializes the database, seeds the local vector store, registers routers, and serves the production SPA when a build exists.

The main API areas are:

- `/api/auth`: register, login, demo login, current user, profile update, logout.
- `/api/claims`: create, list, retrieve, update, and retrieve active claims.
- `/api/policies`: list and manage policies.
- `/api/documents`: list, create, update, attach, reset demo data, and diagnose documents.
- `/api/ai/chat`: context-aware copilot responses and chat history.
- `/ws/copilot`: real-time copilot responses over WebSocket.
- `/api/v1/tts/synthesize`: local speech synthesis.
- `/api/db/status` and `/api/db/reset`: evaluator-friendly database diagnostics and demo reset.

---

## 5. AI and Data Design

### Local model stack

ClaimEase is designed to keep the primary AI workflow local:

- **Qwen 2.5 7B through Ollama:** incident conversion and text copilot reasoning.
- **Llama 3.2 Vision 11B through Ollama:** document and image audit.
- **Nomic Embed Text through Ollama:** embeddings for regulatory retrieval.
- **Kokoro-ONNX:** local speech synthesis.

This choice supports privacy-sensitive insurance workflows, works without a hosted AI key for the main flows, and makes the system easier to demonstrate in a controlled environment.

### Retrieval-augmented generation

The ChromaDB collection is seeded with local regulatory knowledge covering topics such as:

- FIR and General Diary requirements.
- IRDAI document legibility and defect handling.
- Indian Motor Tariff GR-33 and zero depreciation.
- Insurance Act Section 64-VB.
- Cashless garage settlement.
- Driving licence validity.
- Vehicle registration and insurable interest.

For a copilot query, ClaimEase retrieves the closest regulatory passages and combines them with the selected policy or claim context. The response includes grounding information so the user can understand why the answer was produced.

### Graceful degradation

The system does not fail completely when local AI is still starting or unavailable:

- Ollama reachability is checked quickly before model calls.
- Incident conversion has a deterministic fallback.
- Document auditing has a structured fallback based on the expected document type.
- Vector retrieval falls back to keyword matching over the local rules.
- TTS falls back to Windows SAPI.
- The frontend can display seeded database state while backend data is loading.

This is useful in a hackathon setting because the evaluator can still inspect the product flow while individual model services warm up.

---

## 6. Trust, Safety, and Security Choices

- Passwords are hashed before storage.
- Authentication uses bearer JWT access tokens.
- Protected profile routes resolve the current user from the token.
- The document audit returns explicit discrepancies and recommendations rather than silently marking every upload as valid.
- Structured Pydantic outputs constrain the shape of model responses.
- The incident prompt instructs the model not to invent facts.
- Claim and policy context are selected explicitly by identifier.
- Data is persisted locally in SQLite and ChromaDB for the demo.

ClaimEase is an assistance and preparation tool, not a replacement for an insurer, surveyor, lawyer, regulator, or official document verification service. Regulatory content should be reviewed and updated before production use.

---

## 7. Running the Project

### Requirements

- Node.js 18 or newer.
- Python 3.10 or newer.
- Ollama running at `http://localhost:11434` for the full local AI experience.

Recommended Ollama models:

```text
ollama pull qwen2.5:7b
ollama pull llama3.2-vision:11b
ollama pull nomic-embed-text
```

### Backend

```text
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend runs at `http://localhost:8000`.

### Frontend

From the project root:

```text
npm install
npm run dev
```

The development UI runs at `http://localhost:3000`. Vite proxies API and WebSocket calls to the backend. For a production-style run, build the frontend with `npm run build`; the FastAPI server can then serve the generated SPA from `dist/`.

### Demo account

The authentication router provides a one-click demo login endpoint at `/api/auth/demo-login`, which provisions the evaluator account when necessary. This avoids spending evaluation time on account setup.

### Resetting the demo

The backend exposes:

- `POST /api/db/reset`: resets seeded claims, policies, and documents.
- `POST /api/documents/reset-demo`: restores the intentionally degraded FIR and verified driving licence sample states.

These endpoints make the demo repeatable between evaluator sessions.

---

## 8. Suggested Evaluator Walkthrough

1. Log in with the demo login.
2. Observe the home dashboard and the pre-seeded active policy/claim.
3. Open the AI Claim Pilot and submit an incident narrative.
4. Inspect the generated claim type, damages, FIR decision, document checklist, and recommended next action.
5. Open the claim journey and verify that the structured result is persisted.
6. Open the document library and select the degraded FIR.
7. Run the document check and inspect the low score, failed checklist items, extracted fields, and recommendation.
8. Run a clean specimen or inspect the verified driving licence to compare the passing state.
9. Attach a passing document and observe claim progress and document readiness update.
10. Open the copilot and ask: `What documents are still required for my claim?`
11. Ask a policy question such as: `How does zero depreciation apply to bumper damage?`
12. Inspect the grounding details and chat history.
13. Try `/api/db/status` or reset the demo to repeat the flow.

The most important comparison is between an uploaded document being merely present and a document being claim-ready. That distinction is the product's central value.

---

## 9. Why This Is Valuable

ClaimEase creates value in three places:

1. **Fewer avoidable rejections:** quality checks identify missing, blurry, cropped, or inconsistent evidence before submission.
2. **Better claimant decisions:** the user receives a structured claim plan instead of guessing whether an FIR, GD, RC, estimate, or policy schedule is needed.
3. **A more transparent AI workflow:** responses are grounded in stored claim/policy context and local regulatory passages, while the system exposes scores, checklists, extracted fields, and recommendations.

The result is a practical insurance operations assistant that is explainable at the interaction level and demonstrable end to end.

---

## 10. Current Scope and Next Steps

The hackathon implementation focuses on the complete local demo loop: authentication, seeded policy data, incident conversion, claim persistence, document diagnostics, grounded chat, progress tracking, and local TTS.

The browser microphone permission and audio recording utilities are present in the frontend, and the backend exposes the transcription contract. The current transcription endpoint returns an empty transcription placeholder, so the strongest demonstrated voice capability is local text-to-speech. A production extension would connect that endpoint to a local speech-to-text engine.

Natural next steps would include:

- Local speech-to-text for full voice claim intake.
- Real insurer and government integrations with consent and audit logs.
- Stronger document authenticity checks and tamper detection.
- Per-user authorization on every claim, policy, and document query.
- A versioned regulatory knowledge base with source links and update dates.
- Automated tests for model fallbacks, retrieval grounding, and document state transitions.
- Encrypted storage and deployment hardening for real policyholder data.

ClaimEase provides the interaction model and technical foundation for those extensions while already demonstrating the most important workflow: prepare, verify, explain, and track an insurance claim before it reaches the insurer.
