# AGENTS

## Purpose

`project-harness` is a small evaluation harness for prompt experiments using the Vercel AI SDK and Gemini.

It now includes two related paths:

- a benchmark-style CLI harness for prompt evaluation loops
- a chat-backed coding harness that executes inline Python inside Vercel Sandbox against a target Git repository

The project exists to:

- run benchmark cases against prompt variants
- score outputs using deterministic checks
- feed evaluation failures back into a prompt-improvement loop
- stop when scores stop improving or the loop reaches its cap
- persist run artifacts for later inspection

## Scope

This folder is intentionally narrow in scope.

Keep work here focused on:

- evaluation harness behavior
- chat harness behavior
- Vercel sandbox execution flow
- prompt optimization flow
- model/provider configuration
- scoring logic
- run outputs and summaries
- high-level documentation for the harness

Do not use this folder as a general product repo, website, or research dump.

## Structure

- `src/`
  TypeScript source for the benchmark harness and shared Node-emitted modules. Compiled by `tsc` with `moduleResolution: NodeNext` — all internal imports must use explicit `.js` extensions.
- `lib/`
  Next.js/server runtime modules for the chat-backed sandbox harness. Bundled by Next.js/Turbopack with `moduleResolution: Bundler` — no `.js` extensions on imports.
- `app/`
  Next.js app router UI and API routes
- `src/dataset.ts`
  benchmark cases and expected checks
- `src/prompts.ts`
  seed prompt variants and prompt metadata
- `src/models.ts`
  model/provider configuration
- `src/scorers.ts`
  deterministic evaluation logic
- `src/harness.ts`
  orchestration, evaluation loop, and prompt refinement loop
- `src/cli.ts`
  command-line entry point
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
  compiled output and run artifacts
- `dist/runs/`
  JSON outputs from harness runs
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
- preserve the current HLD direction: benchmark -> score -> improve -> rerun
- avoid adding framework or UI complexity unless explicitly requested
- prefer deterministic scorers first; add judge-style evaluation only when needed
- do not silently change the evaluation objective or benchmark semantics
- for the chat harness, keep the tool surface intentionally narrow

## Verification

After code changes, run:

- `pnpm build`
- `pnpm lint`

If behavior changes materially and credentials are available, also run:

- `pnpm run run`

Report whether:

- build passed
- lint passed
- a live harness run was executed
- a new run artifact was produced
- a sandbox create/clone smoke test was executed when sandbox behavior changed

## Output Conventions

- keep run artifacts as separate JSON files under `dist/runs/`
- prefer additive run history over overwriting prior results
- keep summaries easy to scan
- expose stop reason and completed iteration count in outputs

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

- external dataset loading
- richer scoring dimensions
- human review hooks
- multi-model comparisons
- experiment metadata and diffing

Add these only when they materially support the harness goal.
