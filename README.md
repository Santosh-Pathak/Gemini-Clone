# Gemini Clone — LangChain Gen AI Assistant

[![CI](https://github.com/Santosh-Pathak/Gemini-Clone/actions/workflows/ci.yml/badge.svg)](https://github.com/Santosh-Pathak/Gemini-Clone/actions/workflows/ci.yml)

A polished, full-stack Gemini-style AI assistant built with Next.js, TypeScript, LangChain, Google Gemini, MongoDB, and NextAuth. It is designed as both a working product and a portfolio project for demonstrating modern Gen AI engineering.

This app lets you chat with an AI, upload documents to build a personal knowledge base, switch into agent mode for tool-based tasks, analyze images, and review request metrics and eval results.

**Repository:** [github.com/Santosh-Pathak/Gemini-Clone](https://github.com/Santosh-Pathak/Gemini-Clone)

## What this project can do

### 1. Smart chat experience
- Stream responses in real time
- Keep chat history across sessions
- Use long-thread memory with summarization for better continuity
- Support rewrite and fact-check style workflows

### 2. Knowledge / RAG
- Upload PDF, TXT, or MD files
- Chunk and embed documents for retrieval
- Ask questions grounded in your uploaded content
- See cited sources in the response flow

### 3. Agent mode
- Use tools such as calculator, date/time, web search, and recent chat lookup
- See intermediate tool steps while the assistant works
- Switch between normal chat and tool-using agent behavior

### 4. Vision capabilities
- Upload images and ask questions about them
- Use presets like Describe, OCR, and Diagram explanations
- Persist images for later chat context

### 5. Production-minded AI features
- Server-side Gemini calls with auth and rate limiting
- Feature flags to enable or disable RAG, agent, and vision modes
- Request metrics and admin-only metrics dashboard
- Offline eval harness for prompt and response quality checks

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand for client state
- NextAuth for Google authentication
- MongoDB + Mongoose
- LangChain.js + Google Gemini
- Zod for structured outputs

## Quick start

### Prerequisites
- Node.js 20+
- MongoDB instance
- Google OAuth credentials
- Gemini API key

### Setup

```bash
git clone https://github.com/Santosh-Pathak/Gemini-Clone.git
cd Gemini-Clone
cp .env.sample .env
# Fill in the required environment variables
npm install
npm run dev
```

Open http://localhost:3000 and sign in with Google.

## Environment variables

See [.env.sample](.env.sample).

### Required

| Variable | Purpose |
|----------|---------|
| GOOGLE_API_KEY | Gemini API key on the server only |
| GOOGLE_ID | Google OAuth client ID |
| GOOGLE_SECRET | Google OAuth client secret |
| MONGODB_URI | MongoDB connection string |
| NEXTAUTH_SECRET | Session encryption secret |
| NEXTAUTH_URL | App base URL, usually http://localhost:3000 |

### Optional

| Variable | Purpose |
|----------|---------|
| TAVILY_API_KEY | Better web search for agent mode |
| ADMIN_EMAILS | Allowlist for metrics dashboard access |
| FEATURE_AGENT_ENABLED | Disable agent mode if needed |
| FEATURE_RAG_ENABLED | Disable knowledge/RAG mode if needed |
| FEATURE_VISION_ENABLED | Disable image features if needed |

## How the app works

The app follows a simple flow:

1. User sends a message or image from the UI
2. The Next.js API route handles auth, validation, and feature checks
3. LangChain orchestrates the prompt, memory, RAG context, and tools
4. Gemini generates the response
5. The app saves chat state, images, and metrics to MongoDB

## Feature walkthrough

A typical portfolio demo could be:

1. Sign in and send a streaming chat message
2. Turn on Knowledge mode and upload a document
3. Ask a question about the document and see citations appear
4. Switch to Agent mode and run a simple tool-based prompt
5. Upload an image and ask the assistant to describe it

## Scripts

```bash
npm run dev        # start the development server
npm run build      # create a production build
npm run lint       # run ESLint
npm run typecheck  # run TypeScript checks
npm test           # run unit tests
npm run eval       # run the offline evaluation harness
```

## Deployment

For a live deployment:

1. Push the project to GitHub
2. Deploy to Vercel
3. Create a MongoDB Atlas cluster
4. Configure the environment variables in Vercel
5. Set ADMIN_EMAILS for metrics access

## Architecture

```text
Browser → Next.js API routes → LangChain.js → Gemini
                ↓
            MongoDB (chats, RAG data, images, metrics)
```

More details are available in [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md).

## Project documentation

- [RESUME-ENHANCEMENT-ROADMAP.md](RESUME-ENHANCEMENT-ROADMAP.md) — roadmap and portfolio positioning
- [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md) — architecture and threat model
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — CI pipeline

## License

Portfolio and educational use.
