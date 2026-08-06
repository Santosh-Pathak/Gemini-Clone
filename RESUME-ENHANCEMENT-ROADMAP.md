# Resume Enhancement Roadmap — Gemini Clone + LangChain / LLM / Gen AI

A step-by-step plan to turn this **Dev Gemini Clone** into a portfolio project that proves you can build real Gen AI apps — while you learn **LangChain**, **LLMs**, and **Generative AI** by shipping features into *this* codebase (not toy notebooks alone).

---

## 1. What you already have (baseline)

| Area | Current state |
|------|----------------|
| Stack | Next.js 14 (App Router), TypeScript, Tailwind, Zustand, NextAuth (Google), MongoDB/Mongoose |
| AI | LangChain.js + Gemini (server-side streaming, agents, RAG, vision) |
| Features | Streaming chat, memory, RAG, agents, multimodal vision, rewrite, double-check, metrics, evals |
| Ops | GitHub Actions CI, unit tests, feature flags, error boundaries, SYSTEM-DESIGN.md |

**Resume position:** Production-minded Gen AI app with LangChain orchestration, RAG, secure server-side LLM calls, tool-using agents, and eval/metrics tooling.

---

## 2. Can you add LangChain / LLM / Gen AI? — Yes (and you should)

This project is an ideal learning sandbox because:

1. You already have a **real chat UI + auth + DB** — the hard product shell is done.
2. LLM calls are isolated mainly in:
   - `src/components/input-prompt-components/input-prompt.tsx` (main chat)
   - `src/components/chat-provider-components/chat-provider.tsx` (rewrite)
   - `src/components/chat-provider-components/chat-actions-btns.tsx` (double-check queries)
3. You can **swap the client SDK for a LangChain server pipeline** without redesigning the whole UI.
4. MongoDB chat documents are a natural place to add **embeddings / RAG / memory**.

### What “Gen AI on resume” usually means (map to this app)

| Topic interviewers care about | Feature you will build here |
|------------------------------|-----------------------------|
| Prompt engineering | System prompts, templates, structured output |
| LLM APIs & streaming | Server-side Gemini (or multi-model) via LangChain |
| Context / memory | Full-thread + summary memory |
| RAG | Chat-with-your-docs over uploads / past chats |
| Agents & tools | Weather, web search, calculator, DB lookup |
| Evaluation | Simple offline eval set + latency/cost logging |
| Safety & production | Secret keys server-side, rate limits, authz |

**Recommendation:** Keep Gemini as the primary model (fits the brand), but orchestrate it with **LangChain.js** (`langchain` + `@langchain/google-genai`) so your story is “I design Gen AI *systems*, not just call an API.”

---

## 3. Learning path (study → ship in same week)

Do **not** learn LangChain in isolation for months. Use this loop:

```
Watch / read concept (1–2 hrs)
  → Implement one small feature in this repo (1–2 days)
    → Write 2–3 resume bullets + a short README section
      → Record a 60s Loom demo of that feature
```

### Suggested free / cheap learning resources

| Week theme | Focus | Practice in this repo |
|------------|--------|------------------------|
| Week 1 | LLM basics, tokens, temperature, streaming | Move Gemini call server-side |
| Week 2 | Prompt templates, chat history, memory | Full multi-turn context |
| Week 3 | Embeddings + vector search + RAG | “Ask my documents” |
| Week 4 | Tools + agents | Tool-using assistant |
| Week 5 | Eval, logging, cost | Simple eval harness + metrics |
| Week 6 | Polish + deploy | README, demo, resume bullets |

LangChain docs to bookmark: [JS docs](https://js.langchain.com/docs/), Google GenAI integration, ConversationalRetrievalChain / LCEL, tools/agents.

---

## 4. Phase 0 — Make the repo resume-credible (2–3 days)

> **Status: Implemented** — README, `.env.sample`, ESLint/CI, metadata, deploy guide, and architecture docs.

Do this **before** Gen AI upgrades. Recruiters and engineers clone first.

### Steps

1. **Restore `package.json` + lockfile** (this fork is missing them). Copy scripts/deps from upstream or regenerate with Next.js + your current imports.
2. **Write a real `README.md`**: problem, features, architecture diagram, setup, env vars, demo URL, tech stack, “what I built beyond the clone.”
3. Fix metadata in `src/app/layout.tsx` (replace `"Your Name"` placeholders).
4. Confirm `.env.sample` matches reality; never commit real keys.
5. Deploy a **live demo** (Vercel + MongoDB Atlas) and put the URL at the top of the README.
6. Add a short **Architecture** section (UI → Server Actions/API → LangChain → Gemini → MongoDB).

### Resume impact

> Built and deployed a full-stack Gemini-style chat app (Next.js, NextAuth, MongoDB) with streaming UI and persistent conversation history.

---

## 5. Phase 1 — Secure & production-minded LLM calls (3–5 days) ⭐ highest priority

> **Status: Implemented** — Gemini calls run through authenticated `/api/chat*` routes with `GOOGLE_API_KEY` (server-only), streaming, rate limits, max prompt length, AbortController cancel, and session-scoped chat authz.

**Problem today:** `NEXT_PUBLIC_API_KEY` in `input-prompt.tsx` exposes your Gemini key to every browser.

### Steps

1. Rename env to `GOOGLE_API_KEY` (server-only). Remove `NEXT_PUBLIC_API_KEY` from client code.
2. Create a Route Handler or Server Action, e.g. `src/app/api/chat/route.ts`, that:
   - checks `auth()`
   - accepts `{ chatID, message, image? }`
   - streams tokens back (ReadableStream / SSE)
3. Update the client to `fetch` that endpoint and update Zustand as chunks arrive.
4. Add basic **rate limiting** (per user / IP) and max prompt length.
5. Ensure `createChat` / history APIs only return data for the **authenticated** user (tighten authz on reads/updates).

### Learning goals

- How LLM API keys must be handled
- Streaming protocols for chat UIs
- AuthN vs AuthZ in AI apps

### Resume bullet

> Migrated client-side Gemini calls to authenticated server-side streaming endpoints, eliminating public API key exposure and adding session-scoped rate limits.

---

## 6. Phase 2 — Introduce LangChain.js as the orchestration layer (4–7 days)

> **Status: Implemented** — Chat / rewrite / double-check go through LangChain LCEL (`ChatGoogleGenerativeAI` + `ChatPromptTemplate`), Zod structured output for double-check, and an optional Flash/Pro model picker.

This is where your project stops being “SDK demo” and becomes **Gen AI engineering**.

### Steps

1. Install:
   ```bash
   npm install langchain @langchain/core @langchain/google-genai @langchain/community
   ```
2. Create `src/lib/ai/` (suggested layout):
   ```
   src/lib/ai/
     llm.ts              # ChatGoogleGenerativeAI factory
     prompts.ts          # ChatPromptTemplate / system prompts
     chains/chat.ts      # main reply chain
     memory.ts           # history loader from Mongo
     tools/              # later phases
     rag/                # later phases
   ```
3. Replace raw `GoogleGenerativeAI` usage with LangChain `ChatGoogleGenerativeAI` + LCEL:
   ```ts
   // conceptual shape
   const chain = prompt.pipe(model).pipe(parser);
   ```
4. Implement **prompt templates** for:
   - default assistant
   - rewrite styles (Longer / Simplify / Formalize — already in UI)
   - “double-check” → structured JSON list of search queries
5. Use **structured output** (Zod + LangChain parser) for double-check queries instead of fragile `JSON.parse` on free text.
6. Keep Gemini as default model; optionally add a **model picker** (Flash vs Pro) via LangChain model config.

### Learning goals

- LCEL / chains vs raw SDK
- Prompt templates vs string concatenation
- Structured outputs for reliable UI features

### Resume bullet

> Rebuilt the chat backend with LangChain.js (LCEL, prompt templates, structured output) on top of Google Gemini for maintainable multi-feature Gen AI workflows.

---

## 7. Phase 3 — Real conversation memory (3–5 days)

> **Status: Implemented** — Server loads the full Mongo thread by `chatID`, maps turns to LangChain `HumanMessage`/`AIMessage`, applies a ~6k-token budget with running `threadSummary` for older turns, and surfaces a context hint in the UI.

**Problem today:** prompts only inject the **previous single turn** (`prevChat` in `input-prompt.tsx`).

### Steps

1. Load full thread from Mongo for `chatID` (you already have `getChatHistory`).
2. In LangChain, map messages to `HumanMessage` / `AIMessage`.
3. Add a **token budget** strategy:
   - last N messages, **or**
   - summarize older turns with a small “summary” chain and keep recent raw turns
4. Persist optional `threadSummary` on the chat document.
5. Show a subtle UI hint: “Using full conversation context” / message count.

### Learning goals

- Context windows & truncation
- Summarization memory patterns
- Why “chatbots forget” and how to fix it

### Resume bullet

> Implemented multi-turn memory with token-aware history truncation and running conversation summaries so replies stay coherent across long threads.

---

## 8. Phase 4 — RAG: Chat with your documents (1–2 weeks) ⭐ strongest Gen AI signal

> **Status: Implemented** — Per-user document upload (PDF/TXT/MD), LangChain chunking + Gemini embeddings, cosine similarity retrieval, cited answers via Knowledge mode toggle, and a Sources accordion in the UI.

RAG is the feature that most clearly shows **LLM + Gen AI** skills on a resume.

### Product idea (fits Gemini Clone UX)

Add **“Knowledge”** or **“Upload docs”** next to the prompt bar:

- User uploads PDF / TXT / MD
- App chunks → embeds → stores vectors
- Answers cite sources (“Based on *resume.pdf*, page 2…”)

### Steps

1. **Choose a vector store** (pick one; don’t overbuild):
   - **MongoDB Atlas Vector Search** (reuses your DB story), or
   - **Chroma / LanceDB** locally for learning, or
   - **Pinecone** (common on resumes)
2. Pipeline:
   - Load docs (`PDFLoader` / text splitter)
   - `RecursiveCharacterTextSplitter` (chunk size ~800–1200, overlap ~100–200)
   - Embed with Gemini embeddings or a free embedding model via LangChain
   - Store `{ userId, chatID?, source, embedding, text, metadata }`
3. Retrieval chain:
   - similarity search top-k
   - stuff/refine context into prompt
   - generate answer + return citations
4. UI:
   - upload modal
   - “Sources” accordion under the answer
   - per-user isolation (never retrieve another user’s docs)
5. Optional stretch: **RAG over past chats** (“What did we decide last week?”).

### Learning goals

- Embeddings, chunking, similarity search
- Why RAG beats stuffing entire PDFs into the prompt
- Citation / grounding UX

### Resume bullet

> Built a per-user RAG pipeline (chunking, embeddings, vector search, cited answers) so the assistant can ground responses in uploaded documents and prior chats.

---

## 9. Phase 5 — Tools & a lightweight agent (1–2 weeks)

> **Status: Implemented** — LangChain tools (calculator, datetime, web search, list recent chats), tool-calling agent loop, streamed NDJSON agent steps, and Chat/Agent mode toggle in the UI.

Agents demonstrate you understand **LLMs that take actions**, not only chat.

### Start with 3–4 safe tools

| Tool | Why it’s good for learning |
|------|----------------------------|
| Calculator / math | Deterministic, easy to test |
| Current date/time | Shows tool routing |
| Web search (SerpAPI / Tavily) | Classic agent demo |
| Mongo “list my recent chats” | App-specific tool |

### Steps

1. Define tools with LangChain tool APIs (`tool()` + Zod schemas).
2. Use a simple **tool-calling** agent (avoid complex multi-agent until basics work).
3. Stream **intermediate steps** to the UI (“Searching…”, “Calculating…”).
4. Log tool name + args + latency for debugging.
5. Add a toggle: **Chat mode** vs **Agent mode** so users (and demos) stay predictable.

### Learning goals

- Tool schemas & function calling
- Agent loops / when *not* to use agents
- Observability of tool use

### Resume bullet

> Added a tool-using LangChain agent (search, math, app DB lookups) with streamed intermediate steps and a user-facing agent mode toggle.

---

## 10. Phase 6 — Multimodal & Gen AI product polish (3–7 days)

> **Status: Implemented** — GridFS image persistence, streaming multimodal vision via LangChain, Describe/OCR/Diagram presets, durable thumbnails in chat history, and abort-aware server streams for image + text replies.

You already accept images client-side; finish the Gen AI story.

### Steps

1. Persist uploads (Cloudinary / S3 / Mongo GridFS) — today only `imgName` is stored.
2. Pass image + text through LangChain multimodal messages.
3. Add **image understanding presets**: “Describe”, “Extract text (OCR)”, “Explain diagram”.
4. Optional: **image generation** (Imagen / another API) as a separate tab — label clearly as Gen AI generation vs chat.
5. Fix abort so it **cancels** the server stream (AbortController), not only UI state.

### Resume bullet

> Extended multimodal chat with durable image storage and server-side vision prompts, plus reliable stream cancellation.

---

## 11. Phase 7 — Evaluation, cost, and reliability (resume differentiator)

> **Status: Implemented** — 25-case eval set + rubric scorer (`npm run eval`), per-request MongoDB metrics (latency + token proxies, hashed user id, feature tags), admin dashboard at `/app/metrics` with CSV export, and unit tests for chunking, schemas, calculator, rate limit, and eval scoring.

Most clones skip this. Adding it marks you as engineering-minded.

### Steps

1. Create `evals/prompts.json` — 20–30 fixed questions + expected traits (not exact string match).
2. Script that runs the chain offline and scores with a rubric or LLM-as-judge.
3. Log per request: model, tokens (if available), latency, userId hash, feature tag (`chat` / `rag` / `rewrite`).
4. Simple dashboard page (admin-only) or CSV export.
5. Add unit tests for chunking, auth guards, and structured parsers; one Playwright smoke test for login → send message (mocked LLM).

### Resume bullet

> Introduced a lightweight LLM eval harness and request metrics (latency/token proxies) to catch regressions across prompt and chain changes.

---

## 12. Phase 8 — Ship like a product (ongoing, 2–4 days focused)

> **Status: Implemented** — GitHub Actions CI (lint, typecheck, test, build), error boundaries, friendly AI error toasts, env-based feature flags for Agent/RAG/Vision, `SYSTEM-DESIGN.md`, and a full README with setup/scripts/demo placeholders.

1. GitHub Actions: lint + typecheck + test on PR.
2. Error boundaries + user-friendly AI failure toasts.
3. Feature flags for RAG/Agent (easy demos).
4. Short **SYSTEM DESIGN.md** (1 page): data flow, threat model (key leakage, prompt injection), scaling notes.
5. 2–3 minute demo video + GIFs in README.

---

## 13. Suggested build order (maximize resume value per week)

```
Week 1:  Phase 0 + Phase 1   → secure streaming API, live demo, README
Week 2:  Phase 2 + Phase 3   → LangChain + real memory
Week 3–4: Phase 4            → RAG (biggest Gen AI talking point)
Week 5:  Phase 5             → tools/agent
Week 6:  Phase 6 + 7 + 8     → multimodal polish, evals, CI, video
```

If time is short, **must-do** for interviews: **Phase 1 + 2 + 4**.  
Skip image generation and fancy agents before RAG is solid.

---

## 14. Concrete tickets you can copy into GitHub Issues

- [x] Restore `package.json` / lockfile  
- [x] Document install & env in README  
- [x] Move Gemini generation to authenticated `/api/chat` stream; remove public API key  
- [x] Add `src/lib/ai` with LangChain `ChatGoogleGenerativeAI` + prompt templates  
- [x] Structured output for double-check search queries  
- [x] Full-thread memory + optional summary memory  
- [x] Document upload + chunk + embed + vector retrieval with citations  
- [x] Agent mode with 3 tools + streamed tool traces  
- [x] Persist chat images to cloud storage  
- [x] Eval set (20+ cases) + latency logging  
- [x] CI pipeline + deploy demo link + Loom walkthrough  

---

## 15. How to talk about this on your resume

### Project title ideas

- **Gemini-Clone — LangChain-powered Gen AI Assistant**  
- **Full-stack RAG Chat App (Next.js + LangChain + Gemini)**

### Skill line (example)

`LangChain.js · Google Gemini · RAG · Prompt Engineering · Next.js · TypeScript · MongoDB · NextAuth · Vector Search · Streaming APIs`

### Bullet formula

`[Action verb] + [what you built] + [tech] + [measurable/outcome]`

Examples:

1. Architected a Gemini-style assistant using **LangChain.js** and **Gemini**, with server-side streaming and OAuth-protected chat APIs.  
2. Implemented **RAG** over user documents (chunking, embeddings, vector search) with source citations in the UI.  
3. Designed **multi-turn memory** and structured-output chains for rewrite and fact-check workflows.  
4. Added a **tool-calling agent** for search and app-data actions with visible intermediate steps.  
5. Hardened the app by removing browser-exposed API keys, enforcing authz on chat data, and adding basic evals/CI.

### Interview talking points to prepare

1. Why you moved the key server-side (security).  
2. How chunk size/overlap affect RAG quality.  
3. When you’d use agents vs a single chain.  
4. How you’d stop prompt injection from uploaded docs.  
5. Cost/latency tradeoffs: Flash vs Pro, top-k, history length.

---

## 16. What *not* to do (common resume traps)

| Trap | Better approach |
|------|-----------------|
| Add LangChain but still call Gemini from the client | Server-side LangChain only |
| Claim “built an agentic multi-RAG LLM OS” with thin wrappers | Ship 2–3 deep features and demo them |
| Only Jupyter notebooks, no product | Keep features inside this Next.js app |
| Commit API keys / `.env` | Use `.env.sample` + secrets in Vercel |
| Copy a tutorial RAG app with no auth | Tie RAG to **your** logged-in users and Mongo chats |

---

## 17. Minimal architecture target (end state)

```
┌─────────────┐     auth      ┌──────────────────────┐
│  Next.js UI │ ─────────────►│  /api/chat (stream)  │
│  Zustand    │               │  /api/rag            │
│  TipTap     │◄── tokens ────│  /api/agent          │
└─────────────┘               └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │  LangChain.js        │
                              │  prompts · memory    │
                              │  RAG · tools/agent   │
                              └──────────┬───────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                   Gemini LLM     Embeddings       Vector Store
                                  + Tools          (Atlas / Pinecone)
                                         │
                                         ▼
                                      MongoDB
                                   (users, chats, docs meta)
```

---

## 18. Final checklist before putting it on your resume

- [ ] Live demo URL works without you explaining local setup  
- [x] README shows **your** contributions (especially LangChain / RAG / security)  
- [x] No secrets in git history (use `.env.sample` only)  
- [x] Gen AI features implemented in code (chat, RAG, agent, vision, evals, metrics)  
- [x] Architecture doc (`SYSTEM-DESIGN.md`) + CI pipeline  
- [ ] Record a 60s–3min demo video and add link to README  
- [x] Bullets use LangChain / RAG / LLM words **backed by code you wrote**

---

## 19. Roadmap completion status

| Phase | Topic | Status |
|-------|--------|--------|
| 0 | Repo credibility (README, CI, metadata) | Done |
| 1 | Secure server-side LLM | Done |
| 2 | LangChain orchestration | Done |
| 3 | Multi-turn memory | Done |
| 4 | RAG with citations | Done |
| 5 | Tools & agent | Done |
| 6 | Multimodal vision | Done |
| 7 | Evals & metrics | Done |
| 8 | Product polish (CI, flags, errors, docs) | Done |

**Remaining (you):** Deploy to Vercel, set `ADMIN_EMAILS`, record portfolio video, add live URL to README.

---

## Bottom line

**All eight phases are implemented in code.** The UI clone is now a **secure, LangChain-orchestrated Gen AI system** with **memory, RAG, agents, vision, evals, and metrics**.

For interviews, lead with **Phase 1 (secure API) → Phase 2 (LangChain) → Phase 4 (RAG)** — then demo agent mode and metrics if time allows.
