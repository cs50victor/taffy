import { z } from 'zod'

const node = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  text: z.string().max(320),
  code: z.string().max(1600),
  file: z.string().max(160),
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(1500),
}).strict()

export const visualSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(320),
  detail: z.string().max(8000),
  kind: z.enum(['diagram', 'video']),
  nodes: z.array(node).max(12),
  edges: z.array(z.object({
    from: z.string().max(40), to: z.string().max(40), label: z.string().max(80),
  }).strict()).max(18),
  video: z.string().max(400),
}).strict().superRefine((value, ctx) => {
  const ids = new Set(value.nodes.map(node => node.id))
  if (ids.size !== value.nodes.length) ctx.addIssue({ code: 'custom', message: 'Node IDs must be unique' })
  if (value.edges.some(edge => !ids.has(edge.from) || !ids.has(edge.to))) {
    ctx.addIssue({ code: 'custom', message: 'Edges must reference existing nodes' })
  }
  if (value.kind === 'diagram' && value.nodes.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'A diagram needs at least one node' })
  }
  if (value.kind === 'video' && !value.video.endsWith('.mp4')) {
    ctx.addIssue({ code: 'custom', message: 'A video needs a local MP4 artifact' })
  }
})

export const feedbackSchema = z.object({
  id: z.string().min(1).max(80),
  message: z.string().trim().min(1).max(12000),
  responseId: z.string().max(80).nullable(),
  selection: z.string().max(3000),
  image: z.string().max(4_000_000),
}).strict()

export type Visual = z.infer<typeof visualSchema>
export type Feedback = z.infer<typeof feedbackSchema>
export type Entry = { id: string, request: string, visual: Visual }
export type State = { threadId: string | null, entries: Entry[] }

export const stateSchema = z.object({
  threadId: z.string().nullable(),
  entries: z.array(z.object({ id: z.string(), request: z.string(), visual: visualSchema }).strict()),
}).strict()

export const example: Visual = {
  title: 'Point at the idea you want to change.',
  summary: 'Ask a question, draw a connection, or request a short Manim explainer.',
  detail: 'This opening scene is an example. Your first message starts a real Codex conversation in the selected project.',
  kind: 'diagram',
  nodes: [
    { id: 'input', title: 'Your question', text: 'One conversation', code: '', file: '', x: 0, y: 90 },
    { id: 'agent', title: 'Your agent', text: 'Works in your project', code: '', file: '', x: 380, y: 90 },
    { id: 'visual', title: 'A visual response', text: 'Diagram, drawing, or Manim video', code: '', file: '', x: 760, y: 90 },
  ],
  edges: [{ from: 'input', to: 'agent', label: 'ask or point' }, { from: 'agent', to: 'visual', label: 'show the idea' }],
  video: '',
}
