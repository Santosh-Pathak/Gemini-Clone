# System Design — Gemini Clone

One-page overview of architecture, data flow, security, and scaling.

## High-level architecture

```
Browser (Next.js App Router)
  ├── Google OAuth (NextAuth)
  ├── Chat UI (Zustand, streaming fetch)
  └── Admin metrics dashboard (admin emails only)

Next.js API routes (Node runtime)
  ├── /api/chat          → LangChain + Gemini (chat / agent / vision / RAG)
  ├── /api/chat/rewrite  → LangChain rewrite chain
  ├── /api/chat/double-check → Zod structured output
  ├── /api/rag/documents → ingest + list + delete
  ├── /api/images        → GridFS upload / serve
  └── /api/metrics       → request telemetry (admin)

MongoDB (devgemini)
  ├── users, chats, knowledge chunks + embeddings
  ├── chatImages (GridFS)
  └── requestMetrics
```

## Request flow (chat)

1. Client sends `POST /api/chat` with message, optional `chatID`, mode, RAG/vision flags.
2. **Auth** — NextAuth session required; rate limit per user.
3. **Memory** — Server loads thread from MongoDB; older turns summarized when over token budget.
4. **RAG** (optional) — Query embedded; cosine similarity over user's chunks; context injected into system prompt with citations.
5. **Generation** — LangChain `ChatGoogleGenerativeAI` streams text (or NDJSON for agent tool steps).
6. **Persist** — Client calls `createChat` server action; images stored in GridFS with `imageId`.
7. **Metrics** — Latency + token proxies logged with hashed `userId`.

## Threat model

| Risk | Mitigation |
|------|------------|
| **API key leakage** | `GOOGLE_API_KEY` server-only; never `NEXT_PUBLIC_*` |
| **Unauthenticated LLM abuse** | NextAuth on all AI routes + in-memory rate limits |
| **Cross-user data access** | Server actions assert `session.user.id === requested userId`; RAG/images scoped by owner |
| **Prompt injection via RAG** | Document grounding instruction; user uploads are untrusted — treat as data not instructions |
| **Agent tool abuse** | Bounded tool set; no arbitrary code exec; web search rate-limited by provider |
| **Admin metrics exposure** | `ADMIN_EMAILS` allowlist for `/app/metrics` and CSV export |

## Scaling notes

- **Rate limiting** — In-process Map today; use Redis for multi-instance Vercel/K8s.
- **Embeddings / RAG** — Cosine search in MongoDB is fine for demos; migrate to dedicated vector DB at scale.
- **GridFS images** — OK for moderate volume; S3/Cloudinary for CDN and cost at scale.
- **Streaming** — AbortController on client + `req.signal` on server; no partial chat save on cancel.
- **Evals** — Offline `npm run eval` against fixed prompt set; CI runs unit tests only (no live LLM in CI by default).

## Feature flags

Set in environment (default: enabled):

- `FEATURE_AGENT_ENABLED`
- `FEATURE_RAG_ENABLED`
- `FEATURE_VISION_ENABLED`

Disable for simpler demos or staged rollout without redeploying UI code paths.

## Observability

- Structured console logs for agent tool calls
- `RequestMetric` collection: feature, model, latencyMs, input/output token estimates, status
- Eval reports written to `evals/results/` locally
