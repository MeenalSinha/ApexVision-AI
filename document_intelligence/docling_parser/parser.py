"""
ApexVision AI — Document Intelligence Engine (PitWall-IQ)
Powered by Docling + IBM Granite RAG Pipeline
"""

import os, json
from pathlib import Path
from typing import List, Dict, Optional


class DoclingParser:
    """
    Parse FIA regulation PDFs using Docling.
    Chunks the text and indexes into ChromaDB for RAG queries with IBM Granite.
    """

    def __init__(self, output_dir: str = "./data/docling_parsed", chroma_path: str = "./data/chromadb"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_path = chroma_path
        self._converter = None
        self._collection = None

    def _init_docling(self):
        if self._converter is not None:
            return
        try:
            from docling.document_converter import DocumentConverter
            self._converter = DocumentConverter()
        except ImportError:
            self._converter = None

    def _init_chroma(self):
        if self._collection is not None:
            return
        try:
            import chromadb
            client = chromadb.PersistentClient(path=self.chroma_path)
            self._collection = client.get_or_create_collection(
                name="fia_regulations",
                metadata={"hnsw:space": "cosine"},
            )
        except ImportError:
            self._collection = None

    async def parse_document(self, file_path: str) -> Dict:
        """Parse a PDF/document using Docling into structured text."""
        self._init_docling()
        if self._converter is None:
            return {"source": file_path, "text": f"[Docling not installed — pip install docling]", "pages": 0, "tables": 0, "simulated": True}
        try:
            result = self._converter.convert(file_path)
            doc = result.document
            text = doc.export_to_markdown()
            tables = len(doc.tables) if hasattr(doc, "tables") else 0
            pages = len(doc.pages) if hasattr(doc, "pages") else 0
            out_path = self.output_dir / (Path(file_path).stem + ".json")
            out_path.write_text(json.dumps({"source": file_path, "text": text, "pages": pages, "tables": tables}))
            return {"source": file_path, "text": text, "pages": pages, "tables": tables}
        except Exception as e:
            return {"source": file_path, "error": str(e)}

    async def index_document(self, file_path: str, doc_name: str) -> Dict:
        """Parse with Docling and index chunks into ChromaDB."""
        self._init_chroma()
        doc = await self.parse_document(file_path)
        if "error" in doc:
            return {"status": "error", "error": doc["error"]}
        if self._collection is None:
            return {"status": "error", "error": "ChromaDB not available"}

        chunks = self._chunk_text(doc.get("text", ""), chunk_size=400, overlap=40)
        self._collection.upsert(
            ids=[f"{doc_name}_c{i}" for i in range(len(chunks))],
            documents=chunks,
            metadatas=[{"source": doc_name, "chunk": i} for i in range(len(chunks))],
        )
        return {"status": "indexed", "doc_name": doc_name, "chunks": len(chunks), "pages": doc.get("pages", 0)}

    def query(self, question: str, n: int = 5) -> List[Dict]:
        """Query the ChromaDB vector store."""
        self._init_chroma()
        if self._collection is None:
            return []
        try:
            count = self._collection.count()
            if count == 0:
                return []
            results = self._collection.query(query_texts=[question], n_results=min(n, count))
            output = []
            for i, doc in enumerate(results.get("documents", [[]])[0]):
                meta = results.get("metadatas", [[]])[0][i] if results.get("metadatas") else {}
                dist = results.get("distances", [[]])[0][i] if results.get("distances") else 0.5
                output.append({"text": doc, "source": meta.get("source", "FIA Regulations"), "relevance": round(1 - dist, 3)})
            return output
        except Exception:
            return []

    def _chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 40) -> List[str]:
        words = text.split()
        chunks, i = [], 0
        while i < len(words):
            chunks.append(" ".join(words[i:i + chunk_size]))
            i += chunk_size - overlap
        return chunks

    @property
    def chunk_count(self) -> int:
        self._init_chroma()
        if self._collection is None:
            return 0
        try:
            return self._collection.count()
        except Exception:
            return 0
