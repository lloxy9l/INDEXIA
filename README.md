
<img width="1883" height="761" alt="image" src="https://github.com/user-attachments/assets/d4bd30d6-38df-4b9b-b98a-8e96673e1810" />

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![FAISS](https://img.shields.io/badge/VectorStore-FAISS-orange)
![LLM](https://img.shields.io/badge/LLM-Modular-red)
![License](https://img.shields.io/badge/License-Academic-lightgrey)

# Overview

**INDEXIA** is a modular and secure Retrieval-Augmented Generation (RAG) framework designed for enterprise document search.

It allows organizations to:

-  Search structured internal documentation
-  Connect any Large Language Model (LLM)
-  Enforce role-based access control (RBAC)
-  Switch between multiple RAG strategies
-  Operate in secure and sensitive environments


#  Project Objectives

The project addresses three major research and engineering challenges:
<img width="1884" height="904" alt="image" src="https://github.com/user-attachments/assets/c060a92e-ed36-44e0-9aae-9cb4376a44ca" />


### 1. LLM Comparative Study
Criteria:
- Reasoning performance
- Context window size
- Latency
- API cost
- Enterprise integration feasibility

### 2️. RAG Variants Implementation
<img width="968" height="350" alt="image" src="https://github.com/user-attachments/assets/014aa644-284e-4212-a7f4-18aa25d98c27" />

<img width="1568" height="741" alt="image" src="https://github.com/user-attachments/assets/a22fdd4a-fd3c-4abd-8f97-42aa71eb8a16" />

### 3️. Secure Enterprise Architecture

The system guarantees:

- Document isolation
- Access control enforcement
- Prevention of data leakage
- Modular LLM-RAG abstraction
- Enterprise-ready deployment


# 🏗️ System Architecture
<img width="2816" height="1536" alt="Gemini_Generated_Image_bga0sibga0sibga0" src="https://github.com/user-attachments/assets/944b6fc2-74bb-4903-9a90-a63b246362a4" />

##  High-Level Flow

```mermaid
flowchart TD
    User --> API
    API --> Auth
    Auth --> RAGPipeline
    RAGPipeline --> VectorStore
    RAGPipeline --> LLM
    LLM --> Response
```

# Technical Architecture

## Indexing Layer
<img width="1097" height="373" alt="image" src="https://github.com/user-attachments/assets/5126e8f6-d71a-4e0c-8a99-f181ef4fcd83" />


- Document chunking
- Embedding generation
- FAISS vector storage
- Metadata indexing

---

##  RAG Pipeline
<img width="1098" height="525" alt="image" src="https://github.com/user-attachments/assets/bee9f65d-be4f-4552-b7f5-2c66c1e418c1" />

1. User authentication
2. Authorization filtering
3. Semantic search (Top-k)
4. Context injection
5. LLM generation
6. Secure post-processing
