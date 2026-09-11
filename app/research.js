const norm = (value) => String(value ?? "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\b(the|first|second|third|book|epistle|gospel|according|to|of|moses|called|apostle|general|saint|st)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const bookIdentity = (work) => norm(work?.name || work?.title || work?.bookId || "");
const wordTokens = (value) => String(value ?? "").match(/[\p{L}\p{N}'’]+|[^\s\p{L}\p{N}'’]+/gu) || [];
const wordNorm = (value) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export function relatedReadableWorks(primary, works) {
  if (!primary) return [];
  const identity = bookIdentity(primary);
  if (!identity) return [];
  return works.filter((work) => work.key !== primary.key && work.contentState === "local-readable" && bookIdentity(work) === identity);
}

export function alignSegments(primary = [], secondary = []) {
  const byLabel = new Map();
  secondary.forEach((segment, index) => {
    const label = String(segment?.label ?? segment?.v ?? index + 1);
    if (!byLabel.has(label)) byLabel.set(label, { segment, index });
  });
  const used = new Set();
  const rows = primary.map((segment, index) => {
    const label = String(segment?.label ?? segment?.v ?? index + 1);
    const match = byLabel.get(label);
    const fallback = !match && secondary[index] ? { segment: secondary[index], index } : null;
    const picked = match || fallback;
    if (picked) used.add(picked.index);
    return { label, primary: segment, secondary: picked?.segment || null, primaryIndex: index, secondaryIndex: picked?.index ?? null };
  });
  secondary.forEach((segment, index) => {
    if (used.has(index)) return;
    rows.push({ label: String(segment?.label ?? segment?.v ?? index + 1), primary: null, secondary: segment, primaryIndex: null, secondaryIndex: index });
  });
  return rows;
}

export function wordDiff(a, b, maxTokens = 250) {
  const left = wordTokens(a).slice(0, maxTokens);
  const right = wordTokens(b).slice(0, maxTokens);
  const n = left.length, m = right.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) {
    dp[i][j] = wordNorm(left[i]) && wordNorm(left[i]) === wordNorm(right[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const leftOut = [], rightOut = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && wordNorm(left[i]) && wordNorm(left[i]) === wordNorm(right[j])) {
      leftOut.push({ text: left[i], changed: false }); rightOut.push({ text: right[j], changed: false }); i += 1; j += 1;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1]?.[j])) {
      rightOut.push({ text: right[j], changed: true }); j += 1;
    } else if (i < n) {
      leftOut.push({ text: left[i], changed: true }); i += 1;
    }
  }
  return { left: leftOut, right: rightOut, truncated: wordTokens(a).length > maxTokens || wordTokens(b).length > maxTokens };
}

export function makeCitation(work, book, chapter, segment = null) {
  const title = work?.title || book?.book?.title || book?.book?.name || "Untitled work";
  const edition = work?.editionTitle || book?.edition?.title || book?.edition?.name || "";
  const label = segment?.label ?? segment?.v ?? "";
  const sectionLabel = book?.chapterLabels?.[chapter] || `Chapter ${chapter}`;
  const locator = label ? `${sectionLabel}:${label}` : sectionLabel;
  return `${title}. ${edition ? `${edition}. ` : ""}${locator}. Covenant Library.`.replace(/\s+/g, " ").trim();
}

export function sourceProfile(work, edition = {}, book = {}) {
  const meta = book?.book || {};
  return {
    workKey: work?.key || "",
    title: work?.title || meta.title || meta.name || "",
    edition: work?.editionTitle || edition?.title || book?.edition?.title || "",
    collection: work?.collectionLabel || edition?.collectionLabel || "",
    language: edition?.language || book?.edition?.language || "",
    contentState: work?.contentState || "",
    sourceUrl: work?.sourceUrl || null,
    rights: meta.rights || edition?.rights || book?.edition?.rights || "",
    license: meta.license || edition?.license || book?.edition?.license || "",
    licenseUrl: meta.licenseUrl || edition?.licenseUrl || null,
    translator: meta.translator || edition?.translator || "",
    attribution: meta.attribution || "",
    sourceNote: meta.sourceNote || "",
    manuscriptWitnesses: Array.isArray(meta.manuscriptWitnesses) ? meta.manuscriptWitnesses : [],
    sourceUrls: Array.isArray(meta.sourceUrls) ? meta.sourceUrls : []
  };
}

export function concordanceFromDocuments(term, documents = []) {
  const needle = wordNorm(term);
  if (!needle) return { term: "", total: 0, byWork: [], hits: [] };
  const hits = [];
  const counts = new Map();
  for (const doc of documents) {
    const words = String(doc.text || "").match(/[\p{L}\p{N}'’]+/gu) || [];
    const count = words.reduce((sum, word) => sum + (wordNorm(word) === needle ? 1 : 0), 0);
    if (!count) continue;
    hits.push({ ...doc, count });
    counts.set(doc.work, (counts.get(doc.work) || 0) + count);
  }
  const byWork = [...counts.entries()].map(([work, count]) => ({ work, count })).sort((a, b) => b.count - a.count || a.work.localeCompare(b.work));
  return { term: String(term), total: hits.reduce((sum, hit) => sum + hit.count, 0), byWork, hits };
}

export function backlinkIndex(studyBible = {}, userItems = []) {
  const index = new Map();
  const add = (target, item) => { if (!target) return; if (!index.has(target)) index.set(target, []); index.get(target).push(item); };
  const crossrefs = studyBible?.crossReferences || studyBible?.crossrefs || {};
  for (const [source, refs] of Object.entries(crossrefs)) {
    for (const ref of Array.isArray(refs) ? refs : []) add(String(ref.reference || ref.ref || ref), { type: "cross-reference", source });
  }
  for (const item of userItems) add(`${item.work} ${item.chapter}:${item.label || item.passage || ""}`.trim(), { type: item.type || "user", ...item });
  return index;
}

export function exportResearchBundle({ title = "Covenant Library Research Bundle", items = [], notes = [], citations = [], sources = [] } = {}) {
  return JSON.stringify({ schema: "covenant-library-research-bundle/v1", exportedAt: new Date().toISOString(), title, items, notes, citations, sources }, null, 2);
}

export function parallelPassagesFromStudy(studyBible = {}, bookName, chapter, verse) {
  const rows = studyBible?.crossrefs?.[bookName]?.[String(chapter)] || [];
  const targetVerse = String(verse ?? "");
  const seen = new Set();
  const results = [];
  for (const row of rows) {
    if (String(row.verse ?? "") !== targetVerse) continue;
    for (const reference of row.references || []) {
      const value = String(reference || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      results.push({ reference: value, anchor: String(row.anchor || "") });
    }
  }
  return results;
}
