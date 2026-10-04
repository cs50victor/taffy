import { createHash } from 'node:crypto'
import { mkdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { startServer, type Assets } from './server'
import { version } from '../package.json'

export async function main(assets: Assets) {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2), allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' },
      host: { type: 'string', default: '0.0.0.0' }, port: { type: 'string', default: '4177' },
      'state-dir': { type: 'string' }, codex: { type: 'string', default: 'codex' },
    },
  })
  if (values.help) {
    console.log(`Taffy ${version}\nUsage: taffy [project-directory] [options]\n\nOne conversation, visual replies, one web port.\n\n  --host ADDRESS   Bind address (default: 0.0.0.0)\n  --port NUMBER    Web port (default: 4177; 0 selects a free port)\n  --state-dir DIR  Conversation and Manim artifacts\n  --codex PATH     Existing Codex executable\n  --version        Print version\n  -h, --help       Show help`)
    return
  }
  if (values.version) { console.log(version); return }
  if (positionals.length > 1) throw new Error('Expected at most one project directory')
  const port = Number(values.port)
  if (!/^\d+$/.test(values.port!) || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be 0-65535')
  const workspace = await realpath(resolve(positionals[0] ?? '.'))
  if (!(await stat(workspace)).isDirectory()) throw new Error('Project must be a directory')
  const hash = createHash('sha256').update(workspace).digest('hex').slice(0, 16)
  const stateDir = resolve(values['state-dir'] ?? join(homedir(), '.local', 'state', 'taffy', hash))
  await mkdir(stateDir, { recursive: true, mode: 0o700 })
  const lock = join(stateDir, 'server.lock')
  try { await mkdir(lock, { mode: 0o700 }) }
  catch { throw new Error(`This conversation is already open or stopped unexpectedly; check ${lock} before removing it`) }
  try {
    await writeFile(join(lock, 'pid'), String(process.pid), { mode: 0o600 })
    const app = await startServer({ workspace, stateDir, host: values.host!, port, codex: values.codex!, timeoutMs: 10 * 60_000, assets })
    console.log(`Taffy ${version}\nProject: ${workspace}\nOpen a private connection link:\n${app.links.join('\n')}\nKeep these links private. Press Ctrl-C to stop.`)
    let stopping = false
    const stop = async () => {
      if (stopping) return
      stopping = true
      await app.stop()
      await rm(lock, { recursive: true, force: true })
      process.exit(0)
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  } catch (error) { await rm(lock, { recursive: true, force: true }); throw error }
}

if (import.meta.main) {
  const { Glob } = Bun
  const assets: Assets = {}
  const root = resolve(import.meta.dir, '../dist/web')
  for await (const file of new Glob('**/*').scan({ cwd: root, onlyFiles: true })) {
    const path = join(root, file)
    assets[file === 'index.html' ? '/' : '/' + file] = { path, type: Bun.file(path).type }
  }
  main(assets).catch(error => { console.error(error.message); process.exitCode = 1 })
}
