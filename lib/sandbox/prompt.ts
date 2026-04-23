import { getHarnessEnvironment } from '../harness-config';
import { REPO_PATH } from './constants';

function getPromptTimeContext(): {
  isoTimestamp: string;
  localTimestamp: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return {
    isoTimestamp: now.toISOString(),
    localTimestamp: formatter.format(now),
  };
}

export function buildSandboxSummary(): string {
  const runtimeConfig = getHarnessEnvironment();
  const timeContext = getPromptTimeContext();

  const lines = [
    `Repository URL: ${runtimeConfig.HARNESS_REPO_URL}`,
    `Repository revision: ${runtimeConfig.HARNESS_REPO_REVISION}`,
    `Sandbox workspace: ${REPO_PATH}`,
    `Current date and time: ${timeContext.localTimestamp} (${timeContext.isoTimestamp})`,
    'executePython runs your code inside the prepared sandbox environment.',
    'Start every new task by reading the repository README to understand the repo-specific workflow and helper guidance.',
    'You may use Python stdlib, installed packages, and subprocess as needed.',
    'Prefer native Python APIs over shell commands when practical.',
    'Web search helpers are available under the repository `tools/` package.',
    'The harness adds the repo root to the Python import path before your code runs.',
    'Import helpers with `from tools.web_search import search` or `from tools.reddit_research import ...`.',
    'Inspect helper docstrings before use. `tools.web_search.search(...)` supports Exa, Firecrawl, and Tavily via the `provider=` argument.',
    'Direct unauthenticated Reddit `.json` requests may be blocked from this sandbox environment.',
    'If Reddit blocks a request, report that clearly and avoid assuming the failure is caused by Python code alone.',
  ];

  if (runtimeConfig.EXA_API_KEY != null) {
    lines.push('EXA_API_KEY is available in the sandbox environment.');
  }

  if (runtimeConfig.TAVILY_API_KEY != null) {
    lines.push('TAVILY_API_KEY is available in the sandbox environment.');
  }

  if (runtimeConfig.FIRECRAWL_API_KEY != null) {
    lines.push('FIRECRAWL_API_KEY is available in the sandbox environment.');
  }

  if (runtimeConfig.HARNESS_REPO_GIT_PASSWORD != null) {
    lines.push(
      'Git is pre-authenticated for the repository host. You may use git push, pull, and other remote operations directly without supplying credentials.',
    );
  }

  return lines.join('\n');
}
