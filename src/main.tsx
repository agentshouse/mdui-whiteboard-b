import {useEffect,useState,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {DrawingStore,key,type Drawing} from './data/house';
import {Canvas} from './Canvas';
import {validateDrawing} from './drawing';
import './style.css';
const store=new DrawingStore();
function App(){const state=useSyncExternalStore(store.subscribe,store.snapshot);const [selected,select]=useState(''),[search,setSearch]=useState(''),[source,setSource]=useState(false),[archived,setArchived]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void store.start();},[]);
 const drawings=state.drawings.filter(a=>a.fields.archived===archived&&a.fields.title.toLowerCase().includes(search.toLowerCase()));
 const current=state.drawings.find(a=>key(a)===selected)??drawings[0];
 let valid=true;try{valid=!current||validateDrawing(JSON.parse(current.fields.content));}catch{valid=false;}
 const act=(work:Promise<unknown>)=>{setError('');void work.catch(e=>setError(e instanceof Error?e.message:String(e)));};
 const edit=(a:Drawing,patch:Parameters<DrawingStore['edit']>[1])=>{select(key(a));act(store.edit(a,patch));};
 return <main><header><strong>whiteboard-b</strong><input aria-label="Search drawings" placeholder="Search drawings" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Drawing" value={current?key(current):''} onChange={e=>select(e.target.value)}>{drawings.map(a=><option key={key(a)} value={key(a)}>{a.fields.title||'Untitled drawing'}{a.draft?' •':''}</option>)}</select><button disabled={!state.ready||state.saving} onClick={()=>act(store.create().then(select))}>New</button><label><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);select('');}}/>Archived</label></header>
 {(error||state.error)&&<div role="alert" className="warning">{error||state.error}</div>}
 {current?<><div className="document-bar"><input className="title" aria-label="Drawing title" value={current.fields.title} onChange={e=>edit(current,{title:e.target.value})}/><span role="status">{current.failed?'Input not stored. Keep this tab open.':current.pending?'Storing local draft…':current.draft?.returned?'Returned by House; draft preserved for review.':current.draft?'Local Room draft; not saved.':state.outcomes[key(current)]||'Saved drawing'}</span><button aria-pressed={source} onClick={()=>setSource(!source)}>JSON source</button><button disabled={!state.ready||state.saving} onClick={()=>edit(current,{archived:!current.fields.archived})}>{current.fields.archived?'Restore':'Archive'}</button><button className="save" disabled={!state.ready||state.saving||current.pending||current.failed||!current.draft} onClick={()=>act(store.save(current))}>Save</button></div>
 {!valid&&<div role="alert" className="warning">The raw drawing JSON is incomplete or invalid. It is preserved in the Room draft. Continue in JSON source; the canvas shows its last valid state.</div>}{current.draft?.returned&&<div className="warning">Returned by House: {JSON.stringify(current.draft.returned)}</div>}{current.draft?.changedUnderneath&&Object.keys(current.draft.changedUnderneath).length>0&&<div className="warning">This drawing changed beneath the draft. Review before saving.</div>}
 <section className={source?'workbench split':'workbench'}><Canvas key={key(current)} content={current.fields.content} disabled={!state.ready||!valid} onChange={content=>edit(current,{content})}/>{source&&<textarea aria-label="Drawing JSON source" spellCheck={false} value={current.fields.content} onChange={e=>edit(current,{content:e.target.value})}/>}</section>
 <footer>Quickdraw engine · MIT · Native Quickdraw format. Excalidraw originals stay in whiteboard-a. <a href="THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">Notices</a></footer></>:<section className="empty">{state.ready?'No drawings in this view.':'Connecting to the drawing Room…'}</section>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
