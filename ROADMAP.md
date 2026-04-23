# Roadmap

This file tracks focused next-step improvements for `project-harness`.

## Near Term

### Provider Surface Expansion

Add support for `map`, `crawl`, and `scrape` endpoints across all supported search/data providers where those capabilities exist.

Goals:
- expose a consistent repo-local interface for discovery and extraction workflows
- keep provider-specific differences behind stable helper contracts
- document capability gaps when a provider does not support a given endpoint class
- ensure sandbox env forwarding covers any required provider credentials

Initial scope:
- inventory current provider support and API constraints
- define the normalized interface shape
- implement adapters in `harness-playground/tools/`
- add smoke tests for each supported provider/endpoint combination

### Context Token Counter

Add a current-context token counter for the chat harness so the UI and runtime can show how much context is being sent to the model.

Goals:
- measure current turn context after harness filtering/reformatting
- make token usage visible before or during generation
- help diagnose truncation pressure and context growth over long sessions
- support future model comparisons and context budgeting

Initial scope:
- count tokens on the final model-bound message set
- surface totals in a lightweight UI element
- include clear separation between user-visible messages and carried-forward synthetic tool context
- verify behavior across different configured models
