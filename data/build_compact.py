#!/usr/bin/env python3
"""
Build compact JS data files from the full POEM_RECORDS dataset.

Reads data/js/data.js (208,245 records) and outputs:
  - js/poem-dict.js     (author + title dictionaries)
  - js/poem-five.js     (143,092 five-char records, compact format)
  - js/poem-seven.js    (65,153 seven-char records, compact format)

Output is JS files with const assignments, loadable via <script> tags.
Works with both file:// and http:// protocols.

Usage:
  python3 data/build_compact.py
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
SOURCE_FILE = os.path.join(SCRIPT_DIR, "js", "data.js")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "js")  # output to js/ folder


def parse_source(path):
    """Parse POEM_RECORDS array from the JS data file."""
    print(f"Reading {path}...")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the POEM_RECORDS JSON array
    marker = "POEM_RECORDS = ["
    start = content.index(marker) + len(marker) - 1

    # Find matching closing bracket
    depth = 0
    end = start
    for i, c in enumerate(content[start:], start):
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
        if depth == 0:
            end = i + 1
            break

    records = json.loads(content[start:end])
    print(f"Parsed {len(records)} records")
    return records


def build_compact(records):
    """Convert records into compact format with dictionary encoding."""
    # Separate by type
    five_records = [r for r in records if r["type"] == "五言"]
    seven_records = [r for r in records if r["type"] == "七言"]

    print(f"Five-char: {len(five_records)}, Seven-char: {len(seven_records)}")

    # Build author dictionary (sorted for consistency)
    all_authors = sorted(set(r["author"] for r in records))
    author_to_idx = {a: i for i, a in enumerate(all_authors)}

    # Build title dictionary (sorted for consistency)
    all_titles = sorted(set(r["title"] for r in records))
    title_to_idx = {t: i for i, t in enumerate(all_titles)}

    print(f"Authors: {len(all_authors)}, Titles: {len(all_titles)}")

    def encode_group(group_records, char_width):
        """Encode a group of records into compact format."""
        text_parts = []
        author_ids = []
        title_ids = []

        for r in group_records:
            combined = r["line1"] + r["line2"]
            assert len(combined) == char_width, (
                f"Expected {char_width} chars, got {len(combined)}: {combined}"
            )
            text_parts.append(combined)
            author_ids.append(str(author_to_idx[r["author"]]))
            title_ids.append(str(title_to_idx[r["title"]]))

        return {
            "v": 1,
            "t": "".join(text_parts),
            "a": ",".join(author_ids),
            "i": ",".join(title_ids),
        }

    five_data = encode_group(five_records, 10)
    seven_data = encode_group(seven_records, 14)

    dict_data = {
        "v": 1,
        "a": all_authors,
        "t": all_titles,
    }

    return dict_data, five_data, seven_data, five_records, seven_records


def validate(dict_data, five_data, seven_data, five_records, seven_records):
    """Validate by reconstructing sample records and comparing to originals."""
    authors = dict_data["a"]
    titles = dict_data["t"]

    five_author_ids = [int(x) for x in five_data["a"].split(",")]
    five_title_ids = [int(x) for x in five_data["i"].split(",")]
    five_text = five_data["t"]

    seven_author_ids = [int(x) for x in seven_data["a"].split(",")]
    seven_title_ids = [int(x) for x in seven_data["i"].split(",")]
    seven_text = seven_data["t"]

    # Validate all five-char records
    errors = 0
    for idx, r in enumerate(five_records):
        offset = idx * 10
        combined = five_text[offset : offset + 10]
        line1 = five_text[offset : offset + 5]
        line2 = five_text[offset + 5 : offset + 10]
        author = authors[five_author_ids[idx]]
        title = titles[five_title_ids[idx]]

        if combined != r["line1"] + r["line2"]:
            errors += 1
            print(f"MISMATCH five[{idx}]: {combined} != {r['line1']+r['line2']}")
        if author != r["author"]:
            errors += 1
            print(f"MISMATCH five[{idx}] author: {author} != {r['author']}")
        if title != r["title"]:
            errors += 1
            print(f"MISMATCH five[{idx}] title: {title} != {r['title']}")

    # Validate all seven-char records
    for idx, r in enumerate(seven_records):
        offset = idx * 14
        combined = seven_text[offset : offset + 14]
        author = authors[seven_author_ids[idx]]
        title = titles[seven_title_ids[idx]]

        if combined != r["line1"] + r["line2"]:
            errors += 1
            print(f"MISMATCH seven[{idx}]: {combined} != {r['line1']+r['line2']}")
        if author != r["author"]:
            errors += 1
            print(f"MISMATCH seven[{idx}] author: {author} != {r['author']}")
        if title != r["title"]:
            errors += 1
            print(f"MISMATCH seven[{idx}] title: {title} != {r['title']}")

    if errors == 0:
        print(f"Validation passed: all {len(five_records) + len(seven_records)} records OK")
    else:
        print(f"Validation FAILED: {errors} errors")
        sys.exit(1)


def write_output(dict_data, five_data, seven_data):
    """Write compact JS files with const assignments."""
    files = {
        "poem-dict.js": ("POEM_DICT", dict_data),
        "poem-five.js": ("POEM_FIVE", five_data),
        "poem-seven.js": ("POEM_SEVEN", seven_data),
    }

    total_size = 0
    for filename, (var_name, data) in files.items():
        path = os.path.join(OUTPUT_DIR, filename)
        json_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        content = f"const {var_name} = {json_str};\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        size = os.path.getsize(path)
        total_size += size
        print(f"  {filename}: {size / 1024 / 1024:.2f} MB")

    print(f"  Total: {total_size / 1024 / 1024:.2f} MB")


def main():
    print("=== Building compact poetry data ===\n")

    records = parse_source(SOURCE_FILE)
    dict_data, five_data, seven_data, five_records, seven_records = build_compact(records)

    print("\nValidating...")
    validate(dict_data, five_data, seven_data, five_records, seven_records)

    print("\nWriting output files...")
    write_output(dict_data, five_data, seven_data)

    print("\nDone!")


if __name__ == "__main__":
    main()
