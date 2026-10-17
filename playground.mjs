import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
const scratch=path.dirname(fileURLToPath(import.meta.url))
const require=createRequire(path.resolve(scratch,'../markstream-vue/package.json'))
const {chromium}=require('playwright-core')
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:4188/test')
await page.locator('textarea').first().fill('[Playground link](https://example.com "Playground tooltip")')
const link=page.locator('a.link-node').filter({hasText:'Playground link'}).first()
await link.waitFor()
await link.hover()
await page.waitForFunction(()=>document.querySelector('.ms-tooltip')?.dataset.visible==='true')
await page.waitForTimeout(150)
const before=await page.locator('.ms-tooltip').innerText()
await page.screenshot({path:path.join(scratch,'react18-playground-hover.png')})
await page.mouse.move(1,1)
await page.waitForTimeout(300)
const hidden=await page.locator('.ms-tooltip').getAttribute('data-visible')==='false'
const aria=await link.getAttribute('aria-describedby')
await page.screenshot({path:path.join(scratch,'react18-playground-leave.png')})
const result={browser:await browser.version(),react:'18.3.1',before,hidden,aria,errors}
writeFileSync(path.join(scratch,'react18-playground.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
await browser.close()
if(before!=='Playground tooltip'||!hidden||aria||errors.length)process.exitCode=1
