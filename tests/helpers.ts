import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { example, type Feedback } from '../src/schema'

export async function fixture(config: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'taffy-test-'))
  const workspace = join(root, 'project')
  const stateDir = join(root, 'state')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(workspace)
  const codex = resolve(import.meta.dir, 'fixtures/codex.ts')
  await chmod(codex, 0o755)
  const configure = (value: Record<string, unknown>) => writeFile(join(workspace, 'fixture.json'), JSON.stringify(value))
  await configure({ visual: example, ...config })
  return {
    root, workspace, stateDir, codex, timeoutMs: 3000, configure,
    calls: async () => (await readFile(join(workspace, 'calls.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

export function feedback(overrides: Partial<Feedback> = {}): Feedback {
  return { id: crypto.randomUUID(), message: 'Explain this', responseId: null, selection: '', image: '', ...overrides }
}

export async function until(check: () => boolean | Promise<boolean>, timeout = 5000) {
  const end = Date.now() + timeout
  while (!(await check())) {
    if (Date.now() >= end) throw new Error('Condition did not complete')
    await Bun.sleep(10)
  }
}
