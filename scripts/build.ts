import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { version } from '../package.json'

const root = resolve(import.meta.dir, '..')
const web = join(root, 'dist/web')
await rm(web, { recursive: true, force: true })
await mkdir(web, { recursive: true })
const frontend = await Bun.build({ entrypoints: [join(root, 'src/ui/index.html')], target: 'browser', outdir: web,
  minify: true, define: { 'process.env.NODE_ENV': JSON.stringify('production') } })
if (!frontend.success) throw new AggregateError(frontend.logs, 'Frontend build failed')
for (const directory of ['fonts', 'icons', 'translations', 'embed-icons']) {
  await cp(join(root, 'node_modules/@tldraw/assets', directory), join(web, 'tldraw-assets', directory), { recursive: true })
}
const files = [...new Bun.Glob('**/*').scanSync({ cwd: web, onlyFiles: true })].sort()
const imports = files.map((file, index) => `import asset${index} from ${JSON.stringify('./web/' + file)} with { type: 'file' }`)
const assets = files.map((file, index) => `${JSON.stringify(file === 'index.html' ? '/' : '/' + file)}: { path: asset${index}, type: ${JSON.stringify(Bun.file(join(web, file)).type)} }`)
const entry = join(root, 'dist/entry.ts')
await writeFile(entry, `${imports.join('\n')}\nimport { main } from '../src/cli'\nmain({${assets.join(',')}}).catch(error => { console.error(error.message); process.exitCode = 1 })\n`)
const args = [process.execPath, 'build', '--compile', '--minify', '--no-compile-autoload-dotenv', '--no-compile-autoload-bunfig', entry, '--outfile', join(root, 'dist/taffy')]
if (process.argv[2]) args.push('--target', process.argv[2])
const processBuild = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
if (await processBuild.exited !== 0) throw new Error('Executable build failed')
if (!process.argv[2]) {
  const check = Bun.spawn([join(root, 'dist/taffy'), '--version'], { stdout: 'pipe', stderr: 'inherit' })
  if ((await new Response(check.stdout).text()).trim() !== version || await check.exited !== 0) {
    throw new Error('Compiled executable did not start correctly; use an official Bun distribution')
  }
}
console.log(`Built ${files.length} embedded assets into dist/taffy`)
