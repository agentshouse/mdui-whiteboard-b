import {useEffect,useRef} from 'react';
import {createQuickdraw} from '../vendor/quickdraw/index.js';
import {validateDrawing,type DrawingValue,type Shape} from './drawing';
import '../vendor/quickdraw/quickdraw.css';
type CoreStore={getSnapshot():DrawingValue;loadSnapshot(v:DrawingValue,source:string):void;listen(f:()=>void,options:{source:string}):()=>void;applyDiff(d:{added:Record<string,Shape>;removed:Record<string,Shape>;updated:Record<string,[Shape,Shape]>},source:string):void};
type Board={editor:{store:CoreStore;fitContent():void;setReadonly(v:boolean):void};destroy():void};
const create=createQuickdraw as unknown as (opts:{container:HTMLDivElement;theme:string;grid:string;watermark:boolean;readonly:boolean})=>Board;
export function Canvas({content,disabled,onChange}:{content:string;disabled:boolean;onChange:(content:string)=>void}){
 const host=useRef<HTMLDivElement>(null),board=useRef<Board|null>(null),latest=useRef(onChange),initial=useRef(content);latest.current=onChange;
 useEffect(()=>{if(!host.current)return;const b=create({container:host.current,theme:'light',grid:'lines',watermark:false,readonly:false});board.current=b;
  try{const snap:unknown=JSON.parse(initial.current);if(validateDrawing(snap)){b.editor.store.loadSnapshot(snap,'remote');b.editor.fitContent();}}catch{/* raw input stays in native draft */}
  const off=b.editor.store.listen(()=>latest.current(JSON.stringify(b.editor.store.getSnapshot())),{source:'user'});
  return()=>{off();b.destroy();board.current=null;};
 },[]);
 useEffect(()=>{board.current?.editor.setReadonly(disabled);},[disabled]);
 useEffect(()=>{const store=board.current?.editor.store;if(!store)return;try{const next:unknown=JSON.parse(content);if(!validateDrawing(next))return;const current=store.getSnapshot().document.store;const desired=next.document.store;
  const added:Record<string,Shape>={},removed:Record<string,Shape>={},updated:Record<string,[Shape,Shape]>={};
  for(const [id,v]of Object.entries(desired)){if(!current[id])added[id]=v;else if(JSON.stringify(current[id])!==JSON.stringify(v))updated[id]=[current[id],v];}
  for(const [id,v]of Object.entries(current))if(!desired[id])removed[id]=v;
  store.applyDiff({added,removed,updated},'remote');
 }catch{/* preserve invalid raw source without crashing donor */}},[content]);
 return <div className="canvas" ref={host} aria-label="Drawing canvas"/>;
}
