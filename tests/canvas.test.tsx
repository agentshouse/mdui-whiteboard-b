import {describe,it,expect,vi} from 'vitest';
import {render,cleanup,screen} from '@testing-library/react';
import {afterEach} from 'vitest';
import {Canvas} from '../src/Canvas';
afterEach(cleanup);
const content=JSON.stringify({document:{store:{shape:{id:'shape',typeName:'shape',type:'geo',x:0,y:0,rot:0,z:1,props:{geo:'rectangle',w:100,h:80,color:'blue',size:'m',dash:'solid',fill:'none',font:'draw'}}}}});
describe('real Quickdraw UI',()=>{
 it('mounts actual donor tools and no unsupported media import',()=>{render(<Canvas content={content} disabled={false} onChange={vi.fn()}/>);expect(screen.getByLabelText('Drawing canvas').querySelector('canvas')).toBeTruthy();expect(screen.getByTitle('Select — V')).toBeTruthy();expect(screen.getByTitle('Sticky note — N')).toBeTruthy();expect(screen.queryByTitle('Insert image')).toBeNull();});
 it('retains donor canvas across live update and invalid partial JSON',()=>{const change=vi.fn();const r=render(<Canvas content={content} disabled={false} onChange={change}/>);const canvas=r.container.querySelector('canvas');r.rerender(<Canvas content="[partial" disabled={false} onChange={change}/>);expect(r.container.querySelector('canvas')).toBe(canvas);r.rerender(<Canvas content={content} disabled={true} onChange={change}/>);expect(r.container.querySelector('canvas')).toBe(canvas);expect(change).not.toHaveBeenCalled();});
});
