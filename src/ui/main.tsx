import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import './style.css'
import { Canvas } from './Canvas'
import { example, type Feedback } from '../schema'
import type { Status } from '../server'

async function api(path: string, body?: unknown) {
  const response = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  if (response.status === 204) return null
  const value = await response.json()
  if (!response.ok) throw new Error(value.error ?? `Request failed (${response.status})`)
  return value
}

function App() {
  const [state, setState] = useState<Status | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selection, setSelection] = useState<{ text: string, responseId: string | null } | null>(null)
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [sending, setSending] = useState(false)
  const [attach, setAttach] = useState(true)
  const editor = useRef<Editor | null>(null)
  const pending = useRef<{ id: string, text: string } | null>(null)
  const retry = useRef<Feedback | null>(null)
  const loadedWorkspace = useRef<string | null>(null)
  const entry = state?.entries.find(entry => entry.id === active) ?? state?.entries.at(-1)
  const responseId = entry?.id ?? null
  const visual = entry?.visual ?? example
  const mounted = useCallback((value: Editor) => { editor.current = value }, [])
  const selected = useCallback((text: string) => setSelection({ text, responseId }), [responseId])

  useEffect(() => { if (state) sessionStorage.setItem(`taffy-draft-${state.workspace}`, message) }, [message, state?.workspace])
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const next: Status = await api('/api/state')
        if (stopped) return
        if (loadedWorkspace.current !== next.workspace) {
          loadedWorkspace.current = next.workspace
          setMessage(value => value || sessionStorage.getItem(`taffy-draft-${next.workspace}`) || '')
        }
        setState(next)
        setConnectionError('')
        if (pending.current) {
          const sent = pending.current
          if (next.entries.some(entry => entry.id === sent.id)) {
            setMessage(value => value === sent.text ? '' : value)
            setActive(sent.id)
            pending.current = null
            retry.current = null
            setSending(false)
            setError('')
          } else if (!next.busy && next.error?.id === sent.id) {
            pending.current = null
            retry.current = null
            setSending(false)
          }
        }
      } catch (error) { if (!stopped) setConnectionError((error as Error).message) }
      if (!stopped) timer = setTimeout(refresh, 1000)
    }
    const start = async () => {
      try {
        if (location.hash) {
          await api('/api/session', { token: location.hash.slice(1) })
          history.replaceState(null, '', location.pathname)
        }
        await refresh()
      } catch (error) { if (!stopped) setConnectionError((error as Error).message) }
    }
    start()
    return () => { stopped = true; clearTimeout(timer) }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!message.trim() || sending || state?.busy || !state) return
    setSending(true)
    setError('')
    const text = message
    try {
      let image = ''
      const canvas = visual.kind === 'diagram' ? editor.current : null
      if (canvas && attach) {
        const result = await canvas.toImage([...canvas.getCurrentPageShapeIds()], { format: 'png', pixelRatio: 1, background: true })
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result).split(',')[1])
          reader.onerror = () => reject(new Error('Could not attach drawing'))
          reader.readAsDataURL(result.blob)
        })
        if (image.length > 4_000_000) throw new Error('Drawing is too large; remove some marks or send without the attachment')
      }
      const feedback: Feedback = { id: crypto.randomUUID(), message: text, responseId,
        selection: selection ? `From reply ${selection.responseId ?? 'example'}:\n${selection.text}` : '', image }
      const cached = retry.current
      if (cached && cached.message === feedback.message && cached.responseId === feedback.responseId && cached.selection === feedback.selection && cached.image === feedback.image) feedback.id = cached.id
      retry.current = feedback
      pending.current = { id: feedback.id, text }
      await api('/api/message', feedback)
    } catch (error) { pending.current = null; setSending(false); setError((error as Error).message) }
  }

  return <main>
    <div className="conversation">
      {!!state?.entries.length && <nav aria-label="Conversation history">{state.entries.map(item =>
        <button key={item.id} aria-pressed={item.id === responseId} onClick={() => { setActive(item.id); editor.current = null }}>
          <span>{item.request}</span><strong>{item.visual.title}</strong>
        </button>)}</nav>}
      <article className="response">
        <div className="response-copy"><small>{entry ? 'Taffy' : 'Taffy · example'}</small><h1>{visual.title}</h1><p>{visual.summary}</p></div>
        {visual.kind === 'video'
          ? <video key={visual.video} controls playsInline preload="metadata" aria-label={visual.title}
            src={'/media/' + visual.video.split('/').map(encodeURIComponent).join('/')} />
          : <Canvas key={responseId ?? 'example'} visual={visual} storageKey={`taffy-${state?.workspace ?? 'welcome'}-${responseId ?? 'example'}`}
            onEditor={mounted} onSelection={selected} />}
        {visual.detail && <details><summary>Evidence and details</summary><p>{visual.detail}</p></details>}
      </article>
    </div>
    <form className="composer" onSubmit={submit}>
      {selection && <div className="attachment"><span>{selection.text.slice(0, 130)}</span>
        <button type="button" onClick={() => setSelection(null)}>Clear selection</button></div>}
      {(error || connectionError || state?.error?.message) && <p className="error" role="alert">{error || connectionError || state?.error?.message}</p>}
      <div className="input-row"><textarea aria-label="Message" placeholder="Ask, point, or request a video..." value={message}
        onChange={event => setMessage(event.target.value)} rows={2} />
        <button className="send" disabled={!state || !message.trim() || sending || !!state.busy}>{sending || state?.busy ? 'Working...' : 'Send'}</button></div>
      <div className="composer-options"><label><input type="checkbox" checked={attach} onChange={event => setAttach(event.target.checked)} />Attach canvas</label>
        <span>Includes your drawn marks</span></div>
    </form>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
