import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async id=>JSON.parse(await readFile(new URL(`../corpus/books/pseudepigrapha-historical/${id}.json`,import.meta.url),'utf8'));
const apab=await load('APAB'), asis=await load('ASIS');
const count=b=>Object.values(b.chapters).reduce((n,a)=>n+a.length,0);
assert.equal(Object.keys(apab.chapters).length,32); assert.equal(count(apab),295); assert.equal(apab.book.verses,295);
assert.equal(Object.keys(asis.chapters).length,11); assert.equal(count(asis),297); assert.equal(asis.book.verses,297);
assert.equal(apab.chapters['1'][0].v,'1'); assert.match(apab.chapters['1'][0].text,/On the day when I planed the gods/);
assert.equal(apab.chapters['1'][1].v,'2');
assert.ok(asis.chapters['4'].some(v=>v.v==='8')); assert.ok(asis.chapters['8'].some(v=>v.v==='18'));
const a17=asis.chapters['1'].find(v=>v.v==='7').text; assert.match(a17,/the Spirit which speaketh in me liveth/); assert.doesNotMatch(a17,/th3e/);
const all=[...Object.values(apab.chapters).flat(),...Object.values(asis.chapters).flat()].map(v=>v.text).join('\n');
for(const bad of ['The whole of the title occurs only in S.','PART I','CHAP.','Notes:','oinojieeffect','willjthey7make','th3e']) assert.ok(!all.includes(bad),`reader contamination remains: ${bad}`);
assert.doesNotMatch(all,/\b\d{1,3}(?:The|And|For|But|Cf\.)\b/);
assert.match(apab.chapters['1'][0].text,/Mighty God in truth is—$/);
assert.match(apab.chapters['6'].find(v=>v.v==='10').text,/god Joavon \[who standeth/);
assert.match(apab.chapters['6'].find(v=>v.v==='17').text,/^And he\] Barisat/);
assert.match(apab.chapters['7'].find(v=>v.v==='11').text,/\[and tested me in the confusion of my thoughts\]/);
assert.match(apab.chapters['15'].find(v=>v.v==='5').text,/air\] on the height/);
assert.match(apab.chapters['24'].find(v=>v.v==='8').text,/assigned to perdition\]\.$/);
assert.match(apab.chapters['25'].find(v=>v.v==='6').text,/inciteth murderous sacrifices/);
assert.match(apab.chapters['32'][0].text,/seventh generation \(shall\) go with thee/);
assert.doesNotMatch(apab.chapters['32'][0].text,/ADDITIONAL NOTES|APPENDIX|INDEX/i);
assert.ok(apab.chapters['32'][0].text.length < 1000,'APAB 32:1 must remain primary text only');
for(const [chapter,verses] of Object.entries(apab.chapters)){
  const chapterText=verses.map(v=>v.text).join(' ');
  assert.equal((chapterText.match(/\[/g)||[]).length,(chapterText.match(/\]/g)||[]).length,`APAB chapter ${chapter}: unbalanced editorial brackets`);
}
console.log(`PASS: APAB ${count(apab)} verse segments; ASIS ${count(asis)} verse segments; reader text is free of scan footnote/page-furniture contamination`);
