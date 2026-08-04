# Gemini Clone — LangChain Gen AI Assistant

A full-stack Gemini-style chat app built with **Next.js 14**, **LangChain.js**, **Google Gemini**, and **MongoDB**. Supports streaming chat, multi-turn memory, RAG with citations, tool-using agents, multimodal vision, and request metrics.

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
git clone <repo-url>
cd Gemini-Clone
cp .env.sample .env
# Fill in GOOGLE_API_KEY, GOOGLE_ID, GOOGLE_SECRET, MONGODB_URI, NEXTAUTH_*
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and start chatting at `/app`.

## Environment variables

See [`.env.sample`](.env.sample). Required:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_API_KEY` | Gemini API (server only) |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Google OAuth |
| `MONGODB_URI` | MongoDB connection |
| `NEXTAUTH_SECRET` | Session encryption |
| `NEXTAUTH_URL` | App base URL |

Optional:

| Variable | Purpose |
|----------|---------|
| `TAVILY_API_KEY` | Better agent web search |
| `ADMIN_EMAILS` | Comma-separated emails for `/app/metrics` |
| `FEATURE_AGENT_ENABLED` | Set `false` to hide/disable agent mode |
| `FEATURE_RAG_ENABLED` | Set `false` to hide/disable Knowledge/RAG |
| `FEATURE_VISION_ENABLED` | Set `false` to hide/disable image uploads |

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # unit tests
npm run eval       # offline LLM eval (uses API credits)
```

## Architecture

See **[SYSTEM-DESIGN.md](SYSTEM-DESIGN.md)** for data flow, threat model, and scaling notes.

## Demo

<!-- Replace with your deployed URL and Loom/YouTube embed -->
- **Live demo:** _Add Vercel URL_
- **Walkthrough video:** _Add 2–3 min Loom link_
- **Screenshots:** _Add GIFs to `/public/assets/demo/`_

Suggested demo flow:

1. Sign in → send a chat message (streaming)
2. Toggle **Knowledge** → upload a PDF → ask a question (cited sources)
3. Toggle **Agent** → “What is 15% of 240?” (calculator tool steps)
4. Upload an image → **Describe** preset

## CI

GitHub Actions runs lint, typecheck, unit tests, and build on push/PR to `main` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Resume / portfolio

This project follows a phased roadmap documented in [`RESUME-ENHANCEMENT-ROADMAP.md`](RESUME-ENHANCEMENT-ROADMAP.md) covering LangChain orchestration, RAG, agents, multimodal, evals, and production polish.

## License

Private / portfolio use — adjust as needed.
