import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {getNotes} from '../content/notes.ts';
import review from '../research/teaching-reviews/4HB1-cells-teaching-2026-10-09.json' with {type:'json'};
const inventoryPath='research/syllabus/4HB1-cells-foundations.json';
const reviewPath='research/teaching-reviews/4HB1-cells-teaching-2026-10-09.json';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'igcses-multi-teaching-'));
 for(const folder of ['scripts','research/syllabus','research/teaching-reviews','research/curriculum-audits','content/notes'])mkdirSync(join(root,folder),{recursive:true});
 for(const path of ['scripts/teaching_review.py','scripts/note_io.py',inventoryPath,reviewPath,'content/notes/human-biology.json',...review.auditSources.map(s=>s.ref)])cpSync(path,join(root,path));
 cpSync('public/diagrams',join(root,'public/diagrams'),{recursive:true});
 const run=()=>spawnSync('python3',['-c',"import sys,json;from pathlib import Path;sys.path.insert(0,'scripts');from teaching_review import validate_inventory_completion;print(json.dumps(validate_inventory_completion(Path('.'),json.loads(Path(sys.argv[1]).read_text()))))",inventoryPath],{cwd:root,encoding:'utf8'});
 const edit=(fn:(r:typeof review)=>void)=>{const value=JSON.parse(readFileSync(join(root,reviewPath),'utf8'));fn(value);writeFileSync(join(root,reviewPath),JSON.stringify(value));};
 return{root,run,edit};
}
void test('fourteen Human Biology authored statements have 56 distinct requirement decisions while microscopy and chapter stay partial',()=>{
 const f=fixture();try{
 const result=f.run();assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).length,14);
 assert.equal(review.points.reduce((sum,p)=>sum+p.requirements.length,0),56);
 assert.equal(review.auditSources.length,2);
 const n=getNotes('human-biology','cells-and-tissues')!;assert.equal(n.complete,false);
 assert.match(n.sections.find(s=>s.id==='stem-cell-comparison-evidence')!.practice!.answer,/cannot rank clinical effectiveness/);
 assert.match(n.sections.find(s=>s.id==='gamete-function-evidence')!.practice!.answer,/twelve/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
void test('split requirement audits reject missing, duplicated, foreign, ambiguous and stale evidence',()=>{
 const cases:[string,(f:ReturnType<typeof fixture>)=>void][]=[
 ['missing audit',f=>f.edit(r=>{r.auditSources.pop();})],
 ['duplicate audit',f=>f.edit(r=>{r.auditSources.push(r.auditSources[0]);})],
 ['wrong hash',f=>f.edit(r=>{r.auditSources[1].sha256='0'.repeat(64);})],
 ['escaped audit',f=>f.edit(r=>{r.auditSources[1].ref='research/curriculum-audits/../other.json';})],
 ['ambiguous legacy fields',f=>f.edit(r=>{Reflect.set(r,'auditRef',r.auditSources[0].ref);})],
 ['pending requirement',f=>f.edit(r=>{r.points[7].requirements[0].verdict='pending';})],
 ['changed gamete asset',f=>writeFileSync(join(f.root,'public/diagrams/human-biology-gametes.svg'),'<svg/>')],
 ['changed unfamiliar answer',f=>{const p=join(f.root,'content/notes/human-biology.json');const n=JSON.parse(readFileSync(p,'utf8'));n.sections.find((s:{id:string})=>s.id==='gamete-function-evidence').practice.answer='Six diploid chromosomes';writeFileSync(p,JSON.stringify(n));}],
 ];
 for(const [label,mutate]of cases){const f=fixture();try{assert.equal(f.run().status,0);mutate(f);assert.notEqual(f.run().status,0,label);}finally{rmSync(f.root,{recursive:true,force:true});}}
});
