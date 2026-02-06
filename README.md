# DocTalk

Chat with the contents of any Google Drive folder.

DocTalk lets you sign in with Google, paste a Drive folder link, and have a conversation grounded in the actual contents of that folder. It ingests PDFs, Google Docs, Sheets, Slides, and plain text files, then provides RAG-powered chat with source citations and page numbers.

<img width="706" height="625" alt="image" src="https://github.com/user-attachments/assets/2be94f27-8b78-4e55-a8e4-1a39a728b93d" />

## Features

- Google OAuth sign-in with Drive read-only access
- Supports PDFs, Google Docs, Sheets, Slides, plain text, Markdown, and CSV
- Real-time ingestion progress via SSE streaming
- RAG chat with source citations and page numbers
- Recent folders stored in localStorage for quick access
- Recursive subfolder traversal
- Re-index support to refresh stale folder contents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (Google OAuth) |
| Vector Store | Upstash Vector |
| LLM | OpenRouter (default: Gemini 2.0 Flash) |
| UI | Tailwind CSS 4, shadcn/ui |
| Language | TypeScript (strict mode) |
| Testing | Vitest |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Google Cloud project with [OAuth 2.0 credentials](https://console.cloud.google.com/apis/credentials) configured (web application type, with `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI, and the Google Drive API enabled)
- An [Upstash Vector](https://upstash.com/docs/vector/overall/getstarted) index
- An [OpenRouter](https://openrouter.ai/) API key

## Getting Started

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd doctalk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and fill in your values:
   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Description |
   |----------|-------------|
   | `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | OAuth client secret |
   | `AUTH_SECRET` | Random string for session encryption (`openssl rand -base64 32`) |
   | `AUTH_URL` | App base URL (`http://localhost:3000` for local dev) |
   | `UPSTASH_VECTOR_REST_URL` | Upstash Vector REST endpoint |
   | `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector REST token |
   | `OPENROUTER_API_KEY` | OpenRouter API key |
   | `OPENROUTER_MODEL` | Optional — defaults to `google/gemini-2.0-flash-001` |

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
app/
├── api/
│   ├── auth/          # NextAuth route handler
│   ├── chat/          # Chat completion endpoint
│   └── ingest/        # Folder ingestion endpoint (SSE)
├── components/        # App-specific React components
├── layout.tsx         # Root layout + providers
└── page.tsx           # Main page (folder select → ingest → chat)

lib/
├── api/               # Shared route handler helpers (auth, validation)
├── auth/              # NextAuth configuration + token refresh
├── chat/              # LLM client setup (OpenRouter via AI SDK)
├── drive/             # Google Drive API client, file parsing, URL handling
├── ingestion/         # Chunking logic + ingestion pipeline
├── rag/               # Retrieval, prompt building, citation parsing
├── vectorstore/       # Upstash Vector client + namespace management
├── config.ts          # All app constants (limits, chunk sizes, etc.)
├── errors.ts          # Error classes + status/message mapping
└── utils.ts           # Shared utilities

components/ui/         # shadcn/ui primitives (Button, Card, Dialog, etc.)
```

## How It Works

**Ingestion:** When a user pastes a Drive folder URL, the server recursively lists all supported files in the folder and its subfolders via the Google Drive API, then processes each one — exporting Google Workspace files to plain text, downloading PDFs and parsing them page-by-page. The extracted text is split into overlapping chunks with page number attribution, then upserted into Upstash Vector under a namespace scoped to the user and folder. Progress events stream back to the client via SSE in real time.

**Chat:** User messages are sent to the chat endpoint, which embeds the query, retrieves the most relevant chunks from the vector store, deduplicates adjacent overlapping chunks, and builds a system prompt with the retrieved context. The LLM generates a response that can include source citations, which are parsed and mapped back to original file names and page numbers for display in the UI.
