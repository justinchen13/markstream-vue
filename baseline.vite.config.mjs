import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import base from '../markstream-vue/vite.config.ts'

export default async (env) => {
  const config = await base(env)
  config.plugins.push({
    name: 'baseline-tooltip-source',
    enforce: 'pre',
    load(id) {
      if (id.endsWith('/tooltip/singletonTooltip.ts'))
        return readFileSync(fileURLToPath(new URL('./baseline-singletonTooltip.ts', import.meta.url)), 'utf8')
      if (id.endsWith('/LinkNode/LinkNode.tsx'))
        return readFileSync(fileURLToPath(new URL('./baseline-LinkNode.tsx', import.meta.url)), 'utf8')
    },
  })
  return config
}
