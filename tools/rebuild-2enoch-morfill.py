#!/usr/bin/env python3
import argparse
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://apocryphalibrary.weebly.com/2-enoch-{}.html"
SCAN = "https://upload.wikimedia.org/wikipedia/commons/0/0d/The_book_of_the_secrets_of_Enoch%3B_%28IA_cu31924014633568%29.pdf"
MODIFIERS = re.compile(r"[\u1d2c-\u1d6a\u2070-\u209f]+(?=[A-Za-z0-9])")
ZW = re.compile(r"[\u200b-\u200f\u2060\ufeff]")

def clean(s: str) -> str:
    s = html.unescape(s)
    s = unicodedata.normalize("NFC", s)
    s = ZW.sub("", s).replace("\xa0", " ")
    s = MODIFIERS.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Site transcription artifact: printed critical marker after "all" became "!".
    s = s.replace("all! who work", "all who work")
    return s

def body_lines(chapter: int):
    url = BASE.format(chapter)
    r = requests.get(url, timeout=30, headers={"User-Agent":"Covenant-Library-source-audit/1.0"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    raw = soup.get_text("\n")
    lines = [clean(x) for x in raw.splitlines()]
    lines = [x for x in lines if x]
    marker = f"CHAPTER {chapter}"
    try:
        i = lines.index(marker)
    except ValueError:
        sample = clean(soup.get_text(" ", strip=True))
        probes = []
        for node in soup.find_all(string=re.compile(r"CHAPTER|There was a very wise|Hardly had I")):
            p = node.parent
            probes.append({"text": clean(str(node))[:500], "tag": getattr(p, "name", None), "class": p.get("class") if hasattr(p, "get") else None, "parent": getattr(getattr(p, "parent", None), "name", None)})
        raise RuntimeError(f"{url}: did not find {marker!r}; raw_marker={marker in r.text}; raw_phrase={'There was a very wise' in r.text}; probes={probes[:20]!r}; tail={sample[-2500:]!r}")
    end = len(lines)
    for j in range(i + 1, len(lines)):
        if lines[j] == "* * *" or lines[j].startswith("Previous chapter"):
            end = j
            break
    return url, lines[i + 1:end]

def parse_chapter(chapter: int):
    url, lines = body_lines(chapter)
    intro = []
    verses = []
    current = None
    for line in lines:
        m = re.match(r"^(\d+)\s+(.+)$", line)
        if m:
            n = int(m.group(1))
            text = clean(m.group(2))
            if current:
                verses.append(current)
            current = {"v": str(n), "text": text, "kind": "paragraph", "label": str(n)}
        else:
            if current:
                current["text"] = clean(current["text"] + " " + line)
            else:
                intro.append(line)
    if current:
        verses.append(current)
    nums = [int(v["v"]) for v in verses]
    expected = list(range(1, len(nums)+1))
    if nums != expected:
        raise RuntimeError(f"chapter {chapter}: non-sequential verse labels {nums}")
    if not verses:
        raise RuntimeError(f"chapter {chapter}: no verses parsed")
    return url, intro, verses

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    chapters = {}
    chapter_labels = {}
    source_pages = {}
    prologue = []
    for ch in range(1, 69):
        url, intro, verses = parse_chapter(ch)
        source_pages[str(ch)] = url
        if intro:
            if ch == 1:
                prologue.extend(intro)
            else:
                # Some pages may carry a descriptive heading before v.1. It is editorial,
                # not part of Morfill/Charles numbered text; keep it out of reader verses.
                pass
        chapters[str(ch)] = verses
        chapter_labels[str(ch)] = f"Chapter {ch}"
        print(f"{ch:02d}: {len(verses)} verses", file=sys.stderr)

    if not prologue:
        raise RuntimeError("chapter 1 unnumbered introduction was not recovered")
    chapters = {"0": [{"v":"1","text":clean(" ".join(prologue)),"kind":"paragraph","label":"1"}], **chapters}
    chapter_labels = {"0":"Introduction", **chapter_labels}
    count = sum(len(v) for v in chapters.values())

    book = {
        "edition": "pseudepigrapha-historical",
        "book": {
            "id": "2EN",
            "name": "2 Enoch",
            "title": "The Book of the Secrets of Enoch (2 Enoch)",
            "sequence": 1,
            "chapters": 68,
            "verses": count,
            "translator": "W. R. Morfill; edited by R. H. Charles",
            "sourceNote": "1896 historical English translation; numbered text follows the Morfill/Charles edition; printed critical and exegetical notes excluded",
            "sourceName": "The Book of the Secrets of Enoch (Oxford: Clarendon Press, 1896)",
            "remoteUrl": SCAN,
            "remoteFormat": "pdf-source",
            "searchable": True,
            "readerAvailability": "bundled-json",
            "bundledJson": True,
            "readerSourceUrl": SCAN,
            "readerSourceHost": "upload.wikimedia.org",
            "proxySupported": False
        },
        "chapterLabels": chapter_labels,
        "chapters": chapters,
        "localMirror": {
            "status": "bundled",
            "source": "W. R. Morfill translation, edited by R. H. Charles, Clarendon Press, 1896",
            "method": "clean verse-level transcription; source chapter/verse divisions retained; printed critical notes, exegetical notes, page furniture, and modern cross-reference links excluded",
            "sourceIdentity": "edition-matched historical witness",
            "sourceScan": SCAN,
            "transcriptionPages": source_pages
        },
        "normalization": {
            "id": "2-enoch-morfill-charles-1896/v1",
            "behavior": "reader-text-only; source numbering retained; unnumbered opening stored as Introduction section 0"
        }
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "chapters":68,
        "sectionKeys":len(chapters),
        "segments":count,
        "prologueChars":len(chapters["0"][0]["text"]),
        "chapterVerseCounts":{k:len(v) for k,v in chapters.items()}
    }, indent=2))

if __name__ == "__main__":
    main()
