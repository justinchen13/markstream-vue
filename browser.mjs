import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync } from 'node:fs'
const scratch = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.resolve(scratch, '../markstream-vue/package.json'))
const { chromium } = require('playwright-core')
const label = process.argv[2] || 'fixed'
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
// Warm the Vite dependency optimizer before measuring any scenario.
const warmup = await browser.newPage()
await warmup.goto('http://127.0.0.1:4187/__tooltip-repro', { waitUntil: 'networkidle' })
await warmup.close()
const page = await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1})
page.setDefaultTimeout(5000)
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
const results=[]
const tip=page.locator('.ms-tooltip')
const state=()=>page.evaluate(()=>{const t=document.querySelector('.ms-tooltip');return {visible:t?.dataset.visible==='true',opacity:t?getComputedStyle(t).opacity:null,text:t?.textContent,oldConnected:window.__oldAnchor?.isConnected,oldAria:window.__oldAnchor?.getAttribute('aria-describedby'),pending:window.__pendingPositions?.length||0}})
const reset=async()=>{await page.goto('http://127.0.0.1:4187/__tooltip-repro');await page.getByRole('link',{name:'Link: Link A tooltip',exact:true}).waitFor()}
const linkA=()=>page.getByRole('link',{name:'Link: Link A tooltip',exact:true})
const linkB=()=>page.getByRole('link',{name:'Link: Link B tooltip',exact:true})
const row=()=>page.getByRole('link',{name:'Link: Row 0 tooltip',exact:true})
const keepOld=async(locator)=>locator.evaluate(el=>{window.__oldAnchor=el})
const shown=async()=>{await page.waitForFunction(()=>document.querySelector('.ms-tooltip')?.dataset.visible==='true');await page.waitForTimeout(180)}
const capture=async(name)=>page.screenshot({path:path.join(scratch,`${label}-${name}.png`)})
async function check(name,run){try{await reset();await run();await capture(name);results.push({name,passed:true,state:await state()})}catch(e){await capture(name+'-failure');results.push({name,passed:false,error:e.message.replaceAll(scratch,'<evidence>'),state:await state()})}}
function assert(value,message){if(!value)throw new Error(message)}
async function expectHidden(){await page.waitForTimeout(350);const s=await state();assert(!s.visible && (s.opacity===null||Number(s.opacity)===0),`Expected hidden tooltip: ${JSON.stringify(s)}`);assert(!s.oldAria,`Leaked aria-describedby: ${JSON.stringify(s)}`)}
async function hold(){await page.evaluate(()=>{window.__holdPosition=true;window.__pendingPositions=[]})}
async function release(){await page.evaluate(()=>{window.__holdPosition=false;window.__pendingPositions.splice(0).forEach(resolve=>resolve())})}
async function pending(){await page.waitForFunction(()=>window.__pendingPositions?.length>0)}
await check('normal-hover-leave',async()=>{await linkA().hover();await shown();await capture('normal-hover');await keepOld(linkA());await page.mouse.move(20,20);await expectHidden();await capture('normal-leave')})
await check('visible-scroll-unmount',async()=>{await row().hover();await shown();await keepOld(row());await capture('before-scroll');await page.mouse.wheel(0,1800);await page.waitForFunction(()=>window.__oldAnchor?.isConnected===false);await page.waitForTimeout(350);await capture('after-scroll');await expectHidden()})
await check('queued-scroll-unmount',async()=>{await keepOld(row());await row().hover();await page.locator('#list').evaluate(el=>{el.scrollTop=1800;el.dispatchEvent(new Event('scroll'))});await page.waitForFunction(()=>window.__oldAnchor?.isConnected===false);await expectHidden()})
await check('inflight-leave',async()=>{await hold();await keepOld(linkA());await linkA().hover();await pending();await page.mouse.move(20,20);await page.waitForTimeout(180);await release();await expectHidden();await capture('inflight-leave')})
await check('inflight-unmount',async()=>{await hold();await keepOld(row());await row().hover();await pending();await page.mouse.wheel(0,1800);await page.waitForFunction(()=>window.__oldAnchor?.isConnected===false);await page.waitForTimeout(180);await release();await expectHidden()})
await check('a-to-b-stale-result',async()=>{await hold();await keepOld(linkA());await linkA().hover();await pending();await page.evaluate(()=>{window.__holdPosition=false});await linkB().hover();await shown();await release();await page.waitForTimeout(250);const s=await state();assert(s.visible&&s.text==='Link B tooltip'&&!s.oldAria,`Ownership leak: ${JSON.stringify(s)}`);const aria=await linkB().getAttribute('aria-describedby');assert(aria===await tip.getAttribute('id'),'B aria mismatch');await capture('a-to-b')})
await check('a-unmount-keeps-b',async()=>{await linkA().hover();await shown();await keepOld(linkA());await linkB().hover();await shown();await page.getByRole('button',{name:'Remove A',exact:true}).evaluate(el=>el.click());await page.waitForTimeout(250);const s=await state();assert(!s.oldConnected&&s.visible&&s.text==='Link B tooltip'&&!s.oldAria,`A cleanup affected B: ${JSON.stringify(s)}`);await capture('a-unmount-keeps-b')})
writeFileSync(path.join(scratch,`${label}-browser.json`),JSON.stringify({browser:await browser.version(),label,results,errors},null,2)+'\n')
console.log(JSON.stringify({browser:await browser.version(),label,results,errors},null,2))
await browser.close()
process.exitCode=results.some(r=>!r.passed)||errors.length?1:0
