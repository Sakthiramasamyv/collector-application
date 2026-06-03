"""
RAG Knowledge Base - ChromaDB Setup with Latest LangChain API
"""

import os
from pathlib import Path

DOCS_DIR = Path(__file__).parent / "documents"
CHROMA_DIR = Path(__file__).parent / "chroma_db"

_vectorstore = None


def get_embeddings():
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
    except ImportError:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )


def build_vectorstore(force_rebuild: bool = False):
    global _vectorstore
    if _vectorstore is not None and not force_rebuild:
        return _vectorstore

    try:
        from langchain_community.vectorstores import Chroma
        from langchain_community.document_loaders import TextLoader, DirectoryLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError as e:
        print(f"[RAG] Import error: {e}")
        return None

    embeddings = get_embeddings()

    if CHROMA_DIR.exists() and not force_rebuild:
        print("[RAG] Loading existing ChromaDB vector store...")
        try:
            _vectorstore = Chroma(
                persist_directory=str(CHROMA_DIR),
                embedding_function=embeddings,
                collection_name="district_knowledge"
            )
            print("[RAG] ✅ Vector store loaded from cache")
            return _vectorstore
        except Exception as e:
            print(f"[RAG] Cache load failed, rebuilding: {e}")

    print("[RAG] Building new ChromaDB vector store...")
    try:
        loader = DirectoryLoader(
            str(DOCS_DIR),
            glob="**/*.txt",
            loader_cls=TextLoader,
            loader_kwargs={"encoding": "utf-8"}
        )
        documents = loader.load()
        print(f"[RAG] Loaded {len(documents)} documents")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", "?", "!"]
        )
        chunks = splitter.split_documents(documents)
        print(f"[RAG] Created {len(chunks)} chunks")

        _vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=str(CHROMA_DIR),
            collection_name="district_knowledge"
        )
        print("[RAG] ✅ ChromaDB vector store built successfully!")
        return _vectorstore
    except Exception as e:
        print(f"[RAG] ⚠️  Vector store build failed: {e}")
        return None


def get_retriever(k: int = 4):
    store = build_vectorstore()
    if store is None:
        return None
    return store.as_retriever(search_type="similarity", search_kwargs={"k": k})


def similarity_search(query: str, k: int = 3):
    store = build_vectorstore()
    if store is None:
        return []
    try:
        return store.similarity_search(query, k=k)
    except Exception:
        return []
