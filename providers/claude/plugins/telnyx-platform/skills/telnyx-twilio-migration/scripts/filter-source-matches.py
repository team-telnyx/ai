#!/usr/bin/env python3
"""Filter ``grep -nH`` matches through the migration source lexer.

The shell validators use grep for breadth, but grep cannot distinguish live
syntax from comments or quoted prose.  This adapter keeps the shell tools on
the same lexical contract as the messaging-profile analyzer while preserving
the familiar ``path:line:text`` output used in reports.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import subprocess
import sys
from pathlib import Path
from typing import Iterator


def grep_records(data: bytes) -> Iterator[tuple[Path, int]]:
    """Parse ``grep -nH --null`` records without interpreting path bytes.

    Grep terminates the filename with NUL, then writes ``line:text\n``.  A
    filename may legally contain colons or newlines on POSIX, so neither can be
    used to find the filename boundary.  Match text cannot contain a newline;
    grep removes that source delimiter from each emitted record.
    """

    cursor = 0
    while cursor < len(data):
        nul = data.find(b"\0", cursor)
        if nul < 0:
            raise ValueError("grep record has no NUL filename delimiter")
        newline = data.find(b"\n", nul + 1)
        if newline < 0:
            newline = len(data)
        locator = data[nul + 1 : newline]
        colon = locator.find(b":")
        if colon <= 0 or not locator[:colon].isdigit():
            raise ValueError("grep record has no numeric line field")
        filename = os.fsdecode(data[cursor:nul])
        yield Path(filename), int(locator[:colon])
        cursor = newline + 1


def display_path(path: Path) -> str:
    """Keep one finding per output line even for control characters in paths."""

    return (
        str(path)
        .replace("\\", "\\\\")
        .replace("\r", "\\r")
        .replace("\n", "\\n")
    )


def load_analyzer(path: Path):
    spec = importlib.util.spec_from_file_location("telnyx_source_contract", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("comments", "code"), default="comments")
    parser.add_argument("--analyzer", type=Path, required=True)
    parser.add_argument("--pattern", required=True)
    parser.add_argument("--region", choices=("all", "backend"), default="all")
    parser.add_argument("--exclude-suffix", action="append", default=[])
    args = parser.parse_args()

    analyzer = load_analyzer(args.analyzer)
    try:
        records = list(grep_records(sys.stdin.buffer.read()))
    except ValueError as error:
        print(f"Error: malformed NUL-delimited grep input: {error}", file=sys.stderr)
        return 2

    cache: dict[Path, object] = {}
    excluded_suffixes = {suffix.lower() for suffix in args.exclude_suffix}
    for path, line_number in records:
        if path.suffix.lower() in excluded_suffixes:
            continue
        try:
            if path not in cache:
                # Preserve physical newlines exactly. grep -n counts LF bytes;
                # universal-newline translation would turn a preceding bare CR
                # into a synthetic LF and make the lexer index a different row.
                with path.open(
                    "r", encoding="utf-8", errors="replace", newline=""
                ) as source_file:
                    source = source_file.read()
                if args.region == "backend":
                    source = analyzer.backend_executable_source(path, source)
                else:
                    source = analyzer.executable_source(path, source)
                suffix = analyzer.canonical_suffix(path)
                if (
                    path.name == ".env"
                    or path.name.startswith(".env.")
                    or path.suffix.lower() in {
                        ".conf",
                        ".env",
                        ".ini",
                        ".properties",
                        ".toml",
                        ".yaml",
                        ".yml",
                    }
                ):
                    suffix = ".sh"
                cache[path] = analyzer.lex_source(source, suffix)
            lexed = cache[path]
            view = lexed.code if args.mode == "code" else lexed.without_comments
            lines = view.split("\n")
            index = line_number - 1
            if not 0 <= index < len(lines):
                raise ValueError(
                    f"grep line {line_number} is outside the lexed source"
                )
            filtered = lines[index]
        except (OSError, ValueError) as error:
            print(f"Error: could not filter {display_path(path)}: {error}", file=sys.stderr)
            return 2
        match_result = subprocess.run(
            ["grep", "-E", "-q", args.pattern],
            input=filtered,
            text=True,
            check=False,
        )
        if match_result.returncode > 1:
            print("Error: grep could not evaluate the filter pattern", file=sys.stderr)
            return 2
        if filtered.strip() and match_result.returncode == 0:
            print(f"{display_path(path)}:{line_number}:{filtered}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
