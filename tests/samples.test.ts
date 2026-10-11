import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import {verify} from '@agentshouse/mdmodel';
import {validateFields} from '../src/data/house';
import {validateDrawing} from '../src/drawing';
describe('licensed sample and schema provenance',()=>{
 it('matches every documented original/sample hash',()=>{const p=JSON.parse(fs.readFileSync('samples/PROVENANCE.json','utf8'));for(const [name,hash]of Object.entries(p.files))expect(createHash('sha256').update(fs.readFileSync(`samples/${name}`)).digest('hex')).toBe(hash);});
 it('retains all seven donor tasks and all 41 original element records',()=>{const p=JSON.parse(fs.readFileSync('samples/seed-changes.json','utf8'));expect(p.changes).toHaveLength(7);let total=0;for(const change of p.changes){const fields=parse(change.content.split('---')[1]);validateFields(fields);const drawing=JSON.parse(fields.content);expect(validateDrawing(drawing)).toBe(true);const records=Object.values(drawing.document.store) as {id:string;x:number;y:number;sourceElement:{id:string;x:number;y:number}}[];total+=records.length;for(const r of records){expect(r.id).toBe(r.sourceElement.id);expect(r.x).toBe(r.sourceElement.x);expect(r.y).toBe(r.sourceElement.y);}}expect(total).toBe(41);});
 it('validates additive collection without changing original drawing schema',()=>{const original=fs.readFileSync('reports/original-room-schema.yaml','utf8');const combined=fs.readFileSync('reports/combined-room-schema.yaml','utf8');expect(combined.startsWith(original.trimEnd())).toBe(true);expect(verify(combined).verdict).toBe('accept');expect(verify(fs.readFileSync('schema.yaml','utf8')).verdict).toBe('accept');});
});
