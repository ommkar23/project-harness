'use client';

import type { ReactElement } from 'react';

import {
  extractExecutePythonCode,
  formatExecutePythonDisplayOutput,
  type ExecutePythonToolPart,
} from '../../lib/execute-python';

export function ExecutePythonCard({ part }: { part: ExecutePythonToolPart }): ReactElement {
  const codeStatus = part.state === 'input-streaming' ? 'streaming' : 'ready';

  return (
    <>
      <details className="toolCard">
        <summary className="toolSummary">
          <span className="toolSummaryTitle">Python code</span>
          <span className="toolPill">{codeStatus}</span>
        </summary>
        <pre className="toolCode">{extractExecutePythonCode(part.input)}</pre>
      </details>

      {part.state === 'output-available' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill">done</span>
          </summary>
          <pre className="toolCode">{formatExecutePythonDisplayOutput(part.output)}</pre>
        </details>
      ) : null}

      {part.state === 'output-error' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill toolPillError">error</span>
          </summary>
          <pre className="toolCode">{part.errorText}</pre>
        </details>
      ) : null}

      {part.state === 'output-denied' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill toolPillError">denied</span>
          </summary>
          <pre className="toolCode">Execution denied.</pre>
        </details>
      ) : null}
    </>
  );
}
