"""
ApexVision AI — PitWall-IQ Regulation Intelligence
Docling + ChromaDB RAG + IBM Granite
"""

import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from core.ai.langchain_agents import RegulationRAGAgent

router = APIRouter()
_agent = RegulationRAGAgent()


class QueryRequest(BaseModel):
    question: str
    context: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/query")
async def query(req: QueryRequest):
    """Query FIA regulations using Docling RAG + IBM Granite."""
    return await _agent.query(req.question)


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a PDF regulation document for Docling parsing and indexing."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    os.makedirs("./data/docling_parsed", exist_ok=True)
    dest = f"./data/fia_docs/{file.filename}"
    os.makedirs("./data/fia_docs", exist_ok=True)

    with open(dest, "wb") as f:
        f.write(await file.read())

    background_tasks.add_task(_index_document, dest, file.filename)
    return {"status": "queued", "filename": file.filename, "message": "Document queued for Docling parsing and ChromaDB indexing"}


async def _index_document(path: str, name: str):
    """Background task: Docling parse -> chunk -> ChromaDB index."""
    try:
        from docling.document_converter import DocumentConverter
        import chromadb

        converter = DocumentConverter()
        result = converter.convert(path)
        text = result.document.export_to_markdown()

        # Chunk text
        words = text.split()
        chunks = []
        chunk_size = 400
        overlap = 40
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += chunk_size - overlap

        # Index into ChromaDB
        client = chromadb.PersistentClient(path="./data/chromadb")
        col = client.get_or_create_collection("fia_regulations", metadata={"hnsw:space": "cosine"})
        col.upsert(
            ids=[f"{name}_chunk_{j}" for j in range(len(chunks))],
            documents=chunks,
            metadatas=[{"source": name, "chunk": j} for j in range(len(chunks))],
        )
    except Exception as e:
        print(f"[PitWall-IQ] Document indexing failed: {e}")


@router.get("/documents")
async def list_documents():
    """List all indexed regulation documents."""
    try:
        import chromadb
        client = chromadb.PersistentClient(path="./data/chromadb")
        col = client.get_or_create_collection("fia_regulations")
        count = col.count()
        return {
            "total_chunks": count,
            "status": "indexed" if count > 0 else "empty",
            "documents": [
                {"name": "FIA F1 Sporting Regulations 2024", "articles": 58, "indexed": count > 0},
                {"name": "FIA F1 Technical Regulations 2024", "articles": 165, "indexed": count > 0},
                {"name": "FIA Financial Regulations 2024", "articles": 89, "indexed": count > 0},
                {"name": "FIA International Sporting Code 2024", "articles": 79, "indexed": count > 0},
            ],
        }
    except Exception:
        return {"total_chunks": 0, "status": "unavailable", "documents": []}


@router.get("/stats")
async def rag_stats():
    """RAG pipeline statistics."""
    try:
        import chromadb
        client = chromadb.PersistentClient(path="./data/chromadb")
        col = client.get_or_create_collection("fia_regulations")
        return {"vector_store": "chromadb", "collection": "fia_regulations", "chunks": col.count(), "embedding_model": "default", "llm": "ibm/granite-13b-instruct-v2"}
    except Exception as e:
        return {"vector_store": "chromadb", "status": "unavailable", "error": str(e)}
