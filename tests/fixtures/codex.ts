#!/usr/bin/env bun
import { appendFile, copyFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const args = process.argv.slice(2)
const input = await Bun.stdin.text()
const config = JSON.parse(await readFile('fixture.json', 'utf8'))
await appendFile('calls.jsonl', JSON.stringify({ args, input }) + '\n')
if (config.delay) await Bun.sleep(config.delay)
if (config.stderr) process.stderr.write(config.stderr)
if (config.warning) console.log(JSON.stringify({ type: 'error', message: config.warning }))
if (config.overflow) process.stdout.write('x'.repeat(8_000_001))
const resume = args.indexOf('resume')
console.log(JSON.stringify({ type: 'thread.started', thread_id: resume >= 0 ? args[resume + 1] : 'fixture-thread' }))
if (config.error) {
  console.log(JSON.stringify({ type: 'turn.failed', error: { message: config.error } }))
  process.exit(1)
}
if (config.video) {
  const directory = join(args[args.indexOf('--add-dir') + 1], 'artifacts')
  await copyFile('clip.mp4', join(directory, 'clip.mp4'))
}
const visual = config.visual
if (visual) {
  const line = JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(visual) } })
  if (config.fragment) {
    const bytes = Buffer.from(line + '\n')
    for (let i = 0; i < bytes.length; i += 13) process.stdout.write(bytes.subarray(i, i + 13))
  } else console.log(line)
}
if (args.includes('--image')) await writeFile('received-image.png', await readFile(args[args.indexOf('--image') + 1]))
