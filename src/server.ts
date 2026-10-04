import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { hostname, networkInterfaces } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { runAgent, type AgentOptions } from './agent'
import { feedbackSchema, stateSchema, type Feedback, type State, type Visual } from './schema'

export type Assets = Record<string, { path: string, type: string }>
export type Options = {
  workspace: string, stateDir: string, host: string, port: number, codex: string,
  timeoutMs: number, assets: Assets,
}
export type Status = State & {
  workspace: string, busy: string | null, error: { id: string, message: string } | null,
}

const responseHeaders = {
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
}

function matches(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function artifactPath(root: string, name: string) {
  if (isAbsolute(name) || !name.endsWith('.mp4')) throw new Error('Invalid video path')
  const base = await realpath(root)
  const path = await realpath(resolve(base, name))
  const rel = relative(base, path)
  if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Invalid video path')
  if (!(await stat(path)).isFile()) throw new Error('Invalid video path')
  return path
}

export function videoResponse(path: string, range: string | null, head = false) {
  const file = Bun.file(path)
  const size = file.size
  const headers = new Headers({ ...responseHeaders, 'content-type': 'video/mp4', 'accept-ranges': 'bytes' })
  if (!range) {
    headers.set('content-length', String(size))
    return new Response(head ? null : file, { headers })
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  let start = 0, end = size - 1
  if (match && (match[1] || match[2])) {
    if (!match[1]) start = Math.max(0, size - Number(match[2]))
    else {
      start = Number(match[1])
      if (match[2]) end = Math.min(end, Number(match[2]))
    }
  } else start = size
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    headers.set('content-range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('content-range', `bytes ${start}-${end}/${size}`)
  headers.set('content-length', String(end - start + 1))
  return new Response(head ? null : file.slice(start, end + 1), { status: 206, headers })
}

export async function startServer(options: Options) {
  await mkdir(join(options.stateDir, 'artifacts'), { recursive: true, mode: 0o700 })
  const stateFile = join(options.stateDir, 'state.json')
  let state: State = { threadId: null, entries: [] }
  try { state = stateSchema.parse(JSON.parse(await readFile(stateFile, 'utf8'))) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const save = async () => {
    const temp = stateFile + '.tmp'
    await writeFile(temp, JSON.stringify(state), { mode: 0o600 })
    await rename(temp, stateFile)
  }
  const token = randomBytes(32).toString('hex')
  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', hostname(), options.host])
  const addresses = Object.values(networkInterfaces()).flatMap(values => values ?? [])
  addresses.forEach(address => allowedHosts.add(address.address))
  let busy: string | null = null
  let failure: Status['error'] = null
  let job: Promise<void> | null = null
  const controller = new AbortController()
  const status = (): Status => ({ ...state, workspace: options.workspace, busy, error: failure })
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers: responseHeaders })
  const server = Bun.serve({
    hostname: options.host, port: options.port, maxRequestBodySize: 4_100_000,
    async fetch(request): Promise<Response> {
      const url = new URL(request.url)
      if (!allowedHosts.has(url.hostname)) return json({ error: 'Invalid host' }, 403)
      const cookieName = `taffy_${server.port}`
      const cookie = (request.headers.get('cookie') ?? '').split(';').map(item => item.trim())
        .find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1) ?? ''
      const authenticated = matches(cookie, token)
      if (request.method === 'POST') {
        if (request.headers.get('origin') !== url.origin) return json({ error: 'Invalid origin' }, 403)
        if (url.pathname === '/api/session') {
          let value: unknown
          try { value = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
          if (!value || typeof value !== 'object' || !('token' in value) || typeof value.token !== 'string' || !matches(value.token, token)) {
            return json({ error: 'Invalid connection link' }, 401)
          }
          return new Response(null, { status: 204, headers: {
            ...responseHeaders, 'set-cookie': `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/${url.protocol === 'https:' ? '; Secure' : ''}`,
          } })
        }
        if (!authenticated) return json({ error: 'Open the private link printed by Taffy' }, 401)
        if (url.pathname !== '/api/message') return json({ error: 'Not found' }, 404)
        let feedback: Feedback
        try { feedback = feedbackSchema.parse(await request.json()) }
        catch { return json({ error: 'Invalid message or drawing attachment' }, 400) }
        if (state.entries.some(entry => entry.id === feedback.id) || busy === feedback.id) return json({ accepted: true }, 202)
        if (busy) return json({ error: 'The agent is still working; your draft was kept' }, 409)
        if (feedback.responseId && !state.entries.some(entry => entry.id === feedback.responseId)) {
          return json({ error: 'That response is no longer available' }, 409)
        }
        busy = feedback.id
        failure = null
        job = (async () => {
          try {
            const agentOptions: AgentOptions = { ...options, onThread: async id => { state.threadId = id; await save() }, signal: controller.signal }
            const visual: Visual = await runAgent(state, feedback, agentOptions)
            if (visual.kind === 'video') await artifactPath(join(options.stateDir, 'artifacts'), visual.video)
            const entry = { id: feedback.id, request: feedback.message, visual }
            state.entries.push(entry)
            try { await save() } catch (error) { state.entries.pop(); throw error }
          } catch (error) {
            failure = { id: feedback.id, message: error instanceof Error ? error.message : String(error) }
          } finally { busy = null }
        })()
        return json({ accepted: true }, 202)
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
        if (!authenticated) return json({ error: 'Open the private link printed by Taffy' }, 401)
        if (url.pathname === '/api/state') return json(status())
        if (url.pathname.startsWith('/media/')) {
          try {
            const path = await artifactPath(join(options.stateDir, 'artifacts'), decodeURIComponent(url.pathname.slice(7)))
            return videoResponse(path, request.headers.get('range'), request.method === 'HEAD')
          } catch { return json({ error: 'Video not found' }, 404) }
        }
      }
      const asset = options.assets[url.pathname]
      if (asset) return new Response(request.method === 'HEAD' ? null : Bun.file(asset.path), { headers: { ...responseHeaders, 'content-type': asset.type } })
      return json({ error: 'Not found' }, 404)
    },
    error(error) { return json({ error: error.message }, 500) },
  })
  return {
    server, token, status,
    links: ['127.0.0.1', ...addresses.filter(address => !address.internal && address.family === 'IPv4').map(address => address.address)]
      .filter(address => options.host === '0.0.0.0' || options.host === '::' || address === options.host || (options.host === 'localhost' && address === '127.0.0.1'))
      .map(address => `http://${address}:${server.port}/#${token}`),
    async stop() { controller.abort(); await server.stop(true); await job },
  }
}
