import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const stable=x=>JSON.stringify(x,null,2)+'\n';
const configs={
 APAB:{md:'corpus/provenance/reading-transcriptions/apocalypse-of-abraham-clean.md',title:'The Apocalypse of Abraham',name:'Apocalypse of Abraham',sequence:17,chapters:32,translator:'G. H. Box (historical English witness)',source:'https://github.com/scrollmapper/bible_databases_deuterocanonical/blob/271173e/sources/en/apocalypse-of-abraham/apocalypse-of-abraham.md'},
 ASIS:{md:'corpus/provenance/reading-transcriptions/ascension-of-isaiah-clean.md',title:'The Ascension of Isaiah',name:'Ascension of Isaiah',sequence:18,chapters:11,translator:'R. H. Charles (historical English witness)',source:'https://github.com/scrollmapper/bible_databases_deuterocanonical/blob/271173e/sources/en/ascension-of-isaiah/ascension-of-isaiah.md'}
};
function parse(md){
 const chapters={}; let count=0;
 for(const line of md.split(/\r?\n/)){
   if(!line.trim()) continue;
   const m=line.match(/^\[(\d+):(\d+)\]\s*(.*)$/u);
   if(!m) throw new Error(`Unparsed source line: ${line.slice(0,120)}`);
   const [,c,v,text]=m; chapters[c]??=[];
   chapters[c].push({v:String(v),label:String(v),text:text.trim()}); count++;
 }
 return {chapters,count};
}
const manifestPath=join(repo,'corpus/suite-manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const catalogPath=join(repo,'corpus/catalog/catalog.json');
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const workIndexPath=join(repo,'corpus/catalog/work-index.json');
const workIndex=JSON.parse(await readFile(workIndexPath,'utf8'));
const studyPath=join(repo,'corpus/study/reference.json');
const study=JSON.parse(await readFile(studyPath,'utf8'));
const audit={schema:'covenant-library-repair-audit/v1',repairId:'pseudepigrapha-clean-reading-transcription/v1',works:[]};
for(const [id,cfg] of Object.entries(configs)){
 const parsed=parse(await readFile(join(repo,cfg.md),'utf8'));
 if(Object.keys(parsed.chapters).length!==cfg.chapters) throw new Error(`${id}: expected ${cfg.chapters} chapters`);
 const book={
  edition:'pseudepigrapha-historical',
  book:{id,name:cfg.name,title:cfg.title,sequence:cfg.sequence,chapters:cfg.chapters,verses:parsed.count},
  chapters:parsed.chapters,
  localMirror:{status:'bundled',source:'SPCK 1919 public-domain historical English witness; verse structure cross-checked against the pinned Scrollmapper transcription',method:'clean verse-level reading transcription; printed footnotes, page headers, and editorial apparatus excluded from reader text',sourceIdentity:'edition-matched historical witness',provenanceUrl:cfg.source},
  normalization:{id:'pseudepigrapha-clean-reading-transcription/v1',behavior:'reader-text-only; no printed footnote/page-furniture contamination'}
 };
 const out=stable(book), bytes=Buffer.from(out,'utf8');
 const path=join(repo,`corpus/books/pseudepigrapha-historical/${id}.json`);
 await writeFile(path,out,'utf8');
 const key=`pseudepigrapha-historical/${id}`;
 if(!manifest.works?.[key]) throw new Error(`manifest missing ${key}`);
 manifest.works[key].bytes=bytes.length; manifest.works[key].sha256=sha256(bytes);
 const catBook=catalog.editions.flatMap(e=>e.books||[]).find(b=>b.id===id);
 if(!catBook) throw new Error(`catalog missing ${id}`);
 catBook.verses=parsed.count;
 catBook.sourceNote=`${id==='APAB'?'G. H. Box':'R. H. Charles'} public-domain historical English witness; clean verse-level reader transcription`;
 catBook.localMirrorNote='Bundled clean verse-level transcription matched to the SPCK 1919 public-domain witness; printed footnotes/page furniture excluded from reader text.';
 const wi=workIndex.find(w=>w.bookId===id && w.editionId==='pseudepigrapha-historical');
 if(!wi) throw new Error(`work-index missing ${id}`);
 wi.sectionCount=cfg.chapters; wi.segmentCount=parsed.count;
 const st=study[key];
 if(st){
   st.rights='Public-domain historical English witness (SPCK, 1919). Covenant Library bundles the complete reader transcription for free offline access.';
   st.sourceNote='Clean verse-level reading transcription matched to the public-domain SPCK 1919 witness; printed footnotes, page furniture, and editorial apparatus are excluded from reader text.';
   st.availability='local-json';
 }
 audit.works.push({id,title:cfg.title,chapters:cfg.chapters,segments:parsed.count,sha256:sha256(bytes),source:cfg.source});
}
manifest.suiteVersion='1.0.4'; manifest.corpusVersion='1.0.4-r8-text-integrity-repair.1'; manifest.generatedAt=new Date().toISOString();
manifest.repairs=[...(manifest.repairs||[]).filter(r=>r.id!=='pseudepigrapha-clean-reading-transcription/v1'),{id:'pseudepigrapha-clean-reading-transcription/v1',collection:'pseudepigrapha-historical',works:['APAB','ASIS'],behavior:'Replaces scan-OCR chapter blobs with complete verse-level reading transcriptions; printed footnotes and page furniture excluded.'}];
await writeFile(manifestPath,stable(manifest));
await writeFile(catalogPath,stable(catalog));
await writeFile(workIndexPath,stable(workIndex));
await writeFile(studyPath,stable(study));
await writeFile(join(repo,'corpus/provenance/pseudepigrapha-reading-text-repair.json'),stable(audit));
console.log(JSON.stringify(audit,null,2));
