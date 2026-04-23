# AGENTS

## Purpose

`project-harness` is a chat-backed coding harness using the Vercel AI SDK, AI Gateway-backed models, and Vercel Sandbox.

The project exists to:

- execute repo-aware coding tasks inside a sandboxed Python environment
- keep the tool surface narrow and intentional
- preserve telemetry for chat and sandbox execution
- support repo-local helper modules such as Exa, Firecrawl, or Tavily web search when present in the cloned target repo

## Scope

This folder is intentionally narrow in scope.

Keep work here focused on:

- chat harness behavior
- chat UI presentation for tool inputs and sandbox outputs
- Vercel sandbox execution flow
- model/provider configuration
- high-level documentation for the harness

Do not use this folder as a general product repo, website, or research dump.

## Structure

- `src/`
  TypeScript source for shared Node-emitted modules. Compiled by `tsc` with `moduleResolution: NodeNext` — all internal imports must use explicit `.js` extensions.
- `src/harness-config.ts`
  shared typed environment/config resolution for the harness
- `lib/`
  Next.js/server runtime modules for the chat-backed sandbox harness. Bundled by Next.js/Turbopack with `moduleResolution: Bundler` — no `.js` extensions on imports.
- `lib/chat-harness/`
  request parsing, context-building, and stream assembly for the chat route
- `lib/sandbox/`
  sandbox constants, store, bootstrap, prompt, lifecycle, and execution modules
- `app/`
  Next.js app router UI and API routes
- `app/components/`
  chat UI presentation components
- `app/hooks/`
  client-side chat controller hooks
- `test/`
  first-party harness unit and UI tests
- `src/models.ts`
  model/provider configuration
- `lib/chat-harness.ts`
  thin entrypoint that delegates chat route orchestration to `lib/chat-harness/`
- `lib/sandbox-session.ts`
  thin entrypoint that delegates sandbox session logic to `lib/sandbox/`
- `app/api/chat/route.ts`
  chat endpoint returning AI SDK UI message streams
- `app/api/chat/reset/route.ts`
  reset endpoint that clears the active chat sandbox session
- `app/page.tsx`
  chat UI
- `instrumentation.ts`
  Next.js instrumentation entrypoint
- `instrumentation.node.ts`
  Node-only OTel provider bootstrap — registers `BraintrustSpanProcessor`
- `dist/`
  compiled output from the current source tree
- `README.md`
  quick usage notes
- `hld-overview.html`
  high-level design explainer for non-code review
- `harness-playground/`
  Git submodule checkout of the target repo for local reference

## Environment

- use `pnpm`
- use `AI_GATEWAY_API_KEY` for model access through Vercel AI Gateway
- use `BRAINTRUST_API_KEY` for OpenTelemetry tracing via Braintrust
- keep secrets out of source control
- `.env.example` should document required environment variables
- the chat harness pulls `HARNESS_REPO_URL` at `HARNESS_REPO_REVISION` into a Vercel sandbox
- the sandbox uses direct `python3` execution and may install repository dependencies with `python3 -m pip`
- for private repositories, set `HARNESS_REPO_GIT_PASSWORD=<github-pat>`; the username is always `x-access-token` (hardcoded per GitHub PAT convention)
- credentials are passed as `source.username`/`source.password` in `Sandbox.create` for the initial clone, and written to `~/.netrc` inside the sandbox for subsequent git operations
- the PAT is NOT forwarded as an env var into the sandbox
- `EXA_API_KEY`, `TAVILY_API_KEY`, and `FIRECRAWL_API_KEY` are forwarded into the sandbox env when present so repo-local web search helpers can use any configured backend directly
- the current harness chat model is `openai/gpt-5.4-mini` via AI Gateway
- local sandbox work assumes Vercel CLI auth and a linked local project
- the current public target repo used in this session is `ommkar23/harness-playground`
- the default revision is `tools` unless `HARNESS_REPO_REVISION` overrides it
- `harness-playground/` is included in this repo as a Git submodule that tracks the `tools` branch
- repo-local helper modules in the target repo live under `tools/`, including `tools/web_search.py` and `tools/reddit_research.py`
- the current `harness-playground` submodule revision in this repo is `d0888be` on `tools`
- the Reddit helper uses unauthenticated Reddit `.json` endpoints, which may be blocked from sandbox or datacenter IP ranges even with a custom `User-Agent`
- repo-local web search helpers currently support `exa`, `firecrawl`, and `tavily`

## Change Rules

- prefer small, reviewable edits
- keep the harness simple unless the user asks for broader platform features
- avoid adding framework or UI complexity unless explicitly requested
- for the chat harness, keep the tool surface intentionally narrow

## Verification

After code changes, run:

- `pnpm build`
- `pnpm lint`

Report whether:

- build passed
- lint passed
- a sandbox create/clone smoke test was executed when sandbox behavior changed

## Output Conventions

- keep chat output focused on the current task and sandbox response
- keep summaries easy to scan

For the chat harness:

- render `executePython` activity inline in the chat stream rather than in a separate context sidebar
- show Python tool input and sandbox output as separate sequential UI elements
- keep Python code and code output collapsed by default when rendered as tool UI blocks
- render assistant text responses as Markdown
- keep user-authored prompts rendered as plain text
- support `Cmd+Enter` in the chat textarea to submit the current message
- do not add a custom context viewer — runtime tracing goes to Braintrust via `experimental_telemetry`

## Chat Harness

- the coding harness agent has two available actions:
  - respond to the user in text
  - call `executePython`
- all repo interaction must happen through `executePython`
- prefer native Python APIs before using `subprocess`
- `subprocess` is allowed for git, installs, tests, and other command-oriented tasks
- the system prompt is built by `buildSandboxSummary()` and includes repo URL, revision, workspace path, current date/time, and whether git is pre-authenticated
- the system prompt should advertise repo-local helper modules present in the cloned target repo, such as `tools/web_search.py`
- the system prompt should tell the agent to start by reading the target repository README
- the system prompt should tell the agent to inspect helper docstrings before use
- when Reddit blocks unauthenticated `.json` requests from the sandbox, surface that as an environment/access limitation rather than as a generic Python failure
- the chat request may carry a selected AI Gateway `modelId`, but it must be validated against the harness allowlist before use
- the chat UI currently exposes only one eligible allowlist entry: `openai/gpt-5.4-mini`
- the harness owns context filtering and ordering before conversion to model messages
- the carry-forward model context keeps user text, assistant text, and completed `executePython` outputs
- raw tool-call inputs are not carried forward into the next-turn model context
- `executePython` results are reformatted into synthetic context entries before conversion with AI SDK `convertToModelMessages(...)`
- do not tell the model to manage a virtual environment; sandbox runtime setup is a harness concern
- the chat UI includes a reset control that must clear the current conversation and stop the active sandbox session so the next turn starts from a fresh clone

## Repo Helpers

- `tools.web_search.search(...)` is the stable public interface for repo-local web search
- supported providers are `exa`, `firecrawl`, and `tavily`
- all supported web-search providers now normalize to a common top-level shape with `query`, `provider`, and `results`, plus optional fields such as `answer`, `images`, `warning`, `usage`, and `metadata`
- callers should treat provider-specific details as optional and read them from normalized fields or `metadata`, not from legacy provider-native top-level keys
- unsupported non-default provider parameters should fail explicitly instead of being silently ignored
- `tools.reddit_research.discover_subreddits(...)` now accepts explicit provider selection for stable discovery behavior
- helper interface docstrings are the source of truth for parameter and return-shape details
- the target repo README includes backend-selection guidance for agents and should be read before using helpers

## Network Notes

- repo-local web search helpers use `urllib.request` with an explicit `User-Agent`
- repo-local web search helpers now use a `certifi`-aware SSL context when `certifi` is available
- local smoke tests previously exposed TLS trust-store issues that did not reproduce in Vercel Sandbox
- Exa may reject requests from some environments with Cloudflare `browser_signature_banned` or other access-denied responses even when the request is otherwise valid
- treat those Exa/Cloudflare failures as environment or upstream access-policy limitations, not as prompt or Python logic failures

## Testing Notes

- `harness-playground/tests/test_tools_smoke.py` provides live smoke coverage for the web search helpers and Reddit research primitives
- `harness-playground/tests/test_web_search_unit.py` and `harness-playground/tests/test_reddit_research_unit.py` provide deterministic unit coverage for normalized contracts, provider mapping, subreddit extraction, and blocked-response handling
- the harness itself now has first-party tests under `test/` and uses `vitest`
- harness-playground smoke tests are environment-aware and may skip on missing API keys, TLS certificate issues, or Reddit sandbox blocking

## Telemetry

- `experimental_telemetry: { isEnabled: true }` is set on all `streamText` and `generateText` calls
- `instrumentation.node.ts` registers a `BraintrustSpanProcessor` via `NodeTracerProvider`
- traces appear in Braintrust under the `project-harness` service name

## Documentation Preference

- update `README.md` for usage changes
- update `hld-overview.html` for architecture changes that matter at a non-code level
- update `coding-harness-spec.html` for sandbox or chat-architecture changes that matter at a non-code level
- prefer editing existing docs over creating redundant new docs

## Future Extensions

Reasonable future additions for this project include:

- human review hooks
- multi-model comparisons
- experiment metadata and diffing

Add these only when they materially support the harness goal.
