import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import base from '../markstream-vue/vite.config.ts'

export default async (env) => {
  const config = await base(env)
  const require18 = createRequire(resolve(process.cwd(), 'playground-react18/package.json'))
  const pin = ['react/jsx-dev-runtime', 'react/jsx-runtime', 'react-dom/client', 'react-dom', 'react']
    .map(find => ({ find, replacement: require18.resolve(find) }))
  config.resolve.alias = [...pin, ...Object.entries(config.resolve.alias).map(([find, replacement]) => ({ find, replacement }))]
  config.plugins.push({
    name: 'review-react18-strict-mode',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('/test/react-singleton-tooltip.test.tsx')) return
      return readFileSync(id, 'utf8')
        .replace('React.createElement(React.Fragment, null,', 'React.createElement(React.StrictMode, null,')
        .replace('  function anchor() {', `  it('review: verifies React 18 and StrictMode effect replay', async () => {
    expect(React.version).toBe('18.3.1')
    const effect = vi.fn()
    function Probe() {
      React.useEffect(() => { effect() }, [])
      return null
    }
    root = createRoot(host)
    await act(async () => root!.render(React.createElement(React.StrictMode, null, React.createElement(Probe))))
    expect(effect).toHaveBeenCalledTimes(2)
  })

  function anchor() {`)
    },
  })
  return config
}
