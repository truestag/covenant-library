export const CATEGORY_DEFS = [
  { id: "hebrew-bible", title: "Hebrew Bible & Translations", description: "Hebrew Bible, Old Testament, Septuagint, and historic translation traditions", image: "collection-hebrew-bible.png" },
  { id: "new-testament", title: "New Testament", description: "New Testament texts across historic English and related translation traditions", image: "collection-new-testament.png" },
  { id: "apocrypha", title: "Apocrypha", description: "Biblical deuterocanon and Christian apocryphal writings", image: "collection-apocrypha.png" },
  { id: "pseudepigrapha", title: "Pseudepigrapha & Enochic Literature", description: "Enochic, testamentary, apocalyptic, and related early Jewish writings", image: "collection-pseudepigrapha.png" },
  { id: "early-christian", title: "Early Christian Writings", description: "Apostolic Fathers, creeds, Syriac writings, and other early Christian witnesses", image: "collection-early-christian.png" },
  { id: "gnostic", title: "Gnostic & Related Texts", description: "Nag Hammadi, Bruce Codex, Pistis Sophia, and related texts", image: "collection-new-testament.png" },
  { id: "hymns", title: "Hymns & Songs", description: "Sacred poetry, hymns, prayers, and historical songs", image: "collection-hymns-songs.png" },
  { id: "ethiopian", title: "Ethiopian Scriptures", description: "Tewahedo-canonical and closely related texts represented in the verified corpus", image: "collection-ethiopian.png" },
  { id: "restoration", title: "Restoration Scriptures & Studies", description: "Restoration traditions, their scripture editions, and clearly separated study resources", image: "collection-restoration.png" },
  { id: "jewish", title: "Torah, Mishnah, Talmud & Zohar", description: "Jewish scriptural, rabbinic, and mystical collections kept in their distinct textual families", image: "collection-source-index.png" },
  { id: "sources", title: "Sources & Originals", description: "Source-readable, bibliographic, critical, and original-language records", image: "collection-source-index.png" }
];

const categoryMap = new Map(CATEGORY_DEFS.map((item) => [item.id, item]));

const normalizeName = (value) => String(value || "").toLocaleLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, " ").trim();

const OT_NAMES = new Set([
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"
]);
const NT_NAMES = new Set([
  "matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"
]);

const BIBLE_EDITION_IDS = new Set(["kjv","web","asv","dra","brenton","ylt","gnv1599","jps1917","rv1885","dby","tyndale-nt"]);
const HEBREW_CROSSLIST_IDS = new Set(["jewish-scripture-torah","torah-jps1917"]);
const ENOCHIC_EDITION_IDS = new Set(["enoch-charles","enoch-odeberg-1928","pseudepigrapha-enochic-giants"]);
const PSEUDEPIGRAPHA_EXTRA_IDS = new Set(["jubilees-charles","daniel-apocrypha-open-i"]);

export const standardBiblePart = (work) => {
  const name = normalizeName(work?.name || work?.title);
  if (OT_NAMES.has(name)) return "ot";
  if (NT_NAMES.has(name)) return "nt";
  return "other";
};

export const isAcquisitionEdition = (edition = {}) => {
  const title = String(edition.title || "");
  const id = String(edition.id || "");
  return /\bSource Pack\b/i.test(title)
    || /Online Critical Pseudepigrapha/i.test(title)
    || /Recovered Local Editions/i.test(title)
    || /Source-Readable Works/i.test(title)
    || /Bibliographic and Fragmentary Witnesses/i.test(title)
    || id === "christian-apocrypha-open-i";
};

export const friendlyEditionTitle = (edition = {}) => {
  let title = String(edition.title || edition.id || "Documented edition");
  title = title.replace(/Online Critical Pseudepigrapha\s*·\s*Original-Language Editions/gi, "Original-Language Critical Pseudepigrapha");
  title = title.replace(/Recovered Local Editions\s*·\s*/gi, "");
  title = title.replace(/\bSource Pack\s*([IVXLC\d-]+)/gi, "Collection $1");
  title = title.replace(/\bSource-Readable Works\s*([IVXLC\d-]+)/gi, "Documented Sources $1");
  title = title.replace(/\bBibliographic and Fragmentary Witnesses\s*([IVXLC\d-]+)/gi, "Bibliographic Witnesses $1");
  return title.replace(/\s{2,}/g, " ").replace(/\s*·\s*·\s*/g, " · ").trim();
};

const workText = (work) => `${work?.editionId || ""} ${work?.editionTitle || ""} ${work?.collectionLabel || ""} ${work?.title || ""} ${work?.name || ""}`.toLocaleLowerCase();
const isBibleEdition = (work) => BIBLE_EDITION_IDS.has(work?.editionId);
const isChristianApocrypha = (work) => work?.section === "Christian Apocrypha" || String(work?.editionId || "").startsWith("christian-apocrypha-");
const isPseudepigrapha = (work) => work?.section === "Pseudepigrapha" || String(work?.editionId || "").startsWith("pseudepigrapha-") || ENOCHIC_EDITION_IDS.has(work?.editionId) || PSEUDEPIGRAPHA_EXTRA_IDS.has(work?.editionId);
const isEarlyChristian = (work) => String(work?.editionId || "").startsWith("early-christian-");
const isDedicatedGnostic = (work) => String(work?.editionId || "").startsWith("gnostic-") || work?.editionId === "user-early-christian-gnostic-texts";
const isGnosticRelated = (work) => {
  if (isDedicatedGnostic(work)) return true;
  const text = workText(work);
  if (work?.editionId === "early-christian-sacred-i") return /pistis sophia/.test(text);
  if (work?.editionId !== "christian-apocrypha-open-i") return false;
  return /gospel of thomas|gospel of mary|gospel of philip|gospel of judas|apocryphon|secret book|apocalypse of adam|apocalypse of james|hypostasis|archons|melchizedek|origin of the world|great seth|three steles|thunder|tripartite tractate/.test(text);
};
const isEthiopianRelated = (work) => /tewahedo|ethiop/.test(workText(work));
const isEnochic = (work) => ENOCHIC_EDITION_IDS.has(work?.editionId) || /\benoch\b|book of giants/.test(workText(work));

const jewishSupplementIds = {
  torah: ["torah-jps1917"],
  mishnah: ["rabbinic-mishnah-kulp"],
  tosefta: ["rabbinic-tosefta-sefaria"],
  yerushalmi: ["rabbinic-yerushalmi-guggenheimer"],
  bavli: ["rabbinic-bavli-davidson"],
  zohar: []
};

const groupCount = (records) => ({ records: records.length, readable: records.filter((work) => work.contentState === "local-readable").length });

export function createLibraryHierarchy(catalog, works) {
  const editions = new Map((catalog?.editions || []).map((edition) => [edition.id, edition]));
  const restorationBase = catalog?.taxonomy?.restorationScriptures?.groups || [];
  const restorationStudy = catalog?.taxonomy?.restorationStudyResources?.groups || [];
  const jewishBase = catalog?.taxonomy?.jewishCollections?.groups || [];

  const restorationGroups = [
    ...restorationBase.map((group) => ({ ...group, kind: "tradition", editionIds: [...group.editionIds, ...(group.id === "utah-lds" ? ["pgp1851"] : [])] })),
    ...restorationStudy.map((group) => ({ ...group, kind: "study", description: "Study resources · not canon" }))
  ];
  const jewishGroups = jewishBase.map((group) => ({ ...group, kind: "collection", editionIds: [...group.editionIds, ...(jewishSupplementIds[group.id] || [])] }));

  function categoryMatches(work, categoryId) {
    const part = standardBiblePart(work);
    switch (categoryId) {
      case "hebrew-bible": return (isBibleEdition(work) && part === "ot") || (HEBREW_CROSSLIST_IDS.has(work.editionId) && part === "ot");
      case "new-testament": return isBibleEdition(work) && part === "nt";
      case "apocrypha": return (isBibleEdition(work) && part === "other") || isChristianApocrypha(work);
      case "pseudepigrapha": return isPseudepigrapha(work);
      case "early-christian": return isEarlyChristian(work);
      case "gnostic": return isGnosticRelated(work);
      case "hymns": return work?.section === "Hymns & Songs" || /hymn|song|sacred poetry/.test(workText(work));
      case "ethiopian": return isEthiopianRelated(work);
      case "restoration": return restorationGroups.some((group) => group.editionIds.includes(work.editionId));
      case "jewish": return jewishGroups.some((group) => group.editionIds.includes(work.editionId));
      case "sources": return work.contentState !== "local-readable" || String(work.editionId || "").startsWith("research-");
      default: return false;
    }
  }

  function groupsForCategory(categoryId) {
    if (categoryId === "apocrypha" || categoryId === "pseudepigrapha") return [];
    if (categoryId === "restoration") return restorationGroups;
    if (categoryId === "jewish") return jewishGroups;
    return [];
  }

  function groupMatches(work, categoryId, groupId) {
    if (!categoryMatches(work, categoryId)) return false;
    if (!groupId) return true;
    if (categoryId === "apocrypha") {
      return groupId === "biblical-apocrypha" ? isBibleEdition(work) && standardBiblePart(work) === "other" : groupId === "christian-apocrypha" ? isChristianApocrypha(work) : false;
    }
    if (categoryId === "pseudepigrapha") return groupId === "enochic" ? isEnochic(work) : groupId === "other-pseudepigrapha" ? !isEnochic(work) : false;
    const group = groupsForCategory(categoryId).find((item) => item.id === groupId);
    if (!group || !group.editionIds?.includes(work.editionId)) return false;
    if (categoryId === "restoration" && work.editionId === "kjv") return standardBiblePart(work) === "ot" || standardBiblePart(work) === "nt";
    return true;
  }

  function records(categoryId, groupId = "", editionId = "") {
    return works.filter((work) => groupMatches(work, categoryId, groupId) && (!editionId || work.editionId === editionId));
  }

  function categorySummary(categoryId) {
    return groupCount(records(categoryId));
  }

  function groupSummary(categoryId, groupId) {
    return groupCount(records(categoryId, groupId));
  }

  function editionIds(categoryId, groupId = "") {
    return [...new Set(records(categoryId, groupId).map((work) => work.editionId))];
  }

  function meaningfulEditions(categoryId, groupId = "") {
    return editionIds(categoryId, groupId).filter((id) => !isAcquisitionEdition(editions.get(id) || { id }));
  }

  function flattenedWorks(categoryId, groupId = "") {
    const acquisitionIds = new Set(editionIds(categoryId, groupId).filter((id) => isAcquisitionEdition(editions.get(id) || { id })));
    return records(categoryId, groupId).filter((work) => acquisitionIds.has(work.editionId));
  }

  function groupForEdition(categoryId, editionId) {
    return groupsForCategory(categoryId).find((group) => group.editionIds?.includes(editionId))?.id || "";
  }

  function defaultContext(work) {
    if (!work) return { category: "sources", group: "" };
    const restorationEdition = restorationGroups.find((group) => group.editionIds.includes(work.editionId));
    if (restorationEdition && !BIBLE_EDITION_IDS.has(work.editionId)) return { category: "restoration", group: restorationEdition.id };
    const jewishEdition = jewishGroups.find((group) => group.editionIds.includes(work.editionId));
    if (jewishEdition && !BIBLE_EDITION_IDS.has(work.editionId)) return { category: "jewish", group: jewishEdition.id };
    if (isChristianApocrypha(work)) return { category: "apocrypha", group: "christian-apocrypha" };
    if (isPseudepigrapha(work)) return { category: "pseudepigrapha", group: isEnochic(work) ? "enochic" : "other-pseudepigrapha" };
    if (isGnosticRelated(work)) return { category: "gnostic", group: "" };
    if (work?.section === "Hymns & Songs") return { category: "hymns", group: "" };
    if (isEarlyChristian(work)) return { category: "early-christian", group: "" };
    if (isEthiopianRelated(work)) return { category: "ethiopian", group: "" };
    if (isBibleEdition(work)) {
      const part = standardBiblePart(work);
      if (part === "nt") return { category: "new-testament", group: "" };
      if (part === "other") return { category: "apocrypha", group: "biblical-apocrypha" };
      return { category: "hebrew-bible", group: "" };
    }
    if (work.contentState !== "local-readable") return { category: "sources", group: "" };
    return { category: "hebrew-bible", group: "" };
  }

  return {
    categories: CATEGORY_DEFS,
    category: (id) => categoryMap.get(id),
    groupsForCategory,
    categoryMatches,
    groupMatches,
    records,
    categorySummary,
    groupSummary,
    editionIds,
    meaningfulEditions,
    flattenedWorks,
    groupForEdition,
    defaultContext,
    edition: (id) => editions.get(id),
    editionTitle: (id) => friendlyEditionTitle(editions.get(id) || { id, title: id })
  };
}
