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

    # Locate the rendered chapter heading in the DOM, then walk forward through
    # text nodes. Weebly uses different nesting on different 2 Enoch pages:
    # some expose "CHAPTER N" as one node, others expose "CHAPTER" and N
    # separately. DOM traversal avoids depending on either serialization.
    heading_end = None
    marker = f"CHAPTER {chapter}"
    for node in soup.find_all(string=True):
        value = clean(str(node))
        if not value or "CHAPTER" not in value.upper():
            continue
        if marker in value.upper():
            heading_end = node
            break
        if value.upper() == "CHAPTER":
            seen = 0
            for nxt in node.find_all_next(string=True):
                candidate = clean(str(nxt))
                if not candidate:
                    continue
                seen += 1
                if candidate == str(chapter):
                    heading_end = nxt
                    break
                if seen >= 8:
                    break
            if heading_end is not None:
                break
    if heading_end is None:
        raise RuntimeError(f"{url}: unable to locate DOM chapter heading {marker!r}")

    body = []
    for node in heading_end.find_all_next(string=True):
        value = clean(str(node))
        if not value:
            continue
        if value == "* * *" or value.startswith("Previous chapter"):
            break
        body.append(value)
    if not body:
        raise RuntimeError(f"{url}: no text nodes found after chapter heading")
    return url, body

def parse_chapter(chapter: int):
    url, lines = body_lines(chapter)
    intro = []
    verses = []
    current = None
    pending_number = None
    expected_next = 1

    def finish_current():
        nonlocal current
        if current is not None:
            current["text"] = clean(current["text"])
            if not current["text"]:
                raise RuntimeError(f"chapter {chapter} verse {current['v']}: blank text")
            verses.append(current)
            current = None

    for line in lines:
        # Common rendering: verse number and text remain on one line.
        m = re.match(r"^(\d+)\s+(.+)$", line)
        if m and int(m.group(1)) == expected_next:
            finish_current()
            n = int(m.group(1))
            current = {"v": str(n), "text": clean(m.group(2)), "kind": "paragraph", "label": str(n)}
            expected_next = n + 1
            pending_number = None
            continue

        # Weebly may also split a verse number into its own text node. Only
        # accept the next expected number, so years and other numerals inside
        # the source text cannot accidentally become verse labels.
        if re.fullmatch(r"\d+", line) and int(line) == expected_next:
            finish_current()
            pending_number = int(line)
            expected_next += 1
            continue

        if pending_number is not None:
            current = {
                "v": str(pending_number),
                "text": line,
                "kind": "paragraph",
                "label": str(pending_number)
            }
            pending_number = None
        elif current is not None:
            current["text"] = clean(current["text"] + " " + line)
        else:
            intro.append(line)

    if pending_number is not None:
        raise RuntimeError(f"chapter {chapter} verse {pending_number}: number found without text")
    finish_current()

    nums = [int(v["v"]) for v in verses]
    expected = list(range(1, len(nums) + 1))
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
