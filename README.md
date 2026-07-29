# Immensity

Immensity is an opportunity-intelligence platform that turns unstructured public conversations into evidence-backed problem clusters. It combines a customer-facing web application, an asynchronous API, and a separate AI/ML data pipeline in one repository.

## Repository layout

| Directory | Purpose | Core technologies |
| --- | --- | --- |
| [`web`](web/) | Search, trend, signal, portfolio, and launch interfaces | Next.js, React, TypeScript, Firebase, Recharts |
| [`backend`](backend/) | Authenticated API, semantic search, analytics, subscriptions, and durable LLM analysis jobs | FastAPI, SQLAlchemy, PostgreSQL, pgvector, OpenAI, Anthropic |
| [`ai`](ai/) | Ingestion, cleaning, classification, embedding, clustering, enrichment, and publishing pipeline | Python, Qwen, Transformers, OpenAI embeddings, scikit-learn, PostgreSQL, Supabase |

## System flow

```mermaid
flowchart LR
    A["Reddit posts and GitHub issues"] --> B["Cleaning and quality gates"]
    B --> C["Problem classification and normalization"]
    C --> D["3,072-dimensional embeddings"]
    D --> E["Centroid assignment and new-cluster discovery"]
    E --> F["Cluster naming and summaries"]
    F --> G["PostgreSQL / Supabase"]
    G --> H["FastAPI search and analysis"]
    H --> I["Next.js intelligence dashboard"]
```

The pipeline is deliberately problem-first: it identifies concrete, software-addressable pain before generating solution analysis. Complete problem records are embedded, assigned to existing cluster centroids when sufficiently similar, or grouped into new problem spaces using cosine similarity.

## Local development

Each component remains independently runnable and includes its own environment template and detailed documentation.

### Web application

```bash
cd web
npm install
npm run dev
```

Copy `web/.env.example` to `web/.env.local` and configure the API and Firebase values.

### Backend API

```bash
cd backend
python -m venv .venv
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

Copy `backend/.env.example` to `backend/.env` and configure PostgreSQL, Firebase, and the model providers used by the selected features.

### AI pipeline

```bash
cd ai
python -m venv .venv
python -m pip install -r requirements.txt
docker compose up -d
python -m problemfinder.cli db migrate --yes
```

Copy `ai/.env.example` to `ai/.env`, then follow the commands in [`ai/README.md`](ai/README.md) to scrape, classify, embed, cluster, and publish records.

## Verification

```bash
cd web && npm run typecheck && TZ=UTC npm test
cd ../backend && python -m pytest tests -q
cd ../ai && python -m pytest tests -q
```

On Windows PowerShell, set `$env:TZ = "UTC"` before running the web tests. Model-dependent AI workers require their documented API credentials or local model runtime. GPU-marked tests are excluded from the default AI test command.

## Security

Environment templates contain placeholders only. Never commit `.env` files, service-account credentials, API keys, model-provider tokens, or production database URLs.
