import chromadb
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from app.config import CHROMA_DIR, OLLAMA_BASE_URL, EMBEDDING_MODEL

# Persistent local Chroma instance (stores on disk inside ./data/chroma_db)
chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))

embeddings = OllamaEmbeddings(
    base_url=OLLAMA_BASE_URL,
    model=EMBEDDING_MODEL
)

vector_store = Chroma(
    client=chroma_client,
    collection_name="claimease_guidelines",
    embedding_function=embeddings
)

REGULATORY_RULES = [
    (
        "IRDAI Circular 2024 / Rule 102: Any police FIR or General Diary (GD) entry submitted for a motor "
        "accident claim must have the issuing jurisdictional round seal legible. If blurred, cropped, or below "
        "150 DPI equivalent, survey approval must be withheld pending submission of a clean true copy.",
        {"doc_type": "fir", "topic": "seal_legibility", "source": "IRDAI Circular 2024"}
    ),
    (
        "Indian Motor Tariff General Regulation GR-33 & Section 4: Plastic bumpers, nylon parts, and rubber "
        "fittings are subject to 50% statutory depreciation unless an active Zero-Depreciation endorsement "
        "rider (B2B cover) is attached to the comprehensive insurance policy.",
        {"doc_type": "policy", "topic": "zero_depreciation", "source": "Indian Motor Tariff"}
    ),
    (
        "Section 64-VB of Insurance Act, 1938: Premium must be fully credited prior to the risk inception date. "
        "Surveyor requires chronological reconciliation between the reported loss event and casualty/workshop "
        "intake within 24 to 48 hours.",
        {"doc_type": "statutory", "topic": "discrepancies", "source": "Insurance Act 1938"}
    ),
    (
        "Section 154 CrPC & Bharatiya Nagarik Suraksha Sanhita (BNSS) Guidelines: Road traffic accidents involving "
        "commercial vehicles, disputed third-party liability, or pedestrian injury require immediate Police General "
        "Diary (GD) entry or FIR registration. For single-vehicle non-injury minor scraping, surveyor may accept "
        "a self-declaration spot intimation.",
        {"doc_type": "fir", "topic": "fir_necessity", "source": "BNSS Guidelines"}
    ),
    (
        "IRDAI Master Circular on Cashless Claims: Empanelled cashless network garages are prohibited from demanding "
        "upfront repair deposits from policyholders holding active comprehensive policies with cashless pre-authorization, "
        "except for the statutory compulsory deductible (Standard ₹1,000 for private cars).",
        {"doc_type": "settlement", "topic": "cashless_garage", "source": "IRDAI Master Circular"}
    ),
    (
        "Motor Vehicles Act Section 3 & 14: The individual driving the vehicle at the exact time of the accident must hold "
        "a valid, unexpired Driving Licence for the appropriate class (LMV-NT for private cars). Commercial transport badges "
        "are not required for private cars under Supreme Court ruling Mukund Dewangan v. Oriental Insurance Co.",
        {"doc_type": "dl", "topic": "driving_licence_validity", "source": "Motor Vehicles Act"}
    ),
    (
        "Vehicle Registration Certificate (RC Form 23): Insurable interest requires that the vehicle's chassis number "
        "and engine number on the physical vehicle match the RC and the insurance policy schedule without any discrepancy.",
        {"doc_type": "rc", "topic": "insurable_interest", "source": "Central Motor Vehicles Rules"}
    )
]

def seed_regulatory_knowledge():
    """Initializes the local vector collection with statutory rules if empty."""
    try:
        collection = chroma_client.get_or_create_collection("claimease_guidelines")
        if collection.count() == 0:
            texts = [r[0] for r in REGULATORY_RULES]
            metadatas = [r[1] for r in REGULATORY_RULES]
            ids = [f"rule-{i}" for i in range(len(REGULATORY_RULES))]
            vector_store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
            print(f"ChromaDB seeded with {len(REGULATORY_RULES)} statutory IRDAI guidelines.")
    except Exception as e:
        print(f"Warning: Could not seed ChromaDB vector store (Ollama or Chroma may be initializing): {e}")

def retrieve_claim_context(query: str, k: int = 2) -> str:
    """Performs local vector retrieval for RAG grounding."""
    try:
        docs = vector_store.similarity_search(query, k=k)
        if docs:
            return "\n\n".join([d.page_content for d in docs])
    except Exception as e:
        print(f"ChromaDB similarity search note: {e}")

    # Fallback to keyword matching on local regulatory rules if vector search is warming up
    query_lower = query.lower()
    matched = []
    for text, meta in REGULATORY_RULES:
        if any(word in text.lower() for word in query_lower.split() if len(word) > 3):
            matched.append(text)
    if matched:
        return "\n\n".join(matched[:k])
    
    return (
        "IRDAI Circular 2024 / Rule 102 & Motor Tariff Schedule: Claims require legible documentary evidence, "
        "chronological casualty intimation within 48 hours, and valid zero-depreciation coverage for body parts."
    )
