export type SandboxSessionRecord = {
  chatId: string;
  sandboxId: string;
  createdAt: string;
  lastUsedAt: string;
};

type SandboxSessionStore = Map<string, SandboxSessionRecord>;

declare global {
  var __projectHarnessSandboxSessions__: SandboxSessionStore | undefined;
}

export function getSandboxSessionStore(): SandboxSessionStore {
  globalThis.__projectHarnessSandboxSessions__ ??= new Map<string, SandboxSessionRecord>();
  return globalThis.__projectHarnessSandboxSessions__;
}

export function resetSandboxSessionStoreForTests(): void {
  globalThis.__projectHarnessSandboxSessions__ = new Map<string, SandboxSessionRecord>();
}
