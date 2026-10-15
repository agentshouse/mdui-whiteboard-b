import { validateDrawing, mergeDrawing } from '../drawing';
import { houseBridge as getHouseBridge } from '@agentshouse/app-bridge';
import { DraftSession, DraftSaveUncertainError, type RoomDraft } from './draft-session';
export type Runtime = Awaited<ReturnType<typeof getHouseBridge>['runtime']>;
export type Fields = { title: string; content: string; archived: boolean; source_url: string; source_revision: string; author: string; license: string };
export type Drawing = { room: string; path: string; fields: Fields; draft?: RoomDraft; pending?: boolean; failed?: boolean };
export type Snapshot = { drawings: Drawing[]; loaded: boolean; ready: boolean; error: string; outcomes: Record<string,string>; saving: boolean };
export const query = {types:['quickdraw_drawing'],select:{fields:'all' as const},orderBy:[{by:{field:'/title'},direction:'asc' as const}]};
export const key = (a:Pick<Drawing,'room'|'path'>)=>`${a.room}/${a.path}`;
export function parseContent(content: string) {
  const tree:unknown=JSON.parse(content);
  if(!validateDrawing(tree))throw new Error('Content is not a valid drawing. Your raw source draft is preserved.'); return tree;
}
export function validateFields(fields: Fields) {
 if(!fields.title.trim())throw new Error('A title is required. Your partial draft is preserved.');
 parseContent(fields.content); return fields;
}
let bridge:ReturnType<typeof getHouseBridge>|undefined;
export function houseBridge(){if(!bridge){bridge=getHouseBridge();bridge.setTab({title:'whiteboard-b'});}return bridge;}
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export class DrawingStore {
  private state:Snapshot={drawings:[],loaded:false,ready:false,error:'',outcomes:{},saving:false};
  private listeners=new Set<()=>void>();
  private md?:Runtime; private room=''; private synced=false; private guards=false; private denied=''; private lost=''; private init?:Promise<void>;
  private documents:Drawing[]=[]; private drafts:readonly RoomDraft[]=[]; private sessions=new Map<string,DraftSession>(); private overrides=new Map<string,Drawing>(); private jobs=new Map<string,Promise<void>>(); private failedPatches=new Map<string,Partial<Fields>>(); private uncertain=new Set<string>(); private batchOutcomes=new Map<string,string>(); private queueBatches=new Map<string,Map<string,string[]>>(); private pathBatch=new Map<string,string>();
  private closes:(()=>void)[]=[]; private disposed=false; private generation=0; private queryRoom=''; private queryReceived=false;
  constructor(private provider:()=>Promise<Runtime>=async()=>houseBridge().runtime){}
  snapshot=()=>this.state; subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private emit(patch:Partial<Snapshot>={}){if(this.disposed)return;this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}
  private watch<T>(obs:{current():T;subscribe(fn:()=>void):()=>void;close():void},fn:(v:T)=>void){if(this.disposed){obs.close();return;}const render=()=>{if(!this.disposed)fn(obs.current());};const off=obs.subscribe(render);this.closes.push(()=>{off();obs.close();});render();}
  private render(){
    if(!this.room){this.emit({ready:false,loaded:false});return;}
    const outcomes={...this.state.outcomes};
    const drawings=new Map(this.documents.filter(a=>a.room===this.room).map(a=>[key(a),{...a}]));
    for(const d of this.drafts){if(d.room!==this.room)continue;const k=key(d);let a=drawings.get(k);if(!a&&d.parts.creation&&'type' in d.parts.creation&&d.parts.creation.type==='quickdraw_drawing')a={room:d.room,path:d.path,fields:d.parts.creation.fields as Fields};if(!a)continue;const fields={...a.fields};for(const [name,v]of Object.entries(d.parts.fields??{}))Object.assign(fields,{[name]:v.value});drawings.set(k,{...a,fields,draft:d});if(d.returned)outcomes[k]=`Returned by House: ${JSON.stringify(d.returned)}`;else if(outcomes[k]==='Saved.')outcomes[k]='Saved; newer local draft not saved.';}
    for(const [k,a]of this.overrides)if(a.room===this.room)drawings.set(k,a);
    this.emit({outcomes,drawings:[...drawings.values()].sort((a,b)=>a.fields.title.localeCompare(b.fields.title)),loaded:this.queryReceived&&this.queryRoom===this.room&&this.synced,ready:this.queryReceived&&this.queryRoom===this.room&&this.guards&&this.synced&&!!this.room&&!this.denied&&!this.lost});
  }
  private session(a:Pick<Drawing,'room'|'path'>){const k=key(a);let s=this.sessions.get(k);if(!s){s=new DraftSession(this.md!,a.room,a.path);this.sessions.set(k,s);}return s;}
  start(){this.init??=this.connect();return this.init;}
  private async connect(){try{
    this.md=await this.provider();if(this.disposed)return;
    const rooms=await this.md.observe('rooms');
    const refresh=()=>{const entries=rooms.current();this.room=entries.length===1?entries[0].locator:'';this.emit({error:this.denied||this.lost||(this.synced&&!this.room?'Bind exactly one drawing Room in House. Open input is preserved.':'')});this.render();if(this.guards&&this.synced&&this.room&&this.queryRoom!==this.room)void this.openQuery(this.room);};
    this.watch(rooms,refresh);
    this.watch(await this.md.observe('sync-status'),s=>{this.synced=s.lastCompleted!=null;refresh();});
    this.watch(await this.md.observe('connection-refusal'),v=>{this.denied=v?'House authorization changed. Reopen this App before saving.':'';refresh();});
    this.watch(await this.md.observe('storage-loss'),v=>{this.lost=v?'House reports lost local changes. Check the Room before continuing.':'';refresh();});
    this.watch(await this.md.observe('room-drafts'),drafts=>{this.drafts=drafts;this.sessions.forEach(s=>s.accept(drafts.find(d=>d.room===s.room&&d.path===s.path)??null));this.render();});
    this.guards=true;refresh();
  }catch(e){this.emit({error:message(e),ready:false});}}
  private async openQuery(room:string){this.queryRoom=room;this.queryReceived=false;this.render();const gen=++this.generation;try{
    const watch=await this.md!.observe('query',{...query,rooms:[room]});if(gen!==this.generation||this.disposed){watch.close();return;}
    this.watch(watch,result=>{if(gen!==this.generation||room!==this.room)return;if('pending' in result){this.queryReceived=false;this.render();return;}this.queryReceived=true;this.documents=result.documents.map(d=>({room:d.room,path:d.path,fields:d.fields as Fields}));this.render();});
    this.watch(await this.md!.observe('queue',room),entries=>{
      const outcomes={...this.state.outcomes};const previous=this.queueBatches.get(room)??new Map<string,string[]>();const current=new Map<string,string[]>();
      for(const e of entries){const paths=e.batch.changes.filter(c=>c.path.startsWith('quickdraw/')).map(c=>`${room}/${c.path}`);current.set(e.batch.id,paths);const status=e.state==='accepted'?'Accepted by House; waiting for the replica.':e.state==='submitted'?'Submitted; waiting for House.':e.state==='reset'?'Queued; House scheduled a retry.':'Queued locally; waiting for House.';this.batchOutcomes.set(e.batch.id,status);for(const path of paths){this.pathBatch.set(path,e.batch.id);outcomes[path]=status;}}
      this.queueBatches.set(room,current);this.emit({outcomes});
      for(const [batch,paths]of previous)if(!current.has(batch))void this.resolveDeparture(room,batch,paths);
    });
  }catch(e){if(gen===this.generation){this.queryRoom='';this.emit({error:message(e)});}}}
  /** Master1845: queue departure without a returned native Draft means saved.
   * Read the local Draft surface as well as observing it, so callback ordering
   * cannot mistake a returned draft for acceptance. No provider request. */
  private async resolveDeparture(room:string,batch:string,paths:string[]){
    for(const path of paths){
      try{
        const draft=await this.md!.roomDraft.read(room,path.slice(room.length+1));
        if(this.disposed||this.room!==room||this.queueBatches.get(room)?.has(batch)||this.pathBatch.get(path)!==batch)continue;
        const status=draft?.returned?`Returned by House: ${JSON.stringify(draft.returned)}`:draft?'Saved; newer local draft not saved.':'Saved.';
        this.batchOutcomes.set(batch,status);this.emit({outcomes:{...this.state.outcomes,[path]:status}});
      }catch(e){if(!this.disposed&&this.pathBatch.get(path)===batch)this.emit({outcomes:{...this.state.outcomes,[path]:`Could not read the local save result: ${message(e)}`}});}
    }
  }
  edit(drawing:Drawing,patch:Partial<Fields>):Promise<void>{
    const k=key(drawing);const previous=this.overrides.get(k)??this.state.drawings.find(a=>key(a)===k)??drawing;
    const edited={...previous,fields:{...previous.fields,...patch},pending:true,failed:false};this.overrides.set(k,edited);this.render();
    const job=(this.jobs.get(k)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      await this.start();if(!this.state.ready||drawing.room!==this.room)throw new Error('The Room is unavailable. Your input remains visible but is not durable.');
      const effective={...this.failedPatches.get(k),...patch};
      const session=this.session(drawing);await session.stage(d=>{
        if(d?.parts.markdown||d?.parts.move||d?.parts.removal||(d?.parts.creation&&'markdown' in d.parts.creation))throw new Error('A whole-document draft needs review in House.');
        const currentContent = d?.parts.fields?.content?.value ?? (d?.parts.creation && 'fields' in d.parts.creation ? d.parts.creation.fields.content : undefined) ?? this.documents.find(x=>key(x)===k)?.fields.content ?? drawing.fields.content;
        const merged = effective.content === undefined ? effective : {...effective, content:mergeDrawing(drawing.fields.content, effective.content, String(currentContent))};
        if(d?.parts.creation&&'fields' in d.parts.creation)return{creation:{...d.parts.creation,fields:{...d.parts.creation.fields,...merged}}};
        return {fields:Object.fromEntries(Object.entries(merged).map(([name,value])=>[name,{value,base:{value:(this.documents.find(d=>key(d)===k)?.fields??drawing.fields)[name as keyof Fields]}}]))};
      });
      this.failedPatches.delete(k);
      this.drafts=[...this.drafts.filter(d=>key(d)!==k),...(session.current()?[session.current()!]:[])];
      if(this.overrides.get(k)===edited)this.overrides.delete(k);
      this.emit({error:this.denied||this.lost,outcomes:{...this.state.outcomes,[k]:'Local Room draft; not saved.'}});
    }).catch(e=>{this.failedPatches.set(k,{...this.failedPatches.get(k),...patch});if(this.overrides.get(k)===edited)this.overrides.set(k,{...edited,pending:false,failed:true});this.emit({error:message(e)});throw e;}).finally(()=>this.render());
    this.jobs.set(k,job);return job;
  }
  async create(){await this.start();if(!this.state.ready)throw new Error('The drawing Room is not ready.');const drawing:Drawing={room:this.room,path:`quickdraw/${crypto.randomUUID()}.md`,fields:{title:'',content:'{"document":{"store":{}}}',archived:false,source_url:'',source_revision:'',author:'',license:''}};const s=this.session(drawing);await s.stage({creation:{type:'quickdraw_drawing',fields:drawing.fields,sections:{}}});this.drafts=[...this.drafts,s.current()!];this.render();return key(drawing);}
  save(drawing:Drawing):Promise<void>{
    const k=key(drawing);if(this.uncertain.has(k))return Promise.reject(new Error('The previous Save result is uncertain. Review this document in House before retrying.'));if(this.state.saving)return Promise.reject(new Error('A Save is already in progress.'));
    this.emit({saving:true});const prior=this.jobs.get(k);
    const job=(async()=>{await prior;if(!this.state.ready||this.room!==drawing.room)throw new Error('This Room is unavailable. The draft is preserved.');if(this.overrides.get(k)?.failed)throw new Error('Local input was not stored. Edit again before saving.');const s=this.session(drawing);const draft=await s.read();if(!draft)return;const current=this.state.drawings.find(a=>key(a)===k)??drawing;validateFields(current.fields);const batch=await s.commit(draft.revision);this.drafts=this.drafts.filter(d=>key(d)!==k);if(s.current())this.drafts=[...this.drafts,s.current()!];if(batch)this.emit({error:this.denied||this.lost,outcomes:{...this.state.outcomes,[k]:this.batchOutcomes.get(batch)??'Queued locally; waiting for House.'}});})().catch(e=>{if(e instanceof DraftSaveUncertainError)this.uncertain.add(k);this.emit({error:message(e),outcomes:{...this.state.outcomes,[k]:message(e)}});throw e;}).finally(()=>{this.emit({saving:false});this.render();});
    this.jobs.set(k,job);return job;
  }
  dispose(){this.disposed=true;this.closes.splice(0).forEach(fn=>fn());this.listeners.clear();}
}
