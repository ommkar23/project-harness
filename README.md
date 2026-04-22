# project-harness

Chat-backed sandbox harness built with the Vercel AI SDK and Vercel Sandbox.

## Quick start

```bash
git submodule update --init --recursive
pnpm install
cp .env.example .env
pnpm build
pnpm lint
pnpm dev
```

## What it does

- exposes a Next.js chat UI backed by AI SDK 6
- routes chat requests through a single `executePython` tool
- runs repo interaction inside a Vercel Sandbox
- clones the configured repository revision into the sandbox
- keeps sandbox output in the chat stream instead of writing run artifacts

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

- initialize the `harness-playground` submodule with `git submodule update --init --recursive`
- set `GEMINI_API_KEY` in `.env`
- set `HARNESS_REPO_URL` and `HARNESS_REPO_REVISION`
- run `vercel link` and `vercel env pull` so the sandbox SDK can authenticate locally
- if the repo is private, set `HARNESS_REPO_GIT_USERNAME` and `HARNESS_REPO_GIT_PASSWORD`

## Environment

Set `GEMINI_API_KEY` in `.env` before running the chat harness.

Optional variables:

- `GEMINI_CHAT_MODEL_ID` overrides the model used by the chat harness.
- `HARNESS_*` values configure the sandboxed repo execution path.
- `TAVILY_API_KEY` enables the sandboxed repository's Tavily search helper.

By default the sandbox clones the `tools` branch of the target repo, which includes the
`tools/` Python helper modules. Override `HARNESS_REPO_REVISION` if you want a different
ref.

The Reddit helper in `harness-playground/tools/` uses unauthenticated Reddit `.json` endpoints.
Those requests can be blocked from sandbox or datacenter IP ranges, so direct Reddit fetches are
not guaranteed to work inside Vercel Sandbox even with a custom `User-Agent`.

This repo also vendors `harness-playground/` as a Git submodule for local reference and
coordination. To pull the latest submodule commit on its configured branch, run:

```bash
git submodule update --remote harness-playground
```
