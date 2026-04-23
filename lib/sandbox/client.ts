import { Sandbox } from '@vercel/sandbox';

export async function createSandbox(
  params: Parameters<typeof Sandbox.create>[0],
): Promise<Sandbox> {
  return Sandbox.create(params);
}

export async function getSandbox(sandboxId: string): Promise<Sandbox> {
  return Sandbox.get({ sandboxId });
}
