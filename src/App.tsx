import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {DrawingStore,key,type Drawing,houseBridge} from './data/house';
import {Canvas} from './Canvas';
import {validateDrawing} from './drawing';
import {DrawingNavigation,type DrawingTarget} from './navigation';
export function App({store,navigation:suppliedNavigation}:{store:DrawingStore;navigation?:DrawingNavigation}){
 const navigation=useMemo(()=>suppliedNavigation??new DrawingNavigation(houseBridge()),[suppliedNavigation]);
 const [route,setRoute]=useState(navigation.snapshot),generation=useRef(0);
 useEffect(()=>navigation.subscribe(()=>{generation.current++;setRoute(navigation.snapshot());}),[navigation]);
 const navigate=(target:DrawingTarget|null,replace=false)=>{generation.current++;navigation.navigate(target,replace);};
 const state=useSyncExternalStore(store.subscribe,store.snapshot);const [search,setSearch]=useState(''),[archived,setArchived]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void store.start();return()=>store.dispose();},[store]);
 const current=route.target?state.drawings.find(a=>a.room===route.target?.room&&a.path===route.target.path):undefined;
 const source=route.target?.view==='source';
 const drawings=state.drawings.filter(a=>(current&&key(a)===key(current))||(a.fields.archived===archived&&a.fields.title.toLowerCase().includes(search.toLowerCase())));
 useEffect(()=>{if(route.ready&&!route.error&&!route.target&&state.loaded){const first=state.drawings.find(a=>!a.fields.archived);if(first)navigation.navigate({room:first.room,path:first.path},true);}},[navigation,route,state.loaded,state.drawings]);
 const routeError=route.error||(route.ready&&route.target&&state.loaded&&!current?'This drawing is unavailable in the connected Room.':'');
 const select=(id:string)=>{const drawing=state.drawings.find(a=>key(a)===id);if(drawing)navigate({room:drawing.room,path:drawing.path});};
 const create=async()=>{const before=generation.current;const id=await store.create();if(before!==generation.current)return;const drawing=store.snapshot().drawings.find(a=>key(a)===id);if(drawing)navigate({room:drawing.room,path:drawing.path});};
 let valid=true;try{valid=!current||validateDrawing(JSON.parse(current.fields.content));}catch{valid=false;}
 const act=(work:Promise<unknown>)=>{setError('');void work.catch(e=>setError(e instanceof Error?e.message:String(e)));};
 const edit=(a:Drawing,patch:Parameters<DrawingStore['edit']>[1])=>{act(store.edit(a,patch));};
 return <main><header><strong>whiteboard-b</strong><input aria-label="Search drawings" placeholder="Search drawings" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Drawing" value={current?key(current):''} onChange={e=>select(e.target.value)}>{drawings.map(a=><option key={key(a)} value={key(a)}>{a.fields.title||'Untitled drawing'}{a.draft?' •':''}</option>)}</select><button disabled={!state.ready||state.saving} onClick={()=>act(create())}>New</button><label><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);}}/>Archived</label></header>
 {(error||state.error||routeError)&&<div role="alert" className="warning">{error||routeError||state.error}</div>}
 {current?<><div className="document-bar"><input className="title" aria-label="Drawing title" value={current.fields.title} onChange={e=>edit(current,{title:e.target.value})}/><span role="status">{current.failed?'Input not stored. Keep this tab open.':current.pending?'Storing local draft…':current.draft?.returned?'Returned by House; draft preserved for review.':current.draft?'Local Room draft; not saved.':state.outcomes[key(current)]||'Saved drawing'}</span><button aria-pressed={source} onClick={()=>navigate({room:current.room,path:current.path,...(!source?{view:'source' as const}:{})})}>JSON source</button><button disabled={!state.ready||state.saving} onClick={()=>edit(current,{archived:!current.fields.archived})}>{current.fields.archived?'Restore':'Archive'}</button><button className="save" disabled={!state.ready||state.saving||current.pending||current.failed||!current.draft} onClick={()=>act(store.save(current))}>Save</button></div>
 {!valid&&<div role="alert" className="warning">The raw drawing JSON is incomplete or invalid. It is preserved in the Room draft. Continue in JSON source; the canvas shows its last valid state.</div>}{current.draft?.returned&&<div className="warning">Returned by House: {JSON.stringify(current.draft.returned)}</div>}{current.draft?.changedUnderneath&&Object.keys(current.draft.changedUnderneath).length>0&&<div className="warning">This drawing changed beneath the draft. Review before saving.</div>}
 <section className={source?'workbench split':'workbench'}><Canvas key={key(current)} content={current.fields.content} disabled={!state.ready||!valid} onChange={content=>edit(current,{content})}/>{source&&<textarea aria-label="Drawing JSON source" spellCheck={false} value={current.fields.content} onChange={e=>edit(current,{content:e.target.value})}/>}</section>
 <footer>Whiteboard · Separate editable drawing format. <a href="THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">Notices</a></footer></>:<section className="empty">{routeError||(!route.ready||!state.loaded?'Connecting to the drawing Room…':'No drawings in this view.')}</section>}
 </main>;
}

