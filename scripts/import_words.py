#!/usr/bin/env python3
"""Import high-school vocabulary from LinXueyuanStdio/DictionaryData."""
from __future__ import annotations

import csv
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "words.json"
BASE = "https://raw.githubusercontent.com/LinXueyuanStdio/DictionaryData/master"
URLS = {
    "word": f"{BASE}/word.csv",
    "translation": f"{BASE}/word_translation.csv",
    "book": f"{BASE}/book.csv",
    # The repository README documents this relation archive as the book ↔ word join.
    "relation": f"{BASE}/relation_book_word.zip",
}
USER_AGENT = "Junior-Study-vocabulary-import/1.0"

POS_PATTERN = re.compile(
    r"(?<![A-Za-z])(?:v\.t\.|v\.i\.|vt\.|vi\.|n\.|v\.|adj\.|a\.|adv\.|ad\.|prep\.|pron\.|conj\.|art\.|num\.|int\.|aux\.|abbr\.|det\.|interj\.)",
    re.IGNORECASE,
)
POS_NORMALIZATION = {
    "a.": "adj.", "ad.": "adv.", "vt.": "v.", "vi.": "v.",
    "v.t.": "v.", "v.i.": "v.", "interj.": "int.",
}


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def text_rows(content: bytes, delimiter: str) -> list[dict[str, str]]:
    text = content.decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text, newline=""), delimiter=delimiter))


def norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def normalize_ipa(value: str | None) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1].strip()
    elif value.startswith("/") and value.endswith("/"):
        return value
    return f"/{value}/"


def high_school_book_ids(books: list[dict[str, str]]) -> tuple[set[str], list[str]]:
    # Match high-school/high-gaokao collections from book.csv, then include their descendants.
    selected: set[str] = set()
    names: list[str] = []
    for row in books:
        name = row.get("bk_name", "")
        full_name = row.get("bk_book", "")
        if "高中" in name or "高考" in name or "高中" in full_name or "高考" in full_name:
            book_id = row.get("bk_id", "").strip()
            if book_id:
                selected.add(book_id)
                names.append(name)

    changed = True
    while changed:
        changed = False
        for row in books:
            book_id = row.get("bk_id", "").strip()
            parent_id = row.get("bk_parent_id", "").strip()
            if book_id and parent_id in selected and book_id not in selected:
                selected.add(book_id)
                names.append(row.get("bk_name", ""))
                changed = True
    return selected, list(dict.fromkeys(names))


def extract_pos_and_meaning(translations: list[str]) -> tuple[str, str]:
    positions: list[str] = []
    cleaned: list[str] = []
    for translation in translations:
        def replace_pos(match: re.Match[str]) -> str:
            marker = match.group(0).lower()
            normalized = POS_NORMALIZATION.get(marker, marker)
            if normalized not in positions:
                positions.append(normalized)
            return " "

        meaning = POS_PATTERN.sub(replace_pos, translation)
        meaning = re.sub(r"\s+", " ", meaning)
        meaning = re.sub(r"^[\s,，;；:/、]+|[\s,，;；:/、]+$", "", meaning).strip()
        if meaning and meaning not in cleaned:
            cleaned.append(meaning)
    return " / ".join(positions), "；".join(cleaned)


def read_relation_word_ids(content: bytes, selected_books: set[str]) -> set[str]:
    word_ids: set[str] = set()
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        candidates = [name for name in archive.namelist() if name.endswith("relation_book_word.csv")]
        if not candidates:
            raise RuntimeError("relation_book_word.csv was not found in the repository ZIP")
        with archive.open(candidates[0]) as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as stream:
            for relation in csv.DictReader(stream, delimiter=">"):
                if relation.get("bv_book_id", "").strip() in selected_books:
                    word_id = relation.get("bv_voc_id", "").strip()
                    if word_id:
                        word_ids.add(word_id)
    return word_ids


def main() -> int:
    print("Downloading source files from GitHub raw...")
    books = text_rows(fetch_bytes(URLS["book"]), ">")
    word_rows = text_rows(fetch_bytes(URLS["word"]), ">")
    translation_rows = text_rows(fetch_bytes(URLS["translation"]), ",")
    relation_zip = fetch_bytes(URLS["relation"])

    selected_books, selected_book_names = high_school_book_ids(books)
    if not selected_books:
        raise RuntimeError("No high-school or gaokao books were found in book.csv")
    related_word_ids = read_relation_word_ids(relation_zip, selected_books)

    translations_by_word: dict[str, list[str]] = {}
    for row in translation_rows:
        key = norm(row.get("word"))
        translation = (row.get("translation") or "").strip()
        if key and translation:
            values = translations_by_word.setdefault(key, [])
            if translation not in values:
                values.append(translation)

    result: list[dict[str, object]] = []
    missing_translation = 0
    missing_ipa = 0
    missing_pos = 0
    skipped_incomplete = 0
    seen_ids: set[str] = set()
    for row in word_rows:
        word_id = (row.get("vc_id") or "").strip()
        spelling = (row.get("vc_vocabulary") or "").strip()
        if not word_id or word_id not in related_word_ids or word_id in seen_ids or not spelling:
            continue
        seen_ids.add(word_id)
        pronunciation = normalize_ipa(row.get("vc_phonetic_uk") or row.get("vc_phonetic_us"))
        if not pronunciation:
            missing_ipa += 1
        raw_translations = translations_by_word.get(norm(spelling), [])
        part_of_speech, meaning = extract_pos_and_meaning(raw_translations)
        if not raw_translations or not meaning:
            missing_translation += 1
        if not part_of_speech:
            missing_pos += 1
        # Keep the review file complete: omit rows missing any requested dictionary field.
        if not pronunciation or not part_of_speech or not meaning:
            skipped_incomplete += 1
            continue
        result.append({
            "id": word_id,
            "spelling": spelling,
            "pronunciation": pronunciation,
            "partOfSpeech": part_of_speech,
            "meaning": meaning,
            "masteryStatus": "unmastered",
        })

    result.sort(key=lambda item: str(item["spelling"]).casefold())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(OUTPUT),
        "highSchoolBooks": len(selected_books),
        "bookNames": selected_book_names,
        "relatedVocabularyIds": len(related_word_ids),
        "exportedWords": len(result),
        "skippedIncomplete": skipped_incomplete,
        "missingTranslation": missing_translation,
        "missingPronunciation": missing_ipa,
        "missingPartOfSpeech": missing_pos,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
