import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'
const scratch = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scratch, '../markstream-vue')
const require = createRequire(path.join(root, 'package.json'))
const { createServer } = await import(require.resolve('vite'))
const baseline = process.argv.includes('--baseline')
const server = await createServer({
  configFile: false,
  root,
  resolve: {
    alias: {
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react-dom/client': require.resolve('react-dom/client'),
      'react-dom': require.resolve('react-dom'),
      'react': require.resolve('react'),
      'stream-markdown-parser': path.join(root, 'packages/markdown-parser/src/index.ts'),
      'markstream-core': path.join(root, 'packages/markstream-core/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: { hmr: false, host: '127.0.0.1', port: 4187, strictPort: true, fs: { allow: [path.dirname(root)] } },
  plugins: [{
    name: 'tooltip-evidence',
    configureServer(server) {
      server.middlewares.use('/__tooltip-repro', (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(`<!doctype html><html lang="en"><title>React link tooltip lifecycle</title><div id="root"></div><script type="module" src="/@fs/${scratch}/demo.tsx"></script></html>`)
      })
    },
    enforce: 'pre',
    resolveId(id) {
      if (id === '/__floating.ts') return '\0tooltip-floating'
    },
    transform(code, id) {
      if (id.endsWith('/tooltip/singletonTooltip.ts'))
        return code.replace("from '@floating-ui/dom'", "from '/__floating.ts'")
    },
    load(id) {
      if (id === '\0tooltip-floating') return `
        export {autoUpdate, flip, offset, shift} from '@floating-ui/dom';
        import {computePosition as realComputePosition} from '@floating-ui/dom';
        export async function computePosition(...args) {
          const result = await realComputePosition(...args);
          if (window.__holdPosition) {
            window.__pendingPositions ??= [];
            await new Promise(resolve => window.__pendingPositions.push(resolve));
          }
          return result;
        }
      `
      if (baseline && id.endsWith('/tooltip/singletonTooltip.ts'))
        return readFileSync(path.join(scratch, 'baseline-singletonTooltip.ts'), 'utf8')
      if (baseline && id.endsWith('/LinkNode/LinkNode.tsx'))
        return readFileSync(path.join(scratch, 'baseline-LinkNode.tsx'), 'utf8')
    },
  }],
})
await server.listen()
console.log(`Evidence server: http://127.0.0.1:4187/__tooltip-repro (${baseline ? 'baseline' : 'fixed'})`)
