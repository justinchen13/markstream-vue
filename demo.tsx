import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { LinkNode } from '/packages/markstream-react/src/components/LinkNode/LinkNode.tsx'
import '/packages/markstream-react/src/index.css'

function App() {
  const [start, setStart] = useState(0)
  const [removed, setRemoved] = useState(false)
  return <main>
    <h1>React link tooltip lifecycle</h1>
    <p>Hover a link, move away, then scroll the windowed list to unmount its anchor.</p>
    <button onClick={() => setRemoved(true)}>Remove A</button>
    <button onClick={() => { setRemoved(false); setStart(0) }}>Reset</button>
    <div className="pinned"><span style={{width:150}}>{!removed && <LinkNode node={{type:'link', href:'https://example.com/a', title:'Link A tooltip', text:'Link A'}} typewriter={false}/>}</span> <LinkNode node={{type:'link', href:'https://example.com/b', title:'Link B tooltip', text:'Link B'}} typewriter={false}/></div>
    <h2>Windowed list</h2>
    <div id="list" onScroll={e => flushSync(() => setStart(Math.floor(e.currentTarget.scrollTop / 64)))}>
      <div style={{height:6400,position:'relative'}}>
        {Array.from({length:6},(_,i)=>start+i).filter(i=>i<100).map(i=><div key={i} className="row" style={{top:i*64}}>{i<6 ? <LinkNode node={{type:'link',href:`https://example.com/row/${i}`,title:`Row ${i} tooltip`,text:`Row ${i} link`}} typewriter={false}/> : <span>Row {i} — plain text content</span>}</div>)}
      </div>
    </div>
    <p id="status">Mounted rows {start}–{Math.min(start+5,99)}</p>
  </main>
}
const style=document.createElement('style')
style.textContent=`body{font:18px/1.5 system-ui;margin:0;background:#f8fafc;color:#102030}main{max-width:850px;margin:40px auto;padding:30px;background:white;border:1px solid #dde4ee;border-radius:12px}h1{font-size:30px}h2{font-size:22px}button{font:inherit;margin:8px 12px 8px 0;padding:6px 15px}.pinned{display:flex;gap:70px;padding:35px 0}#list{height:256px;overflow:auto;border:1px solid #aab8c9}.row{position:absolute;height:64px;left:30px;right:30px;display:flex;align-items:center;border-bottom:1px solid #e4e9f0}`
document.head.appendChild(style)
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
