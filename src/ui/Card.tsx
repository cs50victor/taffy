import { createContext, useContext, useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { BaseBoxShapeUtil, HTMLContainer, T, useEditor, useValue, type TLBaseShape } from 'tldraw'

export const SelectionContext = createContext<(value: string) => void>(() => {})
export type Card = TLBaseShape<'card', { w: number, h: number, title: string, text: string, code: string, file: string }>

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap { card: Card['props'] }
}

function CardView({ shape }: { shape: Card }) {
  const editor = useEditor()
  const select = useContext(SelectionContext)
  const selecting = useValue('selecting', () => editor.isIn('select'), [editor])
  const container = useRef<HTMLDivElement>(null)
  const { title, text, code, file, w, h } = shape.props
  useEffect(() => {
    if (!container.current || !code) return
    const view = new EditorView({ parent: container.current, doc: code, extensions: [
      EditorState.readOnly.of(true), drawSelection(), EditorView.lineWrapping,
      ...(/\.[cm]?[jt]sx?$/.test(file) ? [javascript({ typescript: true }), syntaxHighlighting(defaultHighlightStyle)] : []),
      EditorView.contentAttributes.of({ 'aria-label': `${file || title} code`, spellcheck: 'false' }),
      EditorView.updateListener.of(update => {
        const { from, to, empty } = update.state.selection.main
        if (update.selectionSet && !empty) select(`${file || title}\nCharacters ${from}-${to}:\n${code.slice(from, to)}`)
      }),
      EditorView.theme({
        '&': { fontSize: '12px', background: 'transparent' },
        '.cm-content': { fontFamily: 'ui-monospace, monospace', padding: '8px' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { background: '#cfe9d0 !important' },
      }),
    ] })
    return () => view.destroy()
  }, [code, file, title, select])
  return <HTMLContainer className="card" style={{ width: w, height: h }}>
    <strong>{title}</strong>
    {text && <p>{text}</p>}
    {file && <small>{file}</small>}
    <div ref={container} className="code" style={{ pointerEvents: selecting ? 'auto' : 'none' }}
      onPointerDown={event => { if (selecting) event.stopPropagation() }}
      onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()} />
    <button style={{ pointerEvents: selecting ? 'auto' : 'none' }} onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); select(`${title}\n${text}\n${file}\n${code}`.trim()) }}>Ask about this</button>
  </HTMLContainer>
}

export class CardUtil extends BaseBoxShapeUtil<Card> {
  static override type = 'card' as const
  static override props = { w: T.number, h: T.number, title: T.string, text: T.string, code: T.string, file: T.string }
  override getDefaultProps(): Card['props'] { return { w: 320, h: 250, title: '', text: '', code: '', file: '' } }
  override canResize() { return false }
  override canEdit() { return false }
  override component(shape: Card) { return <CardView shape={shape} /> }
  override getIndicatorPath(shape: Card) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 16)
    return path
  }
  override toSvg(shape: Card) {
    const { w, h, title, text, code, file } = shape.props
    const lines = [title, text, file, ...code.split('\n')].flatMap(line => line.match(/.{1,38}/g) ?? ['']).slice(0, 14)
    return <g>
      <rect width={w} height={h} rx={16} fill="#ffffff" stroke="#a0a0a0" />
      {lines.map((line, index) => <text key={index} x={14} y={25 + index * 16} fontSize={12}
        fontFamily="monospace" fill="#202020">{line}</text>)}
    </g>
  }
}
