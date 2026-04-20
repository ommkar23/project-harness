# project-harness

Minimal evaluation harness built with the Vercel AI SDK.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm lint
pnpm run
```

## What it does

- loads a small in-code dataset
- runs each test case against the configured Gemini model
- applies deterministic scorers
- feeds failed evaluation results back into a prompt-improvement loop
- stops when the score no longer improves or after 5 iterations
- writes JSON results to `dist/runs/`

## Chat harness

The repo now includes a first-pass Next.js chat surface backed by AI SDK 6 and Vercel
Sandbox.

```bash
pnpm dev
```

Open `http://localhost:3000` and send a request. The route in
[app/api/chat/route.ts](/Users/ommkar/dev/markagen/project-harness/app/api/chat/route.ts)
uses Gemini for reasoning and exposes a single server-side tool,
`executePython`, which runs inline Python in a Vercel sandbox that clones the configured
repository.

Current behavior:

- the chat UI uses `useChat` with `DefaultChatTransport`
- the route returns a UI message stream via `result.toUIMessageStreamResponse()`
- the sandbox is created lazily per chat id and reused in-memory while the server stays alive
- the sandbox clones `HARNESS_REPO_URL`, upgrades `pip`, and installs
  `requirements.txt` when present
- all repo interaction is intended to happen through Python running inside the sandbox

Before running the chat harness locally:

- set `GEMINI_API_KEY` in `.env`
- set `HARNESS_REPO_URL` and `HARNESS_REPO_REVISION`
- run `vercel link` and `vercel env pull` so the sandbox SDK can authenticate locally
- if the repo is private, set `HARNESS_REPO_GIT_USERNAME` and `HARNESS_REPO_GIT_PASSWORD`

## Environment

Set `GEMINI_API_KEY` in `.env` before running the harness.

Optional variables:

- `GEMINI_MODEL_ID` sets the default evaluation model.
- `GEMINI_CHAT_MODEL_ID` overrides the model used by the chat harness.
- `HARNESS_*` values configure the sandboxed repo execution path.
# harness-playground
