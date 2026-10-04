import { strict as assert } from 'node:assert'
import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAgent } from '../src/agent'
import { artifactPath } from '../src/server'
import type { State } from '../src/schema'

const workspace = await mkdtemp(join(tmpdir(), 'taffy-live-'))
const stateDir = join(workspace, '.taffy')
await mkdir(stateDir)
await copyFile(join(import.meta.dir, '../examples/morph.py'), join(workspace, 'morph.py'))
const state: State = { threadId: null, entries: [] }
const threads: string[] = []
const options = { workspace, stateDir, codex: 'codex', timeoutMs: 300_000,
  onThread: async (id: string) => { threads.push(id); console.log('Thread:', id) } }
console.log('Scratch project:', workspace)
const diagram = await runAgent(state, { id: 'diagram', message: 'Read morph.py and show a small diagram of the actual scene sequence; do not modify any source files.', responseId: null, selection: '', image: '' }, options)
assert.equal(diagram.kind, 'diagram')
assert(diagram.nodes.length > 0)
console.log('PASS: real source inspection and structured diagram')
const video = await runAgent(state, { id: 'video', message: 'Use the existing morph.py from our last turn and run manim -ql --format=mp4 to render Morph into the artifact directory; do not change the Python source; reply with the real video artifact.', responseId: 'diagram', selection: '', image: '' }, options)
assert.equal(video.kind, 'video')
assert.equal(threads.length, 2)
assert.equal(threads[0], threads[1])
const path = await artifactPath(join(stateDir, 'artifacts'), video.video)
assert(Bun.file(path).size > 1000)
await writeFile(join(stateDir, 'state.json'), JSON.stringify({ threadId: state.threadId, entries: [{ id: 'diagram', request: 'Show the scene sequence', visual: diagram }, { id: 'video', request: 'Render the scene', visual: video }] }))
console.log('PASS: resumed same thread and rendered real Manim MP4:', path)
