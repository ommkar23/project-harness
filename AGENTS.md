# AGENTS

## Purpose

`project-harness` is a chat-backed coding harness using the Vercel AI SDK, Gemini, and Vercel Sandbox.

The project exists to:

- execute repo-aware coding tasks inside a sandboxed Python environment
- keep the tool surface narrow and intentional
- preserve telemetry for chat and sandbox execution

## Scope

This folder is intentionally narrow in scope.

Keep work here focused on:

- chat harness behavior
- Vercel sandbox execution flow
- model/provider configuration
- high-level documentation for the harness

Do not use this folder as a general product repo, website, or research dump.

## Structure

- `src/`
  TypeScript source for shared Node-emitted modules. Compiled by `tsc` with `moduleResolution: NodeNext` — all internal imports must use explicit `.js` extensions.
- `lib/`
  Next.js/server runtime modules for the chat-backed sandbox harness. Bundled by Next.js/Turbopack with `moduleResolution: Bundler` — no `.js` extensions on imports.
- `app/`
  Next.js app router UI and API routes
- `src/models.ts`
  model/provider configuration
- `lib/chat-harness.ts`
  chat route orchestration — message filtering, tool registration, streamText
- `lib/sandbox-session.ts`
  sandbox session logic for Next.js runtime
- `app/api/chat/route.ts`
  chat endpoint returning AI SDK UI message streams
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

## Environment

- use `pnpm`
- use `GEMINI_API_KEY` for model access unless the user explicitly requests a different provider
- use `BRAINTRUST_API_KEY` for OpenTelemetry tracing via Braintrust
- keep secrets out of source control
- `.env.example` should document required environment variables
- the chat harness pulls `HARNESS_REPO_URL` at `HARNESS_REPO_REVISION` into a Vercel sandbox
- the sandbox uses direct `python3` execution and may install repository dependencies with `python3 -m pip`
- for private repositories, set `HARNESS_REPO_GIT_PASSWORD=<github-pat>`; the username is always `x-access-token` (hardcoded per GitHub PAT convention)
- credentials are passed as `source.username`/`source.password` in `Sandbox.create` for the initial clone, and written to `~/.netrc` inside the sandbox for subsequent git operations
- the PAT is NOT forwarded as an env var into the sandbox
- local sandbox work assumes Vercel CLI auth and a linked local project
- the current public target repo used in this session is `ommkar23/harness-playground`

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

- do not add a custom context viewer — runtime tracing goes to Braintrust via `experimental_telemetry`

## Chat Harness

- the coding harness agent has two available actions:
  - respond to the user in text
  - call `executePython`
- all repo interaction must happen through `executePython`
- prefer native Python APIs before using `subprocess`
- `subprocess` is allowed for git, installs, tests, and other command-oriented tasks
- the system prompt is built by `buildSandboxSummary()` and includes repo URL, revision, workspace path, and whether git is pre-authenticated
- the harness owns context filtering and ordering before conversion to model messages
- the carry-forward model context keeps user text, assistant text, and completed `executePython` outputs
- raw tool-call inputs are not carried forward into the next-turn model context
- `executePython` results are reformatted into synthetic context entries before conversion with AI SDK `convertToModelMessages(...)`
- do not tell the model to manage a virtual environment; sandbox runtime setup is a harness concern

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
