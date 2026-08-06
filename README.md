# Gemini Clone — LangChain Gen AI Assistant

[![CI](https://github.com/Santosh-Pathak/Gemini-Clone/actions/workflows/ci.yml/badge.svg)](https://github.com/Santosh-Pathak/Gemini-Clone/actions/workflows/ci.yml)

A full-stack Gemini-style chat app built with **Next.js 14**, **LangChain.js**, **Google Gemini**, and **MongoDB**. Supports streaming chat, multi-turn memory, RAG with citations, tool-using agents, multimodal vision, request metrics, and an offline eval harness.

**Repository:** [github.com/Santosh-Pathak/Gemini-Clone](https://github.com/Santosh-Pathak/Gemini-Clone)

## Features

| Feature | Description |
|---------|-------------|
| **Secure LLM** | Server-side Gemini; OAuth + rate limits |
| **LangChain** | Prompt templates, chains, Zod structured output |
| **Memory** | Full-thread context with summarization for long chats |
| **RAG** | Upload docs → chunk → embed → cited answers |
| **Agent mode** | Calculator, datetime, web search, recent chats |
| **Vision** | Image upload, GridFS persistence, Describe/OCR/Diagram presets |
| **Metrics** | Admin dashboard + CSV export (`/app/metrics`) |
| **Evals** | 25-case offline eval harness (`npm run eval`) |

## Quick start

```bash
git clone https://github.com/Santosh-Pathak/Gemini-Clone.git
cd Gemini-Clone
cp .env.sample .env
# Fill in GOOGLE_API_KEY, GOOGLE_ID, GOOGLE_SECRET, MONGODB_URI, NEXTAUTH_*
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and start chatting at `/app`.

## Environment variables

See [`.env.sample`](.env.sample).

**Required**

| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | Gemini API (server only — never `NEXT_PUBLIC_*`) |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Google OAuth |
| `MONGODB_URI` | MongoDB connection |
| `NEXTAUTH_SECRET` | Session encryption (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |

**Optional**

| Variable | Purpose |
|----------|---------|
| `TAVILY_API_KEY` | Better agent web search (else DuckDuckGo) |
| `ADMIN_EMAILS` | Comma-separated emails for `/app/metrics` |
| `FEATURE_AGENT_ENABLED` | Set `false` to disable agent mode |
| `FEATURE_RAG_ENABLED` | Set `false` to disable Knowledge/RAG |
| `FEATURE_VISION_ENABLED` | Set `false` to disable image uploads |

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint (Next.js)
npm run typecheck  # TypeScript
npm test           # unit tests (no live LLM)
npm run eval       # offline LLM eval (uses API credits)
```

## Deploy (Vercel + MongoDB Atlas)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster; copy the connection string to `MONGODB_URI`.
3. Create [Google OAuth credentials](https://console.cloud.google.com/) with redirect URI `https://<your-app>.vercel.app/api/auth/callback/google`.
4. Add all env vars from `.env.sample` in Vercel project settings.
5. Set `ADMIN_EMAILS` to your Google account email to access `/app/metrics`.
6. Redeploy and test sign-in → chat → optional RAG/agent/vision flows.

## Architecture

```
Browser → Next.js API routes → LangChain.js → Gemini
                ↓
            MongoDB (chats, RAG chunks, GridFS images, metrics)
```

Full details: **[SYSTEM-DESIGN.md](SYSTEM-DESIGN.md)**

## Demo script (for portfolio video)

1. Sign in → send a streaming chat message
2. Enable **Knowledge** → upload a PDF → ask a question (cited sources)
3. Switch to **Agent** → “What is 15% of 240?” (tool steps stream)
4. Upload an image → **Describe** preset

Record a 2–3 min walkthrough and link it in your README or LinkedIn.

## CI

GitHub Actions runs lint, typecheck, unit tests, and build on push/PR to `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Roadmap & resume

Phased implementation (Phases 0–8 complete): [`RESUME-ENHANCEMENT-ROADMAP.md`](RESUME-ENHANCEMENT-ROADMAP.md)

**Resume one-liner:** Built a production-minded Gen AI assistant with LangChain orchestration, per-user RAG, tool-using agents, multimodal vision, eval harness, and request metrics on Next.js + MongoDB.

## License

Portfolio / educational use — adjust as needed.
