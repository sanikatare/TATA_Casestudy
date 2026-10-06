import math
from typing import List, Dict, Any, Optional

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

from app.config import settings
from app.utils.logging import logger
from app.services.embeddings import embedding_service


class VectorStoreManager:
    """
    Local Vector Store Manager utilizing ChromaDB.
    Maintains persistent collection in ./vector_store/chroma with cosine distance.
    Provides an in-memory cosine fallback for seamless student execution.
    """

    def __init__(self):
        self.persist_dir = settings.VECTOR_STORE_DIR
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        self.client = None
        self.collection = None
        self._memory_chunks: List[Dict[str, Any]] = []
        self._init_chroma()

    def _init_chroma(self) -> None:
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            self.client = chromadb.PersistentClient(
                path=str(self.persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"ChromaDB persistent collection '{self.collection_name}' ready at {self.persist_dir}")
        except Exception as e:
            logger.warning(f"ChromaDB initialization failed ({e}). Initializing in-memory vector fallback.")
            self.client = None
            self.collection = None

    def add_chunks(
        self,
        chunk_ids: List[str],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
    ) -> None:
        """Indexes text chunks with metadata and embeddings."""
        if not embeddings:
            embeddings = embedding_service.embed_texts(documents)

        if self.collection:
            try:
                self.collection.upsert(
                    ids=chunk_ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings
                )
                logger.info(f"Indexed {len(chunk_ids)} chunks into ChromaDB.")
                return
            except Exception as e:
                logger.error(f"ChromaDB upsert error: {e}")

        # In-memory store fallback
        for cid, doc, meta, emb in zip(chunk_ids, documents, metadatas, embeddings):
            self._memory_chunks = [c for c in self._memory_chunks if c["id"] != cid]
            self._memory_chunks.append({
                "id": cid,
                "text": doc,
                "metadata": meta,
                "embedding": emb
            })

    def search(
        self,
        query: str,
        top_k: int = 5,
        document_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Dense similarity search returning top-k matching chunks with citations."""
        query_vec = embedding_service.embed_query(query)

        if self.collection:
            try:
                where_filter = {"document_id": document_id} if document_id else None
                results = self.collection.query(
                    query_embeddings=[query_vec],
                    n_results=top_k,
                    where=where_filter
                )
                formatted = []
                if results and results["ids"] and len(results["ids"][0]) > 0:
                    for i in range(len(results["ids"][0])):
                        cid = results["ids"][0][i]
                        text = results["documents"][0][i]
                        meta = results["metadatas"][0][i]
                        dist = results["distances"][0][i] if "distances" in results and results["distances"] else 0.1
                        sim = max(0.0, min(1.0, 1.0 - dist))
                        formatted.append({
                            "id": cid,
                            "text": text,
                            "metadata": meta,
                            "similarity": float(sim)
                        })
                return formatted
            except Exception as e:
                logger.warning(f"ChromaDB search query failed ({e}). Falling back to memory index.")

        # In-memory cosine similarity fallback using pure python math
        candidates = self._memory_chunks
        if document_id:
            candidates = [c for c in candidates if c["metadata"].get("document_id") == document_id]

        if not candidates:
            return []

        scored = []
        for c in candidates:
            c_emb = c["embedding"]
            dot = sum(a * b for a, b in zip(query_vec, c_emb))
            norm_q = math.sqrt(sum(a * a for a in query_vec))
            norm_c = math.sqrt(sum(b * b for b in c_emb))
            cosine = dot / (norm_q * norm_c + 1e-9)
            sim = float(max(0.0, min(1.0, (cosine + 1.0) / 2.0)))
            scored.append({
                "id": c["id"],
                "text": c["text"],
                "metadata": c["metadata"],
                "similarity": sim
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    def delete_by_document(self, document_id: str) -> None:
        """Removes all chunks associated with a document."""
        if self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
            except Exception as e:
                logger.warning(f"ChromaDB delete error: {e}")
        self._memory_chunks = [c for c in self._memory_chunks if c["metadata"].get("document_id") != document_id]


vector_store = VectorStoreManager()
