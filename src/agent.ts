import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { feedbackSchema, visualSchema, type Feedback, type State, type Visual } from './schema'

export type AgentOptions = {
  workspace: string, stateDir: string, codex: string, timeoutMs: number,
  onThread: (id: string) => Promise<void>,
  signal?: AbortSignal,
}

export function prompt(feedback: Feedback, artifactDir: string): string {
  return `You are Taffy, one ongoing agent conversation for this project.
The main response is visual, not a wall of text. Use connected diagrams and small source excerpts, or a short explanatory video when motion clarifies the idea.
Use your existing tools to inspect real project files and verify claims. Only change project code when the user's request authorizes it. A drawing or selection alone is not approval.
For videos use Manim Community Edition, already installed as "manim". Write a Python Scene and render a real MP4 with "manim -ql --format=mp4 --media_dir <artifact directory> <scene.py> <SceneName>". Use Text for labels so LaTeX is optional. Never invent a rendered video or its path. Store all media under: ${artifactDir}
Reply with the required JSON object. Keep the title and summary short; put essential risks and full evidence in detail. Use kind=diagram with 1-12 nodes and meaningful labeled edges, or kind=video with a path relative to the artifact directory. For empty fields use an empty string/array. Node x/y are canvas positions; space cards at least 360 horizontally or 300 vertically. Use code/file only for actual small source excerpts. No fabricated call relationships or test results.
Current response: ${feedback.responseId ?? 'first message'}
Selection: ${feedback.selection || 'none'}
${feedback.image ? 'An image of the current diagram and your drawn feedback is attached.' : ''}
User: ${feedback.message}`
}

export async function runAgent(state: State, feedback: Feedback, options: AgentOptions): Promise<Visual> {
  feedbackSchema.parse(feedback)
  await mkdir(options.stateDir, { recursive: true, mode: 0o700 })
  const artifactDir = join(options.stateDir, 'artifacts')
  await mkdir(artifactDir, { recursive: true, mode: 0o700 })
  const schemaFile = join(options.stateDir, 'response.schema.json')
  await writeFile(schemaFile, JSON.stringify(z.toJSONSchema(visualSchema)), { mode: 0o600 })
  const args = ['--add-dir', options.stateDir, 'exec', ...(state.threadId ? ['resume', state.threadId] : []),
    '--json', '--skip-git-repo-check', '--output-schema', schemaFile]
  if (feedback.image) {
    const image = Buffer.from(feedback.image, 'base64')
    if (!image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error('Drawing attachment must be a PNG image')
    }
    const imageFile = join(options.stateDir, 'feedback.png')
    await writeFile(imageFile, image, { mode: 0o600 })
    args.push('--image', imageFile)
  }
  args.push('-')
  const process = Bun.spawn([options.codex, ...args], {
    cwd: options.workspace, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  })
  let timedOut = false
  const kill = () => { if (process.exitCode === null) process.kill() }
  const timer = setTimeout(() => { timedOut = true; kill() }, options.timeoutMs)
  options.signal?.addEventListener('abort', kill, { once: true })
  if (options.signal?.aborted) kill()
  process.stdin.write(prompt(feedback, artifactDir))
  process.stdin.end()
  let lastVisual: Visual | null = null
  let buffer = ''
  let receivedBytes = 0
  let agentError = ''
  let diagnostic = ''
  const stderr = (async () => {
    const decoder = new TextDecoder()
    let tail = ''
    for await (const chunk of process.stderr) tail = (tail + decoder.decode(chunk, { stream: true })).slice(-4000)
    return (tail + decoder.decode()).trim()
  })()
  try {
    const consume = async (line: string) => {
      let event: { type?: string, thread_id?: string, error?: { message?: string }, message?: string, item?: { type?: string, text?: string, message?: string } }
      try { event = JSON.parse(line) } catch { return }
      if (event.type === 'thread.started' && event.thread_id) {
        state.threadId = event.thread_id
        await options.onThread(event.thread_id)
      }
      if (event.type === 'turn.failed') {
        agentError = event.error?.message ?? event.message ?? 'Codex request failed'
      }
      if (event.type === 'error') diagnostic = event.message ?? event.error?.message ?? 'Codex request failed'
      if (event.item?.type === 'error') diagnostic = event.item.message ?? 'Codex request failed'
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        let candidate: unknown
        try { candidate = JSON.parse(event.item.text ?? '') } catch { return }
        const parsed = visualSchema.safeParse(candidate)
        if (parsed.success) lastVisual = parsed.data
      }
    }
    const decoder = new TextDecoder()
    for await (const chunk of process.stdout) {
      receivedBytes += chunk.byteLength
      if (receivedBytes > 8_000_000) throw new Error('Agent output exceeded 8 MB; response was not applied')
      buffer += decoder.decode(chunk, { stream: true })
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        await consume(buffer.slice(0, newline))
        buffer = buffer.slice(newline + 1)
      }
    }
    buffer += decoder.decode()
    if (buffer.trim()) await consume(buffer)
    const exitCode = await process.exited
    const error = (await stderr).trim()
    if (timedOut) throw new Error('Codex timed out; the existing view was kept')
    if (options.signal?.aborted) throw new Error('Codex was stopped; the existing view was kept')
    if (agentError) throw new Error(agentError.slice(-2000))
    if (exitCode !== 0) throw new Error(diagnostic.slice(-2000) || error.slice(-2000) || `Codex exited with status ${exitCode}`)
    if (!lastVisual) throw new Error(diagnostic.slice(-2000) || 'Codex did not return a valid visual response; the existing view was kept')
    return lastVisual
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', kill)
    if (process.exitCode === null) process.kill()
    await stderr
  }
}
