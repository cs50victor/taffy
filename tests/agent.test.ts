import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runAgent } from '../src/agent'
import { example, visualSchema, type State } from '../src/schema'
import { feedback, fixture } from './helpers'

test('should preserve one thread and actual selected evidence across turns', async () => {
  const context = await fixture({ fragment: true, visual: { ...example, title: '中文 explanation' } })
  const state: State = { threadId: null, entries: [] }
  const threads: string[] = []
  const options = { ...context, onThread: async (id: string) => { threads.push(id) } }
  try {
    const first = await runAgent(state, feedback({ selection: 'source.ts lines 2-4: return value' }), options)
    await runAgent(state, feedback({ message: 'Continue that explanation' }), options)
    const calls = await context.calls()
    expect({ title: first.title, threads, resume: calls[1].args.includes('resume'), evidence: calls[0].input.includes('source.ts lines 2-4: return value') })
      .toEqual({ title: '中文 explanation', threads: ['fixture-thread', 'fixture-thread'], resume: true, evidence: true })
  } finally { await context.cleanup() }
})

test('should propagate provider errors while retaining the recorded thread', async () => {
  const context = await fixture({ error: 'Provider returned 429: quota reached', stderr: 'x'.repeat(20000) })
  const state: State = { threadId: null, entries: [] }
  try {
    await expect(runAgent(state, feedback(), { ...context, onThread: async () => {} })).rejects.toThrow('Provider returned 429: quota reached')
    expect(state.threadId).toBe('fixture-thread')
  } finally { await context.cleanup() }
})

test('should reject invalid responses, oversized output, and hung agents', async () => {
  const context = await fixture({ visual: { ...example, nodes: [] } })
  const options = { ...context, onThread: async () => {} }
  try {
    await expect(runAgent({ threadId: null, entries: [] }, feedback(), options)).rejects.toThrow('valid visual response')
    await context.configure({ overflow: true })
    await expect(runAgent({ threadId: null, entries: [] }, feedback(), options)).rejects.toThrow('exceeded 8 MB')
    await context.configure({ delay: 1000 })
    await expect(runAgent({ threadId: null, entries: [] }, feedback(), { ...options, timeoutMs: 100 })).rejects.toThrow('timed out')
  } finally { await context.cleanup() }
})

test('should pass PNG bytes to Codex and reject other attachment types', async () => {
  const context = await fixture()
  const image = await readFile(join(import.meta.dir, 'fixtures/drawing.png'))
  const options = { ...context, onThread: async () => {} }
  try {
    await runAgent({ threadId: null, entries: [] }, feedback({ image: image.toString('base64') }), options)
    expect(await readFile(join(context.workspace, 'received-image.png'))).toEqual(image)
    await expect(runAgent({ threadId: null, entries: [] }, feedback({ image: Buffer.from('not png').toString('base64') }), options)).rejects.toThrow('PNG')
  } finally { await context.cleanup() }
})

test('should reject fabricated graph relationships and repeated node IDs', () => {
  expect([
    visualSchema.safeParse({ ...example, edges: [{ from: 'input', to: 'missing', label: 'calls' }] }).success,
    visualSchema.safeParse({ ...example, nodes: [...example.nodes, example.nodes[0]] }).success,
    visualSchema.safeParse({ ...example, summary: 'x'.repeat(321) }).success,
  ]).toEqual([false, false, false])
})

test('should accept a completed response after a nonfatal Codex configuration warning', async () => {
  const context = await fixture({ warning: 'Codex is ignoring an unrecognized configuration setting' })
  try {
    expect(await runAgent({ threadId: null, entries: [] }, feedback(), { ...context, onThread: async () => {} })).toEqual(example)
  } finally { await context.cleanup() }
})
