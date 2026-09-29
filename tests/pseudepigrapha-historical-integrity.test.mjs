import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const expected = {
  '2BAR': {chapters:87, segments:695},
  '2EN': {chapters:68, segments:321},
  '3BAR': {chapters:17, chapterKeys:18, segments:128},
  'APAB': {chapters:32, segments:295},
  'ASIS': {chapters:11, segments:297},
  'JAS': {chapters:29, segments:211},
  'PSS': {chapters:18, segments:327},
  'TAB': {chapters:20, segments:204},
  'TAsh': {chapters:1, segments:48},
  'TBen': {chapters:2, segments:79},
  'TDan': {chapters:2, segments:54},
  'TGad': {chapters:2, segments:57},
  'TIss': {chapters:2, segments:62},
  'TJOB': {chapters:12, segments:324},
  'TJos': {chapters:2, segments:165},
  'TJud': {chapters:4, segments:175},
  'TLev': {chapters:5, segments:165},
  'TMos': {chapters:12, segments:102},
  'TNap': {chapters:2, segments:68},
  'TReu': {chapters:2, segments:72},
  'TSim': {chapters:3, segments:52},
  'TZeb': {chapters:2, segments:79}
};

const load = async id => JSON.parse(await readFile(
  new URL(`../corpus/books/pseudepigrapha-historical/${id}.json`, import.meta.url),
  'utf8'
));

for (const [id, exp] of Object.entries(expected)) {
  const book = await load(id);
  const chapterKeys = Object.keys(book.chapters || {});
  const rows = chapterKeys.flatMap(ch => (book.chapters[ch] || []).map(v => ({ch, ...v})));
  const refs = rows.map(v => `${v.ch}:${v.v}`);

  assert.equal(book.book.chapters, exp.chapters, `${id}: metadata chapter count`);
  assert.equal(chapterKeys.length, exp.chapterKeys ?? exp.chapters, `${id}: chapter key count`);
  assert.equal(book.book.verses, exp.segments, `${id}: metadata segment count`);
  assert.equal(rows.length, exp.segments, `${id}: actual segment count`);
  assert.equal(new Set(refs).size, refs.length, `${id}: duplicate references`);
  assert.ok(rows.every(v => String(v.text || '').trim()), `${id}: empty reader segment`);

  const all = rows.map(v => v.text).join('\n');
  for (const bad of ['ADDITIONAL NOTES','APPENDIX I','INDEX 99','*[70:3]**','[4:and]']) {
    assert.ok(!all.includes(bad), `${id}: reader contamination remains: ${bad}`);
  }
  assert.ok(!rows.some(v => v.text.trim() === '['), `${id}: stray bracket segment`);
}

const b2 = await load('2BAR');
assert.ok(b2.chapters['70'].some(v => v.v === '3'), '2BAR: swallowed 70:3 not restored');
assert.deepEqual(b2.chapters['34'].map(v => v.v), ['1'], '2BAR: Chapter 34 must be one normalized reader unit');
assert.deepEqual(b2.chapters['37'].map(v => v.v), ['1'], '2BAR: Chapter 37 must be one numbered unit');
assert.deepEqual(b2.chapters['68'].map(v => v.v), Array.from({length:8},(_,i)=>String(i+1)), '2BAR: Chapter 68 numbering must be 1-8');
assert.equal(b2.chapters['27'].length, 15, '2BAR: Chapter 27 must include restored 27:15');
assert.match(b2.chapters['27'].find(v=>v.v==='9').text,/eighth part a multitude of portents/);
assert.match(b2.chapters['37'][0].text,/vine growing/);
assert.doesNotMatch(b2.chapters['37'][0].text,/vine glowing/);
assert.match(b2.chapters['35'].find(v=>v.v==='4').text,/smoke of the incense/);
assert.match(b2.chapters['29'].find(v=>v.v==='8').text,/will come to pass/);
assert.doesNotMatch(b2.chapters['29'].find(v=>v.v==='8').text,/willcome/);
assert.match(b2.chapters['62'].find(v=>v.v==='1').text,/thou hast seen/);
assert.doesNotMatch(b2.chapters['62'].find(v=>v.v==='1').text,/thou bast seen/);
for (const chapter of Object.keys(b2.chapters)) {
  const nums = b2.chapters[chapter].map(v => Number(v.v));
  assert.deepEqual(nums, Array.from({length:nums.length},(_,i)=>i+1), `2BAR: chapter ${chapter} references must be sequential`);
}

const b3 = await load('3BAR');
assert.deepEqual(b3.chapters['0'].map(v => v.v), ['1','2'], '3BAR: prologue refs must be unique');
assert.equal(b3.chapterLabels['0'], 'Prologue');

const job = await load('TJOB');
assert.equal(job.chapters['9'].length, 20, 'TJOB: Chapter 9 must contain one coherent 20-verse witness');
assert.deepEqual(job.chapters['9'].map(v => v.v), Array.from({length:20},(_,i)=>String(i+1)));

console.log('PASS: all 22 pseudepigrapha-historical reader books pass structure, count, duplicate-reference, and contamination checks');
