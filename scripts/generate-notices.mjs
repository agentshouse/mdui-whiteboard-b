import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=process.cwd();const hash=b=>createHash('sha256').update(b).digest('hex');
const donor=JSON.parse(fs.readFileSync('reports/source-map.json','utf8'));
for(const file of donor.files)assert.equal(hash(fs.readFileSync(file.vendored)),file.sha256,file.vendored);
for(const file of donor.adapted)assert.equal(hash(fs.readFileSync(file.path)),file.sha256,file.path);
const notices=['WHITEBOARD-B — THIRD PARTY NOTICES\nQuickdraw MIT core and UI adapted from https://github.com/quickdrawjs/quickdraw/tree/1eba78b46f19ac0fa71454494a7bda47d4df7e47. House native Draft/Save and shell replace standalone browser storage. Media import/system clipboard removed. Seven sample drawings are adapted from MIT Excalidraw source; full original element metadata and notices retained.'];
for(const file of ['licenses/QUICKDRAW-LICENSE','licenses/EXCALIDRAW-LICENSE','licenses/LUCIDE-LICENSE'])notices.push(`\n${file}\n${fs.readFileSync(file,'utf8')}`);
const supplements=JSON.parse(fs.readFileSync('reports/license-supplements.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));const packages=[],missing=[];
for(const [relative,entry]of Object.entries(lock.packages)){
 if(!relative||entry.dev)continue;const dir=path.join(root,relative);if(!fs.existsSync(path.join(dir,'package.json'))){if(!entry.optional)missing.push(relative);continue;}
 const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));assert(!/elkjs|excalidraw|mermaid/.test(pkg.name),`Excluded dependency ${pkg.name}`);
 const files=fs.readdirSync(dir).filter(n=>/^(licen[cs]e|notice|copying|copyright|ofl|thirdpartynotice)/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());
 packages.push({name:pkg.name,version:pkg.version,license:pkg.license,files});notices.push(`\n${'='.repeat(72)}\n${pkg.name}@${pkg.version}\nDeclared license: ${pkg.license}\n`);
 if(!files.length){const supplement=supplements.find(x=>x.name===pkg.name&&x.version===pkg.version);if(!supplement)missing.push(`${pkg.name}@${pkg.version}`);else {const body=fs.readFileSync(supplement.file);assert.equal(hash(body),supplement.sha256);notices.push(`Source: ${supplement.source}\n${supplement.provenanceNote??''}\n${body}`);}};for(const file of files)notices.push(fs.readFileSync(path.join(dir,file),'utf8'));
}
fs.writeFileSync('public/THIRD_PARTY_NOTICES.txt',notices.join('\n'));fs.writeFileSync('reports/license-audit.json',JSON.stringify({packages,missing},null,2)+'\n');console.log({packages:packages.length,missing});assert.equal(missing.length,0,'Missing exact dependency license text');
