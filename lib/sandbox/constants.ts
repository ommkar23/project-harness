export const REPO_PATH = '/vercel/sandbox';
export const PYTHON_COMMAND = 'python3';
export const PYTHON_EXECUTION_BOOTSTRAP = [
  'import sys',
  'from pathlib import Path',
  '',
  '# Ensure repo-local packages such as tools/ are importable from .harness temp scripts.',
  'workspace = Path(__file__).resolve().parents[1]',
  'workspace_str = str(workspace)',
  'if workspace_str not in sys.path:',
  '    sys.path.insert(0, workspace_str)',
  '',
].join('\n');
