import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {render,screen,cleanup,fireEvent,waitFor,act} from '@testing-library/react';
import {connectHouseBridge} from '@agentshouse/app-bridge';
import {createHouseBridgeTestHost} from '@agentshouse/app-bridge/test-host';
import {App} from '../src/App';
import {DrawingStore,type Fields} from '../src/data/house';
import {DrawingNavigation,drawingAddress,readDrawingAddress} from '../src/navigation';
import {fakeRuntime} from './fakeRuntime';
const fields:Fields={title:'First',content:'{"document":{"store":{}}}',archived:false,source_url:'',source_revision:'',author:'',license:''};
const first={room:'r_one',path:'quickdraw/one.md',type:'quickdraw_drawing',fields};
const second={...first,path:'quickdraw/two.md',fields:{...fields,title:'Second'}};
const target=(path=second.path)=>({room:'r_one',path,view:'source' as const});
afterEach(cleanup);
function setup(address:string|null=drawingAddress(target())){
 const fake=fakeRuntime([first,second]);const store=new DrawingStore(async()=>fake.runtime);
 const host=createHouseBridgeTestHost(address===null?{}:{address});const nav=new DrawingNavigation(connectHouseBridge(host));
 return {...fake,store,host,nav};
}
it('accepts only bounded drawing identity and optional source view',()=>{
 expect(readDrawingAddress(drawingAddress(target())).target).toEqual(target());
 for(const url of ['/drawings?room=r&path=../x','//host','/drawings?room=r&path=p&view=admin','/drawings?room=r&path=p&text=secret','/drawings?room=r&path=p&path=q'])expect(readDrawingAddress(url).error).toBeTruthy();
});
it('cold source link selects its drawing, preserves raw drafts through Back and remount, and never saves',async()=>{
 const f=setup();const mounted=render(<App store={f.store} navigation={f.nav}/>);
 const input=await screen.findByLabelText('Drawing JSON source');expect((screen.getByLabelText('Drawing title') as HTMLInputElement).value).toBe('Second');
 fireEvent.change(input,{target:{value:'[unfinished'}});
 await waitFor(()=>expect(f.drafts.get('r_one/quickdraw/two.md')?.parts.fields?.content.value).toBe('[unfinished'));
 await act(async()=>f.host.open(drawingAddress(target(first.path))));
 await waitFor(()=>expect((screen.getByLabelText('Drawing title') as HTMLInputElement).value).toBe('First'));
 await act(async()=>f.host.open(drawingAddress(target())));
 await waitFor(()=>expect((screen.getByLabelText('Drawing JSON source') as HTMLTextAreaElement).value).toBe('[unfinished'));
 expect(f.host.navigations).toHaveLength(0);expect(f.raw.save).not.toHaveBeenCalled();
 mounted.unmount();const store=new DrawingStore(async()=>f.runtime);render(<App store={store} navigation={f.nav}/>);
 await waitFor(()=>expect((screen.getByLabelText('Drawing JSON source') as HTMLTextAreaElement).value).toBe('[unfinished'));expect(f.raw.save).not.toHaveBeenCalled();
});
it('missing and wrong-Room targets never fall back or create a drawing',async()=>{
 const f=setup(drawingAddress({room:'r_other',path:first.path}));render(<App store={f.store} navigation={f.nav}/>);
 await screen.findByRole('alert');expect(screen.queryByLabelText('Drawing title')).toBeNull();expect(f.raw.roomDraft.write).not.toHaveBeenCalled();
 await act(async()=>f.host.open(drawingAddress(target())));await screen.findByLabelText('Drawing title');expect(f.raw.save).not.toHaveBeenCalled();
});
it('drawing and view clicks update the House address while typing adds no history',async()=>{
 const f=setup();render(<App store={f.store} navigation={f.nav}/>);await screen.findByLabelText('Drawing JSON source');
 fireEvent.change(screen.getByLabelText('Drawing'),{target:{value:'r_one/quickdraw/one.md'}});
 await waitFor(()=>expect(f.nav.snapshot().target).toEqual({room:'r_one',path:first.path}));
 fireEvent.click(screen.getByRole('button',{name:'JSON source'}));
 await waitFor(()=>expect(f.nav.snapshot().target).toEqual(target(first.path)));
 const count=f.host.navigations.length;fireEvent.change(screen.getByLabelText('Drawing title'),{target:{value:'Changed title'}});
 await waitFor(()=>expect(f.raw.roomDraft.write).toHaveBeenCalled());expect(f.host.navigations).toHaveLength(count);expect(f.raw.save).not.toHaveBeenCalled();
});
it('waits for a delayed query before diagnosing a deep link as missing',async()=>{
 const f=setup();const observe=f.raw.observe.getMockImplementation()!;let release:()=>void=()=>{};const hold=new Promise<void>(resolve=>{release=resolve;});
 f.raw.observe.mockImplementation(async(...args)=>{if(args[0]==='query')await hold;return observe(...args);});
 render(<App store={f.store} navigation={f.nav}/>);await waitFor(()=>expect(f.raw.observe).toHaveBeenCalledWith('query',expect.anything()));
 expect(f.store.snapshot().loaded).toBe(false);expect(screen.queryByRole('alert')).toBeNull();
 await act(async()=>release());await screen.findByLabelText('Drawing JSON source');expect(f.host.navigations).toHaveLength(0);
});
it('a new-drawing completion cannot replace a newer host selection',async()=>{
 const f=setup();render(<App store={f.store} navigation={f.nav}/>);await screen.findByLabelText('Drawing JSON source');
 let release:()=>void=()=>{};const hold=new Promise<void>(resolve=>{release=resolve;});const create=f.store.create.bind(f.store);vi.spyOn(f.store,'create').mockImplementation(async()=>{await hold;return create();});
 fireEvent.click(screen.getByRole('button',{name:'New'}));await act(async()=>f.host.open(drawingAddress(target(first.path))));await act(async()=>release());
 await waitFor(()=>expect(f.store.snapshot().drawings).toHaveLength(3));expect((screen.getByLabelText('Drawing title') as HTMLInputElement).value).toBe('First');expect(f.host.navigations).toHaveLength(0);
});
