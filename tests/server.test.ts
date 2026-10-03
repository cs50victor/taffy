import { expect, test } from 'bun:test'
import { copyFile, mkdir, readFile, realpath, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { artifactPath, startServer, videoResponse } from '../src/server'
import { feedback, fixture, until } from './helpers'

test('should protect the agent with private links, origin checks, and host checks', async () => {
  const context = await fixture()
  const app = await startServer({ ...context, port: 0, host: '127.0.0.1', assets: {} })
  const base = `http://127.0.0.1:${app.server.port}`
  try {
    const statuses = []
    statuses.push((await fetch(base + '/api/state')).status)
    statuses.push((await fetch(base + '/api/session', { method: 'POST', headers: { origin: 'https://elsewhere.test' }, body: JSON.stringify({ token: app.token }) })).status)
    statuses.push((await fetch(base + '/api/session', { method: 'POST', headers: { origin: base }, body: JSON.stringify({ token: 'bad' }) })).status)
    statuses.push((await fetch(base + '/api/state', { headers: { host: 'elsewhere.test' } })).status)
    const session = await fetch(base + '/api/session', { method: 'POST', headers: { origin: base }, body: JSON.stringify({ token: app.token }) })
    const cookie = session.headers.get('set-cookie')!.split(';')[0]
    statuses.push((await fetch(base + '/api/state', { headers: { cookie } })).status)
    statuses.push((await fetch(base + '/api/message', { method: 'POST', headers: { cookie, origin: 'null' }, body: JSON.stringify(feedback()) })).status)
    statuses.push((await fetch(base + '/api/message', { method: 'POST', headers: { cookie, origin: base }, body: 'x'.repeat(4_200_000) })).status)
    expect(statuses).toEqual([401, 403, 401, 403, 200, 403, 413])
  } finally { await app.stop(); await context.cleanup() }
})

test('should deduplicate accepted requests, preserve failed views, and resume after restart', async () => {
  const context = await fixture({ delay: 100 })
  let app = await startServer({ ...context, port: 0, host: '127.0.0.1', assets: {} })
  const send = async (message: ReturnType<typeof feedback>) => {
    const base = `http://127.0.0.1:${app.server.port}`
    return fetch(base + '/api/message', { method: 'POST', headers: { origin: base, cookie: `taffy_${app.server.port}=${app.token}` }, body: JSON.stringify(message) })
  }
  try {
    const first = feedback()
    expect((await send(first)).status).toBe(202)
    expect((await send(first)).status).toBe(202)
    expect((await send(feedback())).status).toBe(409)
    await until(() => !app.status().busy)
    await context.configure({ error: 'Upstream 503: service overloaded' })
    await send(feedback({ id: 'failure' }))
    await until(() => !app.status().busy)
    expect({ count: app.status().entries.length, error: app.status().error?.message }).toEqual({ count: 1, error: 'Upstream 503: service overloaded' })
    await app.stop()
    app = await startServer({ ...context, port: 0, host: '127.0.0.1', assets: {} })
    await send(first)
    expect((await context.calls()).length).toBe(2)
    const saved = JSON.parse(await readFile(join(context.stateDir, 'state.json'), 'utf8'))
    expect({ thread: saved.threadId, count: saved.entries.length }).toEqual({ thread: 'fixture-thread', count: 1 })
  } finally { await app.stop(); await context.cleanup() }
})

test('should restrict media to artifact files even through symlinks', async () => {
  const context = await fixture()
  const root = join(context.stateDir, 'artifacts')
  await mkdir(root, { recursive: true })
  await writeFile(join(context.root, 'outside.mp4'), 'secret')
  await writeFile(join(root, 'inside.mp4'), 'video')
  await symlink(join(context.root, 'outside.mp4'), join(root, 'escape.mp4'))
  try {
    expect(await artifactPath(root, 'inside.mp4')).toBe(await realpath(join(root, 'inside.mp4')))
    await expect(artifactPath(root, '../../outside.mp4')).rejects.toThrow('Invalid video path')
    await expect(artifactPath(root, 'escape.mp4')).rejects.toThrow('Invalid video path')
  } finally { await context.cleanup() }
})

test('should support video seeking, suffix ranges, and invalid-range responses', async () => {
  const context = await fixture()
  const path = join(context.root, 'range.mp4')
  await writeFile(path, '0123456789')
  try {
    const first = videoResponse(path, 'bytes=2-5')
    const suffix = videoResponse(path, 'bytes=-3')
    const invalid = videoResponse(path, 'bytes=10-20')
    expect([first.status, first.headers.get('content-range'), await first.text(), await suffix.text(), invalid.status, videoResponse(path, null, true).headers.get('content-length')])
      .toEqual([206, 'bytes 2-5/10', '2345', '789', 416, '10'])
  } finally { await context.cleanup() }
})

test('should deliver real MP4 artifacts from a persisted video response', async () => {
  const context = await fixture({ video: true, visual: { title: 'Motion', summary: 'A real clip', detail: '', kind: 'video', nodes: [], edges: [], video: 'clip.mp4' } })
  await copyFile(join(import.meta.dir, 'fixtures/clip.mp4'), join(context.workspace, 'clip.mp4'))
  const app = await startServer({ ...context, port: 0, host: '127.0.0.1', assets: {} })
  const base = `http://127.0.0.1:${app.server.port}`
  const headers = { origin: base, cookie: `taffy_${app.server.port}=${app.token}` }
  try {
    await fetch(base + '/api/message', { method: 'POST', headers, body: JSON.stringify(feedback()) })
    await until(() => !app.status().busy)
    const response = await fetch(base + '/media/clip.mp4', { headers: { ...headers, range: 'bytes=0-31' } })
    expect({ status: response.status, type: response.headers.get('content-type'), length: (await response.arrayBuffer()).byteLength, kind: app.status().entries[0]?.visual.kind })
      .toEqual({ status: 206, type: 'video/mp4', length: 32, kind: 'video' })
  } finally { await app.stop(); await context.cleanup() }
})
