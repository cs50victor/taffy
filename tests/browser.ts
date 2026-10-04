import { strict as assert } from 'node:assert'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import { example } from '../src/schema'
import { fixture, until } from './helpers'

const context = await fixture({ delay: 1500 })
const visual = { ...example, title: 'A small source example', nodes: [{ ...example.nodes[0], title: 'Input', file: 'input.ts', code: 'export const answer = 42', text: 'Fixture source excerpt', x: 0, y: 0 }], edges: [] }
await mkdir(context.stateDir)
await writeFile(join(context.stateDir, 'state.json'), JSON.stringify({ threadId: null, entries: [{ id: 'initial', request: 'Explain this source', visual }] }))
await copyFile(join(import.meta.dir, 'fixtures/clip.mp4'), join(context.workspace, 'clip.mp4'))
const cli = Bun.spawn([resolve(import.meta.dir, '../dist/taffy'), context.workspace, '--host', '127.0.0.1', '--port', '0', '--state-dir', context.stateDir, '--codex', context.codex], { cwd: context.root, stdout: 'pipe', stderr: 'pipe' })
let output = ''
const readOutput = (async () => { for await (const chunk of cli.stdout) output += new TextDecoder().decode(chunk) })()
const errors = new Response(cli.stderr).text()
const browser = await chromium.launch()
const pageErrors: string[] = []
let currentPage: Awaited<ReturnType<typeof browser.newPage>> | null = null
try {
  await until(() => !!output.match(/http:\/\/127\.0\.0\.1:\d+\/#\w+/))
  const link = output.match(/http:\/\/127\.0\.0\.1:\d+\/#\w+/)![0]
  const page = await browser.newPage({ viewport: { width: 1360, height: 960 } })
  currentPage = page
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(link)
  await page.getByRole('button', { name: 'Send', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Ask about this', exact: true }).waitFor()
  assert.equal(new URL(page.url()).hash, '')
  console.log('PASS: standalone launch and private-link authentication')
  await page.locator('.cm-content').click()
  await page.locator('.cm-content').press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a')
  await page.getByRole('button', { name: 'Clear selection' }).waitFor()
  console.log('PASS: actual code selection')
  const message = page.getByRole('textbox', { name: 'Message', exact: true })
  await message.fill('Explain my selected code')
  await page.getByRole('button', { name: 'Draw', exact: true }).click()
  const bounds = await page.locator('.canvas').boundingBox()
  assert(bounds)
  await page.mouse.move(bounds.x + 80, bounds.y + 120)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 160, bounds.y + 170, { steps: 12 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await page.getByRole('button', { name: 'Working...', exact: true }).waitFor()
  await message.fill('Draft the next question')
  await message.focus()
  await page.getByRole('heading', { name: example.title, exact: true }).waitFor()
  assert.equal(await message.inputValue(), 'Draft the next question')
  assert.equal(await message.evaluate(element => element === document.activeElement), true)
  const call = (await context.calls())[0]
  assert(call.input.includes('export const answer = 42'))
  assert(call.args.includes('--image'))
  const png = await readFile(join(context.workspace, 'received-image.png'))
  assert(png.length > 500)
  console.log('PASS: PNG export and draft/focus preservation')
  await page.getByRole('button', { name: 'Explain this source', exact: false }).click()
  await page.getByRole('heading', { name: visual.title, exact: true }).waitFor()
  await page.locator('.tl-shape[data-shape-type="draw"]').waitFor()
  await mkdir(resolve(import.meta.dir, '../test-results'), { recursive: true })
  await page.screenshot({ path: resolve(import.meta.dir, '../test-results/diagram.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.waitForFunction(() => {
    const card = document.querySelector('.card')?.getBoundingClientRect()
    const canvas = document.querySelector('.canvas')?.getBoundingClientRect()
    return card && canvas && card.left >= canvas.left && card.right <= canvas.right && card.top >= canvas.top && card.bottom <= canvas.bottom
  })
  await page.screenshot({ path: resolve(import.meta.dir, '../test-results/mobile-diagram.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.setViewportSize({ width: 1360, height: 960 })
  await page.reload()
  await page.getByRole('textbox', { name: 'Message', exact: true }).waitFor()
  assert.equal(await message.inputValue(), 'Draft the next question')
  await context.configure({ error: 'Provider returned 429: quota reached' })
  await message.fill('Keep this failed message')
  await until(async () => await page.getByRole('button', { name: 'Send', exact: true }).isEnabled())
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Provider returned 429' }).waitFor()
  assert.equal(await message.inputValue(), 'Keep this failed message')
  await context.configure({ video: true, visual: { title: 'A rendered clip', summary: 'Motion replaces a paragraph.', detail: '', kind: 'video', nodes: [], edges: [], video: 'clip.mp4' } })
  await message.fill('Show a video')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await page.getByRole('heading', { name: 'A rendered clip', exact: true }).waitFor()
  await page.waitForFunction(() => { const video = document.querySelector('video'); return video && Number.isFinite(video.duration) && video.duration > 0 })
  await page.locator('video').evaluate(async video => { await (video as HTMLVideoElement).play(); (video as HTMLVideoElement).currentTime = .5 })
  await page.waitForFunction(() => (document.querySelector('video')?.currentTime ?? 0) >= .5)
  await mkdir(resolve(import.meta.dir, '../test-results'), { recursive: true })
  await page.screenshot({ path: resolve(import.meta.dir, '../test-results/desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(import.meta.dir, '../test-results/mobile.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const anonymous = await browser.newPage()
  await anonymous.goto(link.split('#')[0])
  await anonymous.getByRole('alert').filter({ hasText: 'private link' }).waitFor()
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'))
  console.log('PASS: standalone assets, private link, code selection, PNG drawing export, preserved draft/focus, failure, video playback/seek, mobile layout')
} catch (error) {
  await mkdir(resolve(import.meta.dir, '../test-results'), { recursive: true })
  await currentPage?.screenshot({ path: resolve(import.meta.dir, '../test-results/failure.png') })
  throw error
} finally {
  await browser.close()
  cli.kill('SIGTERM')
  await cli.exited
  await readOutput
  const stderr = await errors
  if (stderr) console.error(stderr)
  await context.cleanup()
}
