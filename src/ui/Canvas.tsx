import { useCallback, useRef } from 'react'
import { getAssetUrls } from '@tldraw/assets/selfHosted'
import { Tldraw, createShapeId, toRichText, useEditor, useValue, type Editor, type TLArrowShape, type TLComponents } from 'tldraw'
import { CardUtil, SelectionContext, type Card } from './Card'
import type { Visual } from '../schema'

const assets = getAssetUrls({ baseUrl: '/tldraw-assets' })
const shapeUtils = [CardUtil]

function Toolbar() {
  const editor = useEditor()
  const tool = useValue('tool', () => editor.getCurrentToolId(), [editor])
  return <div className="tools" aria-label="Canvas tools">
    {['select', 'draw', 'highlight', 'eraser'].map(id => <button key={id} aria-pressed={tool === id}
      onClick={() => editor.setCurrentTool(id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    <button onClick={() => editor.undo()}>Undo</button>
    <button onClick={() => editor.zoomToFit({ animation: { duration: 150 } })}>Fit</button>
  </div>
}

const components: TLComponents = {
  Toolbar, StylePanel: null, MainMenu: null, PageMenu: null, NavigationPanel: null,
  ActionsMenu: null, HelpMenu: null, QuickActions: null, SharePanel: null, DebugPanel: null,
}

export function Canvas({ visual, storageKey, onEditor, onSelection }: {
  visual: Visual, storageKey: string, onEditor: (editor: Editor) => void, onSelection: (value: string) => void,
}) {
  const container = useRef<HTMLDivElement>(null)
  const mount = useCallback((editor: Editor) => {
    onEditor(editor)
    if (editor.getCurrentPageShapes().length === 0) {
      const ids = new Map(visual.nodes.map(node => [node.id, createShapeId()]))
      editor.createShapes<Card>(visual.nodes.map(node => ({
        id: ids.get(node.id)!, type: 'card', x: node.x, y: node.y,
        props: { w: 320, h: node.code ? 310 : 180, title: node.title, text: node.text, code: node.code, file: node.file },
      })))
      for (const edge of visual.edges) {
        const id = createShapeId()
        editor.createShapes<TLArrowShape>([{ id, type: 'arrow', props: {
          start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, richText: toRichText(edge.label),
          size: 's', color: 'grey', font: 'sans', dash: 'solid',
        }, meta: { relationship: `${edge.from} -> ${edge.to}: ${edge.label}` } }])
        editor.createBindings([
          { type: 'arrow', fromId: id, toId: ids.get(edge.from)!, props: { terminal: 'start', normalizedAnchor: { x: 1, y: .5 }, isPrecise: true, isExact: false, snap: 'none' } },
          { type: 'arrow', fromId: id, toId: ids.get(edge.to)!, props: { terminal: 'end', normalizedAnchor: { x: 0, y: .5 }, isPrecise: true, isExact: false, snap: 'none' } },
        ])
      }
      editor.clearHistory()
      requestAnimationFrame(() => editor.zoomToFit())
    }
    const unlisten = editor.store.listen(() => {
      const shape = editor.getSelectedShapes()[0]
      if (shape?.type === 'arrow') onSelection(String(shape.meta.relationship ?? 'Drawn relationship'))
    })
    let width = container.current?.clientWidth ?? 0
    let frame = 0
    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width ?? width
      if (Math.abs(nextWidth - width) > 40) {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          if (container.current) editor.updateViewportScreenBounds(container.current)
          editor.zoomToFit()
        })
      }
      width = nextWidth
    })
    if (container.current) observer.observe(container.current)
    return () => { unlisten(); observer.disconnect(); cancelAnimationFrame(frame) }
  }, [visual, onEditor, onSelection])
  return <SelectionContext.Provider value={onSelection}>
    <div ref={container} className="canvas" aria-label="Visual response">
      <Tldraw persistenceKey={storageKey} assetUrls={assets} shapeUtils={shapeUtils} components={components} onMount={mount} />
    </div>
  </SelectionContext.Provider>
}
