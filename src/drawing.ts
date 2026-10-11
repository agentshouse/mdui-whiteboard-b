export type Shape = {id:string;typeName:'shape';type:string;x:number;y:number;rot:number;z:number;props:Record<string,unknown>;[key:string]:unknown};
export type DrawingValue = {document:{store:Record<string,Shape>}};
const types=new Set(['draw','highlight','line','arrow','geo','text','note']);
export function validateDrawing(value:unknown):value is DrawingValue {
 if(!value||typeof value!=='object'||!('document' in value))return false;
 const doc=value.document;if(!doc||typeof doc!=='object'||!('store' in doc)||!doc.store||typeof doc.store!=='object'||Array.isArray(doc.store))return false;
 return Object.entries(doc.store).every(([id,r])=>{
  if(!r||typeof r!=='object'||r.id!==id||r.typeName!=='shape'||!types.has(r.type)||!['x','y','rot','z'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k]))||!r.props||typeof r.props!=='object')return false;
  if(!['black','grey','light-violet','violet','blue','light-blue','yellow','orange','green','light-green','light-red','red'].includes(r.props.color)||!['s','m','l','xl'].includes(r.props.size))return false;
  if(r.props.font!==undefined&&!['draw','sans','serif','mono'].includes(r.props.font))return false;
  if(r.props.fill!==undefined&&!['none','semi','solid','pattern'].includes(r.props.fill))return false;
  if(r.props.dash!==undefined&&!['draw','solid','dashed','dotted'].includes(r.props.dash))return false;
  if(['draw','highlight'].includes(r.type))return Array.isArray(r.props.pts)&&r.props.pts.length>=3&&r.props.pts.length%3===0&&r.props.pts.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v));
  if(['line','arrow'].includes(r.type))return ['dx','dy'].every(k=>typeof r.props[k]==='number'&&Number.isFinite(r.props[k]));
  if(r.type==='geo')return ['w','h'].every(k=>typeof r.props[k]==='number'&&Number.isFinite(r.props[k]));
  return typeof r.props.text==='string';
 });
}
/** Native document remains one business field. Merge disjoint record edits on
 * same-browser CAS; overlapping record input is deliberately later-input-wins. */
export function mergeDrawing(base:string,next:string,current:string):string {
 try {
  const b:unknown=JSON.parse(base),n:unknown=JSON.parse(next),c:unknown=JSON.parse(current);
  if(!validateDrawing(b)||!validateDrawing(n)||!validateDrawing(c))return next;
  const records={...c.document.store};
  for(const id of new Set([...Object.keys(b.document.store),...Object.keys(n.document.store)])){
   if(JSON.stringify(b.document.store[id])===JSON.stringify(n.document.store[id]))continue;
   if(n.document.store[id])records[id]=n.document.store[id];else delete records[id];
  }
  return JSON.stringify({...c,document:{...c.document,store:records}});
 }catch{return next;}
}
