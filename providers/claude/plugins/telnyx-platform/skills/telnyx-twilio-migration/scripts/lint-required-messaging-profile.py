#!/usr/bin/env python3
"""Find required-profile messaging calls whose own payload omits the profile.

This is intentionally a small lexer, not a language parser. It preserves byte
offsets while masking comments and string literals, which is enough to match
call/assignment boundaries without confusing URLs, comment markers, or
semicolons inside strings for source syntax. Payload variables are resolved to
their nearest real assignment in the same file.
"""

from __future__ import annotations

import bisect
import json
import os
import posixpath
import re
import shlex
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, TypeAlias
from urllib.parse import urljoin, urlsplit


# Node module-system extensions (.cjs/.mjs) and the TypeScript equivalents
# (.cts/.mts) are the same language as .js/.ts. SKILL.md documents a CommonJS
# flow, and scan-twilio-deep.py already treats them as JavaScript, so omitting
# them here made the two tools disagree about what counts as source.
JS_TS_SUFFIXES = {
    ".cjs",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".mts",
    ".ts",
    ".tsx",
}
TYPESCRIPT_SUFFIXES = {".ts", ".tsx", ".mts", ".cts"}
# Keys a request-style config object may carry its URL under. Shared so the
# named-argument path and the config-object path cannot recognise different
# spellings, which is how `uri` came to work as a named argument but not as
# an object member.
URL_MEMBER_NAMES = ("url", "uri", "requestUri", "request_uri")
# Extensions that are aliases of a language this linter already analyses, not
# new languages. A `.bash` file is a shell script and a `.phtml` file is PHP,
# but every downstream check compares against the canonical suffix, so an
# alias was read as an unknown language and silently produced no findings.
# Normalising in one place beats widening each comparison: there are dozens.
SUFFIX_LANGUAGE_ALIASES = {
    ".bash": ".sh",
    ".ksh": ".sh",
    ".zsh": ".sh",
    ".phtml": ".php",
    ".pyw": ".py",
    ".rake": ".rb",
    ".cshtml": ".cs",
    ".razor": ".cs",
    ".scala": ".java",
    # Kotlin shares Java's grammar for everything this linter models - the
    # OkHttp/java.net.http builder chains, the braced control-flow arms, the
    # execution links. Three branches already name `.kt`/`.kts` explicitly, but
    # the discovery layer never yielded such a file, so a Kotlin migration was
    # scanned as zero files and passed silently no matter what it contained.
    ".kt": ".java",
    ".kts": ".java",
    # Single-file components and server templates embed the SAME JS/Ruby a
    # sibling .js/.rb file would hold, but the allow-list excluded the whole
    # file type, so a number-pool send inside a Vue/Svelte/Astro component or
    # an ERB view was never opened at all. The lexer already stops a single
    # quote at end of line for JS, so surrounding markup prose does not mask
    # the script blocks.
    ".vue": ".js",
    ".svelte": ".js",
    ".astro": ".js",
    ".erb": ".rb",
    ".ejs": ".js",
    ".jsp": ".java",
}
INCLUDED_SUFFIXES = {
    ".cs",
    ".go",
    ".java",
    ".php",
    ".py",
    ".rb",
    ".sh",
} | JS_TS_SUFFIXES | set(SUFFIX_LANGUAGE_ALIASES)


# package.json "bin" entry points and repo CLIs are extensionless; the
# shebang is their file identity. The Phase-1 scanner greps without include
# filters and reports them, so refusing to open them here let the pipeline
# contradict itself on the same tree.
SHEBANG_LANGUAGE_SUFFIXES = (
    ("node", ".js"),
    ("python", ".py"),
    ("ruby", ".rb"),
    ("bash", ".sh"),
    ("zsh", ".sh"),
    ("ksh", ".sh"),
    ("sh", ".sh"),
)


def shebang_suffix(path: Path) -> str | None:
    """Return the canonical suffix an extensionless executable maps to."""
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            first_line = handle.readline(200)
    except OSError:
        return None
    if not first_line.startswith("#!"):
        return None
    for token, suffix in SHEBANG_LANGUAGE_SUFFIXES:
        if token in first_line:
            return suffix
    return None


def canonical_suffix(path: Path) -> str:
    """Return the language suffix a file should be analysed as."""
    suffix = path.suffix.lower()
    if not suffix:
        if path.name.lower() == "rakefile":
            return ".rb"
        return shebang_suffix(path) or ""
    # Component files can opt into TypeScript inside their script block. Keep
    # that grammar mode: treating `as const` as JavaScript can make endpoint
    # resolution fail while provenance still consumes the literal, silently
    # certifying a required-profile send.
    # Astro frontmatter is TypeScript-capable by default; JavaScript remains a
    # valid subset, so using the TS grammar avoids consuming an endpoint literal
    # while failing to resolve a legal `as const` alias.
    if suffix == ".astro":
        return ".ts"
    if suffix in {".vue", ".svelte"}:
        try:
            with path.open(
                "r", encoding="utf-8", errors="replace", newline=""
            ) as source_file:
                source = source_file.read()
        except OSError:
            source = ""
        if re.search(
            r"<script\b[^>]*\blang\s*=\s*(?:(['\"])(?:ts|typescript)\1|(?:ts|typescript)(?=\s|>))",
            source,
            re.I,
        ):
            return ".ts"
    return SUFFIX_LANGUAGE_ALIASES.get(suffix, suffix)


def _blank_outside_ranges(source: str, ranges: list[tuple[int, int]]) -> str:
    """Preserve offsets/newlines while retaining only executable ranges."""
    keep = bytearray(len(source))
    for start, end in ranges:
        keep[start:end] = b"\x01" * (end - start)
    return "".join(
        char if char in "\r\n\u2028\u2029" or keep[index] else " "
        for index, char in enumerate(source)
    )


def _balanced_brace_ranges(source: str, openings: list[int]) -> list[tuple[int, int]]:
    """Return quote-aware inner spans for balanced template expressions."""

    ranges: list[tuple[int, int]] = []
    for opening in openings:
        depth = 0
        quote = ""
        escaped = False
        for index in range(opening, len(source)):
            character = source[index]
            if quote:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == quote:
                    quote = ""
                continue
            if character in {"'", '"', "`"}:
                quote = character
            elif character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
                if depth == 0:
                    ranges.append((opening + 1, index))
                    break
    return ranges


def _balanced_parenthesis_ranges(
    source: str, openings: list[int]
) -> list[tuple[int, int]]:
    """Return quote-aware inner spans for balanced parenthesized expressions."""

    ranges: list[tuple[int, int]] = []
    for opening in openings:
        depth = 0
        quote = ""
        escaped = False
        for index in range(opening, len(source)):
            character = source[index]
            if quote:
                if escaped:
                    escaped = False
                elif character == "\\":
                    escaped = True
                elif character == quote:
                    quote = ""
                continue
            if character in {"'", '"', "`"}:
                quote = character
            elif character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0:
                    ranges.append((opening + 1, index))
                    break
    return ranges


def _balanced_delimiter_end(source: str, opening: int) -> int | None:
    """Return the index after a quote-aware (), [], or {} expression."""

    pairs = {"(": ")", "[": "]", "{": "}"}
    opening_character = source[opening] if opening < len(source) else ""
    if opening_character not in pairs:
        return None
    stack = [pairs[opening_character]]
    quote = ""
    escaped = False
    for index in range(opening + 1, len(source)):
        character = source[index]
        if quote:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = ""
            continue
        if character in {"'", '"', "`"}:
            quote = character
        elif character in pairs:
            stack.append(pairs[character])
        elif character == stack[-1]:
            stack.pop()
            if not stack:
                return index + 1
    return None


def _razor_implicit_expression_ranges(source: str) -> list[tuple[int, int]]:
    """Return executable C# spans introduced by Razor's implicit ``@`` form.

    Razor permits member, invocation, indexer, null-conditional, and ``await``
    expressions without the explicit ``@(...)`` wrapper.  Parse those access
    chains instead of preserving a handful of examples; markup and email-like
    text remain excluded by requiring a non-word boundary before ``@``.
    """

    ranges: list[tuple[int, int]] = []
    start_pattern = re.compile(
        r"(?<![\w@])@(?!@)(?P<expression>await\s+|[A-Za-z_][\w]*)",
        re.IGNORECASE,
    )
    for match in start_pattern.finditer(source):
        start = match.start("expression")
        cursor = match.end("expression")
        if source[start:cursor].lower().startswith("await"):
            identifier = re.match(r"[A-Za-z_][\w]*", source[cursor:])
            if not identifier:
                continue
            cursor += identifier.end()

        # Directives and control blocks are handled by the dedicated ranges
        # below.  Treating their keyword as an expression adds no coverage and
        # can retain adjacent markup as though it were C#.
        first_identifier = re.match(r"[A-Za-z_][\w]*", source[start:])
        if first_identifier and first_identifier.group(0).lower() in {
            "addtaghelper", "attribute", "case", "catch", "class", "code",
            "default", "do", "else", "finally", "for", "foreach", "functions",
            "helper", "if", "implements", "inherits", "inject", "lock", "model",
            "namespace", "page", "removetaghelper", "section", "switch",
            "taghelperprefix", "try", "using", "while",
        }:
            continue

        while cursor < len(source):
            chain = re.match(r"(?:\?\.|\.)[A-Za-z_][\w]*", source[cursor:])
            if chain:
                cursor += chain.end()
                continue
            if source[cursor] in "([{":
                end = _balanced_delimiter_end(source, cursor)
                if end is None:
                    break
                cursor = end
                continue
            if source[cursor] in "!?":
                cursor += 1
                continue
            break
        ranges.append((start, cursor))
    return ranges


def _razor_continuation_block_ranges(
    source: str, initial_ranges: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    """Return ``else``/``catch``/``finally`` blocks chained to Razor C#."""

    continuations: list[tuple[int, int]] = []
    pending = list(initial_ranges)
    while pending:
        _, closing = pending.pop()
        tail = source[closing + 1 :]
        match = re.match(
            r"\s*@?(?:else(?:\s+if\b[^{}]*)?|catch\b[^{}]*|finally\b)\s*\{",
            tail,
            flags=re.IGNORECASE,
        )
        if not match:
            continue
        opening = closing + 1 + match.end() - 1
        balanced = _balanced_brace_ranges(source, [opening])
        if balanced:
            continuations.extend(balanced)
            pending.extend(balanced)
    return continuations


def _vue_directive_expression_ranges(source: str) -> list[tuple[int, int]]:
    """Return value and dynamic-argument expressions for every Vue directive."""

    directive = (
        r"(?<!\S)(?:v-[\w-]+(?::(?:[\w:-]+|\[[^\]\r\n]+\]))?"
        r"|[@:#.](?:[\w:-]+|\[[^\]\r\n]+\]))"
        r"(?:\.[\w-]+)*"
    )
    ranges: list[tuple[int, int]] = []

    # Restrict directive discovery to opening tags.  A documentation snippet
    # rendered as text (``<pre>v-if="..."</pre>``) is not executable Vue and
    # must not become a false positive merely because it resembles an
    # attribute.  Scan tag endings quote-aware so ``>`` inside an expression
    # does not truncate the attribute list.
    tag_ranges: list[tuple[int, int]] = []
    cursor = 0
    while cursor < len(source):
        opening = source.find("<", cursor)
        if opening < 0:
            break
        if opening + 1 >= len(source) or not re.match(
            r"[A-Za-z]", source[opening + 1]
        ):
            cursor = opening + 1
            continue
        quote = ""
        for index in range(opening + 1, len(source)):
            character = source[index]
            if quote:
                if character == quote:
                    quote = ""
            elif character in {"'", '"'}:
                quote = character
            elif character == ">":
                tag_ranges.append((opening, index + 1))
                cursor = index + 1
                break
        else:
            break

    for tag_start, tag_end in tag_ranges:
        tag = source[tag_start:tag_end]
        outside_attribute_value: list[bool] = []
        quote = ""
        for character in tag:
            outside_attribute_value.append(not quote)
            if quote:
                if character == quote:
                    quote = ""
            elif character in {"'", '"'}:
                quote = character

        value_pattern = re.compile(
            directive
            + r"\s*=\s*(?:(?P<quote>['\"])(?P<quoted>.*?)(?P=quote)"
            + r"|(?P<unquoted>[^\s>]+))",
            flags=re.IGNORECASE | re.DOTALL,
        )
        for candidate in re.finditer(directive, tag, flags=re.IGNORECASE):
            if not outside_attribute_value[candidate.start()]:
                continue
            match = value_pattern.match(tag, candidate.start())
            if not match:
                continue
            group = "quoted" if match.group("quoted") is not None else "unquoted"
            start, end = match.span(group)
            ranges.append((tag_start + start, tag_start + end))

        # A dynamic directive argument is JavaScript independently of its
        # value: ``:[selectEndpoint()]="payload"`` executes both expressions.
        for match in re.finditer(
            r"(?<!\S)(?:v-[\w-]+:|[@:#])\[(?P<argument>[^\]\r\n]+)\]",
            tag,
            flags=re.IGNORECASE,
        ):
            if not outside_attribute_value[match.start()]:
                continue
            start, end = match.span("argument")
            ranges.append((tag_start + start, tag_start + end))
    return ranges


def _javascript_template_expression_ranges(
    source: str, start: int, end: int
) -> list[tuple[int, int]]:
    """Return executable `${...}` spans inside one JavaScript template literal."""

    ranges: list[tuple[int, int]] = []
    cursor = start
    while cursor < end:
        marker = source.find("${", cursor, end)
        if marker < 0:
            break
        backslashes = 0
        probe = marker - 1
        while probe >= start and source[probe] == "\\":
            backslashes += 1
            probe -= 1
        if backslashes % 2:
            cursor = marker + 2
            continue
        balanced = _balanced_brace_ranges(source, [marker + 1])
        if not balanced or balanced[0][1] > end:
            break
        ranges.append(balanced[0])
        cursor = balanced[0][1] + 1
    return ranges


def executable_source(path: Path, source: str) -> str:
    """Extract executable host-language regions from mixed template files."""
    suffix = path.suffix.lower()
    ranges: list[tuple[int, int]] = []
    if suffix in {".vue", ".svelte", ".astro"}:
        # Comments may contain complete, syntactically valid examples. Preserve
        # their offsets/newlines but remove their contents before discovering
        # script blocks, handlers, interpolations, or balanced expressions.
        template_source = re.sub(
            r"<!--.*?-->",
            lambda match: "".join(
                char if char in "\r\n" else " " for char in match.group(0)
            ),
            source,
            flags=re.DOTALL,
        )
        ranges.extend(
            match.span(1)
            for match in re.finditer(
                r"<script\b[^>]*>(.*?)</script\b[^>]*>", template_source,
                flags=re.IGNORECASE | re.DOTALL,
            )
        )
        if suffix == ".astro":
            frontmatter = re.match(
                r"\A\s*---\s*\r?\n(.*?)\r?\n---(?:\s*\r?\n|\Z)",
                template_source,
                re.DOTALL,
            )
            if frontmatter:
                ranges.append(frontmatter.span(1))
        if suffix == ".vue":
            ranges.extend(_vue_directive_expression_ranges(template_source))
            # Vue interpolations may contain nested object literals. A
            # non-greedy regex leaves such calls unterminated; balance the
            # entire double-brace region and retain its inner expression.
            for opening in (
                match.start() for match in re.finditer(r"\{\{", template_source)
            ):
                balanced = _balanced_brace_ranges(template_source, [opening])
                if balanced:
                    _, closing = balanced[0]
                    ranges.append((opening + 2, closing - 1))
        else:
            # Svelte event handlers / expressions and Astro template
            # expressions are executable JavaScript outside <script> too.
            # Preserve their complete balanced spans, including nested payload
            # objects, rather than stopping at the first closing brace.
            expression_source = re.sub(
                r"<style\b[^>]*>.*?</style\s*>",
                lambda match: "".join(
                    char if char in "\r\n" else " " for char in match.group(0)
                ),
                template_source,
                flags=re.IGNORECASE | re.DOTALL,
            )
            openings = [
                match.start()
                for match in re.finditer(r"\{", expression_source)
            ]
            ranges.extend(_balanced_brace_ranges(expression_source, openings))
    elif suffix in {".cshtml", ".razor"}:
        # Razor is a mixed HTML/C# template. Retain explicit expressions,
        # statement/code blocks, and single-line directives while blanking page
        # markup so text such as `<p>VoiceResponse()</p>` is not treated as C#.
        razor_source = re.sub(
            r"@\*.*?\*@",
            lambda match: "".join(
                char if char in "\r\n" else " " for char in match.group(0)
            ),
            source,
            flags=re.DOTALL,
        )
        brace_openings = [
            match.end() - 1
            for match in re.finditer(
                r"(?<!@)@(?:\s*|(?:code|functions)\s*)\{",
                razor_source,
                flags=re.IGNORECASE,
            )
        ]
        control_openings = [
            match.end() - 1
            for match in re.finditer(
                r"(?<!@)@(?:if|for|foreach|while|do|switch|try|catch|finally|using|lock)\b[^{}]*\{",
                razor_source,
                flags=re.IGNORECASE,
            )
        ]
        ordinary_brace_ranges = _balanced_brace_ranges(
            razor_source, brace_openings
        )
        control_ranges = _balanced_brace_ranges(razor_source, control_openings)
        ranges.extend(ordinary_brace_ranges)
        ranges.extend(control_ranges)
        ranges.extend(_razor_continuation_block_ranges(razor_source, control_ranges))

        # The condition after a Razor do/while body is executable C# too.
        for opening in control_openings:
            prefix = razor_source[max(0, opening - 16) : opening]
            if not re.search(r"@do\s*$", prefix, re.IGNORECASE):
                continue
            body = _balanced_brace_ranges(razor_source, [opening])
            if not body:
                continue
            tail = razor_source[body[0][1] + 1 :]
            while_match = re.match(r"\s*while\s*\(", tail, re.IGNORECASE)
            if while_match:
                paren = body[0][1] + 1 + while_match.end() - 1
                ranges.extend(_balanced_parenthesis_ranges(razor_source, [paren]))
        paren_openings = [
            match.end() - 1
            for match in re.finditer(r"(?<!@)@\s*\(", razor_source)
        ]
        ranges.extend(_balanced_parenthesis_ranges(razor_source, paren_openings))
        ranges.extend(_razor_implicit_expression_ranges(razor_source))
        ranges.extend(
            match.span()
            for match in re.finditer(
                r"(?m)^\s*@(?:using|inject|model|inherits|implements|namespace|addTagHelper|removeTagHelper|tagHelperPrefix)\b[^\r\n]*",
                razor_source,
            )
        )
    elif suffix == ".phtml":
        # PHTML is a mixed HTML/PHP template, not a plain PHP source file.
        # Feeding its markup to the PHP lexer lets an apostrophe in page text
        # open a string that masks a later request inside <?php ... ?>.
        ranges.extend(
            match.span("code")
            for match in re.finditer(
                # Plain ``<?`` is executable when short_open_tag is enabled.
                # Keep XML declarations out: with short tags disabled they are
                # markup, and with short tags enabled they make the PHP file
                # invalid rather than forming a customer request.
                r"<\?(?:php\b|=|(?!(?:xml)\b))(?P<code>.*?)(?:\?>|\Z)",
                source,
                flags=re.IGNORECASE | re.DOTALL,
            )
        )
    elif suffix in {".ejs", ".erb", ".jsp"}:
        if suffix == ".ejs":
            # EJS scriptlets execute on the server, while ordinary <script>
            # blocks execute in the generated browser page. Both can contain
            # migration-sensitive JavaScript and must remain visible.
            ranges.extend(
                match.span(1)
                for match in re.finditer(
                    r"<script\b[^>]*>(.*?)</script\b[^>]*>", source,
                    flags=re.IGNORECASE | re.DOTALL,
                )
            )
        for match in re.finditer(
            r"<%(?!%)(?:[=#-])?(.*?)(?:[-]?%>)", source, re.DOTALL
        ):
            # ERB/EJS <%# ... %> and JSP <%-- ... --%> are template
            # comments, not executable scriptlets.
            if source.startswith(("<%#", "<%--"), match.start()):
                continue
            ranges.append(match.span(1))
    else:
        return source
    return _blank_outside_ranges(source, ranges)


def backend_executable_source(path: Path, source: str) -> str:
    """Return executable regions that can declare server-side handlers."""
    if path.suffix.lower() != ".ejs":
        return executable_source(path, source)
    ranges: list[tuple[int, int]] = []
    for match in re.finditer(r"<%(?!%)(?:[=#-])?(.*?)(?:[-]?%>)", source, re.DOTALL):
        if source.startswith("<%#", match.start()):
            continue
        ranges.append(match.span(1))
    return _blank_outside_ranges(source, ranges)
# Kept in step with the EXCLUDE_DIRS list in scan-twilio-usage.sh. Generated
# output belongs here as much as node_modules: a stale compiled bundle under
# .next carrying a pre-fix number-pool send would fail Phase 4 after the
# source had already been corrected, and the scanner that produced the plan
# never looked at it.
EXCLUDED_DIRS = {
    ".git",
    ".next",
    ".nuxt",
    ".tox",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "vendor",
    "venv",
}
EXCLUDED_FILES = {
    "Gemfile.lock",
    "Pipfile.lock",
    "migration-state.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "poetry.lock",
    "twilio-deep-scan.json",
    "twilio-scan.json",
    "yarn.lock",
}

PROFILE_NAMES = (
    "messaging_profile_id",
    "messagingProfileId",
    "messagingProfileID",
    "MessagingProfileId",
    "MessagingProfileID",
)
PROFILE_NAME_PATTERN = "|".join(map(re.escape, PROFILE_NAMES))
PROFILE_IDENTIFIER_RE = re.compile(
    rf"(?<![\w$])(?:{PROFILE_NAME_PATTERN})(?!\w)"
)
PROFILE_CLI_RE = re.compile(r"--messaging-profile-id(?:\s|=|$)")
SDK_METHOD_PATTERN = (
    r"sendNumberPool|send_number_pool|SendNumberPool|"
    r"sendWithAlphanumericSender|send_with_alphanumeric_sender|"
    r"SendWithAlphanumericSender"
)
SDK_CALL_RE = re.compile(
    rf"(?:\?\.|\.|->)\s*(?:{SDK_METHOD_PATTERN})"
    r"\s*(?:\?\.)?\s*\("
)
FETCH_CALL_RE = re.compile(
    r"(?<![\w$])(?:fetch|request|post_form|postAsync|PostAsync|post|Post|POST|"
    # curl_init($url) is the documented one-liner that sets CURLOPT_URL
    # directly. Listing only the setopt spellings made that whole shape
    # invisible: no endpoint resolved, so the send was never counted and the
    # fail-safe could not fire - the linter reported "no number-pool call sites
    # detected" on a number-pool POST.
    # Net::HTTP::Post.new(uri) is the ONLY Net::HTTP form that can set request
    # headers (an Authorization header, for instance), so it is what real
    # migrated Ruby uses. Modelling only Net::HTTP.post made the whole shape
    # invisible: zero sends detected, so the fail-safe could not fire either.
    r"Net::HTTP::(?:Post|Put|Patch)\s*\.\s*new|"
    r"NewRequest|curl_setopt_array|curl_setopt|curl_init|"
    r"HttpRequestMessage|RestRequest|Request|open|file_get_contents|"
    r"axios\s*\.\s*post|axios)\s*\("
)
TWILIO_MESSAGE_CREATE_RE = re.compile(
    r"(?:\?\.|\.|->)\s*messages\s*(?:\?\.|\.|->)\s*"
    r"create\s*(?:\?\.)?\s*\("
)
MESSAGE_BODY_CALL_RE = re.compile(
    r"(?:"
    r"(?:\?\.|\.|->)\s*messages\s*(?:\?\.|\.|->)\s*"
    r"(?:create|send|send_)\s*(?:\?\.)?\s*\("
    r"|(?:\?\.|\.|->)\s*Messages\s*(?:\?\.|\.|->)\s*"
    r"Send\s*\("
    r"|(?:\?\.|\.|->)\s*messages\s*\(\s*\)\s*"
    r"(?:\?\.|\.|->)\s*send\s*\("
    r")"
)
SIMPLE_VARIABLE_RE = re.compile(r"(?:\.\.\.|\*\*|[&*])?\s*(\$?[A-Za-z_]\w*)\s*$")
STRINGIFIED_VARIABLE_RE = re.compile(
    r"(?:JSON\s*\.\s*stringify|json\s*\.\s*dumps|json\s*\.\s*Marshal|"
    r"json_encode|JsonSerializer\s*\.\s*Serialize|"
    r"JsonConvert\s*\.\s*SerializeObject)\s*\(\s*"
    r"(\$?[A-Za-z_]\w*)\s*\)"
)
NAMED_PAYLOAD_VARIABLE_RE = re.compile(
    r"(?:\bbody|\bdata|\bjson|\bpayload)\s*[:=]\s*(\$?[A-Za-z_]\w*)"
)
SOURCE_IDENTIFIER_RE = re.compile(r"(?<![\w$.])(\$?[A-Za-z_]\w*)(?!\w)")
SPREAD_VARIABLE_RE = re.compile(r"\.\.\.\s*(\$?[A-Za-z_]\w*)")
# Matched against RAW source offsets, so it has to tolerate the leading
# whitespace a member span keeps after `{ a, ...base }` is split.
SPREAD_MEMBER_RE = re.compile(r"\s*(?:\.\.\.|\*\*)\s*")
VARIABLE_ASSIGNMENT_RE = re.compile(
    r"(?<![\w$.>])(\$?[A-Za-z_]\w*)(?!\w)"
    r"(?:\s*:[^=;\n]+)?\s*(?::=|=(?!=|>))"
)
SHELL_VARIABLE_RE = re.compile(r"^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$")
SHELL_STATIC_REFERENCE_RE = re.compile(
    r"\$(?:\{([A-Za-z_]\w*)(?:\[([^\]]+)\])?\}|([A-Za-z_]\w*))"
)
SHELL_CURL_RE = re.compile(r"(?<![\w-])(curl)(?=\s|$)")
SHELL_DATA_OPTIONS = {
    "-d",
    "--data",
    "--data-ascii",
    "--data-binary",
    "--data-raw",
    "--data-urlencode",
    "--json",
}
SHELL_FORM_OPTIONS = {"-F", "--form", "--form-string"}
SHELL_UPLOAD_OPTIONS = {"-T", "--upload-file"}
SHELL_CURL_URL_OPTIONS = {"--url"}
SHELL_CURL_SHORT_VALUE_OPTIONS = set("AbcCdDeEFHKmoPqrtTuUwXxyzY")
SHELL_CURL_VALUE_OPTIONS = (
    SHELL_DATA_OPTIONS
    | SHELL_FORM_OPTIONS
    | SHELL_UPLOAD_OPTIONS
    | SHELL_CURL_URL_OPTIONS
    | {
        "-A",
        "--cacert",
        "--cert",
        "--connect-timeout",
        "-H",
        "--header",
        "--key",
        "--max-time",
        "-o",
        "--output",
        "--proxy",
        "--resolve",
        "--retry",
        "--retry-delay",
        "-u",
        "--user",
        "-w",
        "--write-out",
        "-X",
        "--request",
    }
)
SHELL_ASSIGNMENT_TOKEN_RE = re.compile(r"[A-Za-z_]\w*=.*")
MUTATING_HTTP_METHODS = frozenset({"POST", "PUT", "PATCH"})


@dataclass(frozen=True)
class StringToken:
    start: int
    end: int
    contents: str


@dataclass(frozen=True)
class LexedSource:
    original: str
    code: str
    without_comments: str
    strings: tuple[StringToken, ...]


@dataclass(frozen=True)
class Call:
    start: int
    open_paren: int
    end: int
    parenthesized: bool = True


EndpointReference = tuple[str, ...]


REQUIRED = "required"
SAFE = "safe"
UNKNOWN = "unknown"
MISSING = "missing"


@dataclass(frozen=True)
class EndpointValue:
    kind: str
    exact: str | None = None


UNKNOWN_VALUE = EndpointValue(UNKNOWN)
MISSING_VALUE = EndpointValue(MISSING)


@dataclass(frozen=True)
class EndpointLiteral:
    value: str


@dataclass(frozen=True)
class EndpointUnknown:
    reason: str = "unsupported"


@dataclass(frozen=True)
class EndpointRef:
    binding_id: int
    members: EndpointReference = ()


@dataclass(frozen=True)
class EndpointObject:
    entries: tuple[tuple[str, "EndpointExpression"], ...]


@dataclass(frozen=True)
class EndpointArray:
    items: tuple["EndpointExpression", ...]


@dataclass(frozen=True)
class EndpointDefault:
    primary: "EndpointExpression"
    fallback: "EndpointExpression"


@dataclass(frozen=True)
class EndpointConcat:
    parts: tuple["EndpointExpression", ...]


@dataclass(frozen=True)
class EndpointProjected:
    expression: "EndpointExpression"
    members: EndpointReference


EndpointExpression: TypeAlias = (
    EndpointLiteral
    | EndpointUnknown
    | EndpointRef
    | EndpointObject
    | EndpointArray
    | EndpointDefault
    | EndpointConcat
    | EndpointProjected
)


@dataclass(frozen=True)
class IndexedScope:
    id: int
    parent: int | None
    start: int
    end: int
    kind: str


@dataclass(frozen=True)
class IndexedBinding:
    id: int
    name: str
    scope_id: int
    declaration_start: int
    visibility_start: int
    kind: str


@dataclass(frozen=True)
class IndexedDefinition:
    binding_id: int
    member_path: EndpointReference
    start: int
    expression: EndpointExpression
    scope_id: int
    execution_scope: int
    kind: str
    guarded: bool = False


@dataclass(frozen=True)
class EndpointAccessState:
    binding_id: int
    path: EndpointReference
    before: int
    use_scope: int


@dataclass(frozen=True)
class EndpointExpressionState:
    expression: EndpointExpression
    projection: EndpointReference
    before: int
    use_scope: int


EndpointState: TypeAlias = EndpointAccessState | EndpointExpressionState


@dataclass
class EndpointExpansion:
    dependencies: tuple[EndpointState, ...] = ()
    combine: Callable[[tuple[EndpointValue, ...]], EndpointValue] | None = None
    immediate: EndpointValue | None = None


@dataclass
class EndpointFrame:
    state: EndpointState
    expansion: EndpointExpansion | None = None
    next_dependency: int = 0
    values: list[EndpointValue] = field(default_factory=list)


def _blank(buffer: list[str], start: int, end: int) -> None:
    for index in range(start, end):
        # Preserve every source line terminator. JavaScript recognizes U+2028
        # and U+2029 in addition to CR/LF, and all C-style languages accept a
        # bare CR as a physical line boundary. Replacing one with a space can
        # merge the comment with executable code on the following line.
        if buffer[index] not in {"\r", "\n", "\u2028", "\u2029"}:
            buffer[index] = " "


def _line_comment_end(source: str, start: int, suffix: str) -> int:
    """Return the first language-valid line terminator after ``start``."""

    terminators = {"\r", "\n"}
    if suffix in JS_TS_SUFFIXES:
        terminators.update({"\u2028", "\u2029"})
    for index in range(start, len(source)):
        if source[index] in terminators:
            return index
    return len(source)


# Heredoc openers: shell/ruby `<<TAG`, `<<-TAG`, `<<~TAG`, `<<'TAG'`; PHP
# `<<<TAG` / `<<<'TAG'`. The body is data and must be masked like a string.
# NO whitespace is permitted between `<<`/`<<<` and the tag in any of these
# languages. Allowing it made Ruby's append operator (`audit_log << recipient`),
# PHP's left shift (`1 << OFFSET`) and shell arithmetic (`$((1 << SHIFT))`) parse
# as heredoc openers, and since no later line matched the pseudo-tag the "body"
# ran to EOF and blanked every send below it - a silent pass.
_HEREDOC_OPENER_RE = re.compile(
    r"<<[<]?[-~]?(?P<q>['\"]?)(?P<tag>[A-Za-z_]\w*)(?P=q)[ \t]*(?=\r?\n|$)"
)
# Requiring end-of-line after the tag is necessary but NOT sufficient. Ruby's
# singleton-class syntax `class <<self` also puts a bare word straight after
# `<<` at end of line, so it parsed as a heredoc opening a body that never
# closed - blanking the rest of the file and silently passing every send below
# it. That is the same defect the end-of-line anchor was added to fix, one
# spelling sideways, so the opener needs its LEFT context checked too.
_NOT_A_HEREDOC_PREFIX_RE = re.compile(r"(?:^|[^\w.])class[ \t]*$")


def _heredoc_opener_at(
    source: str, index: int, suffix: str
) -> "re.Match[str] | None":
    """Match a heredoc opener at `index`, rejecting Ruby's `class <<self`.

    Scoped to Ruby: `class` is not a keyword before `<<` in shell or PHP, so
    applying the rejection there would disable heredoc masking on any opener
    line that merely ENDS with the word `class` (`echo class <<EOT`).
    """
    match = _HEREDOC_OPENER_RE.match(source, index)
    if match is None:
        return None
    if suffix == ".rb":
        line_start = source.rfind("\n", 0, index) + 1
        if _NOT_A_HEREDOC_PREFIX_RE.search(source[line_start:index]):
            return None
    return match


def _heredoc_langs(suffix: str) -> bool:
    return suffix in {".sh", ".php", ".rb"}


def lex_source(source: str, suffix: str) -> LexedSource:
    """Mask comments and strings while preserving offsets and newlines."""

    code = list(source)
    without_comments = list(source)
    strings: list[StringToken] = []
    c_line_comments = suffix in JS_TS_SUFFIXES | {".cs", ".go", ".java", ".php"}
    c_block_comments = c_line_comments
    hash_comments = suffix in {".php", ".py", ".rb", ".sh"}
    index = 0

    while index < len(source):
        if c_block_comments and source.startswith("/*", index):
            end = source.find("*/", index + 2)
            end = len(source) if end < 0 else end + 2
            _blank(code, index, end)
            _blank(without_comments, index, end)
            index = end
            continue

        if c_line_comments and source.startswith("//", index):
            end = _line_comment_end(source, index + 2, suffix)
            _blank(code, index, end)
            _blank(without_comments, index, end)
            index = end
            continue

        if hash_comments and source[index] == "#":
            if suffix == ".sh" and index == 0 and source.startswith("#!", index):
                end = _line_comment_end(source, index + 2, suffix)
                index = end
                continue
            end = _line_comment_end(source, index + 1, suffix)
            _blank(code, index, end)
            _blank(without_comments, index, end)
            index = end
            continue

        # Ruby block comments. Without this, `=begin ... =end` prose was lexed
        # as code, so one apostrophe in it opened a string that swallowed the
        # sends below (the fail-safe above cannot help when the stray quote
        # finds a LATER quote to pair with).
        if (
            suffix == ".rb"
            and source.startswith("=begin", index)
            and (index == 0 or source[index - 1] == "\n")
        ):
            terminator = re.search(r"^=end\b.*$", source[index:], re.M)
            end = (
                len(source)
                if terminator is None
                else index + terminator.end()
            )
            _blank(code, index, end)
            _blank(without_comments, index, end)
            index = end
            continue

        # Heredoc bodies are DATA, not code. They were lexed as code, so an
        # apostrophe inside one ("Don't edit by hand") paired with a later quote
        # and masked the send that followed.
        heredoc = _heredoc_opener_at(source, index, suffix) if _heredoc_langs(suffix) else None
        if heredoc is not None:
            tag = heredoc.group("tag")
            body_start = source.find("\n", heredoc.end())
            if body_start < 0:
                index = heredoc.end()
                continue
            body_start += 1
            terminator = re.compile(rf"^[ \t]*{re.escape(tag)}\b", re.M).search(
                source, body_start
            )
            body_end = len(source) if terminator is None else terminator.start()
            _blank(code, body_start, body_end)
            strings.append(
                StringToken(body_start, body_end, source[body_start:body_end])
            )
            index = body_end
            continue

        quote = source[index]
        if quote not in {"'", '"', "`"}:
            index += 1
            continue

        delimiter = quote
        if quote in {"'", '"'} and source.startswith(quote * 3, index):
            delimiter = quote * 3
        string_start = index
        index += len(delimiter)
        contents_start = index
        # A backtick delimits a Go RAW string, which has no escape sequences, so
        # a literal `\` inside one previously consumed the closing backtick and
        # ran the "string" to end of file.
        honours_escapes = not (suffix == ".go" and delimiter == "`")
        line_bounded = len(delimiter) == 1 and delimiter in {"'", '"'} and suffix in (
            JS_TS_SUFFIXES | {".py"}
        )
        terminated = False
        while index < len(source):
            if source.startswith(delimiter, index):
                contents_end = index
                index += len(delimiter)
                terminated = True
                break
            if honours_escapes and source[index] == "\\":
                index = min(len(source), index + 2)
                continue
            if (
                line_bounded
                and source[index] in {"\r", "\n", "\u2028", "\u2029"}
                and (
                    source[index] in {"\r", "\n"}
                    or suffix in JS_TS_SUFFIXES
                )
            ):
                # A single/double-quoted JS/TS or Python literal cannot contain a
                # raw newline, so hitting one means the quote never opened a
                # string at all (an apostrophe in JSX text, prose, or a comment).
                # Stop here rather than pairing it with some LATER quote, which
                # masked every send in between.
                break
            index += 1
        else:
            contents_end = len(source)

        if not terminated:
            # FAIL SAFE. An unterminated quote used to blank everything to EOF,
            # so a single apostrophe in JSX text, a heredoc body, or a Ruby
            # =begin comment deleted every send below it and the file was
            # reported clean. Treat the lone quote as ordinary code and resume
            # immediately after it: the damage is one character, not the file.
            index = string_start + 1
            continue

        _blank(code, string_start, index)
        if delimiter == "`" and suffix in JS_TS_SUFFIXES:
            # JavaScript template literal text is inert, but every `${...}`
            # interpolation is executable JavaScript. Recursively lex those
            # spans and restore their code/comments at the original offsets.
            # Nested string tokens are recorded before the enclosing template
            # token so lookups inside an interpolation select the narrow token.
            for expression_start, expression_end in _javascript_template_expression_ranges(
                source, contents_start, contents_end
            ):
                nested = lex_source(
                    source[expression_start:expression_end], suffix
                )
                code[expression_start:expression_end] = list(nested.code)
                without_comments[expression_start:expression_end] = list(
                    nested.without_comments
                )
                strings.extend(
                    StringToken(
                        expression_start + token.start,
                        expression_start + token.end,
                        token.contents,
                    )
                    for token in nested.strings
                )
        strings.append(
            StringToken(string_start, index, source[contents_start:contents_end])
        )

    return LexedSource(source, "".join(code), "".join(without_comments), tuple(strings))


def matching_delimiter(code: str, opening: int, left: str, right: str) -> int | None:
    depth = 0
    for index in range(opening, len(code)):
        character = code[index]
        if character == left:
            depth += 1
        elif character == right:
            depth -= 1
            if depth == 0:
                return index
    return None


def calls_matching(lexed: LexedSource, pattern: re.Pattern[str]) -> list[Call]:
    calls: list[Call] = []
    for match in pattern.finditer(lexed.code):
        opening = lexed.code.rfind("(", match.start(), match.end())
        closing = matching_delimiter(lexed.code, opening, "(", ")")
        if closing is None:
            closing = lexed.code.find("\n", opening)
            closing = len(lexed.code) - 1 if closing < 0 else closing
        calls.append(Call(match.start(), opening, closing + 1))
    return calls


def sdk_alias_calls(lexed: LexedSource) -> list[Call]:
    """Find calls through local aliases of required-profile SDK methods.

    Method values/delegates are ordinary customer code in Python, JS/TS, Go,
    Java/Kotlin and C#. The direct-call regex cannot see them once the member
    name is assigned. Track both assignment/bind forms and JS destructuring,
    and require the defining assignment to remain the nearest one before each
    call so a later reassignment does not create a false SDK finding.
    """

    code = lexed.code
    definitions: list[tuple[str, int]] = []
    member = re.compile(
        rf"(?:\?\.|\.|->|::)\s*(?:{SDK_METHOD_PATTERN})(?!\w)"
    )
    for match in member.finditer(code):
        # A direct invocation is already covered by SDK_CALL_RE.
        after = code[match.end():]
        if re.match(r"\s*(?:\?\.)?\s*\(", after):
            continue
        line_start = max(code.rfind("\n", 0, match.start()), code.rfind(";", 0, match.start())) + 1
        prefix = code[line_start:match.start()]
        assignment = re.search(
            r"(?P<alias>\$?[A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:=)\s*.*$",
            prefix,
        )
        if assignment is not None:
            definitions.append((assignment.group("alias").lstrip("$"), match.end()))

    # JavaScript/TypeScript/CommonJS destructuring aliases.
    for match in re.finditer(r"\{(?P<members>[^{}]*)\}\s*=", code):
        for item in split_arguments(code, match.start("members"), match.end("members")):
            text = code[slice(*item)].strip()
            parsed = re.fullmatch(
                rf"(?P<method>{SDK_METHOD_PATTERN})(?:\s*:\s*(?P<alias>[A-Za-z_$]\w*))?",
                text,
            )
            if parsed is not None:
                definitions.append(
                    ((parsed.group("alias") or parsed.group("method")).lstrip("$"), match.end())
                )

    # Ruby's bound Method and PHP callable-array/Closure forms store the SDK
    # method name as a symbol or string, so it is intentionally absent from the
    # masked code view used above. without_comments retains those values while
    # still excluding prose and comments.
    visible = lexed.without_comments
    for match in re.finditer(
        rf"(?m)^\s*(?P<alias>[A-Za-z_]\w*)\s*=\s*[^\r\n;]*"
        rf"\.\s*method\s*\(\s*:\s*(?:{SDK_METHOD_PATTERN})\s*\)",
        visible,
    ):
        definitions.append((match.group("alias"), match.end()))
    for match in re.finditer(
        rf"(?m)^\s*\$(?P<alias>[A-Za-z_]\w*)\s*=\s*"
        rf"(?:Closure\s*::\s*fromCallable\s*\(\s*)?\["
        rf"[^\]\r\n]*,\s*['\"](?:{SDK_METHOD_PATTERN})['\"]\s*\]",
        visible,
    ):
        definitions.append((match.group("alias"), match.end()))

    calls: list[Call] = []
    seen: set[tuple[int, int]] = set()
    for alias, definition_end in definitions:
        invocation_patterns = (
            re.compile(rf"(?<![\w$.>])\$?{re.escape(alias)}\s*\("),
            re.compile(
                rf"(?<![\w$])\$?{re.escape(alias)}\s*(?:\.|->)\s*"
                r"(?:call|apply|accept|invoke|Invoke)\s*\("
            ),
        )
        invocations = sorted(
            (
                match
                for pattern in invocation_patterns
                for match in pattern.finditer(code, definition_end)
            ),
            key=lambda match: match.start(),
        )
        for match in invocations:
            # A later assignment/shadowing invalidates the original method
            # value. Nearest-definition semantics match the rest of the linter.
            between = code[definition_end:match.start()]
            if re.search(
                rf"(?<![\w$])\$?{re.escape(alias)}\s*(?:=|:=)(?!=)",
                between,
            ):
                continue
            opening = code.find("(", match.start(), match.end())
            closing = matching_delimiter(code, opening, "(", ")")
            if closing is None:
                continue
            key = (match.start(), closing + 1)
            if key not in seen:
                seen.add(key)
                calls.append(Call(match.start(), opening, closing + 1))

        # PHP also invokes callable arrays via call_user_func(_array).
        for call in calls_matching(
            lexed, re.compile(r"(?<!\w)call_user_func(?:_array)?\s*\(")
        ):
            args = split_arguments(code, call.open_paren + 1, call.end - 1)
            if not args:
                continue
            callable_arg = code[slice(*args[0])].strip().lstrip("$")
            key = (call.start, call.end)
            if callable_arg == alias and key not in seen:
                seen.add(key)
                calls.append(call)
    return calls


def serialized_payload_string(
    lexed: LexedSource, token: StringToken, region_start: int
) -> bool:
    prefix_start = max(region_start, token.start - 120)
    code_prefix = lexed.code[prefix_start : token.start]
    source_prefix = lexed.without_comments[prefix_start : token.start]
    return bool(
        re.search(r"(?:\bbody|\bdata)\s*[:=]\s*$", code_prefix)
        or re.search(
            r"(?:^|\s)(?:-d|--data(?:-raw|-binary)?)\s*$", source_prefix
        )
    )


def structural_depth(code: str, start: int, offset: int) -> tuple[int, int, int]:
    round_depth = square_depth = curly_depth = 0
    for character in code[start:offset]:
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
        elif character == "}" and curly_depth:
            curly_depth -= 1
    return round_depth, square_depth, curly_depth


def curly_ancestry(code: str, offset: int) -> tuple[int, ...]:
    """Return the unmatched opening-brace positions containing offset."""

    ancestry: list[int] = []
    for index, character in enumerate(code[:offset]):
        if character == "{":
            ancestry.append(index)
        elif character == "}" and ancestry:
            ancestry.pop()
    return tuple(ancestry)


def scope_contains(code: str, binding: int, use: int) -> bool:
    """Return true when binding's lexical brace path contains use."""

    binding_scope = curly_ancestry(code, binding)
    use_scope = curly_ancestry(code, use)
    return use_scope[: len(binding_scope)] == binding_scope


def payload_root_depth(code: str, start: int, end: int) -> tuple[int, int, int]:
    """Return the direct-member depth for an object payload or argument list."""

    round_depth = square_depth = curly_depth = 0
    named_value = False
    for character in code[start:end]:
        at_argument_root = round_depth == square_depth == curly_depth == 0
        if at_argument_root and character == ",":
            return 0, 0, 0
        if at_argument_root and character in {":", "="}:
            named_value = True
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
            if not named_value:
                return round_depth, square_depth, curly_depth
            return 0, 0, 0
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
            if not named_value:
                return round_depth, square_depth, curly_depth
            return 0, 0, 0
        elif character == "}" and curly_depth:
            curly_depth -= 1
    return 0, 0, 0


def at_payload_root(
    code: str,
    start: int,
    end: int,
    offset: int,
) -> bool:
    return structural_depth(code, start, offset) == payload_root_depth(code, start, end)


def serialized_json_has_profile(value: str) -> bool:
    candidates = [value]
    try:
        decoded_literal = json.loads(f'"{value}"')
    except (TypeError, ValueError):
        pass
    else:
        if decoded_literal != value:
            candidates.append(decoded_literal)
    for candidate in candidates:
        try:
            payload = json.loads(candidate)
        except (TypeError, ValueError):
            continue
        if isinstance(payload, dict) and any(
            _is_usable_profile_value(payload.get(name))
            for name in PROFILE_NAMES
            if name in payload
        ):
            return True
    return False


def _is_usable_profile_value(value: Any) -> bool:
    """Return whether a decoded JSON profile value is usable.

    `value not in {None, ""}` raised TypeError on a dict or list value, and
    nothing between here and main() caught it, so ONE payload carrying
    `"messaging_profile_id": {...}` aborted the entire scan - every other file
    in the project went unanalysed and the run reported nothing at all.
    A non-scalar is also not a usable profile id, so it is simply False.
    """
    return isinstance(value, (str, int)) and not isinstance(value, bool) and str(value).strip() != ""


def token_is_entire_expression(
    lexed: LexedSource, token: StringToken, start: int, end: int
) -> bool:
    """Return true when a string token is the assignment value, not nested data."""

    return not (
        lexed.code[start:token.start].strip()
        or lexed.code[token.end:end].strip()
    )


def region_has_profile(
    lexed: LexedSource,
    start: int,
    end: int,
    *,
    serialized_assignment: bool = False,
    allow_js_shorthand: bool = False,
) -> bool:
    code_region = lexed.code[start:end]
    if PROFILE_CLI_RE.search(code_region):
        return True
    for match in PROFILE_IDENTIFIER_RE.finditer(lexed.code, start, end):
        if not at_payload_root(lexed.code, start, end, match.start()):
            continue
        after = lexed.code[match.end():end]
        if re.match(r"\s*(?::|=(?!=)|\()", after):
            return True
        if allow_js_shorthand and re.match(r"\s*(?=[,}])", after):
            return True

    for token in lexed.strings:
        if token.start < start or token.end > end:
            continue
        after = lexed.without_comments[token.end:end]
        if (
            token.contents in PROFILE_NAMES
            and at_payload_root(lexed.code, start, end, token.start)
            and re.match(r"\s*(?::|=>|=(?!=))", after)
        ):
            return True
        serialized_value = serialized_payload_string(lexed, token, start) or (
            serialized_assignment
            and token_is_entire_expression(lexed, token, start, end)
        )
        if serialized_value and serialized_json_has_profile(token.contents):
            return True
    return False


def split_arguments(code: str, start: int, end: int) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    segment_start = start
    round_depth = square_depth = curly_depth = 0
    for index in range(start, end):
        character = code[index]
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
        elif character == "}" and curly_depth:
            curly_depth -= 1
        elif character == "," and not (round_depth or square_depth or curly_depth):
            spans.append((segment_start, index))
            segment_start = index + 1
    spans.append((segment_start, end))
    return spans


def entry_value_end(code: str, start: int, limit: int) -> int:
    """End of one `key => value` entry inside an enclosing literal.

    The entry stops at its own top-level `,`/`;` or at the first closer that
    belongs to the CONTAINER rather than to the value, so a nested literal
    value is kept whole while a trailing `]]);` is not swallowed.
    """
    depth = 0
    for index in range(start, limit):
        character = code[index]
        if character in "([{":
            depth += 1
        elif character in ")]}":
            if depth == 0:
                return index
            depth -= 1
        elif depth == 0 and character in ",;":
            return index
    return limit


def named_payload_spans(
    code: str,
    spans: list[tuple[int, int]],
    *,
    allow_js_shorthand: bool = False,
) -> list[tuple[int, int]]:
    """Return only body/data/json/payload values from argument/object spans."""

    payloads: list[tuple[int, int]] = []
    name_pattern = re.compile(r"\s*(?:body|data|json|payload)\s*[:=](?!=)")
    shorthand_pattern = re.compile(r"\s*(?:body|data|json|payload)\s*$")
    for start, end in spans:
        match = name_pattern.match(code, start, end)
        if match is not None:
            payloads.append((match.end(), end))
            continue
        if allow_js_shorthand and shorthand_pattern.fullmatch(code, start, end):
            payloads.append((start, end))
            continue
        opening = code.find("{", start, end)
        if opening < 0:
            continue
        closing = matching_delimiter(code, opening, "{", "}")
        if closing is None or closing >= end:
            continue
        for member_start, member_end in split_arguments(code, opening + 1, closing):
            member_match = name_pattern.match(code, member_start, member_end)
            if member_match is not None:
                payloads.append((member_match.end(), member_end))
            elif allow_js_shorthand and shorthand_pattern.fullmatch(
                code, member_start, member_end
            ):
                payloads.append((member_start, member_end))
    return payloads


def assigned_payload_member_span(
    lexed: LexedSource,
    variable: str,
    after: int,
    before: int,
    suffix: str,
) -> list[tuple[int, int]]:
    """Return the latest body-like property assigned to an options variable."""

    escaped = re.escape(variable)
    pattern = re.compile(
        rf"(?<![\w$.>]){escaped}(?!\w)\s*(?:\.|->)\s*"
        r"(?:body|data|json|payload)\s*(?::=|=(?!=|>))"
    )
    matches = list(pattern.finditer(lexed.code, after, before))
    if not matches:
        return []
    latest = matches[-1]
    return [(latest.end(), assignment_end(lexed, latest.end(), suffix))]


def assigned_named_payload_spans(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
    seen: frozenset[str] = frozenset(),
) -> list[tuple[int, int]]:
    """Resolve an options variable and return only its request-body member."""

    candidate = lexed.code[span[0] : span[1]].strip()
    variable_match = SIMPLE_VARIABLE_RE.fullmatch(candidate)
    if variable_match is None:
        return []
    variable = variable_match.group(1)
    if variable in seen:
        return []
    matches = assignment_matches(lexed.code, variable, before)
    if not matches:
        return []
    assignment = matches[-1]
    rhs_start = assignment.end()
    rhs_end = assignment_end(lexed, rhs_start, suffix)
    named = named_payload_spans(
        lexed.code,
        [(rhs_start, rhs_end)],
        allow_js_shorthand=suffix in JS_TS_SUFFIXES,
    )
    mutation = assigned_payload_member_span(
        lexed, variable, rhs_end, before, suffix
    )
    if mutation:
        return mutation
    if named:
        return named
    return assigned_named_payload_spans(
        lexed,
        (rhs_start, rhs_end),
        assignment.start(),
        suffix,
        seen | {variable},
    )


def argument_string_value(
    lexed: LexedSource, span: tuple[int, int]
) -> str | None:
    """Return a sole string literal argument's value."""

    tokens = [
        token
        for token in lexed.strings
        if span[0] <= token.start and token.end <= span[1]
    ]
    if len(tokens) != 1 or lexed.code[span[0] : span[1]].strip():
        return None
    return tokens[0].contents


_KTOR_BODY_LINK_RE = re.compile(r"\b(?:setBody|body)\s*(?:\(|=)")


def _trailing_lambda_span(
    lexed: LexedSource, call: Call
) -> tuple[int, int] | None:
    """Span of a Kotlin trailing lambda immediately following `call`."""
    tail = lexed.code[call.end:call.end + 40]
    brace = re.match(r"\s*\{", tail)
    if brace is None:
        return None
    opening = call.end + brace.end() - 1
    closing = matching_delimiter(lexed.code, opening, "{", "}")
    return None if closing is None else (opening, closing)


def ktor_trailing_body_span(
    lexed: LexedSource, call: Call, suffix: str
) -> tuple[int, int] | None:
    """Body attached inside a Ktor builder lambda: `post(url) { setBody(x) }`.

    Ktor's send takes the ENDPOINT as its only argument and configures the body
    in the trailing lambda, so neither the argument list nor any earlier chain
    link carries the payload.
    """
    block = _trailing_lambda_span(lexed, call)
    if block is None:
        return None
    inner_text = lexed.code[block[0]:block[1]]
    link = _KTOR_BODY_LINK_RE.search(inner_text)
    if link is None:
        return None
    base = block[0] + link.end()
    if inner_text[link.end() - 1] == "(":
        closing = matching_delimiter(lexed.code, base - 1, "(", ")")
        if closing is None:
            return None
        arguments = split_arguments(lexed.code, base, closing)
        span = payload_argument(lexed, arguments) if arguments else None
    else:
        end = lexed.code.find("\n", base)
        span = (base, end if end > 0 else block[1])
    if span is None:
        return None
    return resolve_wrapped_payload(lexed, span, span[0], suffix)


def ruby_request_body_spans(
    lexed: LexedSource, call: Call, suffix: str
) -> list[tuple[int, int]]:
    """Body assigned to a Ruby request object after construction.

    `req = Net::HTTP::Post.new(uri)` carries only the endpoint; the payload
    arrives in a later statement as `req.body = ...`, so the constructor's own
    arguments never reveal it.
    """
    line_start = lexed.code.rfind("\n", 0, call.start) + 1
    binding = re.search(
        r"([A-Za-z_]\w*)\s*=", lexed.code[line_start:call.start]
    )
    if binding is None:
        return []
    name = re.escape(binding.group(1))
    match = re.search(
        rf"(?<![\w.]){name}\s*\.\s*body\s*=\s*", lexed.code[call.end:]
    )
    if match is None:
        return []
    start = call.end + match.end()
    end = lexed.code.find("\n", start)
    span = (start, end if end > 0 else len(lexed.code))
    return [resolve_wrapped_payload(lexed, span, span[0], suffix)]


def rest_payload_spans(
    lexed: LexedSource, call: Call, suffix: str
) -> list[tuple[int, int]]:
    """Select request-body expressions without accepting query/config fields."""

    args_start = call.open_paren + 1
    args_end = max(args_start, call.end - 1)
    arguments = split_arguments(lexed.code, args_start, args_end)
    if not arguments:
        return []

    # Guzzle's canonical body shape is an options array with a quoted `json`
    # key: `$client->post($url, ['json' => ['messaging_profile_id' => $mp]])`.
    # Quoted keys are blanked in `lexed.code`, so the generic named-member
    # regex cannot recover them. Project the literal container through the
    # lexer's token-aware key resolver instead.
    if suffix == ".php":
        for argument in arguments[1:]:
            projected = literal_value_span(
                lexed, argument[0], argument[1], ("json",), suffix
            )
            if projected is not None:
                return [projected]

    callee = re.sub(r"\s+", "", lexed.code[call.start:call.open_paren])
    if suffix == ".php" and callee == "file_get_contents":
        region = php_stream_context_region(lexed, call, suffix)
        if region is None:
            return []
        key = re.search(
            r"[\'\"]content[\'\"]\s*=>", lexed.original[region[0]:region[1]]
        )
        if key is None:
            return []
        start = region[0] + key.end()
        # `region[1]` is the end of the whole stream_context_create(...)
        # statement, so an unbounded span reads `$json]]);` rather than the
        # entry's value: no variable is recognised, the hop to the body is lost
        # and a compliant send is reported as missing the profile. Bound the
        # value at the entry's own `,`/`]` first.
        end = entry_value_end(lexed.code, start, region[1])
        return [resolve_wrapped_payload(lexed, (start, end), start, suffix)]
    if suffix in JS_TS_SUFFIXES and callee.split(".")[-1] == "open":
        body = xhr_send_body_span(lexed, call, suffix)
        return [body] if body else []
    if suffix == ".py" and callee.split(".")[-1] == "Request":
        data = named_argument_spans(lexed, arguments, "data")
        return [
            resolve_wrapped_payload(lexed, span, span[0], suffix)
            for span in data[-1:]
        ]
    if callee in {"HttpRequestMessage", "RestRequest"}:
        body = csharp_request_body_span(lexed, call, suffix)
        return [body] if body else []
    if suffix == ".go" and callee in {"Post", "Put", "Patch"} and len(arguments) == 1:
        body = builder_body_span(lexed, call, "SetBody|SetJSONBody|SetFormData")
        return [resolve_wrapped_payload(lexed, body, body[0], suffix)] if body else []
    if suffix == ".go" and callee == "Post" and len(arguments) >= 3:
        # net/http.Post(url, contentType, body) carries the request body in
        # its third argument, unlike the common post(url, body, config) form.
        # Gating on the receiver being literally "http" missed every
        # (*http.Client).Post call — client.Post(...), httpClient.Post(...),
        # http.DefaultClient.Post(...) — which fell through to the generic
        # rule and had its content-type string inspected as the payload,
        # reporting a compliant body as missing messaging_profile_id.
        receiver = (call_receiver(lexed, call) or "").lower()
        second = lexed.code[arguments[1][0]:arguments[1][1]].strip()
        looks_like_content_type = bool(
            re.fullmatch(r"""["'][A-Za-z0-9.+-]+/[A-Za-z0-9.+;=\s-]+["']""", second)
        )
        if (
            receiver == "http"
            or receiver.endswith("client")
            or looks_like_content_type
        ):
            # Follow reader/stringifier wrappers to the literal, as the curl
            # branch does. Returning the raw span only worked when the literal
            # sat textually inside it: the idiomatic
            # `body := []byte(...); http.Post(url, ct, bytes.NewBuffer(body))`
            # left the span at the wrapper, so a compliant body was reported as
            # missing messaging_profile_id.
            return [
                resolve_wrapped_payload(
                    lexed, arguments[2], arguments[2][0], suffix
                )
            ]
    if callee == "fetch":
        inline = named_payload_spans(
            lexed.code,
            arguments[1:2],
            allow_js_shorthand=suffix in JS_TS_SUFFIXES,
        )
        if inline:
            return inline
        if len(arguments) > 1:
            return assigned_named_payload_spans(
                lexed, arguments[1], call.start, suffix
            )
        return []
    if callee == "axios.post":
        return arguments[1:2]
    if callee == "axios":
        inline = named_payload_spans(
            lexed.code,
            arguments[:1],
            allow_js_shorthand=suffix in JS_TS_SUFFIXES,
        )
        if inline:
            return inline
        return assigned_named_payload_spans(
            lexed, arguments[0], call.start, suffix
        )
    named = named_payload_spans(
        lexed.code,
        arguments,
        allow_js_shorthand=suffix in JS_TS_SUFFIXES,
    )
    if named:
        return named
    if callee == "request" and len(arguments) >= 3:
        method = argument_string_value(lexed, arguments[0])
        if method is None or method.upper() in MUTATING_HTTP_METHODS:
            return arguments[2:3]

    if callee == "NewRequest" and len(arguments) >= 3:
        # http.NewRequest(method, url, body): the body is the third argument,
        # normally wrapped (bytes.NewBuffer(json.Marshal output)).
        return [
            resolve_wrapped_payload(lexed, arguments[2], call.start, suffix)
        ]
    if callee.split(".")[-1] == "post_form":
        # Net::HTTP.post_form(uri, k => v, ...): every pair after the URI is
        # form data. Returning only the first pair would report a compliant
        # send whose profile arrives in a later pair.
        return arguments[1:]
    if callee.endswith("new") and "Net::HTTP::" in callee:
        # The endpoint is this call's argument (handled in request_url_spans);
        # the BODY arrives later as `req.body = ...` on the binding, exactly
        # like the C# `req.Content = ...` shape.
        return ruby_request_body_spans(lexed, call, suffix)
    if callee == "curl_init":
        # `$ch = curl_init($url)` names its handle on the LEFT of the
        # assignment, not in the argument list, so the sibling
        # CURLOPT_POSTFIELDS lookup needs the binding. Without it the endpoint
        # resolved but the body never did, and a COMPLIANT send was reported as
        # missing the profile.
        line_start = lexed.code.rfind("\n", 0, call.start) + 1
        binding = re.search(
            r"(\$[A-Za-z_]\w*)\s*=\s*$",
            lexed.code[line_start:call.start].rstrip()[-120:] + "=",
        ) or re.search(
            r"(\$[A-Za-z_]\w*)\s*=", lexed.code[line_start:call.start]
        )
        if binding is None:
            return []
        return [
            resolve_wrapped_payload(lexed, span, span[0], suffix)
            for span in curl_postfields_spans(
                lexed, binding.group(1), call.start, suffix
            )
        ]
    if callee == "curl_setopt" and len(arguments) >= 3:
        option = lexed.code[arguments[1][0]:arguments[1][1]].strip()
        if option != "CURLOPT_URL":
            return []
        handle = lexed.code[arguments[0][0]:arguments[0][1]].strip()
        return [
            resolve_wrapped_payload(lexed, span, span[0], suffix)
            for span in curl_postfields_spans(
                lexed, handle, call.start, suffix
            )
        ]
    if callee == "curl_setopt_array" and len(arguments) >= 2:
        # The array form carries the body in the SAME literal as the URL, and
        # may also have been set by earlier per-option calls on the handle.
        handle = lexed.code[arguments[0][0]:arguments[0][1]].strip()
        spans = curl_option_array_value_spans(
            lexed, arguments[1], suffix, "CURLOPT_POSTFIELDS"
        ) or curl_postfields_spans(lexed, handle, call.start, suffix)
        return [
            resolve_wrapped_payload(lexed, span, span[0], suffix)
            for span in spans
        ]
    # `.kt`/`.kts` are CANONICALISED to `.java` before reaching here, so this
    # must test the canonical suffix - keying on ".kt" meant the branch never
    # ran. Gating on the trailing lambda keeps it Kotlin-only in practice:
    # Java has no trailing-lambda call syntax for this shape.
    if suffix in {".java", ".kt", ".kts", ".scala"} and callee.lower() in {
        "post", "put", "patch", "request", "submitform"
    }:
        ktor_body = ktor_trailing_body_span(lexed, call, suffix)
        if ktor_body is not None:
            return [ktor_body]
    if (
        callee.lower() == "post"
        and suffix in {".java", ".kt", ".kts", ".scala"}
        # ONE argument only. Both idioms below pass the body alone, because the
        # endpoint came from an earlier `.uri(...)`/`.url(...)` link. A
        # positional two-argument `post(url, body)` - the shape used by Ktor and
        # by most thin JVM wrappers - puts the ENDPOINT first, so taking
        # argument 0 as the payload read the URL as the body and reported
        # compliant code as missing the profile. Matching on the case-insensitive
        # verb widened this branch to exactly those calls, so it must now check
        # the arity the branch actually assumes.
        and len(arguments) == 1
        # Ktor spells the send `client.post(url) { setBody(json) }` - ONE
        # argument, but that argument is the ENDPOINT and the body lives in the
        # trailing lambda. The arity gate alone still read the URL as the
        # payload, so a compliant Kotlin send was flagged. A trailing lambda
        # means the single argument is not the body.
        and _trailing_lambda_span(lexed, call) is None
    ):
        # .POST(HttpRequest.BodyPublishers.ofString(json)) for java.net.http and
        # .post(RequestBody.create(json, TYPE)) for OkHttp — in both the payload
        # is the wrapper's inner argument, not the wrapper itself.
        # The canonical OkHttp idiom binds the body first — `RequestBody body =
        # RequestBody.create(json, MediaType.parse(...)); ....post(body)` — and
        # `unwrap_body_publisher` returns a bare variable untouched, leaving the
        # whole `create(json, mediaType)` right-hand side to be inspected as the
        # payload, where the media-type string won and a compliant send was
        # reported as missing the profile. Resolve the variable hop first.
        return [
            unwrap_body_publisher(
                lexed, resolve_wrapped_payload(lexed, span, span[0], suffix)
            )
            for span in arguments[:1]
        ]
    if callee == "request" and len(arguments) == 1:
        resolved = assigned_named_payload_spans(
            lexed, arguments[0], call.start, suffix
        )
        if resolved:
            return resolved
        # Node core http(s).request: the body never rides in the options
        # object — it is written afterwards via <handle>.write(payload).
        written = request_write_payload_spans(lexed, call)
        if written:
            return written
        return []

    if callee.split(".")[-1].lower() in {"post", "postasync"}:
        # Request-style config object held in a variable:
        #   const cfg = {url: ..., json: {...}}; request.post(cfg)
        # The inline form is already covered by named_payload_spans above,
        # which reads json/body/data straight out of the literal. Once the URL
        # side learned to resolve the variable, this side had to as well —
        # otherwise the call was recognised as targeting the endpoint but its
        # body could never be proven compliant, turning a silent miss into a
        # false report on exactly the shape that was just fixed.
        #
        # Only returned when a body member is actually found. For
        # post(urlVariable, bodyVariable) the first argument resolves to a
        # string with no body member, so this yields nothing and the
        # positional rule below still applies.
        resolved = assigned_named_payload_spans(
            lexed, arguments[0], call.start, suffix
        )
        if resolved:
            return resolved

    # For post(url, payload, config)-style clients, only the second positional
    # argument is request data. Later arguments are transport/query options.
    return arguments[1:2]


def payload_variables(
    lexed: LexedSource, start: int, end: int, *, sdk_call: bool = False
) -> list[str]:
    variables: list[str] = []
    for arg_start, arg_end in reversed(split_arguments(lexed.code, start, end)):
        argument = lexed.code[arg_start:arg_end].strip()
        match = SIMPLE_VARIABLE_RE.fullmatch(argument)
        if match:
            variables.append(match.group(1))
        for nested in STRINGIFIED_VARIABLE_RE.finditer(argument):
            variables.append(nested.group(1))
        if not sdk_call:
            for named in NAMED_PAYLOAD_VARIABLE_RE.finditer(argument):
                variables.append(named.group(1))
    for spread in SPREAD_VARIABLE_RE.finditer(lexed.code, start, end):
        depth = structural_depth(lexed.code, start, spread.start())
        if depth[2] and depth == payload_root_depth(lexed.code, start, end):
            variables.append(spread.group(1))
    variables = list(dict.fromkeys(variables))
    if not sdk_call:
        return variables

    non_payload_names = {
        "cancellationToken",
        "context",
        "ctx",
        "options",
        "requestOptions",
    }
    return [
        variable
        for variable in variables
        if variable.lstrip("$") not in non_payload_names
    ][:1]


def assignment_matches(code: str, variable: str, before: int) -> list[re.Match[str]]:
    escaped = re.escape(variable)
    # The optional annotation covers TypeScript/Python declarations without
    # allowing the search to cross a statement boundary.
    pattern = re.compile(
        rf"(?<![\w$.>]){escaped}(?!\w)(?:\s*,\s*\$?[A-Za-z_]\w*)*"
        rf"(?:\s*:[^=;\n]+)?\s*(?::=|=(?!=|>))"
    )
    return list(pattern.finditer(code, 0, before))


def assignment_end(lexed: LexedSource, rhs_start: int, suffix: str) -> int:
    code = lexed.code
    round_depth = square_depth = curly_depth = 0
    c_style = suffix in JS_TS_SUFFIXES | {".cs", ".java", ".php"}
    for index in range(rhs_start, len(code)):
        character = code[index]
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
        elif character == "}" and curly_depth:
            curly_depth -= 1
        elif character == "}" and not (round_depth or square_depth or curly_depth):
            return index
        elif character == ";" and not (round_depth or square_depth or curly_depth):
            return index
        elif character == "\n" and not (round_depth or square_depth or curly_depth):
            if c_style:
                next_line = code[index + 1 :].lstrip(" \t")
                if next_line.startswith((".", "?")):
                    continue
            return index
    return len(code)


def shell_jq_assignment_has_profile(
    lexed: LexedSource, start: int, end: int
) -> bool:
    """Recognize a top-level profile key emitted by a jq command substitution."""

    try:
        shell_source = re.sub(
            r"\\\r?\n", "", lexed.original[start:end]
        )
        tokens = shlex.split(
            shell_source, comments=True, posix=True
        )
    except ValueError:
        return False

    jq_index = next(
        (
            index
            for index, token in enumerate(tokens)
            if token.lstrip("$(").rsplit("/", 1)[-1] == "jq"
        ),
        None,
    )
    if jq_index is None:
        return False

    two_value_options = {
        "--arg",
        "--argjson",
        "--slurpfile",
        "--rawfile",
    }
    one_value_options = {
        "-f",
        "--from-file",
        "-L",
        "--library-path",
        "--indent",
    }
    index = jq_index + 1
    while index < len(tokens):
        token = tokens[index]
        if token == "--":
            index += 1
            break
        if token in two_value_options:
            index += 3
            continue
        if token in one_value_options:
            index += 2
            continue
        if token.startswith("-"):
            index += 1
            continue
        break
    if index >= len(tokens):
        return False

    program = tokens[index]
    program_lexed = lex_source(program, ".sh")
    return region_has_profile(program_lexed, 0, len(program))


def shell_curl_get_mode(tokens: list[str]) -> bool:
    """Return curl's final -G/--get state without reading option values as flags."""

    enabled = False
    index = 0
    while index < len(tokens):
        token = tokens[index]
        option, separator, _ = token.partition("=")
        if separator and option in SHELL_CURL_VALUE_OPTIONS:
            index += 1
            continue
        if token in SHELL_CURL_VALUE_OPTIONS:
            index += 2
            continue
        if token == "--get":
            enabled = True
        elif token == "--no-get":
            enabled = False
        elif token.startswith("-") and not token.startswith("--"):
            for short_option in token[1:]:
                if short_option == "G":
                    enabled = True
                if short_option in SHELL_CURL_SHORT_VALUE_OPTIONS:
                    break
        index += 1
    return enabled


def shell_curl_http_method(lexed: LexedSource, call: Call) -> str | None:
    """Return curl's effective HTTP method, or None when it is dynamic.

    curl defaults to GET, switches to POST for data/form options and PUT for
    uploads, while an explicit request method wins.  A dynamic -X value stays
    unresolved so callers can conservatively keep the request in scope.
    """

    try:
        tokens = shlex.split(
            lexed.original[call.start:call.end], comments=True, posix=True
        )
    except ValueError:
        return None
    curl_index = next(
        (
            index
            for index, token in enumerate(tokens)
            if re.search(r"(?:^|[/$(])curl$", token)
        ),
        None,
    )
    if curl_index is None:
        return None

    explicit: str | None = None
    inferred = "GET"
    index = curl_index + 1
    while index < len(tokens):
        token = tokens[index]
        if token in {"-X", "--request"}:
            if index + 1 >= len(tokens):
                return None
            explicit = tokens[index + 1]
            index += 2
            continue
        if token.startswith("--request="):
            explicit = token.split("=", 1)[1]
            index += 1
            continue
        if token.startswith("-X") and len(token) > 2:
            explicit = token[2:]
            index += 1
            continue
        option = token.split("=", 1)[0]
        if (
            option in SHELL_DATA_OPTIONS | SHELL_FORM_OPTIONS
            or token.startswith("-d") and len(token) > 2
            or token.startswith("-F") and len(token) > 2
        ):
            inferred = "POST"
        elif (
            option in SHELL_UPLOAD_OPTIONS
            or token.startswith("-T") and len(token) > 2
        ):
            inferred = "PUT"
        elif option in {"-I", "--head"}:
            inferred = "HEAD"
        elif option in {"-G", "--get"}:
            inferred = "GET"
        elif (
            token.startswith("-")
            and not token.startswith("--")
            and len(token) > 1
        ):
            # BUNDLED short options: `curl -fsSd '<json>' <url>` means -f -s -S
            # -d. Only a bare or `-d<value>` form was inferred as POST, so a
            # clustered -d left the method at GET and the send was dropped
            # from the scan entirely.
            for short_option in token[1:]:
                if short_option not in SHELL_CURL_SHORT_VALUE_OPTIONS:
                    continue
                if short_option == "d":
                    inferred = "POST"
                elif short_option == "F":
                    inferred = "POST"
                elif short_option == "T":
                    inferred = "PUT"
                break
        if token in SHELL_CURL_VALUE_OPTIONS:
            index += 2
        else:
            index += 1

    if explicit is None:
        return "GET" if shell_curl_get_mode(tokens[curl_index + 1:]) else inferred
    if re.search(r"[$`{}()]", explicit):
        return None
    return explicit.upper()


def shell_payload_values(source: str, start: int, end: int) -> list[str]:
    """Return curl request-body arguments without executing shell syntax."""

    try:
        tokens = shlex.split(source[start:end], comments=True, posix=True)
    except ValueError:
        return []
    if shell_curl_get_mode(tokens):
        return []

    values: list[str] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token in SHELL_DATA_OPTIONS:
            if index + 1 < len(tokens):
                values.append(tokens[index + 1])
                index += 2
                continue
        for option in sorted(SHELL_DATA_OPTIONS, key=len, reverse=True):
            separator = "=" if token.startswith(f"{option}=") else ""
            if separator:
                values.append(token[len(option) + 1 :])
                break
            if option == "-d" and token.startswith("-d") and len(token) > 2:
                values.append(token[2:])
                break
        else:
            # BUNDLED short options: `curl -fsSd '<json>' <url>` is the same as
            # `-f -s -S -d '<json>'`. Only a bare `-d` or a `-d<value>` prefix
            # was recognised, so a clustered -d hid the body entirely and the
            # send was never treated as carrying a payload.
            if (
                token.startswith("-")
                and not token.startswith("--")
                and len(token) > 1
            ):
                for position, short_option in enumerate(token[1:], start=1):
                    if short_option not in SHELL_CURL_SHORT_VALUE_OPTIONS:
                        continue
                    if short_option == "d":
                        inline = token[position + 1:]
                        if inline:
                            values.append(inline)
                        elif index + 1 < len(tokens):
                            values.append(tokens[index + 1])
                            index += 1
                    break  # a value-taking option consumes the rest
        index += 1
    return values


def shell_payload_variable(value: str) -> str | None:
    candidate = value[1:] if value.startswith("@") else value
    match = SHELL_VARIABLE_RE.fullmatch(candidate)
    if match is None:
        return None
    return match.group(1) or match.group(2)


def shell_payload_file_has_profile(
    value: str, source_path: Path, project_root: Path
) -> bool:
    if not value.startswith("@") or "$" in value or value == "@-":
        return False
    relative = Path(value[1:])
    candidates = (
        relative if relative.is_absolute() else source_path.parent / relative,
        project_root / relative,
    )
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            resolved.relative_to(project_root)
        except (OSError, ValueError):
            continue
        if not resolved.is_file():
            continue
        try:
            payload = resolved.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if serialized_json_has_profile(payload[:1_000_000]):
            return True
    return False


def _parses_as_json_object(value: str) -> bool:
    """Return whether the text is a complete JSON object we can judge by value."""
    try:
        return isinstance(json.loads(value), dict)
    except (TypeError, ValueError):
        return False


def shell_inline_payload_has_profile(value: str) -> bool:
    """Recognize a literal JSON object passed through a curl data option."""
    return serialized_json_has_profile(value)


def payload_spans(
    lexed: LexedSource,
    call: Call,
    suffix: str,
    mode: str,
) -> list[tuple[int, int]]:
    """Select the payload for each supported official request signature."""

    start = call.open_paren + 1
    end = max(start, call.end - 1 if call.parenthesized else call.end)
    if mode == "rest":
        return rest_payload_spans(lexed, call, suffix)
    arguments = split_arguments(lexed.code, start, end)
    if suffix == ".go":
        # Idiomatic Go passes a context first, so the payload is the second
        # argument - but a single-argument send has its payload in the ONLY
        # argument. Reading argument 1 there yields no span at all, and a
        # compliant send is reported missing.
        return arguments[1:2] or arguments[:1]
    if suffix in {".py", ".rb", ".php"}:
        spans = [(start, end)]
        if mode == "body" and suffix == ".php" and len(arguments) > 1:
            # twilio-php declares `create(string $to, array $options = [])`
            # (twilio/twilio-php MessageList::create), so the canonical send
            # keeps `body` inside the trailing options array - one level below
            # the argument list this region covers.
            spans.append(arguments[-1])
        return spans
    return arguments[:1]


def call_has_profile(
    lexed: LexedSource,
    call: Call,
    suffix: str,
    source_path: Path,
    project_root: Path,
    *,
    sdk_call: bool,
    resolver: PayloadStateResolver | None = None,
) -> bool:
    resolver = resolver or PayloadStateResolver(
        lexed, suffix, PROFILE_NAMES, require_value=True
    )
    if suffix == ".sh" and not sdk_call:
        for value in shell_payload_values(lexed.original, call.start, call.end):
            variable = shell_payload_variable(value)
            if variable is not None and resolver.presence_for_name(
                variable, call.start
            ).state == PRESENT:
                return True
            if shell_payload_file_has_profile(value, source_path, project_root):
                return True
            # When the body is parseable JSON its VALUE can be checked, so that
            # verdict is authoritative. text_presence only sees the key, so a
            # structurally-present but unusable value - `"messaging_profile_id":
            # {"id": "x"}` - was accepted and the send certified.
            if _parses_as_json_object(value):
                if serialized_json_has_profile(value):
                    return True
                continue
            if resolver.text_presence(value).state == PRESENT:
                return True
        return False
    return any(
        resolver.span_presence(start, end, call.start).state == PRESENT
        for start, end in payload_spans(
            lexed, call, suffix, "sdk" if sdk_call else "rest"
        )
    )


def line_number(source: str, offset: int) -> int:
    return source.count("\n", 0, offset) + 1


def line_bounds(source: str, offset: int) -> tuple[int, int]:
    start = source.rfind("\n", 0, offset) + 1
    end = source.find("\n", offset)
    return start, len(source) if end < 0 else end


def finding_row(path: Path, line: int, detail: str) -> str:
    """Format ONE findings row - the single site that decides the path shape.

    Every row the analyzer prints goes through here, so the whole run uses one
    path convention: the path exactly as `iter_source_files` yielded it. Callers
    depend on that - lint-telnyx-correctness.sh copies these strings verbatim
    into both `details.files[]` and the printed bullets, so mixing conventions
    in one run leaves a consumer unable to group, dedupe or open by file.
    """

    # The analyzer-to-shell protocol is LF-delimited. POSIX permits CR and LF
    # in filenames, so emitting a raw path can turn one finding into several
    # records and inflate both counts and details.files. Escape only the record
    # delimiters; keep the rest of the path byte-for-byte displayable.
    display_path = str(path).replace("\r", "\\r").replace("\n", "\\n")
    return f"{display_path}:{line}:{detail}"


def call_detail(path: Path, lexed: LexedSource, call: Call) -> str:
    line_start, line_end = line_bounds(lexed.original, call.start)
    code_line = lexed.code[line_start:line_end]
    relative = call.start - line_start
    statement_start = code_line.rfind(";", 0, relative) + 1
    statement_end = code_line.find(";", relative)
    statement_end = len(code_line) if statement_end < 0 else statement_end + 1
    detail = " ".join(
        lexed.original[line_start + statement_start : line_start + statement_end].split()
    )
    return finding_row(path, line_number(lexed.original, call.start), detail)


def static_references(
    lexed: LexedSource, start: int, end: int
) -> list[EndpointReference]:
    """Return identifier/member chains whose property names are static."""

    references: list[EndpointReference] = []
    strings = {token.start: token for token in lexed.strings}
    for match in SOURCE_IDENTIFIER_RE.finditer(lexed.code, start, end):
        if re.search(r"(?:\.|->)\s*$", lexed.code[start:match.start()]):
            continue
        parts = [match.group(1)]
        cursor = match.end()
        while cursor < end:
            while cursor < end and lexed.code[cursor].isspace():
                cursor += 1
            bracket = False
            if lexed.code.startswith("?.", cursor):
                cursor += 2
                while cursor < end and lexed.code[cursor].isspace():
                    cursor += 1
                bracket = cursor < end and lexed.code[cursor] == "["
            elif lexed.code.startswith("->", cursor):
                cursor += 2
            elif cursor < end and lexed.code[cursor] == ".":
                cursor += 1
            elif cursor < end and lexed.code[cursor] == "[":
                bracket = True
            else:
                break

            if bracket:
                cursor += 1
                while (
                    cursor < end
                    and cursor not in strings
                    and lexed.code[cursor].isspace()
                ):
                    cursor += 1
                token = strings.get(cursor)
                if token is not None:
                    key = token.contents
                    cursor = token.end
                else:
                    numeric = re.match(r"\d+", lexed.code[cursor:end])
                    symbol = re.match(
                        r":\s*([A-Za-z_]\w*)", lexed.code[cursor:end]
                    )
                    if numeric is not None:
                        key = numeric.group(0)
                        cursor += len(numeric.group(0))
                    elif symbol is not None:
                        key = symbol.group(1)
                        cursor += len(symbol.group(0))
                    else:
                        break
                while cursor < end and lexed.code[cursor].isspace():
                    cursor += 1
                if cursor >= end or lexed.code[cursor] != "]":
                    break
                parts.append(key)
                cursor += 1
                continue

            while cursor < end and lexed.code[cursor].isspace():
                cursor += 1
            member = re.match(r"[A-Za-z_]\w*", lexed.code[cursor:end])
            if member is None:
                break
            member_name = member.group(0)
            cursor += len(member_name)
            lookup_cursor = cursor
            while lookup_cursor < end and lexed.code[lookup_cursor].isspace():
                lookup_cursor += 1
            if (
                member_name in {"fetch", "get", "Get"}
                and lookup_cursor < end
                and lexed.code[lookup_cursor] == "("
            ):
                closing = matching_delimiter(
                    lexed.code, lookup_cursor, "(", ")"
                )
                if closing is None or closing >= end:
                    break
                key = static_lookup_key(
                    lexed, lookup_cursor + 1, closing
                )
                if key is None:
                    break
                parts.append(key)
                cursor = closing + 1
            else:
                parts.append(member_name)
        references.append(tuple(parts))

    for token in lexed.strings:
        if (
            token.start < start
            or token.end > end
            or lexed.original[token.start] != "`"
        ):
            continue
        for interpolation in re.finditer(r"\$\{([^{}]+)\}", token.contents):
            expression = interpolation.group(1).strip()
            root = re.match(r"(\$?[A-Za-z_]\w*)", expression)
            if root is None:
                continue
            parts = [root.group(1)]
            cursor = root.end()
            valid = True
            while cursor < len(expression):
                whitespace = re.match(r"\s*", expression[cursor:])
                cursor += len(whitespace.group(0)) if whitespace else 0
                dot = re.match(
                    r"(?:\?\.|\.)\s*([A-Za-z_]\w*)",
                    expression[cursor:],
                )
                bracket = re.match(
                    r"\[\s*(?:['\"]([^'\"]+)['\"]|(\d+))\s*\]",
                    expression[cursor:],
                )
                if dot is not None:
                    parts.append(dot.group(1))
                    cursor += len(dot.group(0))
                elif bracket is not None:
                    parts.append(bracket.group(1) or bracket.group(2))
                    cursor += len(bracket.group(0))
                else:
                    valid = False
                    break
            if valid:
                references.append(tuple(parts))
    return references


def direct_member_assignments(
    lexed: LexedSource, before: int, suffix: str
) -> list[tuple[EndpointReference, int, int, int]]:
    """Return assignments to static dot/bracket member chains."""

    target = (
        r"(\$?[A-Za-z_]\w*(?:(?:\s*(?:\.|->)\s*[A-Za-z_]\w*)|"
        r"(?:\s*\[\s*(?:\"[^\"]*\"|'[^']*'|`[^`]*`|"
        r":\s*[A-Za-z_]\w*|\d+)\s*\]))+)"
    )
    pattern = re.compile(target + r"\s*(?::=|=(?!=|>))")
    assignments: list[tuple[EndpointReference, int, int, int]] = []
    for match in pattern.finditer(lexed.without_comments, 0, before):
        if lexed.code[match.start(1)].isspace():
            continue
        references = static_references(lexed, match.start(1), match.end(1))
        if not references:
            continue
        rhs_start = match.end()
        assignments.append(
            (
                references[0],
                match.start(),
                rhs_start,
                assignment_end(lexed, rhs_start, suffix),
            )
        )
    return assignments


def top_level_colon(code: str, start: int, end: int) -> int | None:
    round_depth = square_depth = curly_depth = 0
    for index in range(start, end):
        character = code[index]
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
        elif character == "}" and curly_depth:
            curly_depth -= 1
        elif character == ":" and not (round_depth or square_depth or curly_depth):
            return index
    return None


def static_object_key(lexed: LexedSource, start: int, end: int) -> str | None:
    code = lexed.code[start:end].strip()
    if re.fullmatch(r"[A-Za-z_]\w*", code):
        return code
    if re.fullmatch(r"\d+", code):
        return code
    symbol = re.fullmatch(r":\s*([A-Za-z_]\w*)", code)
    if symbol is not None:
        return symbol.group(1)
    tokens = [
        token for token in lexed.strings
        if start <= token.start and token.end <= end
    ]
    if len(tokens) != 1:
        return None
    residual = (
        lexed.code[start:tokens[0].start] + lexed.code[tokens[0].end:end]
    ).strip()
    return tokens[0].contents if residual in {"", "[]"} else None


def static_lookup_key(lexed: LexedSource, start: int, end: int) -> str | None:
    """Return only literal lookup keys, never a runtime identifier."""

    code = lexed.code[start:end].strip()
    if re.fullmatch(r"\d+", code):
        return code
    symbol = re.fullmatch(r":\s*([A-Za-z_]\w*)", code)
    if symbol is not None:
        return symbol.group(1)
    tokens = [
        token for token in lexed.strings
        if start <= token.start and token.end <= end
    ]
    if len(tokens) != 1:
        return None
    residual = (
        lexed.code[start:tokens[0].start] + lexed.code[tokens[0].end:end]
    ).strip()
    return tokens[0].contents if not residual else None


def top_level_assignment_separator(
    code: str, start: int, end: int
) -> tuple[int, int] | None:
    round_depth = square_depth = curly_depth = 0
    index = start
    while index < end:
        character = code[index]
        if character == "(":
            round_depth += 1
        elif character == ")" and round_depth:
            round_depth -= 1
        elif character == "[":
            square_depth += 1
        elif character == "]" and square_depth:
            square_depth -= 1
        elif character == "{":
            curly_depth += 1
        elif character == "}" and curly_depth:
            curly_depth -= 1
        elif not (round_depth or square_depth or curly_depth):
            if code.startswith("=>", index):
                return index, index + 2
            if (
                character == "="
                and not code.startswith(("==", "=>"), index)
                and (index == start or code[index - 1] not in "!<>=")
            ):
                return index, index + 1
        index += 1
    return None


def matching_opening(
    code: str, closing: int, left: str, right: str
) -> int | None:
    depth = 0
    for index in range(closing, -1, -1):
        if code[index] == right:
            depth += 1
        elif code[index] == left:
            depth -= 1
            if depth == 0:
                return index
    return None


def first_argument_is_object(
    lexed: LexedSource, span: tuple[int, int]
) -> bool:
    """Return whether an argument span is an object/dict literal."""
    text = lexed.code[span[0]:span[1]].strip()
    return text.startswith("{")


def resolved_config_object_span(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
    seen: frozenset[str] = frozenset(),
) -> tuple[int, int] | None:
    """Return the object literal behind an inline or local config alias."""

    if first_argument_is_object(lexed, span):
        return span

    candidate = lexed.code[span[0]:span[1]].strip()
    variable_match = SIMPLE_VARIABLE_RE.fullmatch(candidate)
    if variable_match is None:
        return None
    variable = variable_match.group(1)
    if variable in seen:
        return None
    matches = assignment_matches(lexed.code, variable, before)
    if not matches:
        return None
    assignment = matches[-1]
    rhs_start = assignment.end()
    rhs_end = assignment_end(lexed, rhs_start, suffix)
    return resolved_config_object_span(
        lexed,
        (rhs_start, rhs_end),
        assignment.start(),
        suffix,
        seen | {variable},
    )


def config_object_member_spans(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
    names: tuple[str, ...],
) -> list[tuple[int, int]]:
    """Return selected members of an inline or aliased config object."""

    resolved = resolved_config_object_span(
        lexed, span, before, suffix
    )
    return (
        named_object_member_spans(lexed, resolved, names)
        if resolved is not None
        else []
    )


def config_object_url_spans(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
) -> list[tuple[int, int]]:
    """Return the URL member of a request-style config object."""

    return config_object_member_spans(
        lexed, span, before, suffix, URL_MEMBER_NAMES
    )


def named_object_member_spans(
    lexed: LexedSource,
    span: tuple[int, int],
    name: str | tuple[str, ...],
) -> list[tuple[int, int]]:
    names = (name,) if isinstance(name, str) else name
    opening = lexed.code.find("{", span[0], span[1])
    if opening < 0:
        return []
    closing = matching_delimiter(lexed.code, opening, "{", "}")
    if closing is None or closing >= span[1]:
        return []
    values: list[tuple[int, int]] = []
    for member_start, member_end in split_arguments(
        lexed.code, opening + 1, closing
    ):
        colon = top_level_colon(lexed.code, member_start, member_end)
        if colon is None:
            shorthand = lexed.code[member_start:member_end].strip()
            if shorthand in names:
                values.append((member_start, member_end))
            continue
        if (
            static_object_key(lexed, member_start, colon) in names
        ):
            values.append((colon + 1, member_end))
    return values


def named_argument_spans(
    lexed: LexedSource,
    spans: list[tuple[int, int]],
    name: str,
) -> list[tuple[int, int]]:
    """Return top-level keyword/named-argument value spans."""

    values: list[tuple[int, int]] = []
    for start, end in spans:
        separator = top_level_assignment_separator(lexed.code, start, end)
        if separator is None:
            colon = top_level_colon(lexed.code, start, end)
            separator = (colon, colon + 1) if colon is not None else None
        if separator is None:
            continue
        separator_start, value_start = separator
        if lexed.code[start:separator_start].strip().lstrip("$") == name:
            values.append((value_start, end))
    return values


def call_receiver(lexed: LexedSource, call: Call) -> str | None:
    # The optional `?` covers optional chaining - JS `client?.post(...)` and
    # PHP nullsafe `$client?->post(...)`. Without it the receiver reads as
    # anonymous and the send is discarded by the anonymous-receiver guard,
    # which is a false negative on a defensive but perfectly ordinary send.
    match = re.search(
        r"(\$?[A-Za-z_]\w*)\s*\??\s*(?:\.|->|::)\s*$",
        lexed.code[max(0, call.start - 120):call.start],
    )
    return match.group(1).lstrip("$") if match is not None else None


# Factory methods that build an HTTP client which then sends. A `.post()` on
# such a factory (requests.Session().post, httpx.Client().post,
# axios.create(...).post) is a real send; a `.post()` on a mock/assertion
# factory (nock, expect) is not. Distinguishing on the factory method keeps
# the mocks out of scope without dropping the clients.
HTTP_CLIENT_FACTORY_METHODS = frozenset(
    {
        "Session",
        "session",  # requests.session() is the documented lowercase alias
        "Client",
        "AsyncClient",
        # aiohttp's client class is named ClientSession, not Client or
        # Session, so `aiohttp.ClientSession().post(url, json=...)` fell
        # through the allowlist and the send was discarded entirely.
        "ClientSession",
        "create",
        "Http",
        "HTTP",
        # resty builds the request through a chain - client.R().SetBody(x).Post(url)
        # - so the IMMEDIATE receiver of the send is the last builder link, not
        # the client. Each link must be recognised or the send is discarded by
        # the anonymous-receiver guard.
        "R",
        "SetBody",
        "SetJSONBody",
        "SetFormData",
        "SetHeader",
        "SetHeaders",
        "SetQueryParam",
        "SetResult",
    }
)


def factory_receiver_method(lexed: LexedSource, call: Call) -> str | None:
    """Return the method name of a factory-call receiver, or None.

    For `axios.create(...).post(...)` the receiver is the call `create(...)`,
    so `call_receiver` returns None; this recovers `create`. For a receiver
    that is not a call (`foo.post`) it returns None.
    """
    prefix = lexed.code[:call.start]
    accessor = re.search(r"(?:\.|->|::)\s*$", prefix)
    if accessor is None:
        return None
    before = prefix[: accessor.start()].rstrip()
    if not before.endswith(")"):
        return None
    # Walk back to the matching '(' of the factory call.
    depth = 0
    index = len(before) - 1
    while index >= 0:
        char = before[index]
        if char == ")":
            depth += 1
        elif char == "(":
            depth -= 1
            if depth == 0:
                break
        index -= 1
    if index < 0:
        return None
    # The factory method sits immediately before the call parens:
    # requests.Session() -> "Session", axios.create(...) -> "create",
    # new Client() -> "Client". A receiver wrapped in an extra paren group,
    # e.g. PHP `(new Client())`, is not recovered here and stays skipped
    # rather than risking a misread; that shape is left to a future change.
    name = re.search(r"([A-Za-z_]\w*)\s*$", before[:index])
    return name.group(1) if name is not None else None


def static_method_value(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
    seen: frozenset[str] = frozenset(),
) -> str | None:
    value = argument_string_value(lexed, span)
    if value is not None:
        return value.upper()
    member_constant = re.fullmatch(
        r"\s*(?:[A-Za-z_]\w*\s*\.\s*)*(?:Http|Request)?Method"
        r"\s*\.?\s*(Get|Head|Options|Delete|Post|Put|Patch)\s*",
        lexed.code[slice(*span)],
        re.IGNORECASE,
    )
    if member_constant is not None:
        return member_constant.group(1).upper()
    symbol = re.fullmatch(r"\s*:\s*([A-Za-z_]\w*)\s*", lexed.code[slice(*span)])
    if symbol is not None:
        return symbol.group(1).upper()
    variable_match = re.fullmatch(
        r"\s*(\$?[A-Za-z_]\w*)\s*", lexed.code[slice(*span)]
    )
    if variable_match is None or variable_match.group(1) in seen:
        return None
    variable = variable_match.group(1)
    assignments = assignment_matches(lexed.code, variable, before)
    if not assignments:
        return None
    assignment = assignments[-1]
    rhs_end = assignment_end(lexed, assignment.end(), suffix)
    return static_method_value(
        lexed,
        (assignment.end(), rhs_end),
        assignment.start(),
        suffix,
        seen | {variable},
    )


def static_string_value(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
    seen: frozenset[str] = frozenset(),
) -> str | None:
    """Resolve a string literal through a bounded local alias chain."""

    value = argument_string_value(lexed, span)
    if value is not None:
        return value
    variable_match = re.fullmatch(
        r"\s*(\$?[A-Za-z_]\w*)\s*", lexed.code[slice(*span)]
    )
    if variable_match is None or variable_match.group(1) in seen:
        return None
    variable = variable_match.group(1)
    assignments = assignment_matches(lexed.code, variable, before)
    if not assignments:
        return None
    assignment = assignments[-1]
    rhs_end = assignment_end(lexed, assignment.end(), suffix)
    return static_string_value(
        lexed,
        (assignment.end(), rhs_end),
        assignment.start(),
        suffix,
        seen | {variable},
    )


_CSHARP_BODY_RE = re.compile(
    r"\.\s*(?:Content\s*=|AddJsonBody\s*\(|AddStringBody\s*\(|AddBody\s*\()"
)


# A request OBJECT is not a request. Each client has an explicit execution step;
# without it the object is constructed and discarded (a builder in a factory, a
# test fixture, dead code), and reporting it is a false positive.
_EXECUTION_LINK_RE = {
    # OkHttp executes via newCall(req).execute()/.enqueue(); java.net.http via
    # client.send(req, ...) / sendAsync(req, ...).
    # `\??\s*\.` accepts Kotlin's null-safe call: the .kt/.kts files that now
    # reach this table spell the same link `client?.newCall(req)?.execute()`,
    # and requiring a plain dot dropped the send entirely - a silent pass on
    # idiomatic Kotlin.
    # `(?:\?|!!)?` accepts both Kotlin null-handling spellings between the call
    # and the link - `client?.newCall(req)?.execute()` and the non-null
    # assertion `client!!.newCall(req)!!.execute()`. Requiring a plain dot
    # dropped the send entirely on idiomatic Kotlin, a silent pass.
    ".java": (
        r"newCall\s*\(\s*{name}\s*\)\s*(?:\?|!!)?\s*\.\s*(?:execute|enqueue)\s*\("
        r"|(?:send|sendAsync)\s*\(\s*{name}\b"
    ),
    ".cs": (
        r"(?:SendAsync|Send)\s*\(\s*{name}\b"
        r"|Execute\w*\s*(?:<[^>()]*>)?\s*\(\s*(?:[A-Za-z_]\w*\s*,\s*)?{name}\b"
    ),
    ".py": r"urlopen\s*\(\s*{name}\b",
    ".go": r"\.\s*Do\s*\(\s*{name}\b",
}
_INLINE_EXECUTION_RE = re.compile(
    # The constructor may be namespaced inside the execution call, as in
    # urlopen(urllib.request.Request(...)), so allow a dotted qualifier.
    r"(?:urlopen|newCall|SendAsync|Send|Execute\w*|Do)\s*\(\s*"
    r"(?:[A-Za-z_][\w.]*\s*\.\s*)?$"
)


def request_object_is_executed(
    lexed: LexedSource, call: Call, suffix: str
) -> bool:
    """Return whether a constructed request object is actually sent.

    OkHttp needs newCall(req).execute()/.enqueue(), HttpRequestMessage needs
    SendAsync(req), RestSharp needs Execute*/ExecuteAsync*, urllib needs
    urlopen(req) and net/http needs client.Do(req). Construction alone is not a
    send.
    """
    canonical = ".java" if suffix in {".kt", ".kts", ".scala"} else suffix
    pattern = _EXECUTION_LINK_RE.get(canonical)
    if pattern is None:
        return True

    # Inline: urlopen(Request(...)) / client.Do(http.NewRequest(...)).
    prefix = lexed.code[max(0, call.start - 160):call.start]
    if _INLINE_EXECUTION_RE.search(prefix):
        return True

    # Otherwise the object must be bound and that binding executed. The bound
    # name is searched for SPECIFICALLY so two request objects in one scope
    # cannot borrow each other's execution.
    statement_start = max(
        lexed.code.rfind(";", 0, call.start),
        chain_newline_boundary(lexed.code, call.start),
        lexed.code.rfind("{", 0, call.start),
    ) + 1
    head = lexed.code[statement_start:call.start]
    assignment = re.search(r"^(.*?)(?::=|=(?!=))", head, re.S)
    if assignment is None:
        # An UNBOUND chain can still be executed inline:
        #   client.send(HttpRequest.newBuilder()...build(), handler)
        return re.search(
            r"(?:send|sendAsync|newCall|execute|enqueue|urlopen|Do)\s*\(", head
        ) is not None
    # `req, err := http.NewRequest(...)` binds several names; the blank `_` is
    # never the one executed, so every candidate must be tried.
    names = [
        name
        for name in re.findall(r"[A-Za-z_]\w*", assignment.group(1))
        if name != "_"
    ]
    return any(
        re.search(pattern.format(name=re.escape(name)), lexed.code[statement_start:])
        for name in names
    )


def php_stream_context_region(
    lexed: LexedSource, call: Call, suffix: str
) -> tuple[int, int] | None:
    """Return the stream-context array backing a file_get_contents() call.

    `$ctx = stream_context_create(["http" => ["method" => "POST", "content" =>
    $json]]); file_get_contents($url, false, $ctx);` - the verb and the body live
    in the CONTEXT, not in the call, so the call alone looks like a plain read.
    """
    args = split_arguments(lexed.code, call.open_paren + 1, call.end - 1)
    if len(args) < 3:
        return None
    text = lexed.code[args[2][0]:args[2][1]].strip()
    if "stream_context_create" in text:
        return args[2]
    name = re.fullmatch(r"\$?([A-Za-z_]\w*)", text)
    if name is None:
        return None
    # A PHP variable is written `$ctx`, and assignment_matches' lookbehind
    # rejects a leading `$`, so the bare name alone never resolves.
    candidates = [
        match
        for form in (text, name.group(1))
        for match in assignment_matches(lexed.code, form, call.start)
    ]
    for assignment in sorted(candidates, key=lambda m: m.start(), reverse=True):
        start = assignment.end()
        end = assignment_end(lexed, start, suffix)
        if "stream_context_create" in lexed.code[start:end]:
            return (start, end)
    return None


def xhr_send_body_span(
    lexed: LexedSource, call: Call, suffix: str
) -> tuple[int, int] | None:
    """Return the body passed to `.send(...)` after an XHR `.open(...)`.

    XMLHttpRequest splits one request across two calls on the same object:
    `x.open('POST', url)` carries the endpoint and method, `x.send(body)` the
    payload. Neither call alone describes the send.
    """
    receiver = call_receiver(lexed, call)
    if receiver is None:
        return None
    # `call_receiver` strips a leading `$` (PHP/JS sigil), so the name is
    # searched back into source that still spells it `$xhr`. Keeping `$` in the
    # lookbehind without allowing the sigil made every `$`-prefixed JS
    # identifier ($xhr, $http) unmatchable, losing the `.send(...)` body and
    # reporting a compliant send as missing the profile.
    match = re.search(
        rf"(?<![\w$])\$?{re.escape(receiver)}\s*(?:\?\.|\.)\s*send\s*\(",
        lexed.code[call.end:],
    )
    if match is None:
        return None
    open_paren = call.end + match.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None:
        return None
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    if not inner:
        return None
    return resolve_wrapped_payload(lexed, inner[0], inner[0][0], suffix)


def csharp_request_body_span(
    lexed: LexedSource, call: Call, suffix: str
) -> tuple[int, int] | None:
    """Return the body attached to a C# request object after construction.

    `new HttpRequestMessage(HttpMethod.Post, url)` and `new RestRequest(url,
    Method.Post)` carry only the endpoint; the body arrives in a LATER statement
    (`req.Content = new StringContent(json)`, `req.AddJsonBody(...)`), so the
    constructor's own arguments never reveal it.
    """
    line_start = lexed.code.rfind("\n", 0, call.start) + 1
    assigned = re.search(
        r"([A-Za-z_][\w]*)\s*=\s*$", lexed.code[line_start:call.start].rstrip()[:200]
    ) or re.search(
        r"(?:var|[A-Za-z_][\w<>\[\]]*)\s+([A-Za-z_][\w]*)\s*=",
        lexed.code[line_start:call.start],
    )
    if assigned is None:
        return None
    name = assigned.group(1)
    for match in re.finditer(
        rf"(?<![\w]){re.escape(name)}\s*(?=\.)", lexed.code[call.end:]
    ):
        tail = lexed.code[call.end + match.end():]
        body = _CSHARP_BODY_RE.match(tail)
        if body is None:
            continue
        base = call.end + match.end() + body.end()
        if tail[body.end() - 1] == "(":
            closing = matching_delimiter(lexed.code, base - 1, "(", ")")
            if closing is None:
                continue
            inner = split_arguments(lexed.code, base, closing)
            span = inner[0] if inner else None
        else:
            end = lexed.code.find(";", base)
            span = (base, end if end > 0 else len(lexed.code))
        if span is not None:
            return resolve_wrapped_payload(lexed, span, span[0], suffix)
    return None


# A wrapped fluent chain is ONE statement written two ways. Go (and Python
# inside brackets) puts the dot at the END of the previous line; Java, Kotlin,
# C#, JavaScript and TypeScript put it at the START of the next one, which is
# by far the more common formatting:
#
#     Request r = new Request.Builder().url(URL)
#         .post(body).build();
#
# Only the trailing-dot half used to be recognised, so every window bounded by
# a newline was truncated at the first wrap. That cost the chain its own
# binding (`Request r =`), which is what the execution-link check searches for
# - so a multi-line OkHttp builder was unresolvable while the byte-identical
# single-line spelling resolved fine, and the fail-safe backstop then reported
# a correct send as "could not verify".
#
# The leading-dot form requires the identifier to touch the dot (`.post`, never
# `. post`). That is how fluent chains are written, and it keeps shell's `.`
# source command (`. env.sh`) from reading as a continuation.
_LEADING_CHAIN_LINK_RE = re.compile(r"\.[A-Za-z_]")


def newline_continues_chain(code: str, newline: int) -> bool:
    """Whether the newline at `newline` is a chain wrap rather than a boundary.

    Both halves look only at the text either side of the newline itself. An
    earlier draft bounded the lookahead at the CALLER's position, which for the
    leading-dot form is the dot itself - so the identifier that proves it is a
    chain link sat outside the window and the test could never fire.
    """
    if code[max(0, newline - 200):newline].rstrip().endswith("."):
        return True
    following = code[newline:newline + 200].lstrip()
    return bool(_LEADING_CHAIN_LINK_RE.match(following))


def chain_newline_boundary(code: str, position: int) -> int:
    """Index of the newline that really ends the statement before `position`.

    Walks back over newlines that only wrap a fluent chain. Callers combine
    this with `rfind(";")`/`rfind("{")` under `max()`, so a genuine terminator
    on an earlier line still wins and the widened window cannot swallow a
    preceding statement.
    """
    index = code.rfind("\n", 0, position)
    while index > 0 and newline_continues_chain(code, index):
        index = code.rfind("\n", 0, index)
    return index


def _go_block_brace(code: str, start: int) -> int:
    """Index of the `{` that opens a Go statement BODY, scanning from `start`.

    Go headers are brace-ambiguous: a composite literal (`cfg{A: 1}`,
    `map[string]int{...}`, `[]T{...}`) puts a brace in the header that does not
    open the block. A literal's brace is always preceded by a type expression -
    an identifier, or the `]` closing a slice/map type - whereas a block's brace
    follows an operator, a paren, or nothing. Balanced runs of `()`/`[]` are
    skipped so a brace nested inside them is never mistaken for either.

    Returns -1 when no body brace is found before the statement ends.
    """
    index, depth = start, 0
    while index < len(code):
        char = code[index]
        if char in "([":
            depth += 1
        elif char in ")]":
            depth -= 1
            if depth < 0:
                return -1
        elif char == "}" and depth == 0:
            return -1
        elif char == "{" and depth == 0:
            # ADJACENCY is the discriminator, not the preceding token class:
            # `switch mode {` also puts an identifier before the brace, so
            # testing the token alone classified every ordinary switch as a
            # composite literal. Go composite literals are written with the
            # brace touching the type (`cfg{`, `map[string]int{`), and a block
            # brace is always separated by whitespace.
            prefix = code[max(0, index - 200):index]
            if prefix and (prefix[-1].isalnum() or prefix[-1] in "_]"):
                # A composite literal: skip its balanced body and keep looking.
                closing = matching_delimiter(code, index, "{", "}")
                if closing is None:
                    return -1
                index = closing
            else:
                return index
        index += 1
    return -1


def _top_level_ternary(
    code: str, start: int, end: int
) -> tuple[tuple[int, int], tuple[int, int]] | None:
    """Split `cond ? a : b` into its two arms, or None if this is not a ternary.

    Skips balanced brackets so a `?` inside an argument list is not mistaken for
    the operator, and ignores JS optional chaining (`?.`) and nullish
    coalescing (`??`).
    """
    depth = question = -1
    depth = 0
    for index in range(start, end):
        char = code[index]
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
        elif char == "?" and depth == 0:
            if code[index + 1:index + 2] in (".", "?"):
                continue
            question = index
            break
    if question < 0:
        return None
    depth = 0
    for index in range(question + 1, end):
        char = code[index]
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
        elif char == ":" and depth == 0:
            return (question + 1, index), (index + 1, end)
    return None


def chain_statement_start(code: str, position: int) -> int:
    """Index of the statement boundary preceding a chained call.

    A raw `rfind` for `;`/`{`/newline stops inside the chain's own arguments:
    `SetBody(map[string]string{...}).Post(url)` puts a `{` between the body
    link and the send, so the search window began AFTER the very link being
    looked for. Scan backwards instead, skipping balanced `()`/`{}`/`[]` runs,
    and treat a newline as a boundary only when it is not a chain wrap in
    either of the two spellings above.
    """
    depth = 0
    index = position - 1
    while index >= 0:
        char = code[index]
        if char in ")]}":
            depth += 1
        elif char in "([{":
            if depth == 0:
                return index
            depth -= 1
        elif depth == 0 and char in ";\n":
            if char == "\n" and newline_continues_chain(code, index):
                index -= 1
                continue
            return index
        index -= 1
    return -1


def builder_body_span(
    lexed: LexedSource, call: Call, methods: str
) -> tuple[int, int] | None:
    """Return the body argument set by an earlier link of the same chain.

    resty spells it `client.R().SetBody(payload).Post(url)`: the endpoint is the
    send call's argument while the BODY was attached upstream, the mirror image
    of the java/OkHttp builders.
    """
    statement_start = chain_statement_start(lexed.code, call.start)
    window = lexed.code[statement_start + 1:call.start]
    last = None
    for match in re.finditer(rf"\.\s*(?:{methods})\s*\(", window):
        last = match
    if last is None:
        return None
    open_paren = statement_start + 1 + last.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing > call.start:
        return None
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    return inner[0] if inner else None


def builder_uri_span(
    lexed: LexedSource, call: Call
) -> tuple[int, int] | None:
    """Return the .uri(...)/.url(...) argument preceding a builder send call.

    java.net.http uses `.uri(URI.create(URL))`; OkHttp uses `.url(URL)`. Both
    put the endpoint in an EARLIER link of the same chain than the call that
    performs the send, so the send argument alone never reveals the endpoint.
    """
    statement_start = max(
        lexed.code.rfind(";", 0, call.start),
        lexed.code.rfind("{", 0, call.start),
    )
    window = lexed.code[statement_start + 1:call.start]
    last = None
    matched_link = None
    for match in re.finditer(r"\.\s*(?:uri|url)\s*\(", window):
        last = match
        matched_link = "url" if "url" in match.group(0) else "uri"
    if last is None:
        return None
    open_paren = statement_start + 1 + last.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing > call.start:
        return None
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    if not inner:
        return None
    _BUILDER_LINK_KIND[(id(lexed), call.start)] = matched_link
    return inner[0]


# Which builder link supplied the endpoint for a given call: "uri" for
# java.net.http, "url" for OkHttp. Recorded rather than re-sniffed, because a
# substring search for ".url" in the preceding source also matches an unrelated
# `this.url` / `cfg.url` and silently rerouted java.net.http chains into the
# OkHttp branch, where the execution-link requirement then discarded the send.
_BUILDER_LINK_KIND: dict[tuple[int, int], str | None] = {}


PAYLOAD_WRAPPER_RE = re.compile(
    # `new` is optional so the C# constructor forms below match the same way
    # the static factories above do.
    r"^\s*(?:new\s+)?(?:bytes\s*\.\s*NewBuffer|bytes\s*\.\s*NewReader|"
    r"strings\s*\.\s*NewReader|json\s*\.\s*Marshal|json_encode|"
    r"RequestBody\s*\.\s*create|okhttp3\s*\.\s*RequestBody\s*\.\s*create|"
    # C# attaches the body as `req.Content = new StringContent(json, ...)`.
    # `csharp_request_body_span` already resolved that span, but without the
    # wrapper listed here the presence check ran against the CONSTRUCTOR text
    # rather than the JSON inside it - so a compliant HttpRequestMessage send
    # was reported as missing the profile, and a non-compliant one was flagged
    # for the wrong reason.
    r"StringContent|JsonContent\s*\.\s*Create|"
    # .NET serializers. Without these the resolver stopped at
    # `JsonSerializer.Serialize(payload)` and never reached the payload
    # variable, so every field written via Dictionary.Add was invisible and a
    # compliant C# send was reported as missing the profile.
    r"JsonSerializer\s*\.\s*Serialize|JsonConvert\s*\.\s*SerializeObject)"
    r"\s*\("
)


# A wrapper's payload is not always its FIRST argument. OkHttp ships both
# `RequestBody.create(body, mediaType)` and the deprecated
# `RequestBody.create(mediaType, body)` - and Kotlin code overwhelmingly uses
# the latter. Taking argument 0 unconditionally resolved the MEDIA TYPE as the
# payload, so `messaging_profile_id` was invisible and a compliant send was
# reported as missing it.
#
# Selection is POSITIVE - identify the argument that looks like a BODY - rather
# than a deny-list of media-type spellings. An earlier draft enumerated the
# media-type factories instead, and each spelling it did not list reopened the
# same false positive: a bound `static final MediaType JSON` constant (the
# spelling in OkHttp's own README), and Kotlin's `"application/json"
# .toMediaType()`. Enumerating producers cannot terminate; asking what a
# payload looks like can.
_MEDIA_TYPE_FACTORY_RE = re.compile(
    r"(?:[\w.]*\bMediaType\s*\.\s*(?:parse|get)\s*\(|\bContentType\s*\.|"
    r"\.\s*toMediaTypeOrNull\s*\(|\.\s*toMediaType\s*\(|"
    r"\bMediaTypeHeaderValue\s*\()"
)
# A MIME literal is `type/subtype` with an optional parameter tail, and nothing
# else. A JSON body is never shaped like that, so a real payload cannot be
# skipped by this test.
_MIME_LITERAL_RE = re.compile(
    r"""^\s*(["'])[\w.+-]+/[\w.+-]+(?:\s*;[^"']*)?\1\s*$"""
)
# A body announces itself: a quoted literal whose content opens a JSON object or
# array, or an inline object/array/map literal.
_BODY_LITERAL_RE = re.compile(r"""^\s*(?:["'`]\s*[\{\[]|[\{\[])""")
# Last-resort tiebreak only (see payload_argument). Names that read as a content
# type rather than a payload. Deliberately narrow: it must not match a name a
# real body would plausibly carry, so `body`, `payload`, `data` and `content`
# are absent - `content` in particular appears in `StringContent`, a body.
_CONTENT_TYPE_NAME_RE = re.compile(
    r"(?i)(?:\bmedia[_]?type|\bmime\b|\bcontent[_]?type|\bJSON_TYPE\b|\bTYPE\b)"
)
# Postfix wrapper: the payload is the RECEIVER. Kotlin/OkHttp 4 spells body
# construction this way (`json.toRequestBody(contentType)`), the mirror image of
# every prefix wrapper above.
# Anchored on the CALL, with the receiver taken as everything before it. A
# pattern that tried to capture the receiver directly matched the blanks inside
# a masked string literal instead: lex_source blanks the quotes as well as the
# content, so on `"{...}".toRequestBody(...)` the receiver is indistinguishable
# from whitespace in `lexed.code` and must be delimited by offset, not by shape.
_POSTFIX_PAYLOAD_WRAPPER_RE = re.compile(
    r"\.\s*(?:toRequestBody|toResponseBody)\s*\("
)
# `new X(...)` is NOT evidence of a body: `new MediaTypeHeaderValue("application
# /json")` and `new StringContent(...)` are both spelled that way, so accepting
# every constructor let a CONTENT-TYPE argument win the positive body test and
# outrank the real payload. Only composite literals - Go maps and struct/object
# literals, which are brace-initialised - count here; a constructor has to earn
# it through PAYLOAD_WRAPPER_RE like every other wrapper.
_MAP_LITERAL_RE = re.compile(r"^\s*(?:map\[|new\s+\w[\w.<>\[\]]*\s*\{|\w+\s*\{)")


def _is_media_type_argument(
    lexed: LexedSource, span: tuple[int, int], before: int
) -> bool:
    """Whether an argument denotes a CONTENT TYPE rather than a payload."""
    code_text = lexed.code[span[0]:span[1]]
    if _MEDIA_TYPE_FACTORY_RE.search(code_text):
        return True
    if _MIME_LITERAL_RE.match(lexed.original[span[0]:span[1]]):
        return True
    # An identifier reveals nothing by itself; resolve what it was assigned.
    # `static final MediaType JSON = MediaType.parse(...)` is the OkHttp README
    # spelling, and without this hop the constant read as the payload. The name
    # may be QUALIFIED (`HttpConstants.JSON`, `this.jsonType`, `Companion.JSON`)
    # - resolving only the bare form left every qualified constant unclassified,
    # so it fell through as "not a media type" and won the argument.
    bare = code_text.strip().rsplit(".", 1)[-1].strip()
    variable = SIMPLE_VARIABLE_RE.fullmatch(bare)
    if variable is None:
        return False
    # Searched across the WHOLE file, not just above the send. A media-type
    # constant is conventionally declared at the BOTTOM of the class in Kotlin
    # (`companion object { val JSON = ... }`) and in Java, so bounding the
    # lookup at the call site left those unclassified and the media type won the
    # argument. Safe here because the result only decides which argument is the
    # CONTENT TYPE - it never decides whether a profile value is present.
    matches = assignment_matches(lexed.code, variable.group(1), len(lexed.code))
    if not matches:
        matches = assignment_matches(lexed.code, variable.group(1), before)
    if not matches:
        return False
    rhs_start = matches[-1].end()
    rhs_code = lexed.code[rhs_start:rhs_start + 200]
    if _MEDIA_TYPE_FACTORY_RE.search(rhs_code.split("\n")[0]):
        return True
    rhs_original = lexed.original[rhs_start:rhs_start + 200].split("\n")[0]
    return bool(_MIME_LITERAL_RE.match(rhs_original.strip().rstrip(";,")))


def _is_body_argument(lexed: LexedSource, span: tuple[int, int]) -> bool:
    """Whether an argument positively looks like a request payload."""
    if _BODY_LITERAL_RE.match(lexed.original[span[0]:span[1]]):
        return True
    code_text = lexed.code[span[0]:span[1]]
    if _BODY_LITERAL_RE.match(code_text) or _MAP_LITERAL_RE.match(code_text):
        return True
    return bool(PAYLOAD_WRAPPER_RE.match(code_text) or
                STRINGIFIED_VARIABLE_RE.search(code_text))


def payload_argument(
    lexed: LexedSource, inner: list[tuple[int, int]]
) -> tuple[int, int] | None:
    """Pick the argument carrying the BODY, skipping content-type arguments."""
    if len(inner) <= 1:
        return inner[0] if inner else None
    before = inner[0][0]
    bodies = [span for span in inner if _is_body_argument(lexed, span)]
    if bodies:
        return bodies[0]
    for span in inner:
        if not _is_media_type_argument(lexed, span, before):
            return span
    # Nothing was positively identified either way. That happens when both
    # arguments are plain identifiers and the media-type constant could not be
    # resolved - a qualified name whose last segment collides with an unrelated
    # variable, or a declaration in another file. Falling through to argument 0
    # then picked the MEDIA TYPE for the deprecated
    # `RequestBody.create(mediaType, body)` order. As a last resort only, prefer
    # the argument whose NAME does not read as a content type. This is a
    # tiebreak, never an override: any positively identified body above wins.
    named = [
        span for span in inner
        if not _CONTENT_TYPE_NAME_RE.search(lexed.code[span[0]:span[1]])
    ]
    if named:
        return named[0]
    return inner[0]


def resolve_wrapped_payload(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
) -> tuple[int, int]:
    """Follow reader/stringifier wrappers and variables to the payload.

    bytes.NewBuffer(body) -> body -> json.Marshal(payload) -> payload -> the
    map literal. The literal is where messaging_profile_id is provably
    present or absent; stopping at any earlier hop reports compliant code as
    missing the profile.
    """
    for _ in range(6):
        text = lexed.code[span[0]:span[1]]
        # Kotlin/OkHttp 4 wraps the body as an EXTENSION on it -
        # `body.toRequestBody(mediaType)` - so the payload is the receiver, not
        # an argument. Every wrapper above is prefix-shaped, so without this the
        # whole expression was treated as the payload and the JSON inside it was
        # never inspected.
        postfix = _POSTFIX_PAYLOAD_WRAPPER_RE.search(text)
        if postfix is not None and postfix.start() > 0:
            start, end = span[0], span[0] + postfix.start()
            # Trim against the ORIGINAL: a masked literal is blank in `code`,
            # so trimming there would consume the payload itself.
            while start < end and lexed.original[start].isspace():
                start += 1
            while end > start and lexed.original[end - 1].isspace():
                end -= 1
            if end > start:
                span = (start, end)
                continue
        wrapper = PAYLOAD_WRAPPER_RE.match(text)
        if wrapper is not None:
            open_paren = span[0] + wrapper.end() - 1
            closing = matching_delimiter(lexed.code, open_paren, "(", ")")
            if closing is None or closing > span[1]:
                return span
            inner = split_arguments(lexed.code, open_paren + 1, closing)
            if not inner:
                return span
            chosen = payload_argument(lexed, inner)
            if chosen is None:
                return span
            span = chosen
            continue
        candidate = text.strip()
        variable = SIMPLE_VARIABLE_RE.fullmatch(candidate)
        if variable is None:
            return span
        matches = assignment_matches(lexed.code, variable.group(1), before)
        if not matches:
            return span
        assignment = matches[-1]
        rhs_start = assignment.end()
        rhs = (rhs_start, assignment_end(lexed, rhs_start, suffix))
        rhs_text = lexed.code[rhs[0]:rhs[1]]
        # The postfix wrapper counts as a wrapper hop too. Kotlin binds the body
        # first as often as it inlines it (`val body = json.toRequestBody(type)`
        # then `.post(body)`), and recognising only prefix wrappers here left the
        # variable unresolved, so a compliant Kotlin/OkHttp-4 send was always
        # reported as missing the profile.
        if (
            PAYLOAD_WRAPPER_RE.match(rhs_text) is None
            and _POSTFIX_PAYLOAD_WRAPPER_RE.search(rhs_text) is None
        ):
            # Only serializer/reader hops need chasing: the resolver cannot see
            # through json.Marshal/json_encode. Collapsing a plain variable to
            # its declaration literal instead DISCARDS every later mutation
            # (`payload["messaging_profile_id"] = ""`), certifying a send whose
            # profile was emptied. Stop here and let the mutation-aware
            # resolver evaluate the variable itself.
            return span
        span = rhs
        before = assignment.start()
    return span


BODY_PUBLISHER_RE = re.compile(
    r"^\s*(?:(?:HttpRequest\s*\.\s*)?BodyPublishers\s*\.\s*of\w+"
    r"|(?:okhttp3\s*\.\s*)?RequestBody\s*\.\s*create)\s*\("
)


def unwrap_body_publisher(
    lexed: LexedSource, span: tuple[int, int]
) -> tuple[int, int]:
    """Peel BodyPublishers.ofString(...) down to the payload expression."""
    text = lexed.code[span[0]:span[1]]
    match = BODY_PUBLISHER_RE.match(text)
    if match is None:
        return span
    open_paren = span[0] + match.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing > span[1]:
        return span
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    return inner[0] if inner else span


def php_curl_transaction_bounds(
    lexed: LexedSource, handle: str, anchor: int
) -> tuple[int, int]:
    """Bound the handle transaction containing a URL-setting call."""

    exec_pattern = re.compile(
        r"curl_exec\s*\(\s*" + re.escape(handle) + r"\s*\)"
    )
    previous_exec = list(exec_pattern.finditer(lexed.code, 0, anchor))
    start = previous_exec[-1].end() if previous_exec else 0
    next_exec = exec_pattern.search(lexed.code, anchor)
    return start, next_exec.start() if next_exec is not None else len(lexed.code)


def curl_postfields_spans(
    lexed: LexedSource, handle: str, anchor: int, suffix: str
) -> list[tuple[int, int]]:
    """Return POSTFIELDS spans from the same curl handle transaction."""

    transaction_start, transaction_end = php_curl_transaction_bounds(
        lexed, handle, anchor
    )
    pattern = re.compile(
        r"curl_setopt\s*\(\s*" + re.escape(handle)
        + r"\s*,\s*CURLOPT_POSTFIELDS\s*,"
    )
    # The two curl option forms mix freely on one handle. Reading only the
    # per-option form here made the body invisible whenever the URL arrived
    # through curl_setopt(CURLOPT_URL) but the body through
    # curl_setopt_array() - a compliant send was then reported as missing its
    # profile. Spans are ordered by position so the last write still wins.
    array_pattern = re.compile(
        r"curl_setopt_array\s*\(\s*" + re.escape(handle) + r"\s*,"
    )

    def collect(start: int, end: int) -> list[tuple[int, int]]:
        found: list[tuple[int, tuple[int, int]]] = []
        for match in pattern.finditer(lexed.code, start, end):
            open_paren = lexed.code.index("(", match.start())
            closing = matching_delimiter(lexed.code, open_paren, "(", ")")
            if closing is None:
                continue
            arguments = split_arguments(lexed.code, open_paren + 1, closing)
            if len(arguments) >= 3:
                found.append((open_paren, arguments[2]))
        for match in array_pattern.finditer(lexed.code, start, end):
            open_paren = lexed.code.index("(", match.start())
            closing = matching_delimiter(lexed.code, open_paren, "(", ")")
            if closing is None:
                continue
            arguments = split_arguments(lexed.code, open_paren + 1, closing)
            if len(arguments) >= 2:
                found.extend(
                    (open_paren, span)
                    for span in curl_option_array_value_spans(
                        lexed, arguments[1], suffix, "CURLOPT_POSTFIELDS"
                    )
                )
        return [span for _, span in sorted(found)]

    spans = collect(transaction_start, transaction_end)
    if not spans:
        # POSTFIELDS persists on the handle across exec until overwritten or
        # reset, so a transaction that only changes CURLOPT_URL still sends the
        # body set earlier. Fall back to the most recent carried value.
        state_start = php_curl_handle_state_start(lexed, handle, anchor)
        carried = collect(state_start, transaction_start)
        if carried:
            spans = carried[-1:]
    return spans


_CURL_ARRAY_OPTION_RE = re.compile(
    r"\s*['\"]?(CURLOPT_[A-Z_]+)['\"]?\s*=>"
)


def curl_option_array_value_spans(
    lexed: LexedSource,
    span: tuple[int, int],
    suffix: str,
    option: str,
) -> list[tuple[int, int]]:
    """Return the value spans for one option inside a curl option ARRAY.

    curl_setopt_array($ch, [CURLOPT_URL => ..., CURLOPT_POSTFIELDS => ...]) is
    as idiomatic as repeated curl_setopt() calls, but only the per-option call
    form was recognized, so a number-pool send configured this way was never
    visited at all. Keys are read from the ORIGINAL source (the masked view
    blanks string contents); values stay offset-accurate for the resolvers.
    """
    container = root_literal_container(lexed, span[0], span[1], suffix)
    if container is None:
        return []
    _, opening, closing = container
    spans: list[tuple[int, int]] = []
    for element in split_arguments(lexed.code, opening + 1, closing):
        match = _CURL_ARRAY_OPTION_RE.match(
            lexed.original, element[0], element[1]
        )
        if match is not None and match.group(1) == option:
            spans.append((match.end(), element[1]))
    return spans


def php_curl_handle_state_start(
    lexed: LexedSource, handle: str, anchor: int
) -> int:
    """Return where the handle's CARRIED option state begins.

    ext-curl options persist on a handle across curl_exec() until they are
    overwritten or curl_reset() is called — they are NOT cleared by the exec.
    State therefore begins at the last curl_reset()/curl_init() before the
    anchor, not after the previous exec.
    """
    latest = 0
    for pattern in (
        r"curl_reset\s*\(\s*" + re.escape(handle) + r"\s*\)",
        re.escape(handle) + r"\s*=\s*curl_init\s*\(",
    ):
        matches = list(re.finditer(pattern, lexed.code, 0))
        for match in matches:
            if match.end() <= anchor and match.end() > latest:
                latest = match.end()
    return latest


def php_curl_handle_method(
    lexed: LexedSource, handle: str, url_call_start: int, suffix: str
) -> str | None:
    """Return the method used by the handle's next curl_exec transaction."""

    transaction_start, transaction_end = php_curl_transaction_bounds(
        lexed, handle, url_call_start
    )
    # Options set before an earlier exec are STILL IN EFFECT unless overwritten
    # or reset, so a handle that posted once and then only changes CURLOPT_URL
    # is still POSTing. Scanning from the previous exec made that second
    # transaction look like a fresh GET, and the required send escaped.
    state_start = php_curl_handle_state_start(lexed, handle, url_call_start)
    if state_start < transaction_start:
        transaction_start = state_start
    setter_pattern = re.compile(
        r"curl_setopt\s*\(\s*" + re.escape(handle) + r"\s*,"
    )
    array_pattern = re.compile(
        r"curl_setopt_array\s*\(\s*" + re.escape(handle) + r"\s*,"
    )

    # Both option forms must be applied in SOURCE ORDER so that later settings
    # win. Scanning only curl_setopt() left the array form's method invisible,
    # so an array-configured GET looked like a required send.
    events: list[tuple[int, str, tuple[int, int]]] = []
    for match in setter_pattern.finditer(
        lexed.code, transaction_start, transaction_end
    ):
        opening = lexed.code.index("(", match.start())
        closing = matching_delimiter(lexed.code, opening, "(", ")")
        if closing is None or closing > transaction_end:
            continue
        arguments = split_arguments(lexed.code, opening + 1, closing)
        if len(arguments) < 3:
            continue
        events.append(
            (match.start(), lexed.code[slice(*arguments[1])].strip(), arguments[2])
        )
    for match in array_pattern.finditer(
        lexed.code, transaction_start, transaction_end
    ):
        opening = lexed.code.index("(", match.start())
        closing = matching_delimiter(lexed.code, opening, "(", ")")
        if closing is None or closing > transaction_end:
            continue
        arguments = split_arguments(lexed.code, opening + 1, closing)
        if len(arguments) < 2:
            continue
        container = root_literal_container(
            lexed, arguments[1][0], arguments[1][1], suffix
        )
        if container is None:
            continue
        _, array_open, array_close = container
        for element in split_arguments(lexed.code, array_open + 1, array_close):
            key = _CURL_ARRAY_OPTION_RE.match(
                lexed.original, element[0], element[1]
            )
            if key is not None:
                events.append(
                    (element[0], key.group(1), (key.end(), element[1]))
                )

    method = "GET"
    custom_method: str | None = None
    for position, option, value_span in sorted(events, key=lambda event: event[0]):
        value = lexed.code[slice(*value_span)].strip().lower()
        if option == "CURLOPT_CUSTOMREQUEST":
            resolved = static_method_value(
                lexed, value_span, position, suffix
            )
            if resolved is None:
                return None
            custom_method = resolved
        elif option == "CURLOPT_POSTFIELDS":
            method = "POST"
        elif option == "CURLOPT_POST":
            if value in {"true", "1"}:
                method = "POST"
            elif value in {"false", "0"}:
                method = "GET"
            else:
                return None
        elif option == "CURLOPT_HTTPGET" and value in {"true", "1"}:
            method = "GET"
        elif option == "CURLOPT_NOBODY" and value in {"true", "1"}:
            method = "HEAD"
        elif option in {"CURLOPT_UPLOAD", "CURLOPT_PUT"}:
            if value in {"true", "1"}:
                method = "PUT"
            elif value not in {"false", "0"}:
                return None
    return custom_method or method


ASSIGNED_HANDLE_RE = re.compile(
    r"([A-Za-z_$][\w$]*)\s*=\s*(?:new\s+)?(?:[A-Za-z_$][\w$]*\s*\.\s*)?$"
)


def request_write_payload_spans(
    lexed: LexedSource, call: Call
) -> list[tuple[int, int]]:
    """Return <handle>.write(...) payload spans after a request(...) call."""
    prefix = lexed.code[max(0, call.start - 160):call.start]
    match = ASSIGNED_HANDLE_RE.search(prefix)
    if match is None:
        return []
    handle = match.group(1)
    write_re = re.compile(
        r"(?<![\w$])" + re.escape(handle) + r"\s*\.\s*write\s*\("
    )
    spans: list[tuple[int, int]] = []
    for found in write_re.finditer(lexed.code, call.end):
        open_paren = lexed.code.index("(", found.end() - 1)
        closing = matching_delimiter(lexed.code, open_paren, "(", ")")
        if closing is None:
            continue
        arguments = split_arguments(lexed.code, open_paren + 1, closing)
        if arguments:
            spans.append(arguments[0])
    return spans


URL_CONSTRUCTOR_RE = re.compile(
    r"^\s*(?:new\s+)?(?:URI|URL)(?:\s*\.\s*(?:create|parse|join))?\s*\("
)


def unwrap_url_constructor(
    lexed: LexedSource, span: tuple[int, int]
) -> tuple[int, int]:
    """Peel URI(...) / URI.create(...) / new URL(...) down to the URL itself.

    Ruby's Net::HTTP and Java's HttpRequest REQUIRE the wrapped form, so a
    resolver that only reads bare strings treated the mandatory spelling as
    an unknown expression and dropped the call entirely.
    """
    text = lexed.code[span[0]:span[1]]
    match = URL_CONSTRUCTOR_RE.match(text)
    if match is None:
        return span
    open_paren = span[0] + match.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing > span[1]:
        return span
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    return inner[0] if inner else span


def unwrap_bound_url_constructor(
    lexed: LexedSource, span: tuple[int, int]
) -> tuple[int, int]:
    """Peel a URI/URL constructor held in a BINDING's right-hand side.

    `uri = URI(URL); Net::HTTP.post(uri, body)` is as idiomatic as the inline
    spelling, but unwrapping only ran on the call-argument span, so the binding
    stayed an unknown expression and the send resolved to nothing.

    Narrower than `unwrap_url_constructor` on purpose: a binding carries no
    companion base lookup, so the two-argument `new URL(path, base)` form must
    stay unresolved rather than collapse to its (safe-looking) path, and a
    trailing member call (`URI.create(u).resolve(x)`) must not be discarded.
    """
    text = lexed.code[span[0]:span[1]]
    match = URL_CONSTRUCTOR_RE.match(text)
    if match is None:
        return span
    open_paren = span[0] + match.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing >= span[1]:
        return span
    if lexed.code[closing + 1:span[1]].strip():
        return span
    inner = split_arguments(lexed.code, open_paren + 1, closing)
    return inner[0] if len(inner) == 1 else span


# Only JS/TS `new URL(path, base)` — the WHATWG constructor whose second
# argument is a base. Java/Python `URI(...)` multi-argument constructors have
# different semantics (Java's two-arg form is (scheme, ssp), NOT (path, base)),
# so combining their arguments would misclassify unrelated calls.
_JS_URL_CONSTRUCTOR_RE = re.compile(r"^\s*(?:new\s+)?URL\s*\(")


def url_constructor_base(
    lexed: LexedSource, span: tuple[int, int], suffix: str
) -> str | None:
    """Return the static base of a JS/TS `new URL(path, base)` span."""
    if suffix not in JS_TS_SUFFIXES:
        return None
    text = lexed.code[span[0]:span[1]]
    match = _JS_URL_CONSTRUCTOR_RE.match(text)
    if match is None:
        return None
    open_paren = span[0] + match.end() - 1
    closing = matching_delimiter(lexed.code, open_paren, "(", ")")
    if closing is None or closing > span[1]:
        return None
    arguments = split_arguments(lexed.code, open_paren + 1, closing)
    if len(arguments) < 2:
        return None
    base_start, base_end = arguments[1]
    for token in lexed.strings:
        if base_start <= token.start and token.end <= base_end:
            return token.contents
    # `new URL(path, BASE)` with the base held in a constant is the idiomatic
    # spelling; reading only a raw string token left the whole send
    # unresolvable. Resolve the alias chain the same way every other base does.
    return static_string_value(lexed, arguments[1], span[0], suffix)


# A base URL carried by a client factory: axios.create({baseURL: '...'}),
# httpx.Client(base_url='...'). The request path is then relative, so the
# effective endpoint is base + path. The KEY name is code (preserved), but the
# value is a string whose contents the lexer masks, so it is read from the
# string token rather than from the masked code.
# Stops at the separator: the lexer masks the value string to blanks, so a
# trailing \s* would run past it and miss the token.
# The left boundary excludes `\w` and `-` so the bare `url` alternative cannot
# match the TAIL of an unrelated key (`callback_url:`, `'X-Callback-Url' =>`),
# whose value would otherwise be read as the client's base. `$` is deliberately
# NOT excluded: PHP's `$base_url =` must still match.
_BASE_URL_KEY_RE = re.compile(
    r"(?<![\w\-])(?:base[_]?url|base_uri|BaseAddress|url)['\"]?\s*(?::|=>|=)",
    re.I,
)
_CLIENT_FACTORY_CALL_RE = re.compile(
    r"(?:\.\s*create|\bClient|\bAsyncClient|\bHttpClient|\bSession|"
    r"\bsession|\bFaraday\s*\.\s*new)\s*\("
)


def _paren_group_span_before_accessor(
    lexed: LexedSource, call: Call
) -> tuple[int, int] | None:
    """Return the offset span inside the receiver's trailing call parens."""
    accessor = re.search(r"(?:\.|->|::)\s*$", lexed.code[: call.start])
    if accessor is None:
        return None
    end = len(lexed.code[: accessor.start()].rstrip())
    if end == 0 or lexed.code[end - 1] != ")":
        return None
    depth = 0
    index = end - 1
    while index >= 0:
        if lexed.code[index] == ")":
            depth += 1
        elif lexed.code[index] == "(":
            depth -= 1
            if depth == 0:
                break
        index -= 1
    if index < 0:
        return None
    return index + 1, end - 1


def _base_url_in_region(
    lexed: LexedSource, region: tuple[int, int]
) -> str | None:
    """Return the base URL string literal declared within an offset region."""
    start, end = region
    # Some languages commonly quote option keys (`'base_uri' =>` in PHP),
    # which the masked-code view deliberately blanks. Key syntax is safe to
    # inspect in the original source here; the value still comes from the
    # lexer's string-token table rather than from regex parsing.
    key = _BASE_URL_KEY_RE.search(lexed.original, start, end)
    if key is None:
        return None
    value_start = key.end()
    value_end = _option_value_end(lexed, value_start, end)
    following = [
        token
        for token in lexed.strings
        if value_start <= token.start and token.end <= value_end
    ]
    if not following:
        return None
    return min(following, key=lambda token: token.start).contents


def _option_value_end(lexed: LexedSource, start: int, limit: int) -> int:
    """End of ONE option's value: the next separator at its own nesting depth.

    Without this bound the scan took the first string ANYWHERE after the key,
    so a non-literal base (`url: base`, `baseURL: process.env.X`) silently
    adopted the next option's value - `headers: {'X-Doc' => '<base>'}` became
    the base URL and a relative path was joined against it.
    """
    depth = 0
    cursor = start
    while cursor < limit:
        char = lexed.code[cursor]
        if char in "([{":
            depth += 1
        elif char in ")]}":
            if depth == 0:
                return cursor
            depth -= 1
        elif char in ",;" and depth == 0:
            return cursor
        cursor += 1
    return limit


# An Axios METHOD HELPER takes a per-request config whose baseURL overrides the
# instance one (axios.post(url, data, {baseURL}) / api.post(url, data, {baseURL})).
# Body-carrying helpers put that config third; the rest put it second.
_AXIOS_HELPER_CONFIG_INDEX = {
    "post": 2,
    "put": 2,
    "patch": 2,
    "get": 1,
    "delete": 1,
    "head": 1,
    "options": 1,
}


def config_object_base_url(
    lexed: LexedSource,
    span: tuple[int, int],
    before: int,
    suffix: str,
) -> str | None:
    """Resolve a static baseURL/base_uri from an inline or aliased config."""

    base_spans = config_object_member_spans(
        lexed, span, before, suffix, ("baseURL", "baseUrl", "base_uri")
    )
    if not base_spans:
        return None
    return static_string_value(
        lexed, base_spans[-1], before, suffix
    )


def client_base_url(lexed: LexedSource, call: Call, suffix: str) -> str | None:
    """Return the static base URL of the client a `.post()` is sent through.

    Handles the client created inline —
    axios.create({baseURL: '...'}).post(path) — and bound to a variable —
    const api = axios.create({baseURL: '...'}); api.post(path). The idiomatic
    variable form is as common as the inline one, so both must resolve or a
    base-URL send is silently classified as safe.
    """
    callee = re.sub(r"\s+", "", lexed.code[call.start:call.open_paren]).lower()
    args = split_arguments(lexed.code, call.open_paren + 1, call.end - 1)
    receiver = call_receiver(lexed, call)
    if (
        callee in {"axios", "axios.request"}
        or (callee == "request" and receiver == "axios")
    ) and args:
        return config_object_base_url(
            lexed, args[0], call.start, suffix
        )

    # A per-request config on a method helper — axios.post(url, data, {baseURL})
    # or api.post(url, data, {baseURL}) — sets the effective base and OVERRIDES
    # the instance baseURL. Only the one-shot axios(config) form was read, so a
    # required send addressed this way resolved to the bare path and was
    # silently classified as safe. Checked first for that precedence.
    # Member access differs by language (obj.post, $obj->post, Obj::post).
    method_name = re.split(r"->|::|\.", callee)[-1]
    config_index = _AXIOS_HELPER_CONFIG_INDEX.get(method_name)
    if config_index is not None and len(args) > config_index:
        base = config_object_base_url(
            lexed, args[config_index], call.start, suffix
        )
        if base is not None:
            return base

    if receiver is None:
        # `axios.post(...)` has no client instance receiver. Use the dotted
        # callee prefix so `axios.defaults.baseURL = ...` participates in the
        # same member-assignment resolution as an axios instance.
        prefix = re.split(r"->|::|\.", callee)[0] if "." in callee else ""
        if prefix and re.fullmatch(r"[a-z_]\w*", prefix):
            receiver = prefix
        else:
            region = _paren_group_span_before_accessor(lexed, call)
            return _base_url_in_region(lexed, region) if region is not None else None

    # C# and Axios both support assigning a base URL after construction.
    member_base_pattern = re.compile(
        rf"\b{re.escape(receiver)}\s*\.\s*"
        rf"(?:BaseAddress|(?:defaults\s*\.\s*)?base[Uu][Rr][LlIi]?)\s*="
    )
    member_base = list(
        member_base_pattern.finditer(lexed.code, 0, call.start)
    )
    if member_base:
        start = member_base[-1].end()
        end = assignment_end(lexed, start, suffix)
        values = [
            token.contents
            for token in lexed.strings
            if start <= token.start and token.end <= end
        ]
        if values:
            return values[0]

    for assignment in reversed(assignment_matches(lexed.code, receiver, call.start)):
        rhs_start = assignment.end()
        rhs_end = assignment_end(lexed, rhs_start, suffix)
        if _CLIENT_FACTORY_CALL_RE.search(lexed.code, rhs_start, rhs_end):
            base = _base_url_in_region(lexed, (rhs_start, rhs_end))
            if base is not None:
                return base
    return None


def join_base_and_path(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def request_url_spans(
    lexed: LexedSource, call: Call, suffix: str
) -> list[tuple[int, int]]:
    """Select URL expressions, unwrapping URI/URL constructor spellings."""
    return [
        unwrap_url_constructor(lexed, span)
        for span in _request_url_spans(lexed, call, suffix)
    ]


def _request_url_spans(
    lexed: LexedSource, call: Call, suffix: str
) -> list[tuple[int, int]]:
    """Select URL expressions for the supported REST client signatures."""

    args = split_arguments(lexed.code, call.open_paren + 1, call.end - 1)
    if not args:
        return []
    callee = re.sub(
        r"\s+", "", lexed.code[call.start:call.open_paren]
    )
    callee_lower = callee.lower()
    receiver = call_receiver(lexed, call)
    explicit_receiver = bool(
        re.search(r"(?:\.|->|::)\s*$", lexed.code[:call.start])
    )
    if callee_lower == "post" and suffix in {".java", ".kt", ".kts", ".scala"}:
        # Builder chain: the endpoint is set by an EARLIER link in the same
        # statement — .uri(URI.create(url)) for java.net.http, .url(url) for
        # OkHttp — so the send call's own arguments never carry it. The chain
        # has no simple receiver, so this must run before the anonymous-receiver
        # guard below or the call is discarded exactly because it is a builder.
        # Keyed on the PRESENCE of that link rather than on the method's case,
        # since java.net.http spells it .POST and OkHttp spells it .post.
        uri_span = builder_uri_span(lexed, call)
        if uri_span is not None:
            # The execution-link requirement applies to OkHttp (`.url(...)` +
            # newCall/enqueue), which is newly modelled here. java.net.http
            # (`.uri(...)`) keeps its existing contract, where the builder chain
            # itself is treated as the send - changing that is out of scope for
            # this fix and its behaviour is pinned by existing tests.
            okhttp_style = _BUILDER_LINK_KIND.get((id(lexed), call.start)) == "url"
            if not okhttp_style or request_object_is_executed(
                lexed, call, suffix
            ):
                return [uri_span]
            return []
        if callee == "POST":
            return []
    # A `.post()` whose receiver is not a simple identifier is a factory call.
    # Two kinds exist: HTTP-client factories that DO send —
    # requests.Session().post(...), httpx.Client().post(...),
    # axios.create(...).post(...) — and mock/assertion factories that do NOT —
    # nock(API).post(...), expect(x)... . Skipping every anonymous receiver
    # missed the real clients (a common shape); analysing every one flags the
    # mocks. Discriminate on the factory METHOD name: analyse only the known
    # client factories, keep skipping the rest.
    if (
        callee_lower in {"post", "postasync", "request"}
        and explicit_receiver
        and receiver is None
        and factory_receiver_method(lexed, call) not in HTTP_CLIENT_FACTORY_METHODS
    ):
        return []
    if callee_lower in {"post", "postasync"} and receiver in {
        "app", "console", "expect", "nock", "router"
    }:
        return []
    if callee_lower in {"axios", "axios.request"}:
        return config_object_url_spans(
            lexed, args[0], call.start, suffix
        )
    named_method = named_argument_spans(lexed, args, "method")
    named_url = [
        span
        for name in URL_MEMBER_NAMES
        for span in named_argument_spans(lexed, args, name)
    ]
    if callee_lower in {"post", "postasync"} and named_url:
        return named_url[-1:]
    if suffix == ".php" and callee == "file_get_contents" and args:
        region = php_stream_context_region(lexed, call, suffix)
        if region is None:
            return []
        blob = lexed.original[region[0]:region[1]]
        verb = re.search(r"[\'\"]method[\'\"]\s*=>\s*[\'\"](\w+)[\'\"]", blob)
        if verb is None or verb.group(1).upper() not in MUTATING_HTTP_METHODS:
            return []
        return args[0:1]
    if (
        suffix in JS_TS_SUFFIXES
        and callee.split(".")[-1] == "open"
        and len(args) >= 2
    ):
        method = static_method_value(lexed, args[0], call.start, suffix)
        if method is None or method.upper() not in MUTATING_HTTP_METHODS:
            return []
        return args[1:2]
    if suffix == ".py" and callee.split(".")[-1] == "Request" and args:
        # urllib.request.Request(url, data=..., method="POST") - the stdlib
        # client. Default method is GET unless data= is present or method=
        # names a mutating verb.
        blob = lexed.original[call.start:call.end]
        method = re.search(r"method\s*=\s*[\'\"](\w+)[\'\"]", blob)
        if method is not None:
            if method.group(1).upper() not in MUTATING_HTTP_METHODS:
                return []
        elif not re.search(r"(?<![\w])data\s*=", blob):
            return []
        if not request_object_is_executed(lexed, call, suffix):
            return []
        return args[0:1]
    if callee in {"HttpRequestMessage", "RestRequest"} and args:
        # HttpRequestMessage(HttpMethod.Post, url) puts the endpoint SECOND;
        # RestRequest(url, Method.Post) puts it FIRST. Only a mutating method
        # makes the request a send.
        blob = lexed.original[call.start:call.end]
        mutating = re.search(
            r"(?:HttpMethod|Method)\s*\.\s*(?:Post|Put|Patch)", blob
        ) is not None
        if not mutating:
            # The verb may be assigned AFTER construction:
            #   var req = new RestRequest(url);  req.Method = Method.Post;
            # Treating the constructor alone as authoritative made that a
            # silent pass.
            statement_start = max(
                lexed.code.rfind(";", 0, call.start),
                chain_newline_boundary(lexed.code, call.start),
            ) + 1
            binding = re.search(
                r"([A-Za-z_]\w*)\s*=(?!=)", lexed.code[statement_start:call.start]
            )
            if binding is None:
                return []
            mutating = re.search(
                rf"(?<![\w]){re.escape(binding.group(1))}\s*\.\s*Method\s*="
                r"\s*(?:HttpMethod|Method)\s*\.\s*(?:Post|Put|Patch)\b",
                lexed.code[call.end:],
            ) is not None
            if not mutating:
                return []
        if not request_object_is_executed(lexed, call, suffix):
            return []
        return args[1:2] if callee == "HttpRequestMessage" else args[0:1]
    if suffix == ".go" and callee in {"Post", "Put", "Patch"} and len(args) == 1:
        # resty: client.R().SetBody(...).Post(url) - a single argument is the
        # ENDPOINT, unlike net/http.Post(url, contentType, body). Without this
        # the whole send was invisible.
        return args[0:1]
    if callee == "NewRequest" and len(args) >= 2:
        # Go net/http: http.NewRequest(method, url, body) + client.Do(req).
        # The idiomatic non-shortcut form; only mutating methods matter here.
        method = static_method_value(lexed, args[0], call.start, suffix)
        if method is not None and method not in MUTATING_HTTP_METHODS:
            return []
        # NOTE: http.NewRequest is NOT gated on a client.Do(req) execution link.
        # An existing contract (test_http_method_gate_is_consistent_across_
        # transports, fixture go-method-post.go) pins the behaviour that
        # NewRequest alone counts as a required send. Adding the gate here was a
        # behaviour change beyond the scope of this work, so it is left as-is;
        # the execution requirement applies only to the clients newly modelled
        # in this change (OkHttp, HttpRequestMessage, RestSharp, urllib).
        return args[1:2]
    if callee.endswith("new") and "Net::HTTP::" in callee and len(args) >= 1:
        return args[0:1]
    if callee == "curl_init" and len(args) >= 1:
        # `curl_init($url)` sets CURLOPT_URL directly - it is the documented
        # one-liner form and is at least as common as the setopt spelling.
        # Modelling only curl_setopt(CURLOPT_URL) made the whole send invisible:
        # the endpoint was never resolved, so the call was not counted as a send
        # and the fail-safe could not fire either. The linter reported "no
        # number-pool call sites detected" on a number-pool POST.
        return args[0:1]
    if callee == "curl_setopt" and len(args) >= 3:
        # PHP ext-curl is stateful: the URL and the payload arrive in
        # separate curl_setopt calls on the same handle. The CURLOPT_URL call
        # carries the endpoint; rest_payload_spans finds the sibling
        # CURLOPT_POSTFIELDS for the same handle. Every other option is not
        # an HTTP send and is skipped outright.
        option = lexed.code[args[1][0]:args[1][1]].strip()
        return args[2:3] if option == "CURLOPT_URL" else []
    if callee == "curl_setopt_array" and len(args) >= 2:
        # Same statefulness, one literal: curl_setopt_array($ch, [CURLOPT_URL
        # => ..., CURLOPT_POSTFIELDS => ...]). The URL comes from the array,
        # and the same method gate applies — an array that configures a GET is
        # not a send and must not be reported.
        url_spans = curl_option_array_value_spans(
            lexed, args[1], suffix, "CURLOPT_URL"
        )[-1:]
        if not url_spans:
            return []
        handle = lexed.code[args[0][0]:args[0][1]].strip()
        method = php_curl_handle_method(lexed, handle, call.start, suffix)
        if method is not None and method not in MUTATING_HTTP_METHODS:
            return []
        return url_spans
    if callee_lower in {"post", "postasync"} and not named_url:
        # Request-style config object: post({url: ..., json: {...}}), with or
        # without a trailing callback — request.post(options, cb) is the
        # library's classic form. The URL lives in a member rather than a
        # named argument, so named_url stays empty and the fallback below
        # evaluated the whole object, meaning a number-pool send missing
        # messaging_profile_id was never seen as a required call at all.
        #
        # Resolved from the FIRST argument only, never from any argument
        # carrying a url-ish key: in post(url, {callback_url: ...}) the
        # endpoint is the positional string and a url-shaped key inside the
        # body must not displace it. A base-URL client passing only a body
        # object has no URL member and keeps its existing treatment.
        object_url = config_object_url_spans(
            lexed, args[0], call.start, suffix
        )
        if object_url:
            return object_url[-1:]
    if callee_lower == "request" and named_method and named_url:
        method = static_method_value(
            lexed, named_method[-1], call.start, suffix
        )
        return (
            []
            if method is not None and method not in MUTATING_HTTP_METHODS
            else named_url[-1:]
        )
    if callee_lower == "request":
        first_config = resolved_config_object_span(
            lexed, args[0], call.start, suffix
        )
        if first_config is not None:
            members = config_object_url_spans(
                lexed, args[0], call.start, suffix
            )
            if members:
                return members[-1:]
            path_members = named_object_member_spans(
                lexed, first_config, ("path",)
            )
            host_members = named_object_member_spans(
                lexed, first_config, ("hostname", "host")
            )
            return path_members[-1:] if path_members and host_members else []
        if len(args) > 1 and resolved_config_object_span(
            lexed, args[1], call.start, suffix
        ) is not None:
            # request(url, options[, callback]) is URL-first. Method gating
            # is binding-aware in SourceEndpointResolver.
            return args[:1]
    if callee_lower == "request" and len(args) > 1:
        method = static_method_value(lexed, args[0], call.start, suffix)
        return (
            []
            if method is not None and method not in MUTATING_HTTP_METHODS
            else args[1:2]
        )
    if callee_lower == "request" and len(args) == 1:
        members = config_object_url_spans(lexed, args[0], call.start, suffix)
        if members:
            return members[-1:]
        # Node core http(s).request splits the endpoint into hostname + path.
        # The path alone identifies the required endpoint (the normalizer
        # accepts relative "/v2/messages/number_pool"), so a host member plus
        # a path member is enough to place the call.
        path_members = named_object_member_spans(lexed, args[0], ("path",))
        host_members = named_object_member_spans(
            lexed, args[0], ("hostname", "host")
        )
        if path_members and host_members:
            return path_members[-1:]
        return []
    return args[:1]


def selected_members_after_container(
    lexed: LexedSource, closing: int, end: int
) -> EndpointReference | None:
    """Return a static selection chain, or None for a dynamic selector."""

    members: list[str] = []
    strings = {token.start: token for token in lexed.strings}
    cursor = closing + 1
    while cursor < end:
        while cursor < end and (
            lexed.code[cursor].isspace() or lexed.code[cursor] == ")"
        ):
            cursor += 1
        bracket = False
        if lexed.code.startswith("?.", cursor):
            cursor += 2
            while cursor < end and lexed.code[cursor].isspace():
                cursor += 1
            bracket = cursor < end and lexed.code[cursor] == "["
        elif cursor < end and lexed.code[cursor] == ".":
            cursor += 1
        elif lexed.code.startswith("->", cursor):
            cursor += 2
        elif cursor < end and lexed.code[cursor] == "[":
            bracket = True
        else:
            break

        if bracket:
            cursor += 1
            while (
                cursor < end
                and cursor not in strings
                and lexed.code[cursor].isspace()
            ):
                cursor += 1
            token = strings.get(cursor)
            if token is not None:
                key = token.contents
                cursor = token.end
            else:
                numeric = re.match(r"\d+", lexed.code[cursor:end])
                symbol = re.match(
                    r":\s*([A-Za-z_]\w*)", lexed.code[cursor:end]
                )
                if numeric is not None:
                    key = numeric.group(0)
                    cursor += len(numeric.group(0))
                elif symbol is not None:
                    key = symbol.group(1)
                    cursor += len(symbol.group(0))
                else:
                    return None
            while cursor < end and lexed.code[cursor].isspace():
                cursor += 1
            if cursor >= end or lexed.code[cursor] != "]":
                return None
            members.append(key)
            cursor += 1
            continue

        while cursor < end and lexed.code[cursor].isspace():
            cursor += 1
        member = re.match(r"[A-Za-z_]\w*", lexed.code[cursor:end])
        if member is None:
            return None
        member_name = member.group(0)
        cursor += len(member_name)
        lookup_cursor = cursor
        while lookup_cursor < end and lexed.code[lookup_cursor].isspace():
            lookup_cursor += 1
        if (
            member_name in {"fetch", "get", "Get"}
            and lookup_cursor < end
            and lexed.code[lookup_cursor] == "("
        ):
            lookup_closing = matching_delimiter(
                lexed.code, lookup_cursor, "(", ")"
            )
            if lookup_closing is None or lookup_closing >= end:
                return None
            key = static_lookup_key(
                lexed, lookup_cursor + 1, lookup_closing
            )
            if key is None:
                return None
            members.append(key)
            cursor = lookup_closing + 1
        else:
            members.append(member_name)
    return tuple(members)


STATIC_REFERENCE_EXPRESSION_RE = re.compile(
    r"\s*\$?[A-Za-z_]\w*"
    r"(?:\s*(?:"
    r"(?:\?\.|\.|->)\s*[A-Za-z_]\w*"
    r"|(?:\?\.)?\s*\[\s*(?:\"[^\"]*\"|'[^']*'|`[^`]*`|"
    r":\s*[A-Za-z_]\w*|\d+)\s*\]"
    r"|(?:\.|->)\s*(?:get|Get|fetch)\s*\(\s*"
    r"(?:\"[^\"]*\"|'[^']*'|`[^`]*`|:\s*[A-Za-z_]\w*|\d+)"
    r"\s*\)"
    r"))*\s*"
)


def strip_expression_parentheses(
    lexed: LexedSource, start: int, end: int
) -> tuple[int, int]:
    while True:
        while start < end and lexed.original[start].isspace():
            start += 1
        while end > start and lexed.original[end - 1].isspace():
            end -= 1
        if start >= end or lexed.code[start] != "(":
            return start, end
        closing = matching_delimiter(lexed.code, start, "(", ")")
        if closing != end - 1:
            return start, end
        start += 1
        end -= 1


def static_reference_expression(
    lexed: LexedSource, start: int, end: int
) -> EndpointReference | None:
    start, end = strip_expression_parentheses(lexed, start, end)
    if not STATIC_REFERENCE_EXPRESSION_RE.fullmatch(
        lexed.original[start:end]
    ):
        return None
    references = static_references(lexed, start, end)
    return references[0] if references else None


def root_literal_container(
    lexed: LexedSource, start: int, end: int, suffix: str
) -> tuple[str, int, int] | None:
    """Return a literal container rooted in one bounded expression."""

    start, end = strip_expression_parentheses(lexed, start, end)
    call_forms: tuple[tuple[str, str], ...] = ()
    if suffix == ".java":
        call_forms = (
            (r"\bMap\s*\.\s*of\s*\(", "pairs"),
            (r"\b(?:List\s*\.\s*of|Arrays\s*\.\s*asList)\s*\(", "array"),
        )
    elif suffix == ".php":
        call_forms = ((r"\barray\s*\(", "members"),)
    for pattern, kind in call_forms:
        match = re.search(pattern, lexed.code[start:end])
        if match is None:
            continue
        absolute_end = start + match.end()
        opening = lexed.code.rfind("(", start, absolute_end)
        closing = matching_delimiter(lexed.code, opening, "(", ")")
        if closing is not None and closing < end:
            return kind, opening, closing

    delimiters = "{" if suffix in {".cs", ".go", ".java"} else "[{"
    candidates: list[int] = []
    for index in range(start, end):
        if lexed.code[index] not in delimiters:
            continue
        prefix = lexed.code[start:index].strip()
        prefix = prefix.strip("() \t\r\n")
        if not prefix or (
            suffix in {".cs", ".go", ".java"}
            and re.fullmatch(
                r"(?:new\s+)?(?:[A-Za-z_]\w*(?:\s*<[^{}]+>)?"
                r"(?:\s*\[[^{}]*\])?|map\s*\[[^{}]*\]\s*[A-Za-z_]\w*"
                r"|\[[^{}]*\]\s*[A-Za-z_]\w*)",
                prefix,
            )
        ):
            candidates.append(index)
    if not candidates:
        return None
    opening = candidates[0]
    left = lexed.code[opening]
    right = "}" if left == "{" else "]"
    closing = matching_delimiter(lexed.code, opening, left, right)
    return (
        ("members", opening, closing)
        if closing is not None and closing < end
        else None
    )


def literal_value_span(
    lexed: LexedSource,
    start: int,
    end: int,
    path: EndpointReference,
    suffix: str,
) -> tuple[int, int] | None:
    """Project a static key/index through nested bounded literals."""

    current_start, current_end = start, end
    for selected_key in path:
        container = root_literal_container(
            lexed, current_start, current_end, suffix
        )
        if container is None:
            return None
        kind, opening, closing = container
        members = split_arguments(lexed.code, opening + 1, closing)
        candidates: list[tuple[str, tuple[int, int]]] = []
        if kind == "pairs":
            for index in range(1, len(members), 2):
                key = static_object_key(lexed, *members[index - 1])
                if key is not None:
                    candidates.append((key, members[index]))
        else:
            separators = [
                (
                    (colon, colon + 1)
                    if (colon := top_level_colon(
                        lexed.code, member_start, member_end
                    )) is not None
                    else top_level_assignment_separator(
                        lexed.code, member_start, member_end
                    )
                )
                for member_start, member_end in members
            ]
            keyed = any(
                separator is not None for separator in separators
            )
            for index, ((member_start, member_end), separator) in enumerate(
                zip(members, separators)
            ):
                if keyed:
                    if separator is None:
                        key = static_object_key(
                            lexed, member_start, member_end
                        )
                        if key is not None:
                            candidates.append(
                                (key, (member_start, member_end))
                            )
                        continue
                    separator_start, value_start = separator
                    key = static_object_key(
                        lexed, member_start, separator_start
                    )
                    if key is not None:
                        candidates.append(
                            (key, (value_start, member_end))
                        )
                else:
                    candidates.append(
                        (str(index), (member_start, member_end))
                    )
        # Object/hash duplicate keys use their last value.
        selected = next(
            (
                span
                for key, span in reversed(candidates)
                if key == selected_key
            ),
            None,
        )
        if selected is None:
            return None
        current_start, current_end = selected
    return strip_expression_parentheses(lexed, current_start, current_end)


def class_field_regions(
    lexed: LexedSource, suffix: str
) -> list[tuple[int, int]]:
    """Top-level regions of JS/TS class BODIES - where fields are declared.

    A class field (`class S { payload = {…} }`) declares a MEMBER, not a
    reassignment of a same-named outer variable, but the assignment pattern
    cannot tell them apart. The field's value overwrote an outer `payload`
    that already carried messaging_profile_id, and the send that used the outer
    one was reported as missing the profile. Method bodies sit at depth > 0 and
    are deliberately excluded, so real locals inside them still bind.
    """

    if suffix not in JS_TS_SUFFIXES:
        return []
    code = lexed.code
    regions: list[tuple[int, int]] = []
    for match in re.finditer(r"\bclass\b[^{};()]*\{", code):
        opening = code.rfind("{", match.start(), match.end())
        closing = matching_delimiter(code, opening, "{", "}")
        if closing is None:
            continue
        depth = 0
        span_start = opening + 1
        for index in range(opening + 1, closing):
            character = code[index]
            if character in "([{":
                if depth == 0:
                    regions.append((span_start, index))
                depth += 1
            elif character in ")]}" and depth:
                depth -= 1
                if depth == 0:
                    span_start = index + 1
        regions.append((span_start, closing))
    return regions


def c_function_headers(
    lexed: LexedSource, suffix: str
) -> dict[int, tuple[int, int]]:
    """Index common C-family function/method/closure braces and parameters."""

    supported = JS_TS_SUFFIXES | {".cs", ".go", ".java", ".php", ".sh"}
    if suffix not in supported:
        return {}
    headers: dict[int, tuple[int, int]] = {}
    controls = {
        "catch", "checked", "fixed", "for", "foreach", "if", "lock",
        "switch", "synchronized", "try", "unchecked", "using", "while",
        "with",
    }
    for opening in (index for index, char in enumerate(lexed.code) if char == "{"):
        statement_start = max(
            lexed.code.rfind(";", 0, opening),
            lexed.code.rfind("{", 0, opening),
            lexed.code.rfind("}", 0, opening),
            lexed.code.rfind("\n", 0, opening),
        ) + 1
        statement_start = max(statement_start, opening - 512)
        header = lexed.code[statement_start:opening]
        trimmed = header.rstrip()

        arrow_token = None
        if suffix in JS_TS_SUFFIXES | {".cs"}:
            arrow_token = "=>"
        elif suffix == ".java":
            arrow_token = "->"
        if arrow_token and trimmed.endswith(arrow_token):
            arrow_start = statement_start + len(trimmed) - 2
            cursor = arrow_start - 1
            while cursor >= statement_start and lexed.code[cursor].isspace():
                cursor -= 1
            if cursor >= statement_start and lexed.code[cursor] == ")":
                params_open = matching_opening(
                    lexed.code, cursor, "(", ")"
                )
                if params_open is not None and params_open >= statement_start:
                    headers[opening] = (params_open + 1, cursor)
                continue
            parameter = re.search(
                r"(?:^|[^\w$])([$A-Za-z_]\w*)\s*$",
                lexed.code[statement_start:arrow_start],
            )
            if parameter is not None:
                headers[opening] = (
                    statement_start + parameter.start(1),
                    statement_start + parameter.end(1),
                )
            continue

        pairs: list[tuple[int, int]] = []
        depth = 0
        params_open = -1
        for index in range(statement_start, opening):
            if lexed.code[index] == "(":
                if depth == 0:
                    params_open = index
                depth += 1
            elif lexed.code[index] == ")" and depth:
                depth -= 1
                if depth == 0:
                    pairs.append((params_open, index))
        if not pairs:
            continue

        keyword = re.search(r"\b(function|func)\b", header)
        if keyword is not None:
            keyword_end = statement_start + keyword.end()
            candidates = [pair for pair in pairs if pair[0] >= keyword_end]
            if not candidates:
                continue
            selected = candidates[0]
            if suffix == ".go" and len(candidates) > 1:
                before_first = lexed.code[keyword_end:selected[0]].strip()
                between = lexed.code[selected[1] + 1:candidates[1][0]].strip()
                if not before_first and re.fullmatch(
                    r"[A-Za-z_]\w*", between
                ):
                    selected = candidates[1]
            headers[opening] = (selected[0] + 1, selected[1])
            continue
        if suffix in {".go", ".php"}:
            continue

        for candidate_open, candidate_close in pairs:
            prefix = lexed.code[statement_start:candidate_open]
            name_match = re.search(r"([A-Za-z_]\w*)\s*$", prefix)
            if name_match is None:
                continue
            name = name_match.group(1)
            if name in controls:
                continue
            before_name = prefix[:name_match.start(1)]
            if re.search(
                rf"\b(?:{'|'.join(sorted(controls))})\b[^{{}};]*$",
                before_name,
            ):
                continue
            if re.search(r"(?:\.|->|::)\s*$", before_name):
                continue
            if re.search(
                r"\b(?:new|return|throw)\b[^{};]*$", before_name
            ) or re.search(r"\bclass\b[^{};]*\bextends\b", before_name):
                continue
            tail = lexed.code[candidate_close + 1:opening].strip()
            if suffix == ".java" and tail and not tail.startswith("throws"):
                continue
            if suffix == ".cs" and tail and not re.fullmatch(
                r":\s*(?:base|this)\s*\([\s\S]*\)", tail
            ):
                continue
            if suffix in JS_TS_SUFFIXES and tail:
                if not tail.startswith(":"):
                    continue
            if suffix == ".sh":
                if lexed.code[candidate_open + 1:candidate_close].strip():
                    continue
                shell_prefix = prefix.strip()
                if not re.fullmatch(
                    rf"(?:function\s+)?{re.escape(name)}\s*", shell_prefix
                ):
                    continue
            headers[opening] = (candidate_open + 1, candidate_close)
            break
    return headers


def conditional_curly_scopes(code: str) -> set[int]:
    # The prefix runs back to the previous brace, not a fixed 160 characters:
    # `[^{}]*` already bounds the search there, and a LONG condition pushed its
    # `if` outside the window, so the block opened no scope at all and a
    # block-scoped `const payload` inside it leaked into the enclosing scope -
    # shadowing the outer payload the send actually uses.
    guarded: set[int] = set()
    head = re.compile(
        r"(?:\b(?:if|else|for|foreach|while|switch|case|catch|try)\b[^{}]*)$"
    )
    boundary = 0
    for index, character in enumerate(code):
        if character not in "{}":
            continue
        if character == "{" and head.search(code[boundary:index]):
            guarded.add(index)
        boundary = index + 1
    return guarded


def required_endpoint(value: str) -> bool:
    # urlsplit RAISES on a malformed authority (an unclosed IPv6 bracket, an
    # invalid port), and this runs on every endpoint-shaped literal in the tree
    # - including ones inside test fixtures and documentation. An exception here
    # aborted the whole FILE, so one unparsable string turned every send in it
    # into "could not verify". Fall back to plain string handling instead.
    try:
        parsed = urlsplit(value)
    except ValueError:
        parsed = None
    path = (
        (parsed.path if parsed is not None else "")
        or value.split("?", 1)[0].split("#", 1)[0]
    )
    # Clients configured with a base URL (axios baseURL, requests Session
    # mounts) pass RELATIVE paths such as "messages/number_pool"; a trailing-
    # slash base joined with a relative path also leaves INTERIOR "." / ".."
    # segments, because axios combineURLs does no normalization (baseURL
    # ".../v2/messages/" + "./number_pool" -> ".../v2/messages/./number_pool",
    # and ".../v2/messages/foo/" + "../number_pool" -> "...foo/../number_pool").
    # Resolve all dot segments the way the HTTP layer does before comparing, so
    # neither the base-URL form nor an interior dot segment is silently missed.
    if not path.startswith("/"):
        path = "/" + path
    path = posixpath.normpath(path)
    # posixpath.normpath PRESERVES a leading "//" (POSIX reserves it), so
    # "https://api.telnyx.com//v2/messages/number_pool" kept a "//v2/..." path
    # and matched nothing. Interior runs are already collapsed by normpath;
    # collapse the leading run the same way an HTTP router does.
    path = "/" + path.lstrip("/")
    if path.startswith("/v2/") or path == "/v2":
        path = path[3:] or "/"
    return path.rstrip("/") in {
        "/messages/number_pool",
        "/messages/alphanumeric_sender_id",
    }


def required_endpoint_literal_signal(value: str) -> bool:
    """Whether a URL-expression literal proves a required endpoint suffix.

    Format strings often carry an unknown host prefix (`%s/v2/...`) that is
    not itself a valid URL/path, but their static suffix is still definitive.
    Keep this separate from `required_endpoint`, whose exact-path contract is
    intentionally stricter for fully resolved URLs.
    """
    clean = value.split("?", 1)[0].split("#", 1)[0].rstrip("/")
    return bool(
        re.search(
            r"(?:^|/)messages/(?:number_pool|alphanumeric_sender_id)$",
            clean,
        )
    )


def endpoint_literal_value(value: str) -> EndpointValue:
    return EndpointValue(REQUIRED if required_endpoint(value) else SAFE, value)


def _default_endpoint_value(
    values: tuple[EndpointValue, ...]
) -> EndpointValue:
    """Combine a `primary, fallback` pair (`get(k, d)`, `{a = d} = o`).

    Only a MISSING primary selects the fallback - that is the one case where the
    default is provably taken. EVERY other primary, UNRESOLVABLE included, is
    returned as-is, so a dynamic lookup does NOT promote a REQUIRED literal
    default. See the comment below for why that stays out of scope here.
    """
    primary, fallback = values[0], values[1]
    if primary.kind == MISSING:
        return fallback
    # An UNRESOLVABLE primary deliberately does NOT promote a REQUIRED default.
    # Treating it as required was tried and reverted: the documented contract
    # (test_endpoint_resolver_common_static_syntax_corpus, fixture
    # runtime-primary-default.js) places fail-closed dynamic lookups OUTSIDE
    # this non-parser's finite grammar, so `const {pool: e = REQUIRED} = r`
    # with a dynamic `r` is not provably a required send. Changing that is a
    # behaviour change that needs its own justification, not a side effect.
    return primary


def join_endpoint_values(values: Iterable[EndpointValue]) -> EndpointValue:
    values = tuple(values)
    if not values:
        return UNKNOWN_VALUE
    kinds = {value.kind for value in values}
    exacts = {value.exact for value in values}
    # A JOIN is over branches that may ALL execute (a conditional reassignment,
    # a guarded arm). If ANY branch reaches the required endpoint the send can
    # reach it at runtime, so the join must stay REQUIRED. Collapsing the mixed
    # case to UNKNOWN silently dropped conditionally-assigned number_pool sends:
    # the surrounding call was still recognised, so the fail-safe backstop had
    # nothing left to report either.
    if REQUIRED in kinds:
        return EndpointValue(
            REQUIRED, exacts.pop() if len(exacts) == 1 else None
        )
    if len(kinds) != 1 or UNKNOWN in kinds:
        return UNKNOWN_VALUE
    return EndpointValue(
        values[0].kind, exacts.pop() if len(exacts) == 1 else None
    )


class EndpointGraph:
    """Iterative abstract interpreter over pre-indexed endpoint definitions."""

    def __init__(self, source_length: int, state_budget: int = 10_000) -> None:
        self.scopes: dict[int, IndexedScope] = {
            0: IndexedScope(0, None, 0, source_length, "module")
        }
        self.bindings: dict[int, IndexedBinding] = {}
        self.bindings_by_name: dict[str, list[int]] = {}
        self.definitions: dict[int, list[IndexedDefinition]] = {}
        self.definition_offsets: dict[int, list[int]] = {}
        self._next_scope = 1
        self._next_binding = 1
        self.state_budget = state_budget
        self._memo: dict[EndpointState, EndpointValue] = {}

    def add_scope(
        self, parent: int, start: int, end: int, kind: str
    ) -> int:
        scope_id = self._next_scope
        self._next_scope += 1
        self.scopes[scope_id] = IndexedScope(
            scope_id, parent, start, end, kind
        )
        return scope_id

    def ancestors(self, scope_id: int) -> tuple[int, ...]:
        result: list[int] = []
        current: int | None = scope_id
        while current is not None:
            result.append(current)
            current = self.scopes[current].parent
        return tuple(result)

    def execution_scope(self, scope_id: int) -> int:
        for candidate in self.ancestors(scope_id):
            if self.scopes[candidate].kind in {"function", "module"}:
                return candidate
        return 0

    def visible_binding(
        self, name: str, use_scope: int, before: int
    ) -> int | None:
        ancestry = self.ancestors(use_scope)
        depth = {scope_id: index for index, scope_id in enumerate(ancestry)}
        candidates = [
            self.bindings[binding_id]
            for binding_id in self.bindings_by_name.get(name, ())
            if self.bindings[binding_id].scope_id in depth
            and self.bindings[binding_id].visibility_start <= before
        ]
        if not candidates:
            return None
        candidates.sort(
            key=lambda binding: (
                depth[binding.scope_id],
                -binding.declaration_start,
            )
        )
        return candidates[0].id

    def add_binding(
        self,
        name: str,
        scope_id: int,
        declaration_start: int,
        visibility_start: int,
        kind: str,
    ) -> int:
        binding_id = self._next_binding
        self._next_binding += 1
        binding = IndexedBinding(
            binding_id,
            name,
            scope_id,
            declaration_start,
            visibility_start,
            kind,
        )
        self.bindings[binding_id] = binding
        self.bindings_by_name.setdefault(name, []).append(binding_id)
        return binding_id

    def add_definition(
        self,
        binding_id: int,
        path: EndpointReference,
        expression: EndpointExpression,
        offset: int,
        scope_id: int,
        kind: str,
        guarded: bool = False,
    ) -> None:
        self._memo.clear()
        definition = IndexedDefinition(
            binding_id,
            path,
            offset,
            expression,
            scope_id,
            self.execution_scope(scope_id),
            kind,
            guarded,
        )
        offsets = self.definition_offsets.setdefault(binding_id, [])
        definitions = self.definitions.setdefault(binding_id, [])
        index = bisect.bisect_right(offsets, offset)
        offsets.insert(index, offset)
        definitions.insert(index, definition)

    def _definition_reaches(
        self, definition: IndexedDefinition, state: EndpointAccessState
    ) -> bool:
        if definition.kind in {"declaration", "parameter"}:
            return definition.scope_id in self.ancestors(state.use_scope)
        return definition.execution_scope == self.execution_scope(
            state.use_scope
        )

    def _matching_definitions(
        self, state: EndpointAccessState
    ) -> list[IndexedDefinition]:
        offsets = self.definition_offsets.get(state.binding_id, ())
        stop = bisect.bisect_left(offsets, state.before)
        return [
            definition
            for definition in self.definitions.get(state.binding_id, ())[:stop]
            if state.path[: len(definition.member_path)]
            == definition.member_path
            and self._definition_reaches(definition, state)
        ]

    @staticmethod
    def _concat(values: tuple[EndpointValue, ...]) -> EndpointValue:
        if not values:
            return UNKNOWN_VALUE
        if all(value.exact is not None for value in values):
            return endpoint_literal_value(
                "".join(value.exact or "" for value in values)
            )
        suffix_parts: list[str] = []
        for value in reversed(values):
            if value.exact is None:
                break
            suffix_parts.append(value.exact)
        suffix = "".join(reversed(suffix_parts))
        if required_endpoint(suffix):
            return EndpointValue(REQUIRED)
        # A dynamic QUERY STRING (".../messages/number_pool?ref=" + id) leaves
        # no exact trailing run at all, so the suffix scan above saw nothing and
        # the send was silently classified as safe. Once the exact PREFIX has
        # reached a "?" or "#" the path is already closed: whatever follows is
        # query or fragment and cannot change the endpoint.
        prefix_parts: list[str] = []
        for value in values:
            if value.exact is None:
                break
            prefix_parts.append(value.exact)
        prefix = "".join(prefix_parts)
        if ("?" in prefix or "#" in prefix) and required_endpoint(prefix):
            return EndpointValue(REQUIRED)
        return UNKNOWN_VALUE

    def _definition_dependency(
        self,
        definition: IndexedDefinition,
        state: EndpointAccessState,
    ) -> EndpointExpressionState:
        remainder = state.path[len(definition.member_path):]
        live_container_alias = (
            bool(remainder)
            and isinstance(definition.expression, EndpointRef)
            and not definition.expression.members
        )
        return EndpointExpressionState(
            definition.expression,
            remainder,
            state.before if live_container_alias else definition.start,
            state.use_scope if live_container_alias else definition.scope_id,
        )

    def _expand_access(
        self, state: EndpointAccessState
    ) -> EndpointExpansion:
        definitions = self._matching_definitions(state)
        if not definitions:
            return EndpointExpansion(immediate=UNKNOWN_VALUE)
        last_unguarded = -1
        use_ancestry = set(self.ancestors(state.use_scope))
        for index, definition in enumerate(definitions):
            if not definition.guarded or definition.scope_id in use_ancestry:
                last_unguarded = index
        if last_unguarded < 0:
            selected = definitions
            baseline = (UNKNOWN_VALUE,)
        else:
            selected = [definitions[last_unguarded]] + [
                definition
                for definition in definitions[last_unguarded + 1:]
                if definition.guarded
                and definition.scope_id not in use_ancestry
            ]
            baseline = ()
        dependencies = tuple(
            self._definition_dependency(definition, state)
            for definition in selected
        )
        return EndpointExpansion(
            dependencies,
            lambda values: join_endpoint_values(baseline + values),
        )

    def _expand_expression(
        self, state: EndpointExpressionState
    ) -> EndpointExpansion:
        expression = state.expression
        if isinstance(expression, EndpointUnknown):
            return EndpointExpansion(immediate=UNKNOWN_VALUE)
        if isinstance(expression, EndpointLiteral):
            return EndpointExpansion(
                immediate=(
                    UNKNOWN_VALUE
                    if state.projection
                    else endpoint_literal_value(expression.value)
                )
            )
        if isinstance(expression, EndpointRef):
            return EndpointExpansion(
                dependencies=(
                    EndpointAccessState(
                        expression.binding_id,
                        expression.members + state.projection,
                        state.before,
                        state.use_scope,
                    ),
                ),
                combine=lambda values: values[0],
            )
        if isinstance(expression, EndpointObject):
            if not state.projection:
                return EndpointExpansion(immediate=UNKNOWN_VALUE)
            key, remainder = state.projection[0], state.projection[1:]
            candidates = [
                value for entry_key, value in expression.entries
                if entry_key == key
            ]
            if not candidates:
                return EndpointExpansion(immediate=MISSING_VALUE)
            return EndpointExpansion(
                dependencies=(
                    EndpointExpressionState(
                        candidates[-1], remainder, state.before, state.use_scope
                    ),
                ),
                combine=lambda values: values[0],
            )
        if isinstance(expression, EndpointArray):
            if not state.projection or not state.projection[0].isdigit():
                return EndpointExpansion(immediate=UNKNOWN_VALUE)
            index = int(state.projection[0])
            if index >= len(expression.items):
                return EndpointExpansion(immediate=MISSING_VALUE)
            return EndpointExpansion(
                dependencies=(
                    EndpointExpressionState(
                        expression.items[index],
                        state.projection[1:],
                        state.before,
                        state.use_scope,
                    ),
                ),
                combine=lambda values: values[0],
            )
        if isinstance(expression, EndpointDefault):
            if state.projection:
                return EndpointExpansion(immediate=UNKNOWN_VALUE)
            return EndpointExpansion(
                dependencies=(
                    EndpointExpressionState(
                        expression.primary, (), state.before, state.use_scope
                    ),
                    EndpointExpressionState(
                        expression.fallback, (), state.before, state.use_scope
                    ),
                ),
                combine=_default_endpoint_value,
            )
        if isinstance(expression, EndpointConcat):
            if state.projection:
                return EndpointExpansion(immediate=UNKNOWN_VALUE)
            return EndpointExpansion(
                dependencies=tuple(
                    EndpointExpressionState(
                        part, (), state.before, state.use_scope
                    )
                    for part in expression.parts
                ),
                combine=self._concat,
            )
        if isinstance(expression, EndpointProjected):
            return EndpointExpansion(
                dependencies=(
                    EndpointExpressionState(
                        expression.expression,
                        expression.members + state.projection,
                        state.before,
                        state.use_scope,
                    ),
                ),
                combine=lambda values: values[0],
            )
        return EndpointExpansion(immediate=UNKNOWN_VALUE)

    def _expand(self, state: EndpointState) -> EndpointExpansion:
        return (
            self._expand_access(state)
            if isinstance(state, EndpointAccessState)
            else self._expand_expression(state)
        )

    def evaluate(self, state: EndpointState) -> EndpointValue:
        memo: dict[EndpointState, EndpointValue] = dict(self._memo)
        visiting: set[EndpointState] = set()
        stack = [EndpointFrame(state)]
        expanded_states = 0
        while stack:
            frame = stack[-1]
            if frame.state in memo:
                value = memo[frame.state]
                stack.pop()
                if stack:
                    stack[-1].values.append(value)
                    stack[-1].next_dependency += 1
                continue
            if frame.expansion is None:
                expanded_states += 1
                if expanded_states > self.state_budget:
                    return UNKNOWN_VALUE
                frame.expansion = self._expand(frame.state)
                if frame.expansion.immediate is not None:
                    memo[frame.state] = frame.expansion.immediate
                    continue
                visiting.add(frame.state)
            dependencies = frame.expansion.dependencies
            if frame.next_dependency < len(dependencies):
                dependency = dependencies[frame.next_dependency]
                if dependency in visiting:
                    frame.values.append(UNKNOWN_VALUE)
                    frame.next_dependency += 1
                elif dependency in memo:
                    frame.values.append(memo[dependency])
                    frame.next_dependency += 1
                else:
                    stack.append(EndpointFrame(dependency))
                continue
            visiting.discard(frame.state)
            assert frame.expansion.combine is not None
            memo[frame.state] = frame.expansion.combine(tuple(frame.values))
        self._memo.update(memo)
        return memo[state]


class SourceEndpointResolver:
    """Compile one source file into a call-centric endpoint value graph."""

    JAVASCRIPT_SUFFIXES = JS_TS_SUFFIXES
    C_SUFFIXES = JS_TS_SUFFIXES | {".cs", ".go", ".java", ".php", ".sh"}

    def __init__(
        self,
        lexed: LexedSource,
        suffix: str,
        external_values: dict[str, str] | None = None,
        external_names: set[str] | None = None,
    ) -> None:
        self.lexed = lexed
        self.suffix = suffix
        self.external_values = external_values or {}
        self.external_names = external_names or set()
        self.unverified_external_calls: set[int] = set()
        self.graph = EndpointGraph(len(lexed.code))
        self.c_headers = c_function_headers(lexed, suffix)
        self.class_fields = class_field_regions(lexed, suffix)
        self.conditional_openings = conditional_curly_scopes(lexed.code)
        self.scope_ranges: list[tuple[int, int, int]] = []
        self.scope_by_opening: dict[int, int] = {}
        self.expression_parameters: list[tuple[int, int, int, int]] = []
        self.assignment_bindings: dict[int, int] = {}
        self.destructuring: list[
            tuple[int, int, int, int, list[tuple[str, EndpointReference, tuple[int, int] | None]]]
        ] = []
        self.destructure_mutations: set[int] = set()
        self._build_scopes()
        self._find_destructuring()
        self.root_assignments = [
            match
            for match in VARIABLE_ASSIGNMENT_RE.finditer(lexed.code)
            if not self._inside_destructuring_lhs(match.start())
            and not self._inside_parameter_list(match.start())
            and not self._inside_class_field(match.start())
        ]
        self._build_bindings()
        self._index_node_path_join_bindings()
        self._build_definitions()

    def _index_node_path_join_bindings(self) -> None:
        """Index only live bindings that originate from Node's path.join.

        The builder parser must distinguish a real destructured/imported
        ``path.join`` from an unrelated local function with the same name.
        Binding IDs make parameter/block shadowing explicit; origin offsets
        let later assignments invalidate a mutable CommonJS alias.
        """

        self.node_path_join_origins: dict[int, int] = {}
        self.node_path_join_imports: dict[str, int] = {}
        self.node_path_module_origins: dict[int, int] = {}
        self.node_path_module_imports: dict[str, int] = {}
        source = self.lexed.without_comments

        for match in re.finditer(
            r"\b(?:const|let|var)\s+([A-Za-z_$]\w*)\s*=\s*"
            r"require\s*\(\s*['\"](?:node:)?path['\"]\s*\)"
            r"(?:\s*\.\s*posix)?(?!\s*\.)",
            source,
        ):
            name = match.group(1)
            binding_id = self.graph.visible_binding(
                name, self.scope_at(match.start()), match.end()
            )
            if binding_id is not None:
                self.node_path_module_origins[binding_id] = (
                    self.graph.bindings[binding_id].declaration_start
                )

        for match in re.finditer(
            r"\bimport\s+(?:\*\s+as\s+)?([A-Za-z_$]\w*)\s+from\s*"
            r"['\"](?:node:)?path['\"]",
            source,
        ):
            self.node_path_module_imports[match.group(1)] = match.start()

        commonjs = re.compile(
            r"\b(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*"
            r"require\s*\(\s*['\"](?:node:)?path['\"]\s*\)"
            r"(?:\s*\.\s*posix)?"
        )
        for match in commonjs.finditer(source):
            opening = source.find("{", match.start(), match.end())
            for member in match.group(1).split(","):
                parsed = re.fullmatch(
                    r"\s*join\s*(?::\s*([A-Za-z_$]\w*))?\s*", member
                )
                if parsed is None:
                    continue
                name = parsed.group(1) or "join"
                binding_id = self.destructure_bindings.get((opening, name))
                if binding_id is not None:
                    self.node_path_join_origins[binding_id] = opening

        for match in re.finditer(
            r"\bimport\s*\{([^{}]*)\}\s*from\s*"
            r"['\"](?:node:)?path['\"]",
            source,
        ):
            for member in match.group(1).split(","):
                parsed = re.fullmatch(
                    r"\s*join\s*(?:as\s+([A-Za-z_$]\w*))?\s*", member
                )
                if parsed is not None:
                    self.node_path_join_imports[parsed.group(1) or "join"] = (
                        match.start()
                    )

        # Destructuring or copying `.join` from a previously bound path
        # module is equivalent to destructuring it directly from require().
        for opening, _, rhs_start, rhs_end, leaves in self.destructuring:
            rhs = source[rhs_start:rhs_end].strip()
            module = re.fullmatch(r"([A-Za-z_$]\w*)", rhs)
            if module is None or not self._is_node_path_module_alias(
                module.group(1), self.scope_at(opening), opening
            ):
                continue
            for name, members, _ in leaves:
                if members == ("join",):
                    binding_id = self.destructure_bindings.get((opening, name))
                    if binding_id is not None:
                        self.node_path_join_origins[binding_id] = opening

        for match in re.finditer(
            r"\b(?:const|let|var)\s+([A-Za-z_$]\w*)\s*=\s*"
            r"([A-Za-z_$]\w*)\s*\.\s*join\b",
            source,
        ):
            alias, module = match.groups()
            if not self._is_node_path_module_alias(
                module, self.scope_at(match.start()), match.start()
            ):
                continue
            binding_id = self.graph.visible_binding(
                alias, self.scope_at(match.start()), match.end()
            )
            if binding_id is not None:
                self.node_path_join_origins[binding_id] = (
                    self.graph.bindings[binding_id].declaration_start
                )

        for match in re.finditer(
            r"\b(?:const|let|var)\s+([A-Za-z_$]\w*)\s*=\s*"
            r"require\s*\(\s*['\"](?:node:)?path['\"]\s*\)"
            r"(?:\s*\.\s*posix)?\s*\.\s*join\b",
            source,
        ):
            name = match.group(1)
            binding_id = self.graph.visible_binding(
                name, self.scope_at(match.start()), match.end()
            )
            if binding_id is not None:
                self.node_path_join_origins[binding_id] = (
                    self.graph.bindings[binding_id].declaration_start
                )
            else:
                self.node_path_join_imports[name] = match.start()

    def _is_node_path_module_alias(
        self, name: str, scope_id: int, before: int
    ) -> bool:
        binding_id = self.graph.visible_binding(name, scope_id, before)
        if binding_id is None:
            return self.node_path_module_imports.get(name, before + 1) < before
        origin = self.node_path_module_origins.get(binding_id)
        if origin is None:
            return False
        return not any(
            origin < offset < before and assigned == binding_id
            for offset, assigned in self.assignment_bindings.items()
        )

    def _is_node_path_join_alias(
        self, name: str, scope_id: int, before: int
    ) -> bool:
        binding_id = self.graph.visible_binding(name, scope_id, before)
        if binding_id is None:
            return self.node_path_join_imports.get(name, before + 1) < before
        origin = self.node_path_join_origins.get(binding_id)
        if origin is None:
            return False
        # A mutable alias stops identifying path.join after any later plain
        # or destructuring assignment that reaches the same binding.
        if any(
            origin < offset < before and assigned == binding_id
            for offset, assigned in self.assignment_bindings.items()
        ):
            return False
        if any(
            origin < opening < before
            and self.destructure_bindings.get((opening, name)) == binding_id
            for opening in self.destructure_mutations
        ):
            return False
        return True

    def _build_scopes(self) -> None:
        if self.suffix in self.C_SUFFIXES:
            stack: list[tuple[int, int, int]] = []
            for opening, character in enumerate(self.lexed.code):
                if character != "{":
                    continue
                statement_start = max(
                    self.lexed.code.rfind(";", 0, opening),
                    self.lexed.code.rfind("\n", 0, opening),
                    self.lexed.code.rfind("}", 0, opening),
                ) + 1
                prefix = self.lexed.code[statement_start:opening].strip()
                code_block = (
                    opening in self.c_headers
                    or opening in self.conditional_openings
                    or not prefix
                    or bool(
                        re.search(
                            r"\b(?:else|try|finally|do|class|namespace|"
                            r"interface|struct|enum|synchronized|using|lock|"
                            r"fixed|checked|unchecked)\b[^{}]*$",
                            prefix,
                        )
                    )
                )
                if not code_block:
                    continue
                closing = matching_delimiter(
                    self.lexed.code, opening, "{", "}"
                )
                if closing is None:
                    continue
                while stack and opening > stack[-1][1]:
                    stack.pop()
                parent = stack[-1][2] if stack else 0
                kind = (
                    "function"
                    if opening in self.c_headers
                    else "conditional"
                    if opening in self.conditional_openings
                    else "block"
                )
                scope_id = self.graph.add_scope(
                    parent, opening, closing + 1, kind
                )
                self.scope_by_opening[opening] = scope_id
                self.scope_ranges.append((opening, closing + 1, scope_id))
                stack.append((opening, closing, scope_id))
            self._build_expression_lambda_scopes()
            return
        if self.suffix == ".py":
            self._build_python_scopes()
            return
        if self.suffix == ".rb":
            self._build_ruby_scopes()

    def _build_expression_lambda_scopes(self) -> None:
        token = "->" if self.suffix == ".java" else "=>"
        if self.suffix not in JS_TS_SUFFIXES | {".cs", ".java"}:
            return
        for arrow in re.finditer(re.escape(token), self.lexed.code):
            body_start = arrow.end()
            while (
                body_start < len(self.lexed.code)
                and self.lexed.code[body_start].isspace()
            ):
                body_start += 1
            if (
                body_start >= len(self.lexed.code)
                or self.lexed.code[body_start] == "{"
            ):
                continue
            cursor = arrow.start() - 1
            while cursor >= 0 and self.lexed.code[cursor].isspace():
                cursor -= 1
            if cursor >= 0 and self.lexed.code[cursor] == ")":
                params_open = matching_opening(
                    self.lexed.code, cursor, "(", ")"
                )
                if params_open is None:
                    continue
                params_start, params_end = params_open + 1, cursor
            else:
                parameter = re.search(
                    r"([$A-Za-z_]\w*)\s*$",
                    self.lexed.code[:arrow.start()],
                )
                if parameter is None:
                    continue
                params_start, params_end = parameter.span(1)

            round_depth = square_depth = curly_depth = 0
            body_end = len(self.lexed.code)
            for index in range(body_start, len(self.lexed.code)):
                character = self.lexed.code[index]
                if character == "(":
                    round_depth += 1
                elif character == "[":
                    square_depth += 1
                elif character == "{":
                    curly_depth += 1
                elif character == ")":
                    if not round_depth:
                        body_end = index
                        break
                    round_depth -= 1
                elif character == "]":
                    if not square_depth:
                        body_end = index
                        break
                    square_depth -= 1
                elif character == "}":
                    if not curly_depth:
                        body_end = index
                        break
                    curly_depth -= 1
                elif (
                    character in {";", "\n", ","}
                    and not (round_depth or square_depth or curly_depth)
                ):
                    body_end = index
                    break
            parent = self.scope_at(arrow.start())
            scope_id = self.graph.add_scope(
                parent, body_start, body_end, "function"
            )
            self.scope_ranges.append((body_start, body_end, scope_id))
            self.expression_parameters.append(
                (scope_id, params_start, params_end, arrow.start())
            )

    def _build_python_scopes(self) -> None:
        lines = self.lexed.code.splitlines(keepends=True)
        stack: list[tuple[int, str, int, int]] = []
        records: list[list[int | str]] = []
        cursor = 0
        row = 0
        while row < len(lines):
            line = lines[row]
            consumed = 1
            stripped = line.lstrip(" \t")
            if stripped.strip():
                indent = len(line) - len(stripped)
                while stack and indent <= stack[-1][0]:
                    _, _, record_index, _ = stack.pop()
                    records[record_index][2] = cursor
                match = None
                if re.match(r"(?:async\s+)?(?:def|class)\b", stripped):
                    # A def/class signature may WRAP across lines, leaving its
                    # ':' on a continuation row. Only a one-line header was
                    # recognised, so the function opened no scope at all and a
                    # local `payload` reassignment inside it read as a
                    # module-level one - hiding a send that never got the
                    # profile. Join continuation rows until the brackets close.
                    joined = stripped
                    while (
                        re.search(r":\s*$", joined) is None
                        and row + consumed < len(lines)
                        and sum(joined.count(character) for character in "([{")
                        > sum(joined.count(character) for character in ")]}")
                    ):
                        joined += lines[row + consumed]
                        consumed += 1
                    match = re.fullmatch(
                        r"(?:async\s+)?(def|class)\b[\s\S]*:\s*", joined
                    )
                if match is not None:
                    kind = "function" if match.group(1) == "def" else "class"
                    parent = stack[-1][3] if stack else 0
                    if kind == "function" and stack and stack[-1][1] == "class":
                        parent = 0
                    records.append([cursor, kind, len(self.lexed.code), parent])
                    record_index = len(records) - 1
                    # The graph id is filled after ranges are known; retain a
                    # temporary negative record id in the stack.
                    stack.append((indent, kind, record_index, -(record_index + 1)))
            cursor += sum(
                len(lines[row + offset]) for offset in range(consumed)
            )
            row += consumed
        while stack:
            _, _, record_index, _ = stack.pop()
            records[record_index][2] = len(self.lexed.code)

        id_by_record: dict[int, int] = {}
        for index, (start, kind, end, parent_token) in enumerate(records):
            parent = (
                id_by_record[-int(parent_token) - 1]
                if int(parent_token) < 0
                else int(parent_token)
            )
            scope_id = self.graph.add_scope(
                parent, int(start), int(end), str(kind)
            )
            id_by_record[index] = scope_id
            self.scope_ranges.append((int(start), int(end), scope_id))

    def _build_ruby_scopes(self) -> None:
        stack: list[tuple[str, int | None, int]] = []
        records: list[list[int | str]] = []
        cursor = 0
        for line in self.lexed.code.splitlines(keepends=True):
            stripped = line.strip()
            if re.match(r"end\b", stripped) and stack:
                _, record_index, _ = stack.pop()
                if record_index is not None:
                    records[record_index][2] = cursor + len(line)
            else:
                match = re.match(r"(def|class|module)\b", stripped)
                if match is not None:
                    kind = "function" if match.group(1) == "def" else "class"
                    parent_token = stack[-1][2] if stack else 0
                    if kind == "function" and stack:
                        parent_token = 0
                    records.append(
                        [cursor, kind, len(self.lexed.code), parent_token]
                    )
                    record_index = len(records) - 1
                    stack.append((kind, record_index, -(record_index + 1)))
                elif re.search(r"\bdo(?:\s*\|[^|]*\|)?\s*$", stripped):
                    parent_token = stack[-1][2] if stack else 0
                    records.append(
                        [cursor, "block", len(self.lexed.code), parent_token]
                    )
                    record_index = len(records) - 1
                    stack.append(("block", record_index, -(record_index + 1)))
                elif re.match(
                    r"(?:if|unless|case|begin|for|while|until)\b", stripped
                ):
                    parent_token = stack[-1][2] if stack else 0
                    stack.append(("control", None, parent_token))
            cursor += len(line)
        id_by_record: dict[int, int] = {}
        for index, (start, kind, end, parent_token) in enumerate(records):
            parent = (
                id_by_record[-int(parent_token) - 1]
                if int(parent_token) < 0
                else int(parent_token)
            )
            scope_id = self.graph.add_scope(
                parent, int(start), int(end), str(kind)
            )
            id_by_record[index] = scope_id
            self.scope_ranges.append((int(start), int(end), scope_id))

    def scope_at(self, offset: int) -> int:
        candidates = [
            (end - start, scope_id)
            for start, end, scope_id in self.scope_ranges
            if start <= offset < end
        ]
        return min(candidates)[1] if candidates else 0

    def _inside_parameter_list(self, offset: int) -> bool:
        return any(start <= offset < end for start, end in self.c_headers.values())

    def _inside_class_field(self, offset: int) -> bool:
        return any(start <= offset < end for start, end in self.class_fields)

    def _inside_destructuring_lhs(self, offset: int) -> bool:
        return any(start <= offset < end for start, end, _, _, _ in self.destructuring)

    def _destructure_leaves(
        self,
        start: int,
        end: int,
        prefix: EndpointReference = (),
    ) -> list[tuple[str, EndpointReference, tuple[int, int] | None]]:
        start, end = strip_expression_parentheses(self.lexed, start, end)
        if start >= end or self.lexed.code.startswith("...", start):
            return []
        if self.lexed.code[start] not in "[{":
            default = top_level_assignment_separator(
                self.lexed.code, start, end
            )
            leaf_end = default[0] if default is not None else end
            leaf = self.lexed.code[start:leaf_end].strip()
            match = re.fullmatch(r"\$?([A-Za-z_]\w*)", leaf)
            return (
                [(match.group(1), prefix, (default[1], end) if default else None)]
                if match is not None
                else []
            )
        left = self.lexed.code[start]
        right = "}" if left == "{" else "]"
        closing = matching_delimiter(self.lexed.code, start, left, right)
        if closing is None:
            return []
        leaves: list[
            tuple[str, EndpointReference, tuple[int, int] | None]
        ] = []
        for index, (member_start, member_end) in enumerate(
            split_arguments(self.lexed.code, start + 1, closing)
        ):
            if not self.lexed.code[member_start:member_end].strip():
                continue
            if left == "[":
                leaves.extend(
                    self._destructure_leaves(
                        member_start,
                        member_end,
                        prefix + (str(index),),
                    )
                )
                continue
            colon = top_level_colon(
                self.lexed.code, member_start, member_end
            )
            if colon is not None:
                key = static_object_key(
                    self.lexed, member_start, colon
                )
                if key is not None:
                    leaves.extend(
                        self._destructure_leaves(
                            colon + 1,
                            member_end,
                            prefix + (key,),
                        )
                    )
                continue
            default = top_level_assignment_separator(
                self.lexed.code, member_start, member_end
            )
            key_end = default[0] if default is not None else member_end
            key = static_object_key(
                self.lexed, member_start, key_end
            )
            if key is not None:
                leaves.append(
                    (
                        key,
                        prefix + (key,),
                        (default[1], member_end) if default else None,
                    )
                )
        return leaves

    def _find_destructuring(self) -> None:
        if self.suffix not in self.JAVASCRIPT_SUFFIXES:
            return
        code = self.lexed.code
        for opening, character in enumerate(code):
            if character not in "[{":
                continue
            boundary = max(
                code.rfind(";", 0, opening),
                code.rfind("\n", 0, opening),
            ) + 1
            prefix = code[boundary:opening]
            declaration = re.search(r"\b(const|let|var)\s*$", prefix)
            assignment = declaration is None and re.fullmatch(
                r"\s*\(*\s*", prefix
            )
            if declaration is None and not assignment:
                continue
            right = "}" if character == "{" else "]"
            closing = matching_delimiter(code, opening, character, right)
            if closing is None:
                continue
            round_depth = square_depth = curly_depth = 0
            equals = None
            for cursor in range(closing + 1, len(code)):
                current = code[cursor]
                if current == "(":
                    round_depth += 1
                elif current == ")" and round_depth:
                    round_depth -= 1
                elif current == "[":
                    square_depth += 1
                elif current == "]" and square_depth:
                    square_depth -= 1
                elif current == "{":
                    curly_depth += 1
                elif current == "}" and curly_depth:
                    curly_depth -= 1
                elif not (round_depth or square_depth or curly_depth):
                    if current in ";\n":
                        break
                    if (
                        current == "="
                        and not code.startswith(("==", "=>"), cursor)
                        and (cursor == 0 or code[cursor - 1] not in "!<>=")
                    ):
                        equals = cursor
                        break
            if equals is None:
                continue
            residual = code[closing + 1:equals]
            if residual.strip() and not re.fullmatch(
                r"\s*:\s*[^=;\n]+\s*", residual
            ):
                continue
            leaves = self._destructure_leaves(opening, closing + 1)
            if not leaves:
                continue
            rhs_start = equals + 1
            rhs_end = assignment_end(self.lexed, rhs_start, self.suffix)
            if assignment:
                wrapper = opening - 1
                while wrapper >= boundary and code[wrapper].isspace():
                    wrapper -= 1
                if wrapper >= boundary and code[wrapper] == "(":
                    wrapper_closing = matching_delimiter(
                        code, wrapper, "(", ")"
                    )
                    if wrapper_closing is not None:
                        rhs_end = min(rhs_end, wrapper_closing)
                self.destructure_mutations.add(opening)
            self.destructuring.append(
                (opening, equals, rhs_start, rhs_end, leaves)
            )

    def _parameter_names(
        self, start: int, end: int
    ) -> list[str]:
        names: list[str] = []
        for span_start, span_end in split_arguments(
            self.lexed.code, start, end
        ):
            source = self.lexed.code[span_start:span_end]
            if not source.strip() or source.lstrip().startswith(("{", "[")):
                continue
            identifiers = re.findall(r"\$?([A-Za-z_]\w*)", source)
            if not identifiers:
                continue
            if self.suffix == ".go":
                name = identifiers[0]
            elif self.suffix in self.JAVASCRIPT_SUFFIXES or self.suffix == ".php":
                name = identifiers[0]
            else:
                name = identifiers[-1]
            if name not in {"self", "this"}:
                names.append(name)
        return names

    def _add_parameter_binding(
        self, name: str, scope_id: int, offset: int
    ) -> int:
        existing = [
            binding
            for binding in self.graph.bindings.values()
            if binding.name == name
            and binding.scope_id == scope_id
            and binding.kind == "parameter"
        ]
        if existing:
            return existing[0].id
        scope_start = self.graph.scopes[scope_id].start
        binding_id = self.graph.add_binding(
            name, scope_id, offset, scope_start, "parameter"
        )
        self.graph.add_definition(
            binding_id,
            (),
            EndpointUnknown("parameter"),
            scope_start,
            scope_id,
            "parameter",
        )
        return binding_id

    def _build_parameter_bindings(self) -> None:
        for opening, (start, end) in self.c_headers.items():
            scope_id = self.scope_by_opening.get(opening)
            if scope_id is None:
                continue
            for name in self._parameter_names(start, end):
                self._add_parameter_binding(name, scope_id, opening)
        for scope_id, start, end, offset in self.expression_parameters:
            for name in self._parameter_names(start, end):
                self._add_parameter_binding(name, scope_id, offset)
        if self.suffix in self.C_SUFFIXES:
            for match in re.finditer(
                r"\b(catch|for|foreach)\s*\(", self.lexed.code
            ):
                params_open = self.lexed.code.rfind(
                    "(", match.start(), match.end()
                )
                params_close = matching_delimiter(
                    self.lexed.code, params_open, "(", ")"
                )
                if params_close is None:
                    continue
                brace = self.lexed.code.find("{", params_close)
                if brace < 0 or self.lexed.code[params_close + 1:brace].strip():
                    continue
                scope_id = self.scope_by_opening.get(brace)
                if scope_id is None:
                    continue
                source = self.lexed.code[params_open + 1:params_close]
                if match.group(1) == "catch":
                    identifiers = re.findall(r"\$?([A-Za-z_]\w*)", source)
                    names = identifiers[-1:] if identifiers else []
                else:
                    declaration = re.search(
                        r"\b(?:const|let|var|final|String|string|var)\s+"
                        r"\$?([A-Za-z_]\w*)",
                        source,
                    )
                    names = [declaration.group(1)] if declaration else []
                for name in names:
                    self._add_parameter_binding(name, scope_id, match.start())
        if self.suffix == ".py":
            pattern = re.compile(r"(?:async\s+)?def\s+\w+\s*\(")
            for match in pattern.finditer(self.lexed.code):
                opening = self.lexed.code.rfind("(", match.start(), match.end())
                closing = matching_delimiter(
                    self.lexed.code, opening, "(", ")"
                )
                if closing is None:
                    continue
                scope_id = self.scope_at(match.start())
                for name in self._parameter_names(opening + 1, closing):
                    self._add_parameter_binding(name, scope_id, match.start())
        if self.suffix == ".rb":
            for match in re.finditer(
                r"\bdef\s+\w+\s*(?:\(([^)]*)\)|([^\n]*))",
                self.lexed.code,
            ):
                start, end = (
                    match.span(1) if match.group(1) is not None else match.span(2)
                )
                scope_id = self.scope_at(match.start())
                for name in self._parameter_names(start, end):
                    self._add_parameter_binding(name, scope_id, match.start())
            for match in re.finditer(
                r"\bdo\s*\|([^|]*)\|", self.lexed.code
            ):
                scope_id = self.scope_at(match.start())
                for name in self._parameter_names(*match.span(1)):
                    self._add_parameter_binding(name, scope_id, match.start())

    def _declaration_spec(
        self, assignment: re.Match[str]
    ) -> tuple[int, int, str, tuple[object, ...]] | None:
        name = assignment.group(1).lstrip("$")
        scope_id = self.scope_at(assignment.start())
        execution = self.graph.execution_scope(scope_id)
        line_start = max(
            self.lexed.code.rfind("\n", 0, assignment.start()),
            self.lexed.code.rfind(";", 0, assignment.start()),
            self.lexed.code.rfind("{", 0, assignment.start()),
        ) + 1
        prefix = self.lexed.code[line_start:assignment.start()]
        assignment_text = self.lexed.code[
            assignment.start():assignment.end()
        ]
        if self.suffix in self.JAVASCRIPT_SUFFIXES:
            declaration = re.search(r"\b(const|let|var)\s*$", prefix)
            if declaration is None:
                return None
            keyword = declaration.group(1)
            owner = execution if keyword == "var" else scope_id
            visibility = (
                self.graph.scopes[owner].start
                if keyword == "var"
                else assignment.start()
            )
            key = ("js-var", owner, name) if keyword == "var" else (
                "js-block", assignment.start()
            )
            return owner, visibility, "declaration", key
        if self.suffix == ".go":
            declared = ":=" in assignment_text or re.search(r"\bvar\s*$", prefix)
            if not declared:
                return None
            return scope_id, assignment.start(), "declaration", (
                "go", assignment.start()
            )
        if self.suffix in {".java", ".cs"}:
            declared = re.search(
                r"(?:^|[;{}])\s*(?:(?:public|private|protected|static|final|"
                r"readonly|volatile)\s+)*(?:var|string|String|Uri|URI|URL|"
                r"[A-Za-z_]\w*(?:\s*<[^;=]+>)?(?:\[\])?)\s*$",
                prefix,
            )
            if declared is None:
                return None
            return scope_id, assignment.start(), "declaration", (
                "c-block", assignment.start()
            )
        if self.suffix == ".py":
            kind = self.graph.scopes[scope_id].kind
            owner = scope_id if kind in {"function", "class"} else execution
            visibility = (
                self.graph.scopes[owner].start
                if self.graph.scopes[owner].kind == "function"
                else assignment.start()
            )
            return owner, visibility, "declaration", ("py", owner, name)
        if self.suffix == ".rb":
            owner = execution
            return (
                owner,
                self.graph.scopes[owner].start,
                "declaration",
                ("rb", owner, name),
            )
        if self.suffix == ".php":
            return (
                execution,
                self.graph.scopes[execution].start,
                "declaration",
                ("php", execution, name),
            )
        if self.suffix == ".sh":
            return (
                execution,
                self.graph.scopes[execution].start,
                "declaration",
                ("sh", execution, name),
            )
        return None

    def _build_bindings(self) -> None:
        self._build_parameter_bindings()
        grouped: dict[tuple[object, ...], int] = {}
        for assignment in self.root_assignments:
            name = assignment.group(1).lstrip("$")
            spec = self._declaration_spec(assignment)
            if spec is None:
                continue
            scope_id, visibility, kind, key = spec
            binding_id = grouped.get(key)
            if binding_id is None:
                binding_id = self.graph.add_binding(
                    name,
                    scope_id,
                    assignment.start(),
                    visibility,
                    kind,
                )
                grouped[key] = binding_id
            self.assignment_bindings[assignment.start()] = binding_id

        self.destructure_bindings: dict[tuple[int, str], int] = {}
        for opening, _, _, _, leaves in self.destructuring:
            prefix = self.lexed.code[
                max(0, self.lexed.code.rfind("\n", 0, opening) + 1):opening
            ]
            declaration = re.search(r"\b(const|let|var)\s*$", prefix)
            scope_id = self.scope_at(opening)
            if declaration is None:
                for name, _, _ in leaves:
                    binding_id = self.graph.visible_binding(
                        name, scope_id, opening
                    )
                    if binding_id is None:
                        candidates = list(
                            re.compile(
                                rf"\b(let|var|const)\s+{re.escape(name)}\b"
                            ).finditer(self.lexed.code, 0, opening)
                        )
                        if candidates:
                            candidate = candidates[-1]
                            candidate_scope = self.scope_at(candidate.start())
                            keyword = candidate.group(1)
                            owner = (
                                self.graph.execution_scope(candidate_scope)
                                if keyword == "var"
                                else candidate_scope
                            )
                            binding_id = self.graph.add_binding(
                                name,
                                owner,
                                candidate.start(),
                                (
                                    self.graph.scopes[owner].start
                                    if keyword == "var"
                                    else candidate.start()
                                ),
                                "declaration",
                            )
                    if binding_id is not None:
                        self.destructure_bindings[(opening, name)] = binding_id
                continue
            keyword = declaration.group(1)
            owner = (
                self.graph.execution_scope(scope_id)
                if keyword == "var"
                else scope_id
            )
            for name, _, _ in leaves:
                key = (
                    ("js-var", owner, name)
                    if keyword == "var"
                    else ("destructure", opening, name)
                )
                binding_id = grouped.get(key)
                if binding_id is None:
                    binding_id = self.graph.add_binding(
                        name,
                        owner,
                        opening,
                        (
                            self.graph.scopes[owner].start
                            if keyword == "var"
                            else opening
                        ),
                        "declaration",
                    )
                    grouped[key] = binding_id
                self.destructure_bindings[(opening, name)] = binding_id

        # Plain assignments with no visible declaration create one bounded
        # implicit binding in their execution scope.
        for assignment in self.root_assignments:
            if assignment.start() in self.assignment_bindings:
                continue
            name = assignment.group(1).lstrip("$")
            scope_id = self.scope_at(assignment.start())
            binding_id = self.graph.visible_binding(
                name, scope_id, assignment.start()
            )
            if binding_id is None:
                owner = self.graph.execution_scope(scope_id)
                key = ("implicit", owner, name)
                binding_id = grouped.get(key)
                if binding_id is None:
                    binding_id = self.graph.add_binding(
                        name,
                        owner,
                        assignment.start(),
                        self.graph.scopes[owner].start,
                        "implicit",
                    )
                    grouped[key] = binding_id
            self.assignment_bindings[assignment.start()] = binding_id

    def _top_level_plus_spans(
        self, start: int, end: int
    ) -> list[tuple[int, int]]:
        spans: list[tuple[int, int]] = []
        segment = start
        round_depth = square_depth = curly_depth = 0
        for index in range(start, end):
            character = self.lexed.code[index]
            if character == "(":
                round_depth += 1
            elif character == ")" and round_depth:
                round_depth -= 1
            elif character == "[":
                square_depth += 1
            elif character == "]" and square_depth:
                square_depth -= 1
            elif character == "{":
                curly_depth += 1
            elif character == "}" and curly_depth:
                curly_depth -= 1
            elif (
                character == "+"
                or (
                    # PHP concatenates with '.', and member access there is
                    # '->' / '::', so a top-level dot is unambiguous. Guard
                    # against decimals in a numeric literal.
                    character == "."
                    and self.suffix == ".php"
                    and not (
                        index > start
                        and self.lexed.code[index - 1].isdigit()
                        and index + 1 < end
                        and self.lexed.code[index + 1].isdigit()
                    )
                )
            ) and not (
                round_depth or square_depth or curly_depth
            ):
                spans.append((segment, index))
                segment = index + 1
        if spans:
            spans.append((segment, end))
        return spans

    def _typescript_assertion_start(
        self, start: int, end: int
    ) -> int | None:
        if self.suffix not in TYPESCRIPT_SUFFIXES:
            return None
        round_depth = square_depth = curly_depth = 0
        for match in re.finditer(r"\b(?:as|satisfies)\b", self.lexed.code[start:end]):
            offset = start + match.start()
            for character in self.lexed.code[start:offset]:
                if character == "(":
                    round_depth += 1
                elif character == ")" and round_depth:
                    round_depth -= 1
                elif character == "[":
                    square_depth += 1
                elif character == "]" and square_depth:
                    square_depth -= 1
                elif character == "{":
                    curly_depth += 1
                elif character == "}" and curly_depth:
                    curly_depth -= 1
            if round_depth or square_depth or curly_depth:
                round_depth = square_depth = curly_depth = 0
                continue
            tail = self.lexed.original[start + match.end():end].strip()
            if tail and re.fullmatch(
                r"(?:const|readonly\s+)?[A-Za-z_$][\w$<>.,\[\]\s|&?:]*",
                tail,
            ):
                return offset
            round_depth = square_depth = curly_depth = 0
        return None

    @staticmethod
    def _project_expression(
        expression: EndpointExpression, members: EndpointReference
    ) -> EndpointExpression:
        if not members:
            return expression
        if isinstance(expression, EndpointRef):
            return EndpointRef(
                expression.binding_id, expression.members + members
            )
        if isinstance(expression, EndpointProjected):
            return EndpointProjected(
                expression.expression, expression.members + members
            )
        return EndpointProjected(expression, members)

    def _static_key_from_span(
        self,
        start: int,
        end: int,
        scope_id: int,
        before: int,
    ) -> str | None:
        literal = static_lookup_key(self.lexed, start, end)
        if literal is not None:
            return literal
        source = self.lexed.original[start:end].strip()
        if not source or re.fullmatch(r"-\d+", source):
            return None
        reference = static_reference_expression(self.lexed, start, end)
        if reference is None or len(reference) != 1:
            return None
        binding_id = self.graph.visible_binding(
            reference[0].lstrip("$"), scope_id, before
        )
        if binding_id is None:
            return None
        value = self.graph.evaluate(
            EndpointAccessState(binding_id, (), before, scope_id)
        )
        return value.exact

    def _parse_access_expression(
        self,
        start: int,
        end: int,
        scope_id: int,
        before: int,
    ) -> EndpointExpression | None:
        cursor = start
        if self.lexed.code[cursor] == "(":
            closing = matching_delimiter(
                self.lexed.code, cursor, "(", ")"
            )
            if closing is None or closing >= end:
                return None
            expression = self._parse_expression(
                cursor + 1, closing, scope_id, before
            )
            cursor = closing + 1
        else:
            root = re.match(r"\$?[A-Za-z_]\w*", self.lexed.code[cursor:end])
            if root is None:
                return None
            name = root.group(0).lstrip("$")
            binding_id = self.graph.visible_binding(name, scope_id, before)
            expression = (
                EndpointRef(binding_id)
                if binding_id is not None
                else EndpointUnknown(f"unbound:{name}")
            )
            cursor += len(root.group(0))

        default_methods = {
            ".py": {"get"},
            ".rb": {"fetch"},
            ".java": {"getOrDefault"},
            ".cs": {"GetValueOrDefault"},
        }
        lookup_methods = {"get", "Get", "fetch"}
        while True:
            while cursor < end and self.lexed.code[cursor].isspace():
                cursor += 1
            if (
                self.suffix in TYPESCRIPT_SUFFIXES
                and cursor < end
                and self.lexed.code[cursor] == "!"
            ):
                cursor += 1
                continue
            if cursor >= end:
                return expression

            if self.lexed.code.startswith("?.", cursor):
                cursor += 2
                while cursor < end and self.lexed.code[cursor].isspace():
                    cursor += 1
                if cursor < end and self.lexed.code[cursor] == "[":
                    closing = matching_delimiter(
                        self.lexed.code, cursor, "[", "]"
                    )
                    if closing is None or closing >= end:
                        return EndpointUnknown("dynamic selector")
                    key = self._static_key_from_span(
                        cursor + 1, closing, scope_id, before
                    )
                    if key is None:
                        return EndpointUnknown("dynamic selector")
                    expression = self._project_expression(expression, (key,))
                    cursor = closing + 1
                    continue
            elif self.lexed.code.startswith("->", cursor):
                cursor += 2
            elif self.lexed.code[cursor] == ".":
                cursor += 1
            elif self.lexed.code[cursor] == "[":
                closing = matching_delimiter(
                    self.lexed.code, cursor, "[", "]"
                )
                if closing is None or closing >= end:
                    return EndpointUnknown("dynamic selector")
                key = self._static_key_from_span(
                    cursor + 1, closing, scope_id, before
                )
                if key is None:
                    return EndpointUnknown("dynamic selector")
                expression = self._project_expression(expression, (key,))
                cursor = closing + 1
                continue
            else:
                return None

            while cursor < end and self.lexed.code[cursor].isspace():
                cursor += 1
            member = re.match(r"[A-Za-z_]\w*", self.lexed.code[cursor:end])
            if member is None:
                return EndpointUnknown("dynamic member")
            member_name = member.group(0)
            cursor += len(member_name)
            while cursor < end and self.lexed.code[cursor].isspace():
                cursor += 1
            if cursor >= end or self.lexed.code[cursor] != "(":
                expression = self._project_expression(
                    expression, (member_name,)
                )
                continue

            closing = matching_delimiter(
                self.lexed.code, cursor, "(", ")"
            )
            if closing is None or closing >= end:
                return EndpointUnknown("invalid lookup")
            arguments = split_arguments(
                self.lexed.code, cursor + 1, closing
            )
            if self.suffix == ".rb" and member_name == "dig":
                keys = [
                    self._static_key_from_span(
                        argument_start,
                        argument_end,
                        scope_id,
                        before,
                    )
                    for argument_start, argument_end in arguments
                ]
                if not keys or any(key is None for key in keys):
                    return EndpointUnknown("dynamic dig")
                expression = self._project_expression(
                    expression, tuple(key for key in keys if key is not None)
                )
                cursor = closing + 1
                continue
            supported_defaults = default_methods.get(self.suffix, set())
            if member_name not in lookup_methods | supported_defaults:
                return EndpointUnknown("unsupported call")
            if not arguments or len(arguments) > 2:
                return EndpointUnknown("invalid lookup")
            key = self._static_key_from_span(
                arguments[0][0], arguments[0][1], scope_id, before
            )
            if key is None:
                return EndpointUnknown("dynamic lookup")
            primary = self._project_expression(expression, (key,))
            expression = (
                EndpointDefault(
                    primary,
                    self._parse_expression(
                        arguments[1][0],
                        arguments[1][1],
                        scope_id,
                        before,
                    ),
                )
                if len(arguments) == 2 and member_name in supported_defaults
                else primary
            )
            cursor = closing + 1

    def _parse_reference_text(
        self, source: str, scope_id: int, before: int
    ) -> EndpointExpression:
        temporary = lex_source(source, self.suffix)
        reference = static_reference_expression(
            temporary, 0, len(temporary.code)
        )
        if reference is None:
            return EndpointUnknown("dynamic interpolation")
        name = reference[0].lstrip("$")
        binding_id = self.graph.visible_binding(name, scope_id, before)
        return (
            EndpointRef(binding_id, reference[1:])
            if binding_id is not None
            else EndpointUnknown(f"unbound:{name}")
        )

    def _shell_text_expression(
        self, source: str, scope_id: int, before: int
    ) -> EndpointExpression:
        parts: list[EndpointExpression] = []
        cursor = 0
        for match in SHELL_STATIC_REFERENCE_RE.finditer(source):
            key: str | None = None
            if match.group(2):
                selector = match.group(2).strip()
                if selector.startswith("$"):
                    temporary = lex_source(selector, ".sh")
                    reference = static_reference_expression(
                        temporary, 0, len(temporary.code)
                    )
                    if reference is None or len(reference) != 1:
                        return EndpointUnknown("dynamic shell selector")
                    key_binding = self.graph.visible_binding(
                        reference[0].lstrip("$"), scope_id, before
                    )
                    if key_binding is None:
                        return EndpointUnknown("dynamic shell selector")
                    key = self.graph.evaluate(
                        EndpointAccessState(
                            key_binding, (), before, scope_id
                        )
                    ).exact
                elif re.fullmatch(r"(?:[A-Za-z_]\w*|\d+)", selector) or (
                    len(selector) >= 2
                    and selector[0] == selector[-1]
                    and selector[0] in {"'", '"'}
                ):
                    key = shell_static_key(selector)
                if key is None:
                    return EndpointUnknown("dynamic shell selector")
            if match.start() > cursor:
                parts.append(EndpointLiteral(source[cursor:match.start()]))
            root = match.group(1) or match.group(3)
            binding_id = self.graph.visible_binding(root, scope_id, before)
            parts.append(
                EndpointRef(binding_id, (key,) if key is not None else ())
                if binding_id is not None
                else EndpointUnknown(f"unbound:{root}")
            )
            cursor = match.end()
        if cursor < len(source):
            parts.append(EndpointLiteral(source[cursor:]))
        return EndpointConcat(tuple(parts)) if parts else EndpointLiteral(source)

    def _parse_shell_array(
        self, source: str, scope_id: int, before: int
    ) -> EndpointExpression:
        try:
            tokens = shlex.split(source[1:-1], comments=True, posix=True)
        except ValueError:
            return EndpointUnknown("invalid shell array")
        keyed = bool(tokens) and all(
            re.match(r"^\[[^]]+\]=", token) for token in tokens
        )
        if keyed:
            entries: list[tuple[str, EndpointExpression]] = []
            for token in tokens:
                match = re.match(r"^\[([^]]+)\]=(.*)$", token, re.S)
                if match is None:
                    return EndpointUnknown("invalid shell member")
                key = shell_static_key(match.group(1))
                if key is None:
                    return EndpointUnknown("dynamic shell key")
                entries.append(
                    (
                        key,
                        self._shell_text_expression(
                            match.group(2), scope_id, before
                        ),
                    )
                )
            return EndpointObject(tuple(entries))
        return EndpointArray(
            tuple(
                self._shell_text_expression(token, scope_id, before)
                for token in tokens
            )
        )

    def _parse_template(
        self,
        token: StringToken,
        scope_id: int,
        before: int,
    ) -> EndpointExpression:
        contents = token.contents
        patterns = (
            r"\$\{([^{}]+)\}"
            if self.suffix in self.JAVASCRIPT_SUFFIXES
            else r"#\{([^{}]+)\}"
            if self.suffix == ".rb"
            else r"\{\s*(\$[A-Za-z_]\w*)\s*\}"
            if self.suffix == ".php"
            else r"\{([^{}]+)\}"
        )
        parts: list[EndpointExpression] = []
        cursor = 0
        for match in re.finditer(patterns, contents):
            if match.start() > cursor:
                parts.append(EndpointLiteral(contents[cursor:match.start()]))
            parts.append(
                self._parse_reference_text(
                    match.group(1).strip(), scope_id, before
                )
            )
            cursor = match.end()
        if cursor < len(contents):
            parts.append(EndpointLiteral(contents[cursor:]))
        return (
            EndpointConcat(tuple(parts))
            if parts
            else EndpointLiteral(contents)
        )

    def _parse_container(
        self,
        kind: str,
        opening: int,
        closing: int,
        scope_id: int,
        before: int,
    ) -> EndpointExpression:
        members = split_arguments(self.lexed.code, opening + 1, closing)
        if kind == "pairs":
            entries: list[tuple[str, EndpointExpression]] = []
            for index in range(1, len(members), 2):
                key = static_object_key(self.lexed, *members[index - 1])
                if key is not None:
                    entries.append(
                        (
                            key,
                            self._parse_expression(
                                *members[index], scope_id, before
                            ),
                        )
                    )
            return EndpointObject(tuple(entries))
        separators = [
            (
                (colon, colon + 1)
                if (colon := top_level_colon(
                    self.lexed.code, member_start, member_end
                )) is not None
                else top_level_assignment_separator(
                    self.lexed.code, member_start, member_end
                )
            )
            for member_start, member_end in members
        ]
        declared_map = bool(
            re.search(
                r"(?:\bDictionary\b|\bMap\b|\bmap\s*\[)",
                self.lexed.code[max(0, opening - 160):opening],
            )
        )
        keyed = any(separator is not None for separator in separators) or (
            self.lexed.code[opening] == "{"
            and (
                self.suffix not in {".cs", ".go", ".java"}
                or declared_map
            )
        )
        if not keyed:
            return EndpointArray(
                tuple(
                    self._parse_expression(
                        member_start, member_end, scope_id, before
                    )
                    for member_start, member_end in members
                    if self.lexed.original[member_start:member_end].strip()
                )
            )
        entries = []
        for (member_start, member_end), separator in zip(members, separators):
            if separator is None:
                key = static_object_key(
                    self.lexed, member_start, member_end
                )
                if key is not None:
                    entries.append(
                        (
                            key,
                            self._parse_expression(
                                member_start, member_end, scope_id, before
                            ),
                        )
                    )
                continue
            separator_start, value_start = separator
            key = static_object_key(
                self.lexed, member_start, separator_start
            )
            if key is not None:
                entries.append(
                    (
                        key,
                        self._parse_expression(
                            value_start, member_end, scope_id, before
                        ),
                    )
                )
        return EndpointObject(tuple(entries))

    def _parse_expression(
        self,
        start: int,
        end: int,
        scope_id: int,
        before: int,
    ) -> EndpointExpression:
        raw_start, raw_end = start, end
        while raw_start < raw_end and self.lexed.original[raw_start].isspace():
            raw_start += 1
        while raw_end > raw_start and self.lexed.original[raw_end - 1].isspace():
            raw_end -= 1
        if self.suffix == ".sh":
            raw_source = self.lexed.original[raw_start:raw_end]
            if raw_source.startswith("(") and raw_source.endswith(")"):
                return self._parse_shell_array(
                    raw_source, scope_id, before
                )
            if (
                len(raw_source) >= 2
                and raw_source[0] == raw_source[-1]
                and raw_source[0] in {"'", '"'}
            ):
                if raw_source[0] == "'":
                    return EndpointLiteral(raw_source[1:-1])
                return self._shell_text_expression(
                    raw_source[1:-1], scope_id, before
                )
            if re.fullmatch(r"[A-Za-z_]\w*", raw_source):
                return EndpointLiteral(raw_source)
        start, end = strip_expression_parentheses(self.lexed, start, end)
        if start >= end:
            return EndpointUnknown("empty")
        # `new URL(...)` is routinely stringified before use - `u.toString()`,
        # `u.href`, `String(u)`. Those wrappers are not part of the endpoint, so
        # peel them before resolving or the binding reads as an unknown
        # expression and the send disappears.
        # A TERNARY selecting the endpoint - `flag ? POOL_URL : OTHER` - was not
        # modelled at all, so the whole expression read as unknown and the send
        # vanished: not counted, so the fail-safe could not fire either. The
        # byte-equivalent if/else form was caught. Resolve BOTH arms and treat a
        # required endpoint in EITHER as required, which is the safe direction:
        # the send may take that branch at runtime.
        ternary = _top_level_ternary(self.lexed.code, start, end)
        if ternary is not None:
            for arm_start, arm_end in ternary:
                arm = self._parse_expression(arm_start, arm_end, scope_id, before)
                if isinstance(arm, EndpointLiteral) and required_endpoint(arm.value):
                    return arm

        text_for_peel = self.lexed.code[start:end]
        # SUFFIX forms: u.toString() / u.href / u.toJSON()
        stringified = re.match(
            r"^\s*(.+?)\s*(?:\.\s*(?:toString\s*\(\s*\)|href|toJSON\s*\(\s*\)))\s*$",
            text_for_peel, re.S,
        )
        if stringified is not None and stringified.start(1) != stringified.end(1):
            inner_end = start + stringified.end(1)
            if inner_end > start and (start, inner_end) != (start, end):
                return self._parse_expression(start, inner_end, scope_id, before)
        # PREFIX and TEMPLATE forms: String(u) and `${u}`. An earlier comment
        # claimed String(u) was covered while the pattern only matched suffix
        # member access, so `fetch(String(u), ...)` resolved to UNKNOWN - and
        # because an unknown endpoint is not counted as a send at all, the
        # fail-safe could not fire either and the linter reported CLEAN.
        prefix_peel = re.match(
            r"^\s*(?:String|globalThis\s*\.\s*String)\s*\(\s*(.+?)\s*\)\s*$",
            text_for_peel, re.S,
        ) or re.match(r"^\s*`\s*\$\{\s*(.+?)\s*\}\s*`\s*$", text_for_peel, re.S)
        if prefix_peel is not None:
            inner_start = start + prefix_peel.start(1)
            inner_end = start + prefix_peel.end(1)
            if inner_end > inner_start and (inner_start, inner_end) != (start, end):
                return self._parse_expression(inner_start, inner_end, scope_id, before)

        # A BOUND two-argument `new URL(path, base)` must be combined here, the
        # same way the inline spelling is combined at the call site. Leaving it
        # unresolved was deliberate, but the consequence was a SILENT PASS, not
        # a caveat: neither `number_pool` nor the base is a required endpoint on
        # its own, so the fail-safe backstop never fires either and
        # `const u = new URL('number_pool', BASE); fetch(u, ...)` certified
        # clean while the byte-identical inline form was correctly flagged.
        constructor_base = url_constructor_base(self.lexed, (start, end), self.suffix)
        if constructor_base is not None:
            constructed = unwrap_url_constructor(self.lexed, (start, end))
            if constructed != (start, end):
                inner = self._parse_expression(
                    constructed[0], constructed[1], scope_id, before
                )
                if isinstance(inner, EndpointLiteral):
                    return EndpointLiteral(urljoin(constructor_base, inner.value))

        constructed = unwrap_bound_url_constructor(self.lexed, (start, end))
        if constructed != (start, end):
            return self._parse_expression(
                constructed[0], constructed[1], scope_id, before
            )
        assertion = self._typescript_assertion_start(start, end)
        if assertion is not None:
            return self._parse_expression(start, assertion, scope_id, before)
        plus_spans = self._top_level_plus_spans(start, end)
        if plus_spans:
            return EndpointConcat(
                tuple(
                    self._parse_expression(
                        part_start, part_end, scope_id, before
                    )
                    for part_start, part_end in plus_spans
                )
            )

        # Common URL/string builders. Restrict literal-suffix rescue to these
        # named producers; applying it to every unsupported expression makes
        # an unrelated object member or callback URL displace the real request
        # URL and creates false positives.
        builder_source = self.lexed.original[start:end]
        python_percent_format = (
            self.suffix == ".py"
            and re.search(r"%(?:\s*\([^)]*\))?[#0 +\-]?[0-9.*]*[a-zA-Z]", builder_source)
            is not None
            and re.search(r"%", self.lexed.code[start:end]) is not None
        )
        local_builder = re.match(
            r"\s*([A-Za-z_$]\w*)\s*\(", self.lexed.code[start:end]
        )
        node_join_alias = (
            self.suffix in JS_TS_SUFFIXES
            and local_builder is not None
            and self._is_node_path_join_alias(
                local_builder.group(1), scope_id, start
            )
        )
        if python_percent_format or node_join_alias or re.search(
            r"(?:\bfmt\s*\.\s*Sprintf\s*\(|\.\s*format\s*\("
            r"|\burljoin\s*\(|\bencodeURI(?:Component)?\s*\("
            r"|\.\s*(?:concat|join)\s*\()",
            builder_source,
        ):
            builder_tokens = [
                token.contents
                for token in self.lexed.strings
                if start <= token.start and token.end <= end
            ]
            builder_candidates = builder_tokens + [
                "".join(builder_tokens),
                "/".join(builder_tokens),
            ]
            # A FORMAT builder substitutes later arguments INTO the first
            # token, so concatenating tokens in source order yields garbage
            # ("%snumber_pool" + base). Substitute instead, which is what the
            # runtime does: "%snumber_pool" % base -> ".../messages/number_pool".
            if len(builder_tokens) >= 2:
                remaining = list(builder_tokens[1:])
                substituted = re.sub(
                    r"%(?:\([^)]*\))?[#0 +\-]?[0-9.*]*[a-zA-Z]|\{\d*\}",
                    lambda _match: remaining.pop(0) if remaining else "",
                    builder_tokens[0],
                )
                builder_candidates.append(substituted)
            required = next(
                (
                    candidate
                    for candidate in builder_candidates
                    if required_endpoint(candidate)
                    or required_endpoint_literal_signal(candidate)
                ),
                None,
            )
            if required is not None:
                suffix_match = re.search(
                    r"/messages/(?:number_pool|alphanumeric_sender_id)/?$",
                    required.split("?", 1)[0].split("#", 1)[0],
                )
                return EndpointLiteral(
                    suffix_match.group(0) if suffix_match else required
                )

        if self.suffix == ".py":
            python_tokens = [
                token
                for token in self.lexed.strings
                if start <= token.start and token.end <= end
            ]
            if len(python_tokens) == 1:
                token = python_tokens[0]
                prefix = self.lexed.original[start:token.start].strip().lower()
                suffix_text = self.lexed.original[token.end:end].strip()
                if "f" in prefix and not suffix_text and "{" in token.contents:
                    return self._parse_template(token, scope_id, before)

        container = root_literal_container(
            self.lexed, start, end, self.suffix
        )
        if container is not None:
            kind, opening, closing = container
            selected = selected_members_after_container(
                self.lexed, closing, end
            )
            trailing = self.lexed.code[closing + 1:end].strip(" )\t\r\n")
            if trailing:
                if selected is None or not selected:
                    return EndpointUnknown("dynamic container selector")
                value_span = literal_value_span(
                    self.lexed, start, end, selected, self.suffix
                )
                return (
                    self._parse_expression(
                        value_span[0], value_span[1], scope_id, before
                    )
                    if value_span is not None
                    else EndpointUnknown("missing container member")
                )
            return self._parse_container(
                kind, opening, closing, scope_id, before
            )

        access = self._parse_access_expression(
            start, end, scope_id, before
        )
        if access is not None:
            return access

        reference = static_reference_expression(self.lexed, start, end)
        if reference is not None:
            name = reference[0].lstrip("$")
            binding_id = self.graph.visible_binding(
                name, scope_id, before
            )
            return (
                EndpointRef(binding_id, reference[1:])
                if binding_id is not None
                else EndpointUnknown(f"unbound:{name}")
            )

        if self.suffix == ".rb":
            symbol = re.fullmatch(
                r"\s*:\s*([A-Za-z_]\w*)\s*",
                self.lexed.original[start:end],
            )
            if symbol is not None:
                return EndpointLiteral(symbol.group(1))

        tokens = [
            token
            for token in self.lexed.strings
            if start <= token.start and token.end <= end
        ]
        if len(tokens) == 1:
            token = tokens[0]
            residual = (
                self.lexed.code[start:token.start]
                + self.lexed.code[token.end:end]
            ).strip()
            if self.suffix == ".py":
                format_match = re.fullmatch(
                    r"\s*\.\s*format\s*\((.*)\)\s*",
                    self.lexed.original[token.end:end],
                    re.S,
                )
                if format_match is not None:
                    opening = self.lexed.code.find("(", token.end, end)
                    closing = matching_delimiter(
                        self.lexed.code, opening, "(", ")"
                    )
                    arguments = (
                        split_arguments(
                            self.lexed.code, opening + 1, closing
                        )
                        if closing is not None
                        else []
                    )
                    pieces = token.contents.split("{}")
                    if len(pieces) == len(arguments) + 1:
                        parts: list[EndpointExpression] = []
                        for index, piece in enumerate(pieces):
                            if piece:
                                parts.append(EndpointLiteral(piece))
                            if index < len(arguments):
                                parts.append(
                                    self._parse_expression(
                                        arguments[index][0],
                                        arguments[index][1],
                                        scope_id,
                                        before,
                                    )
                                )
                        return EndpointConcat(tuple(parts))
            is_template = (
                self.lexed.original[token.start] == "`"
                or (self.suffix == ".rb" and "#{" in token.contents)
                or (self.suffix == ".php" and "{$" in token.contents)
                or (
                    self.suffix == ".cs"
                    and "$" in residual
                    and "{" in token.contents
                )
                or (
                    self.suffix == ".py"
                    and "f" in residual.lower()
                    and "{" in token.contents
                )
            )
            if is_template:
                return self._parse_template(token, scope_id, before)
            if (
                self.suffix == ".sh"
                and self.lexed.original[token.start] == '"'
                and "$" in token.contents
            ):
                return self._shell_text_expression(
                    token.contents, scope_id, before
                )
            if residual.lower() in {"", "f", "r", "u", "b", "fr", "rf"}:
                return EndpointLiteral(token.contents)
        return EndpointUnknown("unsupported expression")

    def _guard_scope(self, scope_id: int) -> int | None:
        for candidate in self.graph.ancestors(scope_id):
            if self.graph.scopes[candidate].kind == "conditional":
                return candidate
            if self.graph.scopes[candidate].kind in {"function", "module"}:
                break
        return None

    def _definition_scope(self, scope_id: int) -> tuple[int, bool]:
        guard = self._guard_scope(scope_id)
        return (guard, True) if guard is not None else (scope_id, False)

    def _container_origin_binding(
        self, binding_id: int, before: int
    ) -> int:
        seen: set[int] = set()
        current = binding_id
        cutoff = before
        while current not in seen:
            seen.add(current)
            definitions = [
                definition
                for definition in self.graph.definitions.get(current, ())
                if definition.start < cutoff and not definition.member_path
            ]
            if not definitions:
                return current
            latest = definitions[-1]
            if not (
                isinstance(latest.expression, EndpointRef)
                and not latest.expression.members
            ):
                return current
            current = latest.expression.binding_id
            cutoff = latest.start
        return binding_id

    def _add_member_definition(
        self,
        binding_id: int,
        path: EndpointReference,
        expression: EndpointExpression,
        offset: int,
        scope_id: int,
        guarded: bool,
    ) -> None:
        targets = {binding_id, self._container_origin_binding(binding_id, offset)}
        for target in targets:
            self.graph.add_definition(
                target,
                path,
                expression,
                offset,
                scope_id,
                "mutation",
                guarded,
            )

    def _build_definitions(self) -> None:
        for assignment in self.root_assignments:
            binding_id = self.assignment_bindings[assignment.start()]
            scope_id = self.scope_at(assignment.start())
            rhs_end = assignment_end(
                self.lexed, assignment.end(), self.suffix
            )
            expression = self._parse_expression(
                assignment.end(), rhs_end, scope_id, assignment.start()
            )
            binding = self.graph.bindings[binding_id]
            kind = (
                "declaration"
                if binding.declaration_start == assignment.start()
                else "mutation"
            )
            definition_scope, guarded = self._definition_scope(scope_id)
            self.graph.add_definition(
                binding_id,
                (),
                expression,
                assignment.start(),
                definition_scope,
                kind,
                guarded,
            )

        for reference, start, rhs_start, rhs_end in direct_member_assignments(
            self.lexed, len(self.lexed.code), self.suffix
        ):
            root = reference[0].lstrip("$")
            scope_id = self.scope_at(start)
            binding_id = self.graph.visible_binding(root, scope_id, start)
            if binding_id is None:
                continue
            definition_scope, guarded = self._definition_scope(scope_id)
            self._add_member_definition(
                binding_id,
                reference[1:],
                self._parse_expression(
                    rhs_start, rhs_end, scope_id, start
                ),
                start,
                definition_scope,
                guarded,
            )

        if self.suffix == ".java":
            put_pattern = re.compile(
                r"(?<![\w$.])([A-Za-z_]\w*)\s*\.\s*put\s*\("
            )
            for put in put_pattern.finditer(self.lexed.code):
                opening = self.lexed.code.rfind(
                    "(", put.start(), put.end()
                )
                closing = matching_delimiter(
                    self.lexed.code, opening, "(", ")"
                )
                if closing is None:
                    continue
                arguments = split_arguments(
                    self.lexed.code, opening + 1, closing
                )
                if len(arguments) != 2:
                    continue
                key = static_lookup_key(self.lexed, *arguments[0])
                scope_id = self.scope_at(put.start())
                binding_id = self.graph.visible_binding(
                    put.group(1), scope_id, put.start()
                )
                if key is None or binding_id is None:
                    continue
                definition_scope, guarded = self._definition_scope(scope_id)
                self._add_member_definition(
                    binding_id,
                    (key,),
                    self._parse_expression(
                        arguments[1][0], arguments[1][1], scope_id, put.start()
                    ),
                    put.start(),
                    definition_scope,
                    guarded,
                )

        if self.suffix == ".sh":
            for reference, start, rhs_start, rhs_end in shell_member_assignments(
                self.lexed, len(self.lexed.code), self.suffix
            ):
                scope_id = self.scope_at(start)
                binding_id = self.graph.visible_binding(
                    reference[0], scope_id, start
                )
                if binding_id is None:
                    continue
                self._add_member_definition(
                    binding_id,
                    reference[1:],
                    self._parse_expression(
                        rhs_start, rhs_end, scope_id, start
                    ),
                    start,
                    scope_id,
                    False,
                )

        for opening, _, rhs_start, rhs_end, leaves in self.destructuring:
            scope_id = self.scope_at(opening)
            mutation = opening in self.destructure_mutations
            definition_scope, guarded = (
                self._definition_scope(scope_id)
                if mutation
                else (scope_id, False)
            )
            source = self._parse_expression(
                rhs_start, rhs_end, scope_id, opening
            )
            for name, projection, fallback in leaves:
                binding_id = self.destructure_bindings.get((opening, name))
                if binding_id is None:
                    continue
                expression: EndpointExpression = EndpointProjected(
                    source, projection
                )
                if fallback is not None:
                    expression = EndpointDefault(
                        expression,
                        self._parse_expression(
                            fallback[0], fallback[1], scope_id, opening
                        ),
                    )
                self.graph.add_definition(
                    binding_id,
                    (),
                    expression,
                    opening,
                    definition_scope,
                    "mutation" if mutation else "declaration",
                    guarded,
                )

        delete_pattern = re.compile(r"\bdelete\s+([^;\n]+)")
        for deletion in delete_pattern.finditer(self.lexed.code):
            reference = static_reference_expression(
                self.lexed, deletion.start(1), deletion.end(1)
            )
            if reference is None or len(reference) < 2:
                continue
            scope_id = self.scope_at(deletion.start())
            binding_id = self.graph.visible_binding(
                reference[0].lstrip("$"), scope_id, deletion.start()
            )
            if binding_id is not None:
                definition_scope, guarded = self._definition_scope(scope_id)
                self._add_member_definition(
                    binding_id,
                    reference[1:],
                    EndpointUnknown("delete"),
                    deletion.start(),
                    definition_scope,
                    guarded,
                )

    def resolve_expression(
        self,
        start: int,
        end: int,
        before: int,
        projection: EndpointReference = (),
    ) -> EndpointValue:
        # Resolve statically imported scalar endpoints before entering the
        # per-file binding graph. Keeping module provenance explicit avoids
        # conflating same-named locals and makes the cross-file boundary the
        # only special case; all endpoint classification remains shared.
        expression_text = self.lexed.code[start:end].strip()
        if not projection and re.fullmatch(r"[A-Za-z_$]\w*", expression_text):
            external = self.external_values.get(expression_text.lstrip("$"))
            if external is not None:
                return endpoint_literal_value(external)
        scope_id = self.scope_at(before)
        expression = self._parse_expression(
            start, end, scope_id, before
        )
        return self.graph.evaluate(
            EndpointExpressionState(
                expression, projection, before, scope_id
            )
        )

    def _is_external_expression(self, start: int, end: int) -> bool:
        """Return whether an unresolved URL expression crosses a module boundary."""

        # Shell references commonly live inside double-quoted URL arguments,
        # which the code view masks as string data. This check is already
        # bounded to the selected URL/call span, so the original view is the
        # correct place to recover the imported reference spelling.
        text = self.lexed.original[start:end].strip()
        references = re.findall(r"\$?[A-Za-z_][A-Za-z0-9_$]*", text)
        normalized = [reference.lstrip("$") for reference in references]
        if any(reference in self.external_names for reference in normalized):
            return True
        if "<uppercase>" in self.external_names and any(
            re.fullmatch(r"[A-Z][A-Z0-9_]*", reference)
            for reference in normalized
        ):
            return True
        if "<qualified>" in self.external_names and re.search(
            r"(?:\.|::|->)\s*[A-Za-z_]", text
        ):
            return True
        if "<shell>" in self.external_names and re.search(
            r"\$(?:\{)?[A-Za-z_]", text
        ):
            return True
        return False

    def config_method_may_mutate(
        self, span: tuple[int, int], before: int
    ) -> bool:
        """Return whether a request config can use POST, PUT, or PATCH.

        A proven config without a method defaults to GET. Static methods use
        the shared mutating-method contract, while unresolved dynamic configs
        remain in scope so analysis fails safely.
        """

        value = self.resolve_expression(
            span[0], span[1], before, ("method",)
        )
        if value.exact is not None:
            return value.exact.upper() in MUTATING_HTTP_METHODS
        method_spans = config_object_member_spans(
            self.lexed, span, before, self.suffix, ("method",)
        )
        if method_spans:
            method_source = self.lexed.code[slice(*method_spans[-1])].strip()
            if method_source in {"null", "undefined"}:
                return False
            method = static_method_value(
                self.lexed,
                method_spans[-1],
                before,
                self.suffix,
            )
            return method is None or method in MUTATING_HTTP_METHODS
        if resolved_config_object_span(
            self.lexed, span, before, self.suffix
        ) is not None:
            return False
        return self.lexed.code[slice(*span)].strip() not in {
            "null", "undefined"
        }

    def request_is_required(self, call: Call) -> bool:
        args = split_arguments(
            self.lexed.code, call.open_paren + 1, call.end - 1
        )
        callee = re.sub(
            r"\s+", "", self.lexed.code[call.start:call.open_paren]
        ).lower()
        if callee == "fetch":
            # Fetch defaults to GET.  Only known mutating methods, or an
            # unresolved dynamic method that may be mutating, are sends.
            if len(args) < 2:
                return False
            if not self.config_method_may_mutate(args[1], call.start):
                return False
        receiver = call_receiver(self.lexed, call)
        config_span: tuple[int, int] | None = None
        if callee in {"axios", "axios.request"} or (
            callee == "request" and receiver == "axios"
        ):
            config_span = args[0] if args else None
        elif callee == "request" and args:
            if resolved_config_object_span(
                self.lexed, args[0], call.start, self.suffix
            ) is not None:
                config_span = args[0]
            elif len(args) > 1 and resolved_config_object_span(
                self.lexed, args[1], call.start, self.suffix
            ) is not None:
                config_span = args[1]
        if config_span is not None and not self.config_method_may_mutate(
            config_span, call.start
        ):
            return False
        if callee == "curl_setopt" and len(args) >= 3:
            option = self.lexed.code[slice(*args[1])].strip()
            if option == "CURLOPT_URL":
                handle = self.lexed.code[slice(*args[0])].strip()
                method = php_curl_handle_method(
                    self.lexed, handle, call.start, self.suffix
                )
                if method is not None and method not in MUTATING_HTTP_METHODS:
                    return False
        original_spans = _request_url_spans(self.lexed, call, self.suffix)
        resolved = []
        for span in original_spans:
            unwrapped = unwrap_url_constructor(self.lexed, span)
            value = self.resolve_expression(
                unwrapped[0], unwrapped[1], call.start
            )
            resolved.append(value)
            # new URL(path, base) resolves the path relative to the base per
            # RFC 3986 — a base without a trailing slash drops its last
            # segment — so use urljoin rather than naive concatenation.
            constructor_base = url_constructor_base(self.lexed, span, self.suffix)
            if (
                constructor_base is not None
                and value.exact is not None
                and required_endpoint(urljoin(constructor_base, value.exact))
            ):
                return True
        if any(value.kind == REQUIRED for value in resolved):
            return True
        # A client base URL makes the request path relative, so combine the
        # base with the resolved path before classifying:
        # axios.create({baseURL: '.../messages'}).post('/number_pool').
        base = client_base_url(self.lexed, call, self.suffix)
        if base is not None and any(
            value.exact is not None
            and required_endpoint(join_base_and_path(base, value.exact))
            for value in resolved
        ):
            return True
        # Guzzle, Faraday, and HttpClient also allow the base to be declared
        # in a nearby client configuration form that is not a root assignment
        # the binding index can recover. Keep this fallback narrow: only the
        # three base-client languages, only a relative required suffix, and
        # only a prior static URL whose path is the messages collection.
        if self.suffix in {".php", ".rb", ".cs"} and any(
            value.exact is not None
            and re.search(r"(?:^|/)(?:number_pool|alphanumeric_sender_id)/?$", value.exact)
            for value in resolved
        ):
            prior_bases = [
                token.contents
                for token in self.lexed.strings
                if token.end <= call.start
                and re.search(r"/messages/?$", urlsplit(token.contents).path)
            ]
            if prior_bases and any(
                value.exact is not None
                and required_endpoint(join_base_and_path(prior_bases[-1], value.exact))
                for value in resolved
            ):
                return True
        # A mutating request whose URL crosses a module boundary must not be
        # certified merely because this file has no literal. Resolve exact
        # local exports where possible; otherwise fail closed only for a URL
        # expression proven to originate from an import/require/source form.
        # The caller emits a distinct manual-verification finding, rather than
        # pretending the unknown endpoint is definitely a number-pool route.
        if any(
            value.kind in {UNKNOWN, MISSING}
            and self._is_external_expression(*span)
            for span, value in zip(original_spans, resolved)
        ):
            self.unverified_external_calls.add(call.start)
            return True
        if not args:
            return False
        return bool(
            config_span is not None
            and self.resolve_expression(
                config_span[0], config_span[1], call.start, ("url",)
            ).kind
            == REQUIRED
        )

    def shell_curl_is_required(self, call: Call) -> bool:
        method = shell_curl_http_method(self.lexed, call)
        if method is not None and method not in MUTATING_HTTP_METHODS:
            return False
        scope_id = self.scope_at(call.start)
        allowed_references = shell_curl_url_references(self.lexed, call)
        for argument in shell_curl_url_arguments(self.lexed, call):
            if required_endpoint(argument.strip("'\"")):
                return True
            references = shell_static_references(argument)
            if references and any(
                reference not in allowed_references
                for reference in references
            ):
                continue
            expression = self._shell_text_expression(
                argument, scope_id, call.start
            )
            if self.graph.evaluate(
                EndpointExpressionState(
                    expression, (), call.start, scope_id
                )
            ).kind == REQUIRED:
                return True
            if (
                self.graph.evaluate(
                    EndpointExpressionState(
                        expression, (), call.start, scope_id
                    )
                ).kind
                in {UNKNOWN, MISSING}
                and self._is_external_expression(
                    call.start,
                    call.end,
                )
            ):
                self.unverified_external_calls.add(call.start)
                return True
        return False


ABSENT, MAYBE, PRESENT = "absent", "maybe", "present"
NO_WRITE, WRITE_ABSENT, WRITE_MAYBE, WRITE_PRESENT = range(4)


@dataclass(frozen=True)
class Presence:
    state: str
    evidence: bool = False


ABSENT_VALUE = Presence(ABSENT)
MAYBE_VALUE = Presence(MAYBE)
PRESENT_VALUE = Presence(PRESENT, True)


def join_presence(values: Iterable[Presence]) -> Presence:
    values = tuple(values)
    states = {value.state for value in values}
    return Presence(
        next(iter(states)) if len(states) == 1 else MAYBE,
        any(value.evidence for value in values),
    ) if values else MAYBE_VALUE


def apply_field_effect(value: Presence, effect: int) -> Presence:
    if effect == NO_WRITE:
        return value
    if effect == WRITE_PRESENT:
        return PRESENT_VALUE
    if effect == WRITE_ABSENT:
        return Presence(ABSENT, True)
    return Presence(MAYBE, True)


def overlay_effect(value: Presence) -> int:
    if value.state == PRESENT:
        return WRITE_PRESENT
    if value.state == MAYBE:
        return WRITE_MAYBE
    return WRITE_ABSENT if value.evidence else NO_WRITE


@dataclass(frozen=True)
class ObjectTargets:
    must: frozenset[tuple[int, int]] = frozenset()
    may: frozenset[tuple[int, int]] = frozenset()
    unknown: bool = False

    @property
    def all(self) -> frozenset[tuple[int, int]]:
        return self.must | self.may


def join_targets(values: Iterable[ObjectTargets]) -> ObjectTargets:
    values = tuple(values)
    if not values:
        return ObjectTargets(unknown=True)
    possible = frozenset().union(*(value.all for value in values))
    must = set(values[0].must)
    for value in values[1:]:
        must.intersection_update(value.must)
    if any(value.unknown for value in values):
        must.clear()
    required = frozenset(must)
    return ObjectTargets(required, possible - required, any(v.unknown for v in values))


@dataclass(frozen=True)
class ControlArm:
    group: int
    branch: int
    start: int
    end: int


@dataclass(frozen=True)
class RootFieldEvent:
    binding: int
    start: int
    rhs: tuple[int, int]
    scope: int
    execution: int
    kind: str
    path: tuple[tuple[int, int], ...]
    aliases: tuple[int, ...] | None
    alias_unknown: bool = False

    @property
    def object_id(self) -> tuple[int, int]:
        return self.binding, self.start


@dataclass(frozen=True)
class FieldEvent:
    binding: int
    start: int
    scope: int
    execution: int
    path: tuple[tuple[int, int], ...]
    effect: int
    overlay: tuple[int, int] | None = None


class ControlIndex:
    """Finite branch index; callable boundaries remain in the binding graph."""

    C_SUFFIXES = JS_TS_SUFFIXES | {".cs", ".go", ".java", ".php"}

    def __init__(self, lexed: LexedSource, suffix: str) -> None:
        self.lexed, self.suffix = lexed, suffix
        self.arms: list[ControlArm] = []
        self.exhaustive: set[int] = set()
        if suffix in self.C_SUFFIXES:
            self._curly()
            # Expression-level guards are not a JavaScript peculiarity: PHP,
            # Ruby and Python all write `cond && payload[...] = x`, `cond and
            # payload.update(...)` and the ternary forms, and a field written
            # that way is CONDITIONAL. Indexing them only for JS/TS meant the
            # same guarded write read as unconditional in every other language -
            # a silent pass on a profile that may never be set.
            if suffix in JS_TS_SUFFIXES or suffix == ".php":
                self._expression_guards()
        elif suffix in {".py", ".rb", ".sh"}:
            self._lines()
            if suffix in {".py", ".rb"}:
                self._expression_guards()

    def _unbraced_body_end(self, start: int) -> int | None:
        """End of a single-statement `if (cond) stmt;` body after the ')'.

        The lexer masks string interiors, so scanning the masked code for a
        top-level ';' or line break is safe. Returns None if no statement
        follows (e.g. a stray brace).
        """
        code = self.lexed.code
        index = start
        while index < len(code) and code[index].isspace():
            index += 1
        if index >= len(code) or code[index] in "{};":
            return None
        depth = 0
        while index < len(code):
            character = code[index]
            if character in "([{":
                depth += 1
            elif character in ")]}":
                if depth == 0:
                    break
                depth -= 1
            elif depth == 0 and character == ";":
                return index + 1
            elif depth == 0 and character == "\n":
                return index
            index += 1
        return None

    def _expression_guards(self) -> None:
        """Index short-circuit and ternary expression arms in JS/TS.

        A field write after `&&`/`||`, in either side of `?:`, or through a
        logical assignment (`&&=`/`||=`) is conditional even though no block
        exists. Scope only the containing statement so adjacent unconditional
        writes retain an empty control path.
        """
        code = self.lexed.code
        # A WRAPPED guard is still one statement. Breaking on every raw newline
        # put `usePool &&` and `(payload.messaging_profile_id = p)` into
        # different segments, so neither held both the operator and the write
        # and the conditional write read as unconditional. Only a newline that
        # neither follows nor precedes a logical/ternary operator ends a
        # statement; nothing else is joined, so unrelated lines cannot merge
        # into a spurious arm.
        # Ruby, PHP and Python spell the same operators as WORDS as well.
        word_ops = self.suffix in {".php", ".rb", ".py"}
        logical_re = (
            r"&&=?|\|\|=?|(?<![\w])(?:and|or)(?![\w])" if word_ops
            else r"&&=?|\|\|=?"
        )
        dangling = re.compile(
            r"(?:&&|\|\||\?|(?<![\w])(?:and|or))\s*$" if word_ops
            else r"(?:&&|\|\||\?)\s*$"
        )
        continuing = re.compile(
            r"[ \t]*(?:&&|\|\||\?|:|(?<![\w])(?:and|or)(?![\w]))" if word_ops
            else r"[ \t]*(?:&&|\|\||\?|:)"
        )
        statement_start = 0
        for match in re.finditer(r"[;\n]|$", code):
            statement_end = match.start()
            segment = code[statement_start:statement_end]
            if match.group(0) == "\n" and (
                dangling.search(segment)
                or continuing.match(code, match.end())
            ):
                continue
            # Search the ORIGINAL text, not the masked code: a Python/PHP/Ruby
            # payload spells the key as a STRING ("messaging_profile_id"), and
            # string interiors are blanked in lexed.code - so the guard was only
            # ever found in JS, where object keys are usually bare identifiers.
            # Offsets are preserved by the lexer, so the spans stay valid.
            profile = PROFILE_IDENTIFIER_RE.search(
                self.lexed.original[statement_start:statement_end]
            )
            if profile is not None:
                absolute_profile = statement_start + profile.start()
                logical = list(re.finditer(logical_re, segment))
                for operator in logical:
                    operator_end = statement_start + operator.end()
                    if operator_end <= absolute_profile:
                        self.arms.append(
                            ControlArm(statement_start, 0, operator_end, statement_end)
                        )
                question = segment.find("?")
                colon = segment.find(":", question + 1) if question >= 0 else -1
                if question >= 0 and colon >= 0 and absolute_profile > statement_start + question:
                    self.arms.append(
                        ControlArm(
                            statement_start,
                            0 if absolute_profile < statement_start + colon else 1,
                            statement_start + question + 1,
                            statement_end,
                        )
                    )
            statement_start = match.end()

    def _body_arm(self, group: int, branch: int, after: int) -> int | None:
        """Index one control body — a braced block OR an unbraced single
        statement — starting at/after `after`. Appends a ControlArm and
        returns the position after the body, or None if there is no body.

        Every C-family control construct routes through here so that braced
        and unbraced bodies are treated identically: a field write inside any
        of them is conditional. Handling only braced bodies let unbraced if /
        else / for / while writes look unconditional and pass a send that can
        run without the profile.
        """
        code = self.lexed.code
        cursor = after
        while cursor < len(code) and code[cursor].isspace():
            cursor += 1
        if self.suffix == ".php" and cursor < len(code) and code[cursor] == ":":
            # PHP alternative syntax (`if (…): … endif;`). The body runs to its
            # end-keyword, not to the first ';', so _php_alt spans it. Treating
            # the ':' as a one-statement body would guard only the first
            # statement and leave a later profile write looking unconditional.
            return None
        if cursor < len(code) and code[cursor] == "{":
            closing = matching_delimiter(code, cursor, "{", "}")
            if closing is None:
                return None
            self.arms.append(ControlArm(group, branch, cursor, closing + 1))
            return closing + 1
        body_end = self._unbraced_body_end(after)
        if body_end is None:
            return None
        self.arms.append(ControlArm(group, branch, after, body_end))
        return body_end

    def _curly(self) -> None:
        code = self.lexed.code
        # PHP spells a chained branch as one word, `elseif`, so `\bif` never
        # matches inside it: neither the elseif body nor the `else` that closes
        # the chain was indexed and a profile written there looked
        # unconditional. Treat it exactly like the C-family `else if` - its own
        # group, closed by its own `else`.
        opener = r"\b(?:else)?if\s*\(" if self.suffix == ".php" else r"\bif\s*\("
        # An `else if` used to open a group of its own, which was then marked
        # exhaustive by its trailing `else` INDEPENDENTLY of the outer `if` -
        # so `if (a) {} else if (b) {mp} else {mp}` looked like it always set
        # the profile even though the `a` path sets nothing. The whole
        # if/else-if/else chain is one group with one branch per arm, and only
        # a final bare `else` makes it exhaustive (as Ruby/shell/PHP-alt
        # chains already do).
        chained = (
            r"\s*(?:else\s*if|elseif|else)\b"
            if self.suffix == ".php"
            else r"\s*(?:else\s*if|else)\b"
        )
        handled: set[int] = set()
        for match in re.finditer(opener, code):
            if match.start() in handled:
                continue
            condition = code.rfind("(", match.start(), match.end())
            close = matching_delimiter(code, condition, "(", ")")
            if close is None:
                continue
            group = match.start()
            branch = 0
            after = self._body_arm(group, branch, close + 1)
            if after is None:
                continue
            while True:
                tail = re.match(chained, code[after:])
                if tail is None:
                    break
                head = after + tail.end()
                if tail.group(0).strip() == "else":
                    branch += 1
                    if self._body_arm(group, branch, head) is not None:
                        self.exhaustive.add(group)
                    break
                token = re.search(r"(?:\belseif|\bif)\s*$", code[after:head])
                paren = head
                while paren < len(code) and code[paren].isspace():
                    paren += 1
                if token is None or paren >= len(code) or code[paren] != "(":
                    break
                closing = matching_delimiter(code, paren, "(", ")")
                if closing is None:
                    break
                handled.add(after + token.start())
                branch += 1
                nxt = self._body_arm(group, branch, closing + 1)
                if nxt is None:
                    break
                after = nxt
        if self.suffix == ".go":
            # Go conditions and range clauses conventionally omit the
            # parentheses required by the C-family forms above.
            for match in re.finditer(r"\bif\b(?!\s*\()[^{}\n]*\{", code):
                opening = code.rfind("{", match.start(), match.end())
                closing = matching_delimiter(code, opening, "{", "}")
                if closing is None:
                    continue
                group = match.start()
                self.arms.append(ControlArm(group, 0, opening, closing + 1))
                tail = re.match(r"\s*else\s*", code[closing + 1:])
                if tail is None:
                    continue
                cursor = closing + 1 + tail.end()
                else_open = code.find("{", cursor)
                if else_open >= 0 and not code[cursor:else_open].strip():
                    else_close = matching_delimiter(code, else_open, "{", "}")
                    if else_close is not None:
                        self.arms.append(
                            ControlArm(group, 1, else_open, else_close + 1)
                        )
                        self.exhaustive.add(group)
            for match in re.finditer(r"\bfor\b(?!\s*\()[^{}\n]*\{", code):
                opening = code.rfind("{", match.start(), match.end())
                closing = matching_delimiter(code, opening, "{", "}")
                if closing is not None:
                    self.arms.append(
                        ControlArm(match.start(), 0, opening, closing + 1)
                    )
        # for / while / foreach / catch bodies, braced or unbraced. A loop may
        # execute zero times, so a profile write in its body is conditional —
        # `while (cond) payload.messaging_profile_id = p; send()` can send
        # without the profile. A do-while `} while (cond);` has no following
        # body (the next token is `;`), so _body_arm yields nothing for it,
        # which is correct: a do body always runs at least once.
        for match in re.finditer(r"\b(?:for|foreach|while|catch)\s*\(", code):
            condition = code.rfind("(", match.start(), match.end())
            close = matching_delimiter(code, condition, "(", ")")
            if close is None:
                continue
            self._body_arm(match.start(), 0, close + 1)
        # `try { … }` takes no condition, so the parenthesised sweep above (which
        # already covers `catch (…)`) never saw it. A try body is NOT
        # unconditional: when a sibling catch swallows the error, execution
        # continues past the statement with the write skipped. Treated as an arm,
        # a send INSIDE the body shares it and stays unguarded, while a send
        # after the statement is correctly guarded. Same rule as Python's `try`.
        for match in re.finditer(r"\btry\s*\{", code):
            opening = code.find("{", match.start())
            closing = matching_delimiter(code, opening, "{", "}")
            if closing is None:
                continue
            # ONLY a try whose handler SWALLOWS is a guard. `try { } finally { }`
            # with no handler propagates, and so does `catch (e) { throw e; }`:
            # a later send is never reached and the write is not conditional
            # relative to it - treating either as an arm reported compliant
            # code as missing the profile.
            if not self._swallowing_catch(closing + 1):
                continue
            self.arms.append(
                ControlArm(match.start(), 0, opening, closing + 1)
            )
        # Go writes `switch mode {`, `switch x := f(); x {` and the bare
        # `switch {` with NO parentheses, so the paren-anchored scan below never
        # saw them: every case arm read as unconditional code, and a profile
        # set in a single arm certified the whole send. Indexed here with the
        # same per-arm modelling, so an exhaustive switch (one with `default:`)
        # still counts as covering every path.
        if self.suffix == ".go":
            # The body brace is found by a BALANCED SCAN, not a lookahead. Two
            # successive lookahead patterns were tried and both failed, because
            # a Go switch header is not lexically simple: it may contain
            # parentheses (`switch v := i.(type) {`), a semicolon and an init
            # statement (`switch x := f(); x {`), a newline when it wraps, and
            # a COMPOSITE LITERAL whose own brace (`switch cfg{A: 1}.mode {`)
            # is not the body. Each failure indexed no arms at all, so a profile
            # set in one arm read as unconditional - a silent pass every time.
            # Scanning for the first brace that opens a BLOCK handles all four
            # without another round of pattern guessing.
            for match in re.finditer(r"(?<![\w.])switch(?![\w])", code):
                opening = _go_block_brace(code, match.end())
                if opening < 0:
                    continue
                closing = matching_delimiter(code, opening, "{", "}")
                if closing is None:
                    continue
                split = self._switch_arms(opening, closing)
                if split is None:
                    self.arms.append(
                        ControlArm(match.start(), 0, opening, closing + 1)
                    )
                    continue
                spans, has_default = split
                for branch, (arm_start, arm_end) in enumerate(spans):
                    self.arms.append(
                        ControlArm(match.start(), branch, arm_start, arm_end)
                    )
                if has_default:
                    self.exhaustive.add(match.start())

        # switch bodies are always braced.
        for match in re.finditer(r"\bswitch\s*\(", code):
            condition = code.rfind("(", match.start(), match.end())
            close = matching_delimiter(code, condition, "(", ")")
            opening = code.find("{", close + 1) if close is not None else -1
            if opening < 0 or code[close + 1:opening].strip():
                continue
            closing = matching_delimiter(code, opening, "{", "}")
            if closing is None:
                continue
            # One arm for the whole body could never be exhaustive, so a switch
            # in which EVERY arm (including `default:`) sets the profile was
            # still reported as missing it. Index one arm per case label and
            # mark the group exhaustive when a `default:` covers the rest.
            split = self._switch_arms(opening, closing)
            if split is None:
                self.arms.append(ControlArm(match.start(), 0, opening, closing + 1))
                continue
            spans, has_default = split
            for branch, (arm_start, arm_end) in enumerate(spans):
                self.arms.append(
                    ControlArm(match.start(), branch, arm_start, arm_end)
                )
            if has_default:
                self.exhaustive.add(match.start())
        if self.suffix == ".php":
            self._php_alt()

    def _swallowing_catch(self, cursor: int) -> bool:
        """True when a `catch` clause at `cursor` can SWALLOW the error.

        Only a swallowing handler makes the try body conditional. A handler
        that re-raises (`catch (e) { log(e); throw e; }` — the standard
        log-and-rethrow idiom) never lets execution continue past the
        statement, so a write in the try body is unconditional relative to a
        later send. Every handler must re-raise for the body to lose its arm;
        a handler we cannot parse counts as swallowing, which keeps the
        cautious FLAG.
        """
        code = self.lexed.code
        while True:
            head = re.match(r"\s*catch\b", code[cursor:cursor + 40])
            if head is None:
                return False
            index = cursor + head.end()
            while index < len(code) and code[index].isspace():
                index += 1
            if index < len(code) and code[index] == "(":
                shut = matching_delimiter(code, index, "(", ")")
                if shut is None:
                    return True
                index = shut + 1
                while index < len(code) and code[index].isspace():
                    index += 1
            if index >= len(code) or code[index] != "{":
                return True
            shut = matching_delimiter(code, index, "{", "}")
            if shut is None:
                return True
            if not self._braced_tail_throws(code[index + 1:shut]):
                return True
            cursor = shut + 1

    @staticmethod
    def _braced_tail_throws(body: str) -> bool:
        """True when the LAST statement of a braced handler body re-raises.

        Deliberately conservative: only a trailing top-level `throw` counts, so
        a nested or conditional `if (fatal) { throw e; }` still reads as
        swallowing and the body keeps its arm.
        """
        text = body.rstrip().rstrip(";").rstrip()
        depth = 0
        start = 0
        for index in range(len(text) - 1, -1, -1):
            character = text[index]
            if character in ")]}":
                depth += 1
            elif character in "([{":
                depth -= 1
                if depth < 0:
                    start = index + 1
                    break
            elif depth == 0 and character == ";":
                start = index + 1
                break
        return re.match(r"\s*(?:throw|rethrow)\b", text[start:]) is not None

    @staticmethod
    def _label_colon(text: str, start: int) -> int | None:
        """Offset of the ':' ending a `case …:` label, or None.

        Skips bracketed spans, the `::` scope operator (`Status::SENT`) and the
        ':' of a ternary so a computed case expression still finds its label.
        """
        depth = 0
        pending = 0
        index = start
        while index < len(text):
            character = text[index]
            if character in "([{":
                depth += 1
            elif character in ")]}":
                depth -= 1
            elif character in ";\n" and depth == 0 and pending == 0:
                return None
            elif depth == 0 and character == "?":
                pending += 1
            elif depth == 0 and character == ":":
                if text[index + 1:index + 2] == ":":
                    index += 2
                    continue
                if pending:
                    pending -= 1
                else:
                    return index
            index += 1
        return None

    def _switch_arms(
        self, opening: int, closing: int
    ) -> tuple[list[tuple[int, int]], bool] | None:
        """Per-case arm spans for a switch body, plus whether it has a default.

        Returns None when the shape cannot be modelled safely - no labels, an
        unparsable label, or an IMPLICIT FALL-THROUGH (a non-empty case body
        with no break/return before the next label). In those cases the caller
        keeps the single whole-body arm, which over-guards rather than
        under-guards. Consecutive labels with nothing between them share one
        arm, which is exactly how `case 'a': case 'b': …` behaves.
        """
        code = self.lexed.code
        body = code[opening + 1:closing]
        depths: list[int] = []
        depth = 0
        for character in body:
            depths.append(depth)
            if character in "([{":
                depth += 1
            elif character in ")]}":
                depth -= 1
        labels: list[tuple[int, int, bool]] = []
        for match in re.finditer(r"\b(case|default)\b", body):
            if depths[match.start()] != 0:
                continue
            if match.group(1) == "default":
                tail = re.match(r"\s*:", body[match.end():])
                if tail is None:
                    continue
                colon = match.end() + tail.end() - 1
            else:
                found = self._label_colon(body, match.end())
                if found is None:
                    return None
                colon = found
            labels.append(
                (
                    opening + 1 + match.start(),
                    opening + 2 + colon,
                    match.group(1) == "default",
                )
            )
        if not labels:
            return None
        terminator = re.compile(r"\b(?:break|return|continue|throw|goto|exit|die)\b")
        spans: list[tuple[int, int]] = []
        arm_start: int | None = None
        for position, (label_start, body_start, _) in enumerate(labels):
            if arm_start is None:
                arm_start = label_start
            body_end = (
                labels[position + 1][0]
                if position + 1 < len(labels)
                else closing
            )
            segment = code[body_start:body_end]
            if not segment.strip():
                # Consecutive labels share one arm (`case 'a': case 'b': …`) in
                # the C family, where an empty body falls through. Go does NOT
                # fall through, so an empty `case "a":` is a real arm that runs
                # and sets nothing - merging it into the following `default:`
                # let that default certify a path which writes no profile.
                if self.suffix == ".go":
                    spans.append((arm_start, body_end))
                    arm_start = None
                continue
            # Go breaks IMPLICITLY - falling through needs an explicit
            # `fallthrough` keyword - so a Go arm without `break` is the normal
            # case, not an unmodellable fall-through. Requiring a terminator
            # there made every Go switch fall back to one whole-body arm, so an
            # exhaustive switch whose every arm (including `default:`) sets the
            # profile was still reported as missing it.
            if self.suffix == ".go":
                if re.search(r"\bfallthrough\b", segment):
                    return None
            elif position + 1 < len(labels) and terminator.search(segment) is None:
                return None
            spans.append((arm_start, body_end))
            arm_start = None
        if arm_start is not None:
            spans.append((arm_start, closing))
        return spans, any(is_default for _, _, is_default in labels)

    def _php_alt(self) -> None:
        """Index PHP alternative-syntax bodies (`if (…): … endif;`).

        The colon-delimited forms have no braces, so _body_arm cannot span
        them; without this a profile write between the ':' and the closing
        `endif` / `else` / `elseif` looks unconditional. A stack pairs each
        opener with its terminator so the if/elseif/else chain shares one group
        (a trailing `else` marks it exhaustive) and the loop/switch forms get a
        single conditional arm.
        """
        code = self.lexed.code
        openers = {"if", "elseif", "else", "for", "foreach", "while", "switch"}
        terminators = {
            "endif": "if",
            "endforeach": "foreach",
            "endfor": "for",
            "endwhile": "while",
            "endswitch": "switch",
        }
        token = re.compile(
            r"\b(if|elseif|else|for|foreach|while|switch)\b"
            r"|\b(endif|endforeach|endfor|endwhile|endswitch)\b"
        )
        stack: list[list[int | str]] = []
        for match in token.finditer(code):
            keyword = match.group(1)
            if keyword is not None:
                if keyword == "else":
                    head_end = match.end()
                else:
                    paren = match.end()
                    while paren < len(code) and code[paren].isspace():
                        paren += 1
                    if paren >= len(code) or code[paren] != "(":
                        continue
                    close = matching_delimiter(code, paren, "(", ")")
                    if close is None:
                        continue
                    head_end = close + 1
                probe = head_end
                while probe < len(code) and code[probe].isspace():
                    probe += 1
                if probe >= len(code) or code[probe] != ":":
                    # Brace syntax or a non-alternative use — leave it to the
                    # C-family handler.
                    continue
                body_start = probe + 1
                if keyword in {"elseif", "else"}:
                    if not stack or stack[-1][0] != "if":
                        continue
                    entry = stack[-1]
                    self.arms.append(
                        ControlArm(entry[1], entry[2], entry[3], match.start())
                    )
                    entry[2] += 1
                    entry[3] = body_start
                    if keyword == "else":
                        self.exhaustive.add(entry[1])
                elif keyword in openers:
                    kind = "if" if keyword == "if" else keyword
                    stack.append([kind, match.start(), 0, body_start])
            else:
                want = terminators[match.group(2)]
                if stack and stack[-1][0] == want:
                    entry = stack.pop()
                    self.arms.append(
                        ControlArm(entry[1], entry[2], entry[3], match.start())
                    )

    def _py_header_colon(self, start: int, end: int) -> int | None:
        """Offset of the ':' that ends a Python compound-statement header.

        Scans the masked line (strings/comments already blanked) for the first
        top-level ':' — skipping brackets (slices, dicts, call args) and the
        walrus ':=' — so a compact `if cond: stmt` header is found even when its
        condition contains colons.
        """
        code = self.lexed.code
        depth = 0
        index = start
        while index < end:
            character = code[index]
            if character in "([{":
                depth += 1
            elif character in ")]}":
                depth -= 1
            elif character == ":" and depth == 0:
                if index + 1 < len(code) and code[index + 1] == "=":
                    index += 2
                    continue
                return index
            index += 1
        return None

    def _py_logical_row(
        self, lines: list[tuple[int, int, int, str]], index: int
    ) -> int:
        """Index of the last physical row of the logical line starting at `index`.

        A compound header may WRAP: `if (use_pool\n        and enabled):` keeps
        its ':' on a continuation row, so scanning only the first physical line
        found no colon at all and the guard was never indexed - a profile
        written in its body read as unconditional.
        """
        code = self.lexed.code
        depth = 0
        row = index
        while True:
            for position in range(lines[row][0], lines[row][1]):
                character = code[position]
                if character in "([{":
                    depth += 1
                elif character in ")]}":
                    depth -= 1
            if depth <= 0 or row + 1 >= len(lines):
                return row
            row += 1

    def _swallowing_except(
        self, lines: list[tuple[int, int, int, str]], index: int, indent: int
    ) -> bool:
        """True when an `except` handler of the `try` at `index` can SWALLOW.

        Python mirror of `_swallowing_catch`: a handler whose last statement is
        `raise` propagates, so execution never continues past the statement
        with the write skipped. Every handler must re-raise for the try body to
        lose its arm; anything unparseable counts as swallowing.
        """
        row = index + 1
        while row < len(lines):
            _, _, row_indent, text = lines[row]
            if not text or row_indent > indent:
                row += 1
                continue
            if row_indent < indent:
                return False
            if re.match(r"(?:else|finally)\b", text):
                row += 1
                continue
            if re.match(r"except\b", text) is None:
                return False
            if not self._py_handler_reraises(lines, row, indent):
                return True
            row += 1
        return False

    def _py_handler_reraises(
        self, lines: list[tuple[int, int, int, str]], row: int, indent: int
    ) -> bool:
        """True when the `except` handler at `row` ends in a bare-level `raise`.

        Deliberately conservative: a `raise` nested deeper than the handler's
        own body indent is conditional, so it reads as swallowing and the try
        body keeps its arm.
        """
        code = self.lexed.code
        last = self._py_logical_row(lines, row)
        header_end = lines[last][1]
        colon = self._py_header_colon(lines[row][0], header_end)
        if colon is None:
            return False
        inline = code[colon + 1:header_end]
        if inline.strip():
            return self._tail_statement_raises(inline)
        body = []
        for entry in lines[last + 1:]:
            if not entry[3]:
                continue
            if entry[2] <= indent:
                break
            body.append(entry)
        if not body or body[-1][2] != body[0][2]:
            return False
        return self._tail_statement_raises(body[-1][3])

    @staticmethod
    def _tail_statement_raises(text: str) -> bool:
        """True when the last `;`-separated statement of `text` is a `raise`."""
        statements = [part for part in text.split(";") if part.strip()]
        return bool(statements) and re.match(r"\s*raise\b", statements[-1]) is not None

    def _python(self, lines: list[tuple[int, int, int, str]]) -> None:
        """Index Python control arms, block and compact one-line forms alike.

        A guard writes a profile only on some path — an `if`/`elif`/`else`
        branch, a loop body that may not run, an `except` handler, or one
        `case` arm — whether the body sits on its own indented lines or inline
        after the header colon (`if cond: payload[...] = p`, or a `;`-separated
        suite). Block `if`/`else` chains and `match`/`case` groups are tracked
        so a fully-covering `else` / wildcard `case _` stays exhaustive and a
        genuinely unconditional write is never guarded.
        """
        code = self.lexed.code
        # A `try` body is NOT unconditional: when a sibling handler swallows the
        # error, execution continues past the statement with the write skipped.
        # It is an arm like any other — a send INSIDE the same body shares the
        # arm and stays unguarded, while a send after the statement is guarded.
        conditional = {"if", "elif", "else", "for", "while", "except", "case", "try"}
        if_pending: dict[int, int] = {}
        case_pending: dict[int, int] = {}
        for index, (start, line_end, indent, text) in enumerate(lines):
            header = re.match(
                r"(if|elif|else|for|while|try|except|finally|with|match|case)\b",
                text,
            )
            if header is None:
                continue
            word = header.group(1)
            if word == "match":
                # `match` only dispatches; its `case` arms carry the guard.
                # Start a fresh case chain for any deeper indent.
                for level in [key for key in case_pending if key > indent]:
                    del case_pending[level]
                continue
            if word not in conditional:
                # with / finally bodies always execute — not guards.
                continue
            if word == "try":
                # ONLY a try whose handler SWALLOWS is a guard. `try: / finally:`
                # with no handler propagates, and so does an `except:` whose
                # body ends in `raise`: a later send is never reached and the
                # write is not conditional relative to it - treating either as
                # an arm reported compliant code as missing the profile.
                if not self._swallowing_except(lines, index, indent):
                    continue
            last = self._py_logical_row(lines, index)
            header_end = lines[last][1]
            colon = self._py_header_colon(start, header_end)
            if colon is None:
                continue
            if code[colon + 1:header_end].strip():
                end = header_end  # compact inline body — guard only this line
            else:
                end = next(
                    (row[0] for row in lines[last + 1:] if row[3] and row[2] <= indent),
                    len(code),
                )
            orphan = False
            if word in {"elif", "else"}:
                orphan = indent not in if_pending
                group = if_pending.get(indent, start)
                if_pending[indent] = group
            elif word == "case":
                group = case_pending.get(indent, start)
                case_pending[indent] = group
            else:
                group = start
                if word in {"if", "for", "while"}:
                    if_pending[indent] = group
            self.arms.append(
                ControlArm(
                    group,
                    sum(arm.group == group for arm in self.arms),
                    start,
                    end,
                )
            )
            if word == "else" and not orphan:
                # An `else` with NO recorded opener at this indent is not the
                # tail of an if/for/while chain - it is `try/except/else`, whose
                # body runs only when no exception was raised. Marking it
                # exhaustive made a one-branch group that is always taken, so a
                # profile written there read as unconditional.
                self.exhaustive.add(group)
            elif word == "case":
                pattern = code[start + indent + len(word):colon].strip()
                if re.fullmatch(r"_|[a-z]\w*", pattern):
                    self.exhaustive.add(group)

    def _lines(self) -> None:
        lines: list[tuple[int, int, int, str]] = []
        cursor = 0
        for line in self.lexed.code.splitlines(keepends=True):
            stripped = line.lstrip(" \t")
            lines.append((cursor, cursor + len(line), len(line) - len(stripped), stripped.strip()))
            cursor += len(line)
        if self.suffix == ".py":
            self._python(lines)
            return
        stack: list[tuple[str, int, int, int]] = []
        for start, end, indent, text in lines:
            if self.suffix == ".rb":
                if re.match(r"(?:if|unless|case|for|while|until|begin)\b", text) or re.match(
                    r".+\.(?:each|each_pair|each_with_index|times|map|select)\b.*\bdo(?:\s*\|[^|]*\|)?\s*$",
                    text,
                ):
                    stack.append(("end", start, start, 0))
                elif re.match(r"(?:elsif|when|rescue)\b", text) and stack:
                    # A MIDDLE branch closes the previous one and opens the
                    # next, but does NOT make the group exhaustive - only a
                    # final `else` does. Without this, an `elsif`/`when` body
                    # folded into branch 0 and a profile written only there
                    # read as unconditional.
                    token, group, branch_start, branch = stack.pop()
                    self.arms.append(ControlArm(group, branch, branch_start, start))
                    stack.append((token, group, start, branch + 1))
                elif text == "else" and stack:
                    token, group, branch_start, branch = stack.pop()
                    self.arms.append(ControlArm(group, branch, branch_start, start))
                    self.exhaustive.add(group)
                    stack.append((token, group, start, branch + 1))
                elif re.match(r"end\b", text) and stack:
                    _, group, branch_start, branch = stack.pop()
                    self.arms.append(ControlArm(group, branch, branch_start, end))
                elif re.search(
                    r"\S\s+\b(?:if|unless|while|until)\b\s+\S", text
                ) and not re.search(r"\b(?:then|do)\b\s*(?:\|[^|]*\|)?\s*$", text):
                    # Trailing modifier: `stmt if cond` / `stmt unless cond`
                    # runs the statement only conditionally. It is not a block
                    # opener (those start with the keyword) so it has no `end`.
                    self.arms.append(ControlArm(start, 0, start, end))
            else:
                one_line_if = re.match(r"if\b.*;\s*then\b.*\bfi\b", text)
                if one_line_if:
                    # Self-contained `if …; then …; fi` — the body is guarded
                    # but there is no separate `fi` line to close it.
                    self.arms.append(ControlArm(start, 0, start, end))
                else:
                    opener = re.match(r"(if|for|while|until|case)\b", text)
                    if opener:
                        close = "fi" if opener.group(1) == "if" else "esac" if opener.group(1) == "case" else "done"
                        stack.append((close, start, start, 0))
                    elif (
                        re.match(r"elif\b", text)
                        and stack
                        and stack[-1][0] == "fi"
                    ):
                        # Same as Ruby's elsif: closes the previous branch,
                        # opens the next, does not make the group exhaustive.
                        token, group, branch_start, branch = stack.pop()
                        self.arms.append(
                            ControlArm(group, branch, branch_start, start)
                        )
                        stack.append((token, group, start, branch + 1))
                    elif text == "else" and stack and stack[-1][0] == "fi":
                        token, group, branch_start, branch = stack.pop()
                        self.arms.append(ControlArm(group, branch, branch_start, start))
                        self.exhaustive.add(group)
                        stack.append((token, group, start, branch + 1))
                    elif stack and re.match(rf"{stack[-1][0]}\b", text):
                        _, group, branch_start, branch = stack.pop()
                        self.arms.append(ControlArm(group, branch, branch_start, end))
                guard = re.search(r"&&|\|\|", text)
                if guard is not None and not re.match(
                    r"(?:if|elif|else|fi|for|while|until|case|esac|done|then|do)\b",
                    text,
                ):
                    # `cond && assign` / `cond || assign` runs the right side
                    # only conditionally; guard from the operator onward so a
                    # left-hand assignment that always runs stays unguarded.
                    self.arms.append(
                        ControlArm(start, 0, start + indent + guard.end(), end)
                    )

    def path(self, offset: int) -> tuple[tuple[int, int], ...]:
        arms = [arm for arm in self.arms if arm.start <= offset < arm.end]
        arms.sort(key=lambda arm: (-(arm.end - arm.start), arm.start))
        return tuple((arm.group, arm.branch) for arm in arms)

    def environments(self, paths: Iterable[tuple[tuple[int, int], ...]], call_path: tuple[tuple[int, int], ...]) -> list[dict[int, int | None]]:
        fixed = dict(call_path)
        groups: dict[int, set[int]] = {}
        for path in paths:
            for group, branch in path:
                if group not in fixed:
                    groups.setdefault(group, set()).add(branch)
        environments: list[dict[int, int | None]] = [fixed]
        for group, branches in groups.items():
            if group in self.exhaustive:
                # An exhaustive if/else covers all paths, but a branch that
                # writes nothing never appears in the write paths above. Pull
                # in every branch of the group so the path through a
                # profile-less branch is considered — otherwise
                # `if (skip) {...} else payload.messaging_profile_id = p;` was
                # read as always setting the profile.
                branches = branches | {
                    arm.branch for arm in self.arms if arm.group == group
                }
            choices: list[int | None] = sorted(branches)
            if group not in self.exhaustive:
                choices.append(None)
            expanded: list[dict[int, int | None]] = []
            for environment in environments:
                for choice in choices:
                    candidate = dict(environment)
                    candidate[group] = choice
                    expanded.append(candidate)
            environments = expanded
            if len(environments) > 64:
                return []
        return environments

    @staticmethod
    def active(path: tuple[tuple[int, int], ...], environment: dict[int, int | None]) -> bool:
        return all(environment.get(group) == branch for group, branch in path)


class PayloadStateResolver:
    """Indexed abstract interpreter for payload field/object state."""

    JS_SUFFIXES = JS_TS_SUFFIXES

    def __init__(
        self,
        lexed: LexedSource,
        suffix: str,
        fields: Iterable[str],
        *,
        require_value: bool,
        source: SourceEndpointResolver | None = None,
    ) -> None:
        self.lexed, self.suffix = lexed, suffix
        self.fields, self.require_value = frozenset(fields), require_value
        self.source = source or SourceEndpointResolver(lexed, suffix)
        self.control = ControlIndex(lexed, suffix)
        self.roots: dict[int, list[RootFieldEvent]] = {}
        self.root_offsets: dict[int, list[int]] = {}
        self.objects: dict[tuple[int, int], RootFieldEvent] = {}
        self.events: list[FieldEvent] = []
        self.event_offsets: list[int] = []
        self._targets_memo: dict[tuple[int, int, int], ObjectTargets] = {}
        self._presence_memo: dict[tuple[tuple[int, int], int, int], Presence] = {}
        self._index_roots()
        self._index_field_events()

    def _binding(self, start: int, end: int, scope: int, before: int) -> int | None:
        reference = static_reference_expression(self.lexed, start, end)
        if reference is not None and len(reference) == 1:
            name = reference[0].lstrip("$")
        else:
            text = re.sub(r"^(?:\.\.\.|\*\*|[&*])\s*", "", self.lexed.code[start:end].strip())
            match = re.fullmatch(r"\$?([A-Za-z_]\w*)", text)
            if match is None:
                return None
            name = match.group(1)
        return self.source.graph.visible_binding(name, scope, before)

    def _index_roots(self) -> None:
        for assignment in self.source.root_assignments:
            binding = self.source.assignment_bindings[assignment.start()]
            scope = self.source.scope_at(assignment.start())
            end = assignment_end(self.lexed, assignment.end(), self.suffix)
            owner = self.source.graph.bindings[binding]
            direct_alias = self._binding(
                assignment.end(), end, scope, assignment.start()
            )
            conditional = self._conditional(assignment.end(), end)
            aliases: tuple[int, ...] | None = (
                (direct_alias,) if direct_alias is not None else None
            )
            alias_unknown = False
            if conditional is not None:
                choices = tuple(
                    self._binding(*span, scope, assignment.start())
                    for span in conditional
                )
                aliases = tuple(
                    dict.fromkeys(choice for choice in choices if choice is not None)
                )
                alias_unknown = any(choice is None for choice in choices)
            event = RootFieldEvent(
                binding,
                assignment.start(),
                (assignment.end(), end),
                scope,
                self.source.graph.execution_scope(scope),
                "declaration" if owner.declaration_start == assignment.start() else "mutation",
                self.control.path(assignment.start()),
                aliases,
                alias_unknown,
            )
            self.roots.setdefault(binding, []).append(event)
            self.root_offsets.setdefault(binding, []).append(event.start)
            if event.aliases is None:
                self.objects[event.object_id] = event

    def _add_event(self, binding: int, start: int, effect: int, overlay: tuple[int, int] | None = None) -> None:
        scope = self.source.scope_at(start)
        self.events.append(FieldEvent(
            binding,
            start,
            scope,
            self.source.graph.execution_scope(scope),
            self.control.path(start),
            effect,
            overlay,
        ))

    def _value_effect(
        self, start: int, end: int, seen: frozenset[int] = frozenset()
    ) -> int:
        if not self.require_value:
            return WRITE_PRESENT
        conditional = self._conditional(start, end)
        if conditional is not None:
            effects = {
                self._value_effect(span[0], span[1], seen) for span in conditional
            }
            return effects.pop() if len(effects) == 1 else WRITE_MAYBE
        start, end = strip_expression_parentheses(self.lexed, start, end)
        code = self.lexed.code[start:end].strip()
        if re.fullmatch(r"(?:null|nil|none|undefined|Optional\s*\.\s*empty\s*\(\s*\))", code, re.I):
            return WRITE_ABSENT
        # A messaging_profile_id must be a non-empty identifier. A statically
        # falsy or empty literal — false/true, 0, [], {}, and empty collection
        # constructors — is present in shape but unusable, so the Messages API
        # receives an invalid profile. Treat those as absent (shape vs value).
        if re.fullmatch(
            r"(?:false|true"
            r"|[+-]?0(?:\.0+)?"
            r"|\[\s*\]|\{\s*\}|\(\s*\)"
            r"|(?:dict|list|tuple|set|array|Array|Map|Set|Object|String)\s*\(\s*\)"
            r"|new\s+(?:Array|Map|Set|Object)\s*\(\s*\))",
            code,
            re.I,
        ):
            return WRITE_ABSENT
        # The public API contract is a UUID string. Reject every statically
        # numeric literal (not just zero) across the advertised languages;
        # dynamic expressions remain MAYBE/PRESENT because their runtime type
        # cannot be proven here.
        if re.fullmatch(
            r"[+-]?(?:(?:0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*)"
            r"|(?:0[bB][01](?:_?[01])*)|(?:0[oO][0-7](?:_?[0-7])*)"
            r"|(?:(?:\d(?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?"
            r"|\.(?:\d(?:_?\d)*))(?:[eE][+-]?\d(?:_?\d)*)?)"
            r"(?:[nNlLfFdDmM])?",
            code,
        ):
            return WRITE_ABSENT
        tokens = [token for token in self.lexed.strings if start <= token.start and token.end <= end]
        if len(tokens) == 1:
            residual = (self.lexed.code[start:tokens[0].start] + self.lexed.code[tokens[0].end:end]).strip().lower()
            if residual in {"", "f", "r", "u", "b", "fr", "rf"}:
                return (
                    WRITE_PRESENT
                    if tokens[0].contents.strip()
                    else WRITE_ABSENT
                )
        # A value with an empty fallback is not guaranteed usable. Treat both
        # nullish and logical-OR fallbacks consistently; a concrete non-empty
        # fallback is handled by the conditional resolver above.
        if re.search(r"(?:\?\?|\|\||\boptional\b|\bmaybe\b)", code, re.I):
            return WRITE_MAYBE
        if self.suffix == ".py":
            env_getter = re.search(
                r"(?:os\.environ\.get|os\.getenv)\s*\(",
                self.lexed.code[start:end],
            )
            if env_getter is not None:
                opening = start + env_getter.end() - 1
                closing = matching_delimiter(
                    self.lexed.code, opening, "(", ")"
                )
                arguments = (
                    split_arguments(self.lexed.code, opening + 1, closing)
                    if closing is not None and closing <= end
                    else []
                )
                if len(arguments) < 2:
                    return WRITE_MAYBE
        if tokens and all(not token.contents.strip() for token in tokens):
            # Empty literal concatenations/coercions (`'' + ''`,
            # `String('   ')`, `.concat('')`, `.join('')`) are statically
            # unusable even though their source text is non-empty.
            residual = self.lexed.code[start:end]
            if not re.search(r"[A-Za-z_$]\w*(?!\s*\()", residual):
                return WRITE_ABSENT
        alias = self._alias_absence(start, code, seen)
        if alias is not None:
            return alias
        return WRITE_PRESENT if code else WRITE_ABSENT

    def _assignment_entries(self) -> list[tuple[str, int, int, int]]:
        cached = getattr(self, "_assignment_entries_cache", None)
        if cached is None:
            cached = assignment_index(self.lexed, self.suffix)
            self._assignment_entries_cache = cached
        return cached

    def _alias_absence(
        self, start: int, code: str, seen: frozenset[int]
    ) -> int | None:
        """Resolve a bare-identifier value to its nearest static literal.

        A direct empty/falsy literal is already treated as absent above, but a
        value assigned through a local constant — ``const mp = ''; {..: mp}`` —
        would otherwise pass as present because the identifier text is non-empty.
        Resolve the nearest binding-matched assignment and recurse, so every
        empty/falsy form and any alias chain is caught. This ONLY returns a
        proven absence: a present/maybe value keeps the existing behaviour, so
        the resolution can flag more, never fewer (no new false positives on a
        genuinely populated alias).
        """
        match = re.fullmatch(r"\$?([A-Za-z_]\w*)", code)
        if match is None:
            return None
        name = match.group(1)
        # DECLARED but never assigned - `let mp;` / `var mp;`. Such a name has
        # no assignment entry at all, so it also has no binding, and the lookup
        # below returns None before any absence can be proven. The serialized
        # payload is byte-identical to the explicitly-empty `let mp = ""` case
        # that IS flagged, so treat a bare declaration as proven absence.
        # Checked BEFORE the binding lookup for exactly that reason.
        if not any(
            entry_name.lstrip("$") == name
            for entry_name, _, _, _ in self._assignment_entries()
        ) and re.search(
            rf"(?:^|[;{{}}\n])[ \t]*(?:let|var|my|our)[ \t]+\$?{re.escape(name)}[ \t]*(?=[;\n])",
            self.lexed.code[:start],
        ):
            return WRITE_ABSENT
        binding = self.source.graph.visible_binding(
            name, self.source.scope_at(start), start
        )
        if binding is None or binding in seen:
            return None
        assignments: list[tuple[int, int, int]] = []
        for entry_name, entry_start, rhs_start, rhs_end in self._assignment_entries():
            if entry_name.lstrip("$") != name:
                continue
            entry_binding = self.source.graph.visible_binding(
                name, self.source.scope_at(entry_start), entry_start
            )
            if entry_binding == binding:
                assignments.append((entry_start, rhs_start, rhs_end))
        # Only a SINGLE static assignment is a constant alias. A reassigned or
        # conditionally-assigned binding may hold a different value at the use
        # site, so leave it to the existing present/maybe handling — stay
        # conservative and never manufacture a false absence.
        if len(assignments) != 1:
            return None
        entry_start, rhs_start, rhs_end = assignments[0]
        if entry_start >= start:
            return None
        resolved = self._value_effect(rhs_start, rhs_end, seen | {binding})
        return WRITE_ABSENT if resolved == WRITE_ABSENT else None

    def _index_field_events(self) -> None:
        seen: set[tuple[int, int, int, tuple[int, int] | None]] = set()

        def add(binding: int | None, start: int, effect: int, overlay: tuple[int, int] | None = None) -> None:
            if binding is None or (binding, start, effect, overlay) in seen:
                return
            seen.add((binding, start, effect, overlay))
            self._add_event(binding, start, effect, overlay)

        for reference, start, rhs_start, rhs_end in direct_member_assignments(self.lexed, len(self.lexed.code), self.suffix):
            if len(reference) != 2 or reference[1] not in self.fields:
                continue
            scope = self.source.scope_at(start)
            add(self.source.graph.visible_binding(reference[0].lstrip("$"), scope, start), start, self._value_effect(rhs_start, rhs_end))
        if self.suffix == ".sh":
            for reference, start, rhs_start, rhs_end in shell_member_assignments(self.lexed, len(self.lexed.code), self.suffix):
                if len(reference) == 2 and reference[1] in self.fields:
                    scope = self.source.scope_at(start)
                    add(self.source.graph.visible_binding(reference[0], scope, start), start, self._value_effect(rhs_start, rhs_end))

        names = "|".join(map(re.escape, sorted(self.fields)))
        root_spans = [event.rhs for events in self.roots.values() for event in events]
        setter = re.compile(rf"(?<![\w$.])([A-Za-z_]\w*)\s*(?:\.|->)\s*(?:set)?(?:{names})\s*\(")
        for match in setter.finditer(self.lexed.code):
            if any(start <= match.start() < end for start, end in root_spans):
                continue
            opening = self.lexed.code.rfind("(", match.start(), match.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            scope = self.source.scope_at(match.start())
            if closing is not None:
                add(self.source.graph.visible_binding(match.group(1), scope, match.start()), match.start(), self._value_effect(opening + 1, closing))

        # `.Add(key, value)` (C# Dictionary), `.TryAdd(...)`, `.set(...)` (JS
        # Map) and `.putIfAbsent(...)` are the same two-argument key/value write
        # as Java's `.put(...)`. Modelling only `put` meant a C# payload built
        # with Dictionary.Add was seen as never receiving the profile, so a
        # COMPLIANT send was reported as missing it.
        put = re.compile(
            r"(?<![\w$.])([A-Za-z_]\w*)\s*(?:\.|->)\s*"
            r"(?:put|putIfAbsent|Add|TryAdd|set)\s*\("
        )
        for match in put.finditer(self.lexed.code):
            opening = self.lexed.code.rfind("(", match.start(), match.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            arguments = split_arguments(self.lexed.code, opening + 1, closing) if closing is not None else []
            if len(arguments) == 2 and static_lookup_key(self.lexed, *arguments[0]) in self.fields:
                scope = self.source.scope_at(match.start())
                add(self.source.graph.visible_binding(match.group(1), scope, match.start()), match.start(), self._value_effect(*arguments[1]))

        # Snapshot overlays and in-place merge/update adapters.
        merge = re.compile(r"(?<![\w$.])([A-Za-z_]\w*)\s*(?:\.|->)\s*(?:update|merge!|putAll)\s*\(")
        for match in merge.finditer(self.lexed.code):
            opening = self.lexed.code.rfind("(", match.start(), match.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            if closing is not None:
                scope = self.source.scope_at(match.start())
                binding = self.source.graph.visible_binding(match.group(1), scope, match.start())
                for span in split_arguments(self.lexed.code, opening + 1, closing):
                    add(binding, match.start() + span[0] - opening, NO_WRITE, span)
        for match in re.finditer(r"\bObject\s*\.\s*assign\s*\(", self.lexed.code):
            opening = self.lexed.code.rfind("(", match.start(), match.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            arguments = split_arguments(self.lexed.code, opening + 1, closing) if closing is not None else []
            if len(arguments) < 2:
                continue
            scope = self.source.scope_at(match.start())
            binding = self._binding(*arguments[0], scope, match.start())
            for span in arguments[1:]:
                add(binding, span[0], NO_WRITE, span)

        deletion_patterns = (
            re.compile(r"\b(?:delete|del)\s+([^;\n]+)"),
            re.compile(r"(?<![\w$.])([A-Za-z_]\w*)\s*(?:\.|->)\s*(?:delete|remove|Remove)\s*\(([^)]*)\)"),
            re.compile(r"\bdelete\s*\(\s*([A-Za-z_]\w*)\s*,([^)]*)\)"),
            re.compile(r"\bunset\s*\(\s*([^)]*)\)"),
        )
        for index, pattern in enumerate(deletion_patterns):
            for match in pattern.finditer(self.lexed.code):
                reference = static_reference_expression(self.lexed, match.start(1), match.end(1)) if index in {0, 3} else None
                if index in {1, 2} and static_lookup_key(self.lexed, *match.span(2)) in self.fields:
                    reference = (match.group(1), next(iter(self.fields)))
                if reference is None or len(reference) != 2 or reference[1] not in self.fields:
                    continue
                scope = self.source.scope_at(match.start())
                add(self.source.graph.visible_binding(reference[0].lstrip("$"), scope, match.start()), match.start(), WRITE_ABSENT)
        self.events.sort(key=lambda event: event.start)
        self.event_offsets = [event.start for event in self.events]

    def _conditional(self, start: int, end: int) -> tuple[tuple[int, int], tuple[int, int]] | None:
        round_depth = square_depth = curly_depth = nested = 0
        question: int | None = None
        for index in range(start, end):
            character = self.lexed.code[index]
            if character == "(": round_depth += 1
            elif character == ")" and round_depth: round_depth -= 1
            elif character == "[": square_depth += 1
            elif character == "]" and square_depth: square_depth -= 1
            elif character == "{": curly_depth += 1
            elif character == "}" and curly_depth: curly_depth -= 1
            elif not (round_depth or square_depth or curly_depth):
                if character == "?" and not self.lexed.code.startswith(("?.", "??"), index):
                    if question is None: question = index
                    else: nested += 1
                elif character == ":" and question is not None:
                    if nested: nested -= 1
                    else: return (question + 1, index), (index + 1, end)
        # Python's `a if cond else b`. The `if`/`else` must be at the TOP LEVEL
        # of the span: a plain `build(a if flag else b)` was split by a naive
        # fullmatch into the bogus alias branches "build(a" and "b)", and the
        # payload it really assigns became unresolvable - compliant code was
        # reported as missing the profile.
        depth = 0
        word_if: int | None = None
        for token in re.finditer(
            r"[()\[\]{}]|\bif\b|\belse\b", self.lexed.code[start:end]
        ):
            text = token.group(0)
            if text in "([{":
                depth += 1
            elif text in ")]}":
                depth -= 1
            elif depth:
                continue
            elif text == "if":
                if word_if is None and token.start() > 0:
                    word_if = token.start()
            elif word_if is not None:
                return (
                    (start, start + word_if),
                    (start + token.end(), end),
                )
        return None

    def _root_reaches(self, event: RootFieldEvent, use_scope: int) -> bool:
        if event.kind == "declaration":
            return self.source.graph.bindings[event.binding].scope_id in self.source.graph.ancestors(use_scope)
        return event.execution == self.source.graph.execution_scope(use_scope)

    def targets(self, binding: int, before: int, use_scope: int, visiting: frozenset[tuple[int, int, int]] = frozenset()) -> ObjectTargets:
        key = (binding, before, use_scope)
        if key in self._targets_memo:
            return self._targets_memo[key]
        if key in visiting:
            return ObjectTargets(unknown=True)
        stop = bisect.bisect_left(self.root_offsets.get(binding, ()), before)
        events = [event for event in self.roots.get(binding, ())[:stop] if self._root_reaches(event, use_scope)]
        call_path = self.control.path(before)
        environments = self.control.environments((event.path for event in events), call_path)
        if not environments:
            return ObjectTargets(unknown=True)
        results: list[ObjectTargets] = []
        for environment in environments:
            current = ObjectTargets(unknown=True)
            for event in events:
                if not self.control.active(event.path, environment):
                    continue
                current = (
                    ObjectTargets(frozenset((event.object_id,)))
                    if event.aliases is None
                    else join_targets(
                        [
                            self.targets(
                                alias,
                                event.start,
                                event.scope,
                                visiting | {key},
                            )
                            for alias in event.aliases
                        ]
                        + (
                            [ObjectTargets(unknown=True)]
                            if event.alias_unknown
                            else []
                        )
                    )
                )
            results.append(current)
        value = join_targets(results)
        self._targets_memo[key] = value
        return value

    def _effect_from_presence(self, value: Presence) -> int:
        return overlay_effect(value)

    def _object_presence(self, object_id: tuple[int, int], before: int, use_scope: int, visiting: frozenset[tuple[tuple[int, int], int, int]] = frozenset()) -> Presence:
        key = (object_id, before, use_scope)
        if key in self._presence_memo:
            return self._presence_memo[key]
        if key in visiting or object_id not in self.objects:
            return MAYBE_VALUE
        root = self.objects[object_id]
        initial = self._span_presence(*root.rhs, root.start, root.scope, visiting | {key})
        stop = bisect.bisect_left(self.event_offsets, before)
        # A field write in an ENCLOSING function reaches a send written inside
        # a callback: the object is captured by the closure and the write has
        # already run at the point the send is written. Requiring an exact
        # execution-scope match dropped every such write, so
        # `payload.messaging_profile_id = mp; items.forEach(i => fetch(...))`
        # was reported as missing the profile it plainly sets. The reverse
        # direction stays blocked - a write INSIDE a callback still cannot
        # prove anything about a send outside it, because the callback may
        # never run.
        enclosing = self.source.graph.ancestors(use_scope)
        events = [event for event in self.events[:stop] if event.execution in enclosing]
        environments = self.control.environments((event.path for event in events), self.control.path(before))
        if not environments:
            return Presence(MAYBE, initial.evidence or bool(events))
        outcomes: list[Presence] = []
        for environment in environments:
            value = initial
            for event in events:
                if not self.control.active(event.path, environment):
                    continue
                targets = self.targets(event.binding, event.start, event.scope)
                definite = object_id in targets.must
                possible = definite or object_id in targets.may or targets.unknown
                if not possible:
                    continue
                effect = event.effect
                if event.overlay is not None:
                    effect = self._effect_from_presence(self._span_presence(*event.overlay, event.start, event.scope, visiting | {key}))
                changed = apply_field_effect(value, effect)
                value = changed if definite else join_presence((value, changed))
            outcomes.append(value)
        result = join_presence(outcomes)
        self._presence_memo[key] = result
        return result

    def presence_for_binding(self, binding: int, before: int, use_scope: int) -> Presence:
        targets = self.targets(binding, before, use_scope)
        values = [self._object_presence(object_id, before, use_scope) for object_id in targets.all]
        if targets.unknown:
            values.append(MAYBE_VALUE)
        return join_presence(values)

    def presence_for_name(self, name: str, before: int) -> Presence:
        scope = self.source.scope_at(before)
        binding = self.source.graph.visible_binding(name.lstrip("$"), scope, before)
        return self.presence_for_binding(binding, before, scope) if binding is not None else MAYBE_VALUE

    def _serialized(self, value: str) -> Presence | None:
        candidates = [value]
        try:
            decoded = json.loads(f'"{value}"')
            if decoded != value: candidates.append(decoded)
        except (TypeError, ValueError):
            pass
        for candidate in candidates:
            try: payload = json.loads(candidate)
            except (TypeError, ValueError): continue
            if not isinstance(payload, dict):
                return ABSENT_VALUE
            selected = next((payload[name] for name in reversed(tuple(payload)) if name in self.fields), ...)
            if selected is ...:
                return ABSENT_VALUE
            if not self.require_value:
                return PRESENT_VALUE
            return Presence(
                PRESENT
                if selected not in (None, "", [], {}, False)
                else ABSENT,
                True,
            )
        return None

    def text_presence(self, value: str) -> Presence:
        return self._serialized(value) or MAYBE_VALUE

    def _members(self, kind: str, opening: int, closing: int, before: int, scope: int, visiting: frozenset[tuple[tuple[int, int], int, int]]) -> Presence:
        members = split_arguments(self.lexed.code, opening + 1, closing)
        value = ABSENT_VALUE
        if kind == "pairs":
            for key_span, value_span in zip(members[::2], members[1::2]):
                key = static_object_key(self.lexed, *key_span)
                if key in self.fields: value = apply_field_effect(value, self._value_effect(*value_span))
                elif key is None: value = join_presence((value, MAYBE_VALUE))
            return value
        for member_start, member_end in members:
            text = self.lexed.code[member_start:member_end].strip()
            if not text: continue
            # Match on raw source offsets: `text` is stripped, so any offset
            # derived from it is short by the member's leading whitespace and
            # `{ a, ...base }` resolved to `.base` instead of `base`.
            spread = SPREAD_MEMBER_RE.match(self.lexed.code, member_start, member_end)
            if spread:
                value = apply_field_effect(value, overlay_effect(self._span_presence(spread.end(), member_end, before, scope, visiting)))
                continue
            colon = top_level_colon(self.lexed.code, member_start, member_end)
            separator = (colon, colon + 1) if colon is not None else top_level_assignment_separator(self.lexed.code, member_start, member_end)
            if separator is None:
                key = static_object_key(self.lexed, member_start, member_end)
                # A separator-less member is either a string key or a JS/TS
                # shorthand. Shorthand means the VARIABLE's value, so the value
                # still has to be analysed - hard-coding WRITE_PRESENT
                # certified `const messaging_profile_id = ''; {..., messaging_profile_id}`.
                # For a string-literal key the span is its own non-empty
                # literal, so _value_effect keeps the previous verdict.
                if key in self.fields: value = apply_field_effect(value, self._value_effect(member_start, member_end))
                elif key is None and text.startswith("["): value = join_presence((value, MAYBE_VALUE))
                continue
            separator_start, value_start = separator
            key = static_object_key(self.lexed, member_start, separator_start)
            if key in self.fields: value = apply_field_effect(value, self._value_effect(value_start, member_end))
            elif key is None: value = join_presence((value, MAYBE_VALUE))
        return value

    def _builder(self, start: int, end: int) -> Presence | None:
        names = "|".join(map(re.escape, sorted(self.fields)))
        matches = list(
            re.compile(
                rf"(?:\.|->)\s*(?:set)?(?:{names})\s*\("
            ).finditer(self.lexed.code, start, end)
        )
        matches = [
            match
            for match in matches
            if structural_depth(self.lexed.code, start, match.start())
            == (0, 0, 0)
        ]
        if not matches: return None
        opening = self.lexed.code.rfind("(", matches[-1].start(), matches[-1].end())
        closing = matching_delimiter(self.lexed.code, opening, "(", ")")
        return Presence(MAYBE, True) if closing is None or closing > end else apply_field_effect(ABSENT_VALUE, self._value_effect(opening + 1, closing))

    def _arguments(self, start: int, end: int) -> Presence | None:
        value, found = ABSENT_VALUE, False
        for member_start, member_end in split_arguments(self.lexed.code, start, end):
            colon = top_level_colon(self.lexed.code, member_start, member_end)
            separator = (colon, colon + 1) if colon is not None else top_level_assignment_separator(self.lexed.code, member_start, member_end)
            if separator is None: continue
            key = static_object_key(self.lexed, member_start, separator[0])
            if key in self.fields:
                value, found = apply_field_effect(value, self._value_effect(separator[1], member_end)), True
        return value if found else None

    def _span_presence(self, start: int, end: int, before: int, scope: int, visiting: frozenset[tuple[tuple[int, int], int, int]] = frozenset()) -> Presence:
        start, end = strip_expression_parentheses(self.lexed, start, end)
        if start >= end: return ABSENT_VALUE
        conditional = self._conditional(start, end)
        if conditional is not None:
            return join_presence(self._span_presence(*span, before, scope, visiting) for span in conditional)
        wrapper = re.match(r"\s*(?:JSON\s*\.\s*stringify|json\s*\.\s*dumps)\s*\(", self.lexed.code[start:end])
        if wrapper:
            opening = self.lexed.code.find("(", start, start + wrapper.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            arguments = split_arguments(self.lexed.code, opening + 1, closing) if closing is not None else []
            if arguments: return self._span_presence(*arguments[0], before, scope, visiting)
        # Ruby's serializer is a suffix, not a call wrapper: `payload.to_json`
        # is the idiomatic Net::HTTP/Faraday body. Only the inline-literal form
        # `{..}.to_json` resolved, so a compliant send through a variable was
        # reported as missing the profile.
        to_json = re.fullmatch(
            r"\s*(\$?[A-Za-z_]\w*)\s*(?:\.|->)\s*to_json\s*(?:\(\s*\))?\s*",
            self.lexed.code[start:end],
        )
        if to_json is not None:
            return self._span_presence(
                start + to_json.start(1), start + to_json.end(1), before, scope, visiting
            )
        assign = re.match(r"\s*Object\s*\.\s*assign\s*\(", self.lexed.code[start:end])
        if assign:
            opening = self.lexed.code.find("(", start, start + assign.end())
            closing = matching_delimiter(self.lexed.code, opening, "(", ")")
            value = ABSENT_VALUE
            for span in split_arguments(self.lexed.code, opening + 1, closing) if closing is not None else []:
                value = apply_field_effect(value, overlay_effect(self._span_presence(*span, before, scope, visiting)))
            return value
        copy_call = re.fullmatch(
            r"\s*(?:new\s+)?(?:dict|HashMap|Dictionary)"
            r"(?:\s*<[^>]*>)?\s*\((.*)\)\s*",
            self.lexed.code[start:end],
            re.DOTALL,
        )
        if copy_call is not None:
            copy_start = start + copy_call.start(1)
            return self._span_presence(
                copy_start,
                start + copy_call.end(1),
                before,
                scope,
                visiting,
            )
        copy_method = re.fullmatch(
            r"\s*(\$?[A-Za-z_]\w*)\s*(?:\.|->)\s*"
            r"(?:copy|dup|clone)\s*(?:\(\s*\))?\s*",
            self.lexed.code[start:end],
        )
        if copy_method is not None:
            name_start = start + copy_method.start(1)
            binding = self._binding(
                name_start, start + copy_method.end(1), scope, before
            )
            if binding is not None:
                return self.presence_for_binding(binding, before, scope)
        clone_call = re.fullmatch(
            r"\s*maps\s*\.\s*Clone\s*\((.*)\)\s*",
            self.lexed.code[start:end],
            re.DOTALL,
        )
        if clone_call is not None:
            clone_start = start + clone_call.start(1)
            return self._span_presence(
                clone_start,
                start + clone_call.end(1),
                before,
                scope,
                visiting,
            )
        merge_copy = re.fullmatch(
            r"\s*(\$?[A-Za-z_]\w*)\s*(?:\.|->)\s*merge\s*\((.*)\)\s*",
            self.lexed.code[start:end],
            re.DOTALL,
        )
        if merge_copy is not None:
            receiver_start = start + merge_copy.start(1)
            value = self._span_presence(
                receiver_start,
                start + merge_copy.end(1),
                before,
                scope,
                visiting,
            )
            argument_start = start + merge_copy.start(2)
            for span in split_arguments(
                self.lexed.code,
                argument_start,
                start + merge_copy.end(2),
            ):
                value = apply_field_effect(
                    value,
                    overlay_effect(
                        self._span_presence(*span, before, scope, visiting)
                    ),
                )
            return value
        container = root_literal_container(self.lexed, start, end, self.suffix)
        if container is not None: return self._members(*container, before, scope, visiting)
        builder = self._builder(start, end)
        if builder is not None: return builder
        arguments = self._arguments(start, end)
        if arguments is not None: return arguments
        binding = self._binding(start, end, scope, before)
        if binding is not None: return self.presence_for_binding(binding, before, scope)
        tokens = [token for token in self.lexed.strings if start <= token.start and token.end <= end]
        if len(tokens) == 1:
            serialized = self._serialized(tokens[0].contents)
            if serialized is not None: return serialized
        if (
            self.require_value
            and self.suffix == ".sh"
            and shell_jq_assignment_has_profile(self.lexed, start, end)
        ):
            return PRESENT_VALUE
        old = region_has_profile(self.lexed, start, end, serialized_assignment=True, allow_js_shorthand=self.suffix in self.JS_SUFFIXES) if self.require_value else region_has_message_body(self.lexed, start, end, self.suffix)
        return PRESENT_VALUE if old else MAYBE_VALUE

    def span_presence(self, start: int, end: int, before: int) -> Presence:
        return self._span_presence(start, end, before, self.source.scope_at(before))


def shell_static_key(source: str) -> str | None:
    key = source.strip()
    if len(key) >= 2 and key[0] == key[-1] and key[0] in {"'", '"'}:
        key = key[1:-1]
    return key if re.fullmatch(r"(?:[A-Za-z_]\w*|\d+)", key) else None


def shell_static_references(
    source: str,
) -> list[EndpointReference]:
    references: list[EndpointReference] = []
    for match in SHELL_STATIC_REFERENCE_RE.finditer(source):
        root = match.group(1) or match.group(3)
        key = shell_static_key(match.group(2)) if match.group(2) else None
        if match.group(2) and key is None:
            continue
        references.append((root, key) if key is not None else (root,))
    return references


def shell_member_assignments(
    lexed: LexedSource, before: int, suffix: str
) -> list[tuple[EndpointReference, int, int, int]]:
    pattern = re.compile(
        r"(?<![\w$])([A-Za-z_]\w*)\[\s*([^\]]+)\s*\]\s*=(?!=)"
    )
    assignments: list[tuple[EndpointReference, int, int, int]] = []
    for match in pattern.finditer(lexed.without_comments, 0, before):
        key = shell_static_key(match.group(2))
        if key is None:
            continue
        assignments.append(
            (
                (match.group(1), key),
                match.start(),
                match.end(),
                assignment_end(lexed, match.end(), suffix),
            )
        )
    return assignments


def shell_separator(lexed: LexedSource, offset: int) -> bool:
    character = lexed.code[offset]
    if character not in {"\n", ";", "&", "|"}:
        return False
    backslashes = 0
    cursor = offset - 1
    while cursor >= 0 and lexed.original[cursor] == "\\":
        backslashes += 1
        cursor -= 1
    return backslashes % 2 == 0


def shell_command_span(lexed: LexedSource, offset: int) -> tuple[int, int]:
    """Bound one shell command without merging adjacent curl payloads."""

    start = 0
    for index in range(offset - 1, -1, -1):
        if shell_separator(lexed, index):
            start = index + 1
            break
    end = len(lexed.original)
    for index in range(offset, len(lexed.code)):
        if shell_separator(lexed, index):
            end = index
            break
    return start, end


def shell_curl_is_command(
    lexed: LexedSource, command_start: int, curl_start: int
) -> bool:
    """Exclude prose/arguments containing the word curl without executing it."""

    prefix = lexed.original[command_start:curl_start].strip()
    if not prefix or prefix.endswith("$("):
        return True
    try:
        tokens = shlex.split(prefix, comments=True, posix=True)
    except ValueError:
        return False
    allowed = {
        "!", "command", "do", "elif", "env", "if", "then", "until", "while"
    }
    return all(
        token in allowed or SHELL_ASSIGNMENT_TOKEN_RE.fullmatch(token)
        for token in tokens
    )


def shell_curl_calls(lexed: LexedSource) -> list[Call]:
    calls: list[Call] = []
    seen: set[tuple[int, int]] = set()
    for match in SHELL_CURL_RE.finditer(lexed.code):
        start, end = shell_command_span(lexed, match.start(1))
        if not shell_curl_is_command(lexed, start, match.start(1)):
            continue
        if (start, end) not in seen:
            seen.add((start, end))
            calls.append(Call(start, start, end, parenthesized=False))
    return calls


def shell_curl_url_arguments(lexed: LexedSource, call: Call) -> list[str]:
    """Return curl URL arguments while excluding option values and payloads."""

    source = lexed.original[call.start:call.end]
    try:
        tokens = shlex.split(source, comments=True, posix=True)
    except ValueError:
        return []
    curl_index = next(
        (
            index
            for index, token in enumerate(tokens)
            if re.search(r"(?:^|[/$(])curl$", token)
        ),
        None,
    )
    if curl_index is None:
        return []

    candidates: list[str] = []
    index = curl_index + 1
    while index < len(tokens):
        token = tokens[index]
        option, separator, attached = token.partition("=")
        if separator and option in SHELL_CURL_VALUE_OPTIONS:
            if option in SHELL_CURL_URL_OPTIONS:
                candidates.append(attached)
            index += 1
            continue
        if token in SHELL_CURL_VALUE_OPTIONS:
            if index + 1 < len(tokens) and token in SHELL_CURL_URL_OPTIONS:
                candidates.append(tokens[index + 1])
            index += 2
            continue
        if any(
            token.startswith(short) and len(token) > len(short)
            for short in ("-A", "-d", "-H", "-o", "-u", "-w", "-X")
        ):
            index += 1
            continue
        if not token.startswith("-"):
            candidates.append(token)
        index += 1
    return candidates


def shell_curl_url_references(
    lexed: LexedSource, call: Call
) -> set[EndpointReference]:
    expanded: set[EndpointReference] = set()
    for match in SHELL_STATIC_REFERENCE_RE.finditer(
        lexed.original, call.start, call.end
    ):
        token = next(
            (
                candidate
                for candidate in lexed.strings
                if candidate.start <= match.start() < candidate.end
            ),
            None,
        )
        if token is not None and lexed.original[token.start] == "'":
            continue
        root = match.group(1) or match.group(3)
        key = shell_static_key(match.group(2)) if match.group(2) else None
        expanded.add((root, key) if key is not None else (root,))
    return {
        reference
        for candidate in shell_curl_url_arguments(lexed, call)
        for reference in shell_static_references(candidate)
        if reference in expanded
    }


def iter_source_files(project_root: Path):
    for directory, child_dirs, filenames in os.walk(project_root):
        child_dirs[:] = sorted(name for name in child_dirs if name not in EXCLUDED_DIRS)
        for filename in sorted(filenames):
            # Generated bundles are build OUTPUT, not source. The scanner and
            # both shell validators already exclude *.bundle.js / *.chunk.js /
            # *.min.css alongside *.min.js; skipping only *.min.js here meant a
            # stale webpack bundle carrying an old number-pool POST kept failing
            # `lint-telnyx-correctness.sh --product messaging` long after the
            # source was fixed, with no file the user could correct.
            if filename in EXCLUDED_FILES or filename.endswith(
                (".min.js", ".min.css", ".bundle.js", ".chunk.js")
            ):
                continue
            path = Path(directory, filename)
            suffix = path.suffix.lower()
            if suffix in INCLUDED_SUFFIXES or filename.lower() == "rakefile":
                yield path
            elif not suffix and shebang_suffix(path) is not None:
                yield path




# --- member-clearance net (proof-based; see member_net_contexts) ---

ASSIGNMENT_TARGET_RE = re.compile(
    r"(?<![\w$.>])(\$?[A-Za-z_]\w*)(?!\w)(?:\s*:[^=;\n]+)?\s*(?::=|=(?!=|>))"
)


MEMBER_ACCESS_AFTER_RE = re.compile(r"\s*(?:\?\.|\.)\s*([A-Za-z_]\w*)")


SUBSCRIPT_AFTER_RE = re.compile(r"\s*\[([^\[\]\n]*)\]")


CALL_AFTER_RE = re.compile(r"\s*\(")


IDENTIFIER_TOKEN_RE = re.compile(r"\$?[A-Za-z_]\w*")


RESERVED_TARGETS = frozenset(
    {"export", "default", "module", "exports", "return", "yield", "await",
     "typeof", "delete", "void", "new", "in", "of", "import", "case"}
)


def quoted_key_before(lexed: LexedSource, position: int) -> str | None:
    """Read back a masked quoted key ending immediately before `position`."""

    for token in reversed(lexed.strings):
        if token.end > position:
            continue
        if lexed.code[token.end : position].strip():
            return None
        key = token.contents
        return key if re.fullmatch(r"[A-Za-z_]\w*", key) else None
    return None


def literal_subscript_key(lexed: LexedSource, start: int, end: int) -> str | None:
    """Key of `obj[...]` when the subscript is a literal; None when dynamic."""

    region = lexed.code[start:end]
    numeric = re.fullmatch(r"\s*(\d+)\s*", region)
    if numeric is not None:
        # Normalize so sloppy-mode `[01]` compares equal to position 1.
        return str(int(numeric.group(1)))
    symbol = re.fullmatch(r"\s*:\s*([A-Za-z_]\w*)\s*", region)
    if symbol is not None:
        return symbol.group(1)
    if region.strip():
        return None
    tokens = [t for t in lexed.strings if start <= t.start and t.end <= end]
    if len(tokens) != 1:
        return None
    key = tokens[0].contents
    return key if re.fullmatch(r"[A-Za-z_]\w*", key) else None


def stored_member_key(lexed: LexedSource, token_start: int) -> str | None:
    """Mapping key a literal is stored under: `pool:`, `'pool':`, `=>` forms."""

    code = lexed.code
    end = token_start
    while end > 0 and code[end - 1].isspace():
        end -= 1
    # End-anchored searches only need a small window, not the whole prefix.
    window_start = max(0, end - 160)
    window = code[window_start:end]
    if window.endswith("=>"):
        symbol = re.search(r":([A-Za-z_]\w*)\s*$", window[:-2])
        if symbol is not None:
            return symbol.group(1)
        return quoted_key_before(lexed, end - 2)
    if window.endswith(":"):
        # Not a key when the colon belongs to a ternary (`cond ? x : "..."`).
        if re.search(r"\?[^:{,\n]*:$", window):
            return None
        identifier = re.search(r"(?<![\w$]):?([A-Za-z_]\w*)\s*:$", window)
        if identifier is not None:
            return identifier.group(1)
        return quoted_key_before(lexed, end - 1)
    return None


def container_is_file_private(
    lexed: LexedSource, assign_start: int, name: str, suffix: str, operator: str
) -> bool:
    """Whether the container provably cannot be referenced from another file.

    Clearing is only sound when every use is visible to this analysis, and
    this analysis reads one file. JS/TS module locals qualify unless exported.
    Go's `:=` declares a function local; anything else is package-visible
    across files. Python, Ruby and PHP top-level names are importable or
    global, so only indented (function-scoped) definitions qualify; Ruby
    constants (uppercase) never do.
    """

    line_start, _ = line_bounds(lexed.original, assign_start)
    line_prefix = lexed.code[line_start:assign_start]
    if suffix in JS_TS_SUFFIXES:
        return re.search(r"\bexport\b", line_prefix) is None
    if suffix == ".go":
        return operator == ":="
    if suffix in {".py", ".rb", ".php"}:
        if suffix == ".rb" and name[:1].isupper():
            return False
        # Indented (whitespace-only prefix) AND enclosed by a `def`, not a
        # `class` body — class attributes are reachable from other files.
        if line_prefix == "" or line_prefix.strip() != "":
            return False
        indent = len(line_prefix)
        position = line_bounds(lexed.original, assign_start)[0]
        while position > 0:
            position = lexed.original.rfind("\n", 0, position - 1) + 1
            line_end = lexed.original.find("\n", position)
            line = lexed.original[position : line_end if line_end >= 0 else None]
            stripped = line.strip()
            if not stripped or len(line) - len(line.lstrip()) >= indent:
                if position == 0:
                    break
                continue
            if suffix == ".php":
                return "function" in stripped
            return bool(re.match(r"(?:async\s+)?def\s", stripped))
        return False
    if suffix in {".cs", ".java"}:
        return (
            re.search(r"\b(?:public|protected|internal)\b", line_prefix)
            is None
        )
    return False


def assignment_index(
    lexed: LexedSource, suffix: str
) -> list[tuple[str, int, int, int]]:
    """Every assignment as (name, start, rhs_start, rhs_end), computed once.

    Per-token rescans of the file are what made an earlier attempt at this
    analysis quadratic; everything below reads this index instead.
    """

    entries = []
    for assignment in ASSIGNMENT_TARGET_RE.finditer(lexed.code):
        rhs_start = assignment.end()
        entries.append(
            (
                assignment.group(1),
                assignment.start(),
                rhs_start,
                assignment_end(lexed, rhs_start, suffix),
            )
        )
    return entries


def container_for_token(
    lexed: LexedSource,
    token: StringToken,
    suffix: str,
    assignments: list[tuple[str, int, int, int]],
    walkers: dict[int, list],
) -> tuple[str, list[str], tuple[int, int], str] | None:
    """(name, required key chain, definition span, operator) for `token`."""

    for name, start, rhs_start, rhs_end in reversed(assignments):
        if start >= token.start:
            continue
        if not (rhs_start <= token.start < rhs_end):
            continue
        # Incremental stack walker per RHS: path tokens arrive in ascending
        # order, so each RHS is walked once in total, not once per token —
        # a per-token walk made large single-container literals quadratic.
        walker = walkers.get(rhs_start)
        if walker is None:
            walker = [rhs_start, []]
            walkers[rhs_start] = walker
        position, stack = walker
        while position < token.start:
            character = lexed.code[position]
            if character in "([{":
                stack.append([character, position, 0])
            elif character in ")]}" and stack:
                stack.pop()
            elif character == "," and stack:
                stack[-1][2] += 1
            position += 1
        walker[0] = position
        if not stack:
            return None
        # Resolve the FULL key chain, outermost to innermost. Comparing only
        # the innermost key let a reference to an ancestor member count as
        # proof while handing out the object that contains the required path.
        chain: list[str] = []
        for level, (opener, opener_at, commas) in enumerate(stack):
            boundary = (
                stack[level + 1][1]
                if level + 1 < len(stack)
                else token.start
            )
            if opener == "{":
                key = stored_member_key(lexed, boundary)
            elif opener == "[":
                # PHP spells associative arrays with `[` — a `=>` key wins
                # over position.
                key = stored_member_key(lexed, boundary)
                if key is None:
                    key = str(commas)
            else:
                # A call such as Map.of(...) — not a literal this rule models.
                return None
            if key is None:
                return None
            chain.append(key)
        operator = lexed.code[max(0, rhs_start - 2) : rhs_start].strip()
        return name, chain, (start, rhs_end), operator
    return None


def access_chain_after(
    lexed: LexedSource, position: int
) -> tuple[list[str], bool, bool]:
    """Static keys accessed after an occurrence: (keys, resolvable, is_call)."""

    keys: list[str] = []
    code = lexed.code
    while True:
        member = MEMBER_ACCESS_AFTER_RE.match(code, position)
        if member is not None:
            keys.append(member.group(1))
            position = member.end()
            continue
        subscript = SUBSCRIPT_AFTER_RE.match(code, position)
        if subscript is not None:
            key = literal_subscript_key(
                lexed, subscript.start(1), subscript.end(1)
            )
            if key is None:
                return keys, False, False
            keys.append(key)
            position = subscript.end()
            continue
        break
    return keys, True, CALL_AFTER_RE.match(code, position) is not None


def identifier_occurrences(lexed: LexedSource) -> dict[str, list[int]]:
    """Map identifier -> end offsets of its standalone occurrences in code.

    One pass per file; per-token lookups replace whole-file rescans (the
    quadratic trap an earlier attempt fell into).
    """

    positions: dict[str, list[int]] = {}
    dotted: dict[str, list[int]] = {}
    for match in IDENTIFIER_TOKEN_RE.finditer(lexed.code):
        before = lexed.code[match.start() - 1] if match.start() else " "
        if before == ".":
            # Reached through a property path (`globalThis.x`, `Config.x`,
            # `...x` spread) — a use this rule cannot align, NOT an ignorable
            # one. Skipping these silently is how a container escaped once.
            dotted.setdefault(match.group(0), []).append(match.start())
            continue
        if before == "$" or before.isalnum() or before == "_":
            continue
        positions.setdefault(match.group(0), []).append(match.start())
    return positions, dotted


def masked_identifier_names(lexed: LexedSource) -> dict[str, list[int]]:
    """Identifiers inside strings or comments (unreadable uses), by position."""

    names: dict[str, list[int]] = {}
    for match in IDENTIFIER_TOKEN_RE.finditer(lexed.original):
        if lexed.code[match.start()] != lexed.original[match.start()]:
            names.setdefault(match.group(0), []).append(match.start())
    return names


def member_accesses_prove_unused(
    lexed: LexedSource,
    offset: int,
    suffix: str,
    assignments: list[tuple[str, int, int, int]],
    occurrences: dict[str, list[int]],
    masked_names: set[str],
    dotted_names: set[str],
    walkers: dict[int, list],
    reference_cache: dict[str, tuple[bool, bool, list[list[str]]]],
) -> bool:
    token = next(
        (t for t in lexed.strings if t.start <= offset < t.end), None
    )
    if token is None:
        return False
    resolved = container_for_token(lexed, token, suffix, assignments, walkers)
    if resolved is None:
        return False
    name, required_chain, definition, operator = resolved
    if not container_is_file_private(
        lexed, definition[0], name, suffix, operator
    ):
        return False

    summary = reference_cache.get(name)
    if summary is None:
        names = {name}
        skip_spans = [definition]
        for alias, start, rhs_start, rhs_end in assignments:
            alias_of = lexed.code[rhs_start:rhs_end].strip()
            if (
                alias_of == name
                and alias != name
                and alias.lstrip("$") not in RESERVED_TARGETS
            ):
                names.add(alias)
                skip_spans.append((start, rhs_end))
        # Unreadable uses — via a property path, or mentioned inside a string
        # or comment (template literals, exports lists) — forbid proof.
        readable = not any(
            n in dotted_names or n in masked_names for n in names
        )
        chains: list[list[str]] = []
        proved = False
        if readable:
            for n in sorted(names):
                for start in occurrences.get(n, ()):
                    if any(s <= start < e for s, e in skip_spans):
                        continue
                    keys, resolvable, is_call = access_chain_after(
                        lexed, start + len(n)
                    )
                    if not resolvable or not keys or is_call:
                        readable = False
                        break
                    chains.append(keys)
                    proved = True
                if not readable:
                    break
        summary = (readable, proved, chains)
        reference_cache[name] = summary

    readable, proved, chains = summary
    if not readable or not proved:
        return False
    for chain in chains:
        # A reference conflicts when it agrees with the required chain for
        # its whole shared prefix: it reaches the required member or an
        # ancestor holding it. Only a divergent chain is proof of non-use.
        shared = min(len(chain), len(required_chain))
        if chain[:shared] == required_chain[:shared]:
            return False
    return True



DESTRUCTURE_LHS_RE = re.compile(r"[}\]]\s*$")



def safe_literal_span(
    lexed: LexedSource,
    rhs_from: int,
    rhs_to: int,
    suffix: str,
    assignments: list[tuple[str, int, int, int]],
) -> bool:
    """Whether an assignment RHS is provably free of required paths.

    Accepts a single string literal, or a bare variable whose own latest
    assignment is such a literal (one indirection, no recursion)."""

    tokens = [
        t for t in lexed.strings
        if rhs_from <= t.start and t.end <= rhs_to
    ]
    remainder = lexed.code[rhs_from:rhs_to].strip()
    if len(tokens) == 1 and not remainder:
        return not MEMBER_NET_PATH_RE.search(tokens[0].contents)
    if tokens:
        return False
    variable = re.fullmatch(r"\$?[A-Za-z_]\w*", remainder.rstrip(";").strip())
    if variable is None:
        return False
    latest = None
    for a_name, a_start, a_rhs_start, a_rhs_end in assignments:
        if a_name == variable.group(0) and a_rhs_start < rhs_from:
            latest = (a_rhs_start, a_rhs_end)
    if latest is None:
        return False
    inner = [
        t for t in lexed.strings
        if latest[0] <= t.start and t.end <= latest[1]
    ]
    if len(inner) != 1 or lexed.code[latest[0]:latest[1]].strip():
        return False
    return not MEMBER_NET_PATH_RE.search(inner[0].contents)


def build_binding_index(
    lexed: LexedSource,
    suffix: str,
    assignments: list[tuple[str, int, int, int]],
) -> dict:
    """Once-per-file maps the per-container summary builder reads: binding
    positions per name (pattern keys excluded) and bare-name RHS aliases."""

    own: dict[str, list[int]] = {}
    bare_rhs: dict[str, list[tuple[str, int, int]]] = {}
    for alias, start, rhs_start, rhs_end in assignments:
        before = start
        while before > 0 and lexed.code[before - 1] in " \t":
            before -= 1
        if (
            before > 0
            and lexed.code[before - 1] in "{,("
            and ":" in lexed.code[start:rhs_start]
        ):
            continue
        own.setdefault(alias, []).append(start)
        alias_of = lexed.code[rhs_start:rhs_end].strip()
        if re.fullmatch(r"\$?[A-Za-z_]\w*;?", alias_of):
            bare_rhs.setdefault(alias_of.rstrip(";"), []).append(
                (alias, start, rhs_end)
            )
    return {"own": own, "bare_rhs": bare_rhs}

def build_container_summary(
    lexed: LexedSource,
    name: str,
    definition: tuple[int, int],
    suffix: str,
    assignments: list[tuple[str, int, int, int]],
    binding_index: dict,
    occurrences: dict[str, list[int]],
    masked_names: set[str],
    dotted_names: set[str],
    evaluated_spans: list[tuple[int, int]],
    flagged_spans: list[tuple[int, int]],
) -> dict:
    """Chain-independent reference summary for one container, built once.

    Per-token work then reduces to prefix checks against an index keyed by
    each reference chain's first element — the per-token full rescans of an
    earlier version were quadratic on large containers."""

    names = {name}
    skip_spans = [definition]
    own_assignments = binding_index["own"]
    for alias, start, rhs_end in binding_index["bare_rhs"].get(name, ()):
        if alias != name and alias.lstrip("$") not in RESERVED_TARGETS:
            names.add(alias)
            skip_spans.append((start, rhs_end))

    summary = {
        "ok": True,
        "had_skipped": False,
        "proved_any": False,
        "by_first": {},
        "destructured": [],
        "kills": [],
    }

    def flagged_has(word: str) -> bool:
        ref = re.compile(rf"(?<![\w$.]){re.escape(word)}(?!\w)")
        return any(ref.search(lexed.code, fs, fe) for fs, fe in flagged_spans)

    def evaluated_has(word: str) -> bool:
        ref = re.compile(rf"(?<![\w$.]){re.escape(word)}(?!\w)")
        return any(
            ref.search(lexed.code, es, ee) for es, ee in evaluated_spans
        )

    unreadable = [n for n in names if n in dotted_names or n in masked_names]
    for n in unreadable:
        spots = list(masked_names.get(n, ())) + list(dotted_names.get(n, ()))
        for spot in spots:
            if any(ds <= spot < de for ds, de in skip_spans):
                continue
            covering = None
            for a_name, a_start, a_rhs_start, a_rhs_end in assignments:
                if a_rhs_start <= spot < a_rhs_end:
                    covering = a_name
                    break
            if covering is None or not flagged_has(covering):
                summary["ok"] = False
                return summary
        summary["had_skipped"] = True

    for n in sorted(names):
        for start in occurrences.get(n, ()):
            if any(ds <= start < de for ds, de in skip_spans):
                continue
            nearest = None
            for a_start in own_assignments.get(n, ()):
                if a_start <= start:
                    nearest = a_start if nearest is None else max(
                        nearest, a_start
                    )
            if nearest is not None and all(
                nearest != ds for ds, _de in skip_spans
            ):
                summary["had_skipped"] = True
                continue
            end = start + len(n)
            keys, resolvable, is_call = access_chain_after(lexed, end)
            in_evaluated = any(
                es <= start < ee for es, ee in evaluated_spans
            )
            if not resolvable:
                if in_evaluated:
                    # Dynamic keys inside evaluated calls are the resolver's
                    # corpus-pinned domain.
                    summary["had_skipped"] = True
                    continue
                # A dynamic key handed to code the resolver never judged can
                # reach the required member — no proof.
                summary["ok"] = False
                return summary
            if not keys:
                prefix_end = start
                while prefix_end > 0 and lexed.code[prefix_end - 1] in " \t":
                    prefix_end -= 1
                if lexed.code[max(0, prefix_end - 1):prefix_end] == "=":
                    lhs_close = prefix_end - 1
                    while lhs_close > 0 and lexed.code[lhs_close - 1] in " \t":
                        lhs_close -= 1
                    if lexed.code[lhs_close - 1:lhs_close] in "}]":
                        opener = {"}": "{", "]": "["}[
                            lexed.code[lhs_close - 1]
                        ]
                        depth = 0
                        lhs_open = -1
                        for pos in range(lhs_close - 1, -1, -1):
                            ch = lexed.code[pos]
                            if ch in ")]}":
                                depth += 1
                            elif ch in "([{":
                                depth -= 1
                                if depth == 0 and ch == opener:
                                    lhs_open = pos
                                    break
                        if lhs_open >= 0:
                            pattern = lexed.code[lhs_open:lhs_close]
                            source_pattern = lexed.original[
                                lhs_open:lhs_close
                            ]
                            if "..." in pattern or "**" in pattern:
                                # Rest elements can bind the required
                                # member invisibly.
                                summary["ok"] = False
                                return summary
                            if opener == "[":
                                # Array patterns bind by position — the
                                # resolver's corpus tracks them end to end.
                                summary["had_skipped"] = True
                                continue
                            if "[" in pattern[1:]:
                                # Computed property names in an object
                                # pattern can bind the required member
                                # invisibly.
                                summary["ok"] = False
                                return summary
                            words = set(
                                re.findall(
                                    r"[A-Za-z_]\w*", source_pattern
                                )
                            )
                            covered = any(
                                flagged_has(w) for w in words
                            )
                            summary["destructured"].append(
                                (frozenset(words), covered)
                            )
                            summary["proved_any"] = True
                            continue
                depth = 0
                callee = None
                for pos in range(start - 1, -1, -1):
                    ch = lexed.code[pos]
                    if ch in ")]}":
                        depth += 1
                    elif ch in "([{":
                        if depth == 0:
                            if ch == "(":
                                callee = re.search(
                                    r"([A-Za-z_$][\w$]*)\s*$",
                                    lexed.code[max(0, pos - 60):pos],
                                )
                            break
                        depth -= 1
                if callee is not None and callee.group(1) in {
                    "axios", "fetch", "request", "post",
                }:
                    summary["had_skipped"] = True
                    continue
                summary["ok"] = False
                return summary
            if is_call:
                summary["ok"] = False
                return summary
            entry = {
                "start": start,
                "keys": keys,
                "in_evaluated": in_evaluated,
                "flag_covered": any(
                    fs <= start < fe for fs, fe in flagged_spans
                ),
                "alias_covered": False,
                "alias_evaluated": False,
                "kill": None,
            }
            enclosing_alias = None
            for a_name, a_start, a_rhs_start, a_rhs_end in assignments:
                if a_rhs_start <= start < a_rhs_end:
                    enclosing_alias = a_name
                    break
            if enclosing_alias is not None:
                entry["alias_covered"] = flagged_has(enclosing_alias)
                entry["alias_evaluated"] = evaluated_has(enclosing_alias)
            m = re.match(
                r"(?:\s*(?:\?\.|\.)\s*[A-Za-z_]\w*|"
                r"\s*\[[^\[\]\n]*\])*",
                lexed.code[end:],
            )
            chain_end = end + (m.end() if m else 0)
            write = re.match(r"\s*=(?!=)", lexed.code[chain_end:])
            if write is not None:
                rhs_from = chain_end + write.end()
                rhs_to = assignment_end(lexed, rhs_from, suffix)
                open_braces: list[int] = []
                for position in range(definition[1], start):
                    character = lexed.code[position]
                    if character in "([{":
                        open_braces.append(position)
                    elif character in ")]}" and open_braces:
                        open_braces.pop()
                # A bare statement block always executes, so a kill inside it
                # dominates; a block belonging to if/else/loop/switch/catch is
                # conditional and proves nothing about the send's path.
                conditional = False
                for brace_at in open_braces:
                    if lexed.code[brace_at] != "{":
                        conditional = True
                        break
                    before = brace_at
                    while before > 0 and lexed.code[before - 1].isspace():
                        before -= 1
                    if lexed.code[before - 1 : before] == ")":
                        conditional = True
                        break
                    word = re.search(
                        r"([A-Za-z_]\w*)\s*$", lexed.code[:before]
                    )
                    if word is not None and word.group(1) in {
                        "else", "do", "case", "default", "finally",
                    }:
                        conditional = True
                        break
                if not conditional and safe_literal_span(
                    lexed, rhs_from, rhs_to, suffix, assignments
                ):
                    entry["kill"] = chain_end
            summary["by_first"].setdefault(keys[0], []).append(entry)
    return summary


def member_net_proves_unused(
    lexed: LexedSource,
    resolved: tuple,
    suffix: str,
    summary: dict,
) -> bool:
    name, required_chain, definition, operator = resolved
    if not summary["ok"]:
        return False
    private = container_is_file_private(
        lexed, definition[0], name, suffix, operator
    )
    required_key = required_chain[-1] if required_chain else None
    for words, covered in summary["destructured"]:
        if required_key in words and not covered:
            return False
    had_skipped = summary["had_skipped"] or bool(summary["destructured"])
    proved = summary["proved_any"]
    kill_at = None
    conflicts = []
    for entry in summary["by_first"].get(required_chain[0], []):
        keys = entry["keys"]
        shared = min(len(keys), len(required_chain))
        if keys[:shared] != required_chain[:shared]:
            proved = True
            continue
        if entry["in_evaluated"] and entry["start"] >= definition[1]:
            had_skipped = True
            continue
        if (
            entry["kill"] is not None
            and len(keys) == len(required_chain)
        ):
            kill_at = entry["kill"]
            proved = True
            continue
        if entry["flag_covered"] or entry["alias_covered"]:
            had_skipped = True
            continue
        conflicts.append(entry["start"])
    for first, entries in summary["by_first"].items():
        if first == required_chain[0]:
            continue
        for entry in entries:
            if entry["in_evaluated"] and entry["start"] >= definition[1]:
                had_skipped = True
            elif entry["alias_evaluated"]:
                had_skipped = True
            else:
                proved = True
    if conflicts:
        if kill_at is None:
            return False
        if any(c < kill_at for c in conflicts):
            return False
    if proved:
        return private
    return True if had_skipped else private

MEMBER_NET_PATH_RE = re.compile(
    # A leading slash, or a relative path at the very start of a string
    # literal (base-URL clients pass "messages/number_pool").
    r"(?:/|(?<=['\"`]))(?:v2/)?messages/"
    r"(?:number_pool|alphanumeric_sender_id)\b"
)


def member_net_contexts(
    lexed: LexedSource,
    suffix: str,
    evaluated_spans: list[tuple[int, int]],
    flagged_spans: list[tuple[int, int]],
) -> list[Call]:
    """Literal-driven safety net over the call-centric analysis.

    The resolver only judges recognized calls, so a required path that never
    flows into one (helper parameters, exports, spreads, dynamic keys,
    cross-file definitions) would otherwise vanish. Every required-path
    literal held in a CONTAINER MEMBER outside the evaluated call spans is
    flagged at its definition unless member-access analysis PROVES the member
    is unused in this file, or the resolver already flagged a call that
    references the container (reporting the definition too would be noise).
    """

    contexts: list[Call] = []
    assignments = None
    occurrences: dict[str, list[int]] = {}
    dotted: set[str] = set()
    masked: set[str] = set()
    walkers: dict[int, list] = {}
    cache: dict[str, tuple[bool, bool, list[list[str]]]] = {}
    for match in MEMBER_NET_PATH_RE.finditer(lexed.without_comments):
        if any(s <= match.start() < e for s, e in evaluated_spans):
            continue
        if assignments is None:
            assignments = assignment_index(lexed, suffix)
            binding_index = build_binding_index(lexed, suffix, assignments)
            occurrences, dotted = identifier_occurrences(lexed)
            masked = masked_identifier_names(lexed)
        token = next(
            (t for t in lexed.strings if t.start <= match.start() < t.end),
            None,
        )
        if token is None:
            continue
        tail = token.contents.rstrip("/")
        if not (
            required_endpoint(token.contents)
            or tail.endswith("messages/number_pool")
            or tail.endswith("messages/alphanumeric_sender_id")
            # A URL builder splits the path, so the literal may be only a
            # fragment ("%snumber_pool"). Accept the distinctive segment, but
            # ONLY for a URL-shaped token - prose that merely mentions the path
            # contains whitespace and must not be treated as an endpoint.
            or (
                not re.search(r"\s", tail)
                and re.search(r"(?:number_pool|alphanumeric_sender_id)\b", tail)
            )
        ):
            # The literal merely MENTIONS a required path (prose, docs);
            # it is not itself an endpoint value.
            continue
        resolved = container_for_token(
            lexed, token, suffix, assignments, walkers
        )
        if resolved is None:
            # Plain variables and direct arguments are the resolver's tested
            # domain; the net only covers container members, which the
            # call-centric analysis never evaluates.
            continue
        name = resolved[0]
        summary = cache.get(name)
        if summary is None:
            summary = build_container_summary(
                lexed, name, resolved[2], suffix, assignments,
                binding_index, occurrences, masked, dotted,
                evaluated_spans, flagged_spans,
            )
            cache[name] = summary
        if member_net_proves_unused(lexed, resolved, suffix, summary):
            continue
        if suffix == ".sh":
            start, end = shell_command_span(lexed, match.start())
        else:
            start, end = resolved[2]
        contexts.append(Call(start, start, end, parenthesized=False))
    return contexts


# A send is only exempt from the profile requirement when it is provably NOT a
# mutating request. These are the spellings that prove it.
def required_path_tokens(lexed: LexedSource) -> list[StringToken]:
    """Return every string literal that IS a required endpoint value.

    Prose that merely mentions the path is excluded: an endpoint literal has no
    whitespace and either resolves as a required endpoint or ends with the
    required path segment.
    """
    found: list[StringToken] = []
    for match in MEMBER_NET_PATH_RE.finditer(lexed.without_comments):
        token = next(
            (t for t in lexed.strings if t.start <= match.start() < t.end), None
        )
        if token is None or any(t.start == token.start for t in found):
            continue
        tail = token.contents.rstrip("/")
        if re.search(r"\s", tail):
            continue
        template_endpoint = re.fullmatch(
            r"(?:\$\{[^{}\s]+\}|#\{[^{}\s]+\}|\{[^{}\s]+\})"
            r"(?:/v2)?/messages/(?:number_pool|alphanumeric_sender_id)/?"
            r"(?:[?#][^\s]*)?",
            tail,
        )
        if required_endpoint(token.contents) or template_endpoint:
            found.append(token)
    return found


def _tokens_in_span(
    lexed: LexedSource, span: tuple[int, int]
) -> set[tuple[int, int]]:
    return {
        (t.start, t.end)
        for t in lexed.strings
        if span[0] <= t.start and t.end <= span[1]
    }


def consumed_endpoint_tokens(
    lexed: LexedSource, call: Call, suffix: str
) -> set[tuple[int, int]]:
    """Return the endpoint literals this call's URL resolution actually USED.

    PROVENANCE, not proximity. A literal counts as accounted-for only when the
    analyzer consumed it while resolving THIS call's endpoint - directly as the
    URL expression, or indirectly through the binding the URL expression names.
    Two sends in one file therefore consume their own literals independently,
    and a recognised send can never account for a different, unrecognised one.
    """
    consumed: set[tuple[int, int]] = set()
    if suffix == ".sh":
        # Shell curl resolves URLs from word-split tokens rather than spans, so
        # the call's own text plus any variable it dereferences is the region.
        consumed |= _tokens_in_span(lexed, (call.start, call.end))
        for name in set(re.findall(r"\$\{?([A-Za-z_]\w*)", lexed.original[call.start:call.end])):
            for form in (f"${name}", name):
                for match in assignment_matches(lexed.code, form, call.end):
                    rhs = match.end()
                    consumed |= _tokens_in_span(
                        lexed, (rhs, assignment_end(lexed, rhs, suffix))
                    )
        return consumed

    # An ANALYSED call consumes the endpoint literals of its own statement even
    # when it is ultimately dismissed (a GET, or a request object that is never
    # executed). The analyzer examined those literals and reached a verdict, so
    # they are accounted for - "analysed and rejected" is not "never analysed",
    # and only the latter is unresolved.
    # Consumption is therefore per ENCLOSING STATEMENT, not per call span: a
    # builder chain puts the URL literal outside the span of the call that was
    # analysed (HttpRequest.newBuilder().uri(URI.create(URL)).POST(...)), so a
    # span-only check re-reported a send the analyser had already resolved.
    statement_start = max(
        lexed.code.rfind(";", 0, call.start),
        chain_newline_boundary(lexed.code, call.start),
        lexed.code.rfind("{", 0, call.start),
    ) + 1
    statement_end = call.end
    for terminator in (";", "\n"):
        found = lexed.code.find(terminator, call.end)
        if found > 0:
            # Forward mirror of `chain_newline_boundary`: a wrapped chain's
            # remaining links belong to the same statement, so a newline the
            # chain continues across is not the end of it.
            while (
                terminator == "\n"
                and found > 0
                and newline_continues_chain(lexed.code, found)
            ):
                nxt = lexed.code.find("\n", found + 1)
                if nxt < 0:
                    found = len(lexed.code)
                    break
                found = nxt
            statement_end = max(statement_end, found)
            break
    consumed |= _tokens_in_span(lexed, (statement_start, statement_end))

    for span in request_url_spans(lexed, call, suffix):
        consumed |= _tokens_in_span(lexed, span)
        # Follow the alias chain the resolver itself walked. The endpoint is
        # often held one or more hops away - `url = routes.get("pool")` where
        # `routes` is a Map.of/dict/array literal - so stopping at the first hop
        # left the real literal looking unconsumed and reported it as
        # unresolved. Bounded to keep this linear and cycle-free.
        pending = [lexed.code[span[0]:span[1]].strip()]
        seen: set[str] = set()
        for _ in range(4):
            names: list[str] = []
            for text in pending:
                for name in re.findall(r"\$?[A-Za-z_]\w*", text):
                    if name not in seen:
                        seen.add(name)
                        names.append(name)
            if not names:
                break
            pending = []
            for name in names:
                for form in {name, name.lstrip("$")}:
                    for match in assignment_matches(lexed.code, form, call.end):
                        rhs = match.end()
                        end = assignment_end(lexed, rhs, suffix)
                        consumed |= _tokens_in_span(lexed, (rhs, end))
                        pending.append(lexed.code[rhs:end])
    return consumed


def unresolved_endpoint_tokens(
    lexed: LexedSource,
    suffix: str,
    analysed_calls: list[Call],
) -> list[StringToken]:
    """Return required endpoints that NO analysed send accounted for.

    These are reported as "could not verify" - a distinct outcome from "missing
    profile". The analyzer recognised a required endpoint in the source but was
    unable to attribute it to a send it understands, so it must not certify the
    file either way.
    """
    consumed: set[tuple[int, int]] = set()
    for call in analysed_calls:
        tokens = consumed_endpoint_tokens(lexed, call, suffix)
        if tokens:
            consumed |= tokens
    candidates = [
        token
        for token in required_path_tokens(lexed)
        if (token.start, token.end) not in consumed
        and _looks_like_a_send_target(lexed, token, suffix)
    ]
    # Never use one call as a positional "budget" for an unrelated literal.
    # Only provenance from that exact call may consume a candidate endpoint.
    return candidates


# A required path can appear WITHOUT being a request target: as a curl -d body,
# in a header value, or in prose (`echo curl "$url"`). Those are not sends and
# reporting them blocks valid code, so an unconsumed literal is only actionable
# when it is used somewhere that looks like a request.
_SEND_SITE_RE = re.compile(
    # NOT preceded by a word character - the same guard the read-verb regex
    # below already carries. Without it `isOpen ` matches the `open`
    # alternative and `recall ` matches `call `, so an ordinary declaration
    # looks like a send. `do` is restricted to `do(` (Go's `client.Do(req)`)
    # because bare `do ` matches the English word in a trailing comment.
    r"(?<![A-Za-z0-9_])"
    r"(?:(?:post|put|patch|send|transmit|request|fetch|execute|dispatch|submit"
    r"|invoke|call|open|urlopen|curl)\s*(?:\(|\s)"
    r"|do\s*\()",
    re.I,
)
_ENDPOINT_KEY_RE = re.compile(
    r"(?:url|uri|endpoint|href|target|address)\s*[:=]\s*$", re.I
)


# A literal sitting under a NON-URL key is payload, headers or metadata - not an
# endpoint - even when the enclosing line is a real send to a DIFFERENT endpoint.
_NON_URL_KEY_RE = re.compile(
    r"(?:data|body|json|header|headers|metadata|meta|audit|params|query|form"
    r"|note|comment|description|payload|options|context|extra|tags)"
    r"\s*[:=]\s*$",
    re.I,
)


_ANY_KEY_RE = re.compile(
    r"""(?:['"`]?)(\w+)(?:['"`]?)\s*(?::|=>)\s*$"""
)


def _under_non_url_key(prefix: str) -> bool:
    """Return whether the literal sits under a key that is not an endpoint.

    Inverted deliberately: if the literal has ANY immediately-preceding object
    key, that key must be URL-like. A decoy under `audit:`, a route table under
    `pool:`, or a payload under `data:` are all non-endpoints, and enumerating
    only the bad names would leave every unlisted key looking like a send.
    A POSITIONAL literal (no key) keeps its normal treatment.
    """
    stripped = prefix.rstrip()[-80:]
    if _ENDPOINT_KEY_RE.search(stripped):
        return False
    return _ANY_KEY_RE.search(stripped) is not None


# The verb of the call that ENCLOSES the literal, split off its receiver. The
# line-anchored `echo|printf|print|console.log` test only sees a display command
# that starts the line, so `console.error(...)`, `logger.info(...)`,
# `fmt.Printf(...)`, `var_dump(...)` and a mid-line `echo` all read as sends.
_DISPLAY_VERB_RE = re.compile(
    r"^(?:echo|puts|write_?line|[sf]?print(?:f|ln|_r)?|printStackTrace"
    r"|var_dump|var_export|dump|inspect"
    r"|log|logf|logln|debug|info|warn|warnf|warning|error|errorf|fatal|fatalf"
    r"|trace|critical|exception)$",
    re.I,
)
# A string INSPECTION is not a transport. `url.endswith(URL)` reaches the
# fluent-client catch-all otherwise, because the literal is an argument of a
# call like any other.
_INSPECTION_VERB_RE = re.compile(
    r"^(?:ends?_?with|starts?_?with|includes|contains|str_?contains"
    r"|index_?of|last_?index_?of|strpos|strcmp"
    r"|match|matches|search|test|replace|replace_?all|split"
    r"|equals|equals_?ignore_?case|compare|compare_?to"
    r"|substr|substring|slice|trim)$",
    re.I,
)
# `if (url === URL)` is a comparison, not a call - but the catch-all only asks
# whether a `(` precedes the literal and a `,` or `)` follows it.
_NOT_A_CALL_VERB_RE = re.compile(
    r"^(?:if|elif|elsif|while|switch|for|foreach|when|unless|until|case"
    r"|catch|except|with|return|and|or|not|in|is)$",
    re.I,
)
_READ_VERB_RE = re.compile(
    r"^(?:get|head|options|read|download|list|find|query)(?:Async)?$", re.I
)
_ASSERTION_VERB_RE = re.compile(
    r"^(?:expect|assert\w*|should|toBe|toEqual|toHaveBeenCalledWith"
    r"|assertEqual|assertIn|is_expected)$",
    re.I,
)
# A display STATEMENT has no parentheses to enclose the literal: `<?php echo
# "$url"`, `then echo "$url"`.
_DISPLAY_STATEMENT_RE = re.compile(
    # The tail must not cross a call or a command separator: `echo start; curl
    # -X POST "$URL"` is a SEND, and letting `echo` reach across the `;` would
    # excuse it.
    r"(?:^|[;&|`>{}\s])(?:echo|print|print_r|var_dump|var_export|puts|printf)"
    r"\s+[^()\n;&|]*$",
    re.I,
)

_CALLEE_SPLIT_RE = re.compile(r"\s*(?:->|::|\?\.|\.)\s*")
_CALLEE_TAIL_RE = re.compile(
    r"[A-Za-z_$][\w$]*(?:\s*(?:->|::|\?\.|\.)\s*[A-Za-z_$][\w$]*)*$"
)


def _enclosing_call_verbs(lexed: LexedSource, position: int) -> list[str]:
    """Return innermost-to-outermost unclosed call verbs at `position`."""

    window_start = max(0, position - 600)
    prefix = lexed.code[window_start:position]
    depth = 0
    verbs: list[str] = []
    for index in range(len(prefix) - 1, -1, -1):
        char = prefix[index]
        if char in ")]}":
            depth += 1
        elif char in "([{":
            if depth:
                depth -= 1
                continue
            if char != "(":
                continue
            head = lexed.original[window_start:window_start + index].rstrip()
            match = _CALLEE_TAIL_RE.search(head)
            if match is not None:
                verbs.append(_CALLEE_SPLIT_RE.split(match.group(0))[-1])
    return verbs


def _enclosing_call_verb(lexed: LexedSource, position: int) -> str:
    """Return the verb of the innermost unclosed CALL enclosing `position`.

    Scans the blanked source backwards so brackets inside strings and comments
    cannot unbalance the walk. Returns "" when the innermost enclosure is an
    object/array literal rather than a call, or when there is no enclosure.
    """
    window_start = max(0, position - 600)
    prefix = lexed.code[window_start:position]
    depth = 0
    for index in range(len(prefix) - 1, -1, -1):
        char = prefix[index]
        if char in ")]}":
            depth += 1
        elif char in "([{":
            if depth:
                depth -= 1
                continue
            if char != "(":
                return ""
            head = lexed.original[window_start:window_start + index].rstrip()
            match = _CALLEE_TAIL_RE.search(head)
            if match is None:
                return ""
            return _CALLEE_SPLIT_RE.split(match.group(0))[-1]
    return ""


def _is_display_or_inspection(lexed: LexedSource, position: int, prefix: str) -> bool:
    """Return whether the literal is shown, compared or inspected, not sent."""
    verb = _enclosing_call_verb(lexed, position)
    if verb and (
        _DISPLAY_VERB_RE.match(verb)
        or _INSPECTION_VERB_RE.match(verb)
        or _NOT_A_CALL_VERB_RE.match(verb)
    ):
        return True
    return _DISPLAY_STATEMENT_RE.search(prefix) is not None


def _is_standalone_binding(lexed: LexedSource, token: StringToken) -> bool:
    """Return whether the literal is a statement-level `NAME = "..."` binding.

    A binding stands alone when nothing on its line opens a call, an object or
    an array around it - `export const POOL_URL = "..."`, `POOL_URL="..."`,
    `const NumberPoolURL = "..."`. A MEMBER (`{endpoint: "..."}`, `url="..."`
    inside a call) always sits within an opener, on its line or an earlier one,
    and a member separator is `:`/`=>`, never a bare `=`.
    """
    line_start = lexed.code.rfind("\n", 0, token.start) + 1
    declaration = lexed.code[line_start:token.start]
    if any(bracket in declaration for bracket in "([{,"):
        return False
    return re.search(r"(?<![=!<>])=\s*$", declaration) is not None


def _looks_like_a_send_target(
    lexed: LexedSource, token: StringToken, suffix: str
) -> bool:
    """Return whether an unconsumed endpoint literal is plausibly a request."""
    # A ROUTE TABLE is data, not a send. `Map.of("pool", URL)`, `{pool: URL}`,
    # `["...URL"]` assigned to a name are declarations; the send happens where
    # the table is READ, and that site is judged on its own. Reporting the
    # declaration duplicates the real send and contradicts the documented scope
    # boundary for computed/interprocedural lookups.
    line_start_decl = lexed.code.rfind("\n", 0, token.start) + 1
    declaration = lexed.original[line_start_decl:token.start]
    # A class/package constant is a declaration, not a send. Braces from the
    # surrounding class made _is_standalone_binding reject Java/C# fields, so a
    # compliant cross-file consumer was still accompanied by an unverifiable
    # finding on the constant definition itself. The imported use site is now
    # judged (or failed closed) independently.
    if re.search(
        r"(?:\bstatic[ \t]+final"
        r"|\b(?:public|private|protected|internal)[ \t]+const"
        r"|\b(?:public|private|protected|internal)?[ \t]*static[ \t]+readonly)"
        r"[ \t]+[A-Za-z_$][\w$<>,.?\[\]]*[ \t]+"
        r"[A-Za-z_$][\w$]*[ \t]*=[ \t]*$",
        declaration,
        re.I,
    ) and _SEND_SITE_RE.search(declaration) is None:
        return False
    if re.search(
        r"(?:=|:=)\s*(?:new\s+\w+[^=]*)?(?:Map\s*\.\s*of|List\s*\.\s*of"
        r"|Arrays\s*\.\s*asList|array|dict|\{|\[|\()",
        declaration,
    ) and not _SEND_SITE_RE.search(declaration):
        return False

    prefix = lexed.original[max(0, token.start - 120):token.start]
    if _under_non_url_key(prefix):
        return False
    key = _ENDPOINT_KEY_RE.search(prefix.rstrip()[-60:])
    if key is not None:
        name = re.search(r"([A-Za-z_]\w*)\s*[:=]\s*$", prefix.rstrip())
        if name is None:
            return True
        # An endpoint-named MEMBER (`endpoint: "..."`) sits inside the call that
        # would send it. An endpoint-named VARIABLE does not - it must still be
        # used somewhere that looks like a request, or it is just a constant
        # that happens to be printed or documented.
        references = [
            match
            for match in re.finditer(
                rf"(?<![\w$])\$?\{{?{re.escape(name.group(1))}(?![\w])",
                lexed.original,
            )
            if match.start() > token.end
        ]
        if not references:
            # NO use of the binding in this file. A MEMBER is still a send: the
            # call that would send it is the one it sits inside. A standalone
            # BINDING is not - an endpoint constants module exports the URL and
            # the request lives in another file, where it is judged on its own.
            # Reporting the declaration instead blocks the most common correct
            # layout in a migrated project.
            return not _is_standalone_binding(lexed, token)
        for match in references:
            start = lexed.original.rfind("\n", 0, match.start()) + 1
            stop = lexed.original.find("\n", match.end())
            line = lexed.original[start:stop if stop > 0 else len(lexed.original)]
            if re.match(
                r"\s*(?:echo|printf|print|console\s*\.\s*log|#|//)\b", line
            ) or _is_display_or_inspection(
                lexed, match.start(), lexed.original[start:match.start()]
            ):
                continue
            if _under_non_url_key(lexed.original[:match.start()]):
                # `fetch(other, {metadata: endpoint})` - the variable reaches a
                # send, but not as its URL.
                continue
            if _SEND_SITE_RE.search(line):
                return True
        return False
    # Use the lexical call enclosure before falling back to a physical line.
    # A custom request call commonly wraps its URL onto the next line; limiting
    # this check to the URL's line silently certified such unknown clients.
    # The nearest call can be a helper nested inside an OUTER assertion, e.g.
    # `assertTrue(required_endpoint(URL))`. Consider every enclosing call before
    # treating the innermost unknown helper as a send.
    if any(
        _ASSERTION_VERB_RE.match(verb)
        for verb in _enclosing_call_verbs(lexed, token.start)
    ):
        return False
    enclosing_verb = _enclosing_call_verb(lexed, token.start)
    if enclosing_verb:
        if (
            _DISPLAY_VERB_RE.match(enclosing_verb)
            or _INSPECTION_VERB_RE.match(enclosing_verb)
            or _NOT_A_CALL_VERB_RE.match(enclosing_verb)
            or _READ_VERB_RE.match(enclosing_verb)
            or _ASSERTION_VERB_RE.match(enclosing_verb)
        ):
            return False
        return True
    # Otherwise require a request-like call on the same logical line, and NOT a
    # display command, which is how prose mentions reach the source.
    line_start = lexed.code.rfind("\n", 0, token.start) + 1
    line_end = lexed.code.find("\n", token.end)
    line = lexed.original[line_start:line_end if line_end > 0 else len(lexed.original)]
    if re.match(r"\s*(?:echo|printf|print|console\s*\.\s*log|#|//)\b", line):
        return False
    # The line-anchored test above only catches a display command that STARTS
    # the line. `console.error(..., URL)`, `logger.info(..., URL)`,
    # `fmt.Printf(..., URL)`, `var_dump(URL)`, a mid-line `echo`, a string
    # inspection (`url.endsWith(URL)`) and a comparison (`if (url === URL)`)
    # all reach the fluent-client catch-all below otherwise.
    if _is_display_or_inspection(
        lexed, token.start, lexed.original[line_start:token.start]
    ):
        return False
    # A TEST ASSERTION is not a send. `expect(x).toBe(URL)`, `assertEqual(...)`,
    # `x.should.equal(URL)` all mention the endpoint to compare against it.
    if re.search(
        r"(?<![\w])(?:expect|assert\w*|should|toBe|toEqual|toHaveBeenCalledWith"
        r"|assertEqual|assertIn|is_expected)\s*[.(]",
        line,
        re.I,
    ):
        return False
    # A READ verb is not a send. Without this, `requests.get(url)` - which the
    # analyzer deliberately does not treat as a required send - was reported as
    # unverifiable purely because no send consumed its endpoint.
    if re.search(
        # NOT preceded by a word character - otherwise the `get` inside
        # `target(` matches and a fluent send is silently excused. `.get(` is
        # fine because `.` is not a word character. Async suffixes included for
        # C# (`GetAsync(`).
        r"(?<![A-Za-z0-9_])"
        r"(?:get|head|options|read|download|list|find|query)(?:Async)?\s*\(",
        line,
        re.I,
    ) and not _SEND_SITE_RE.search(line):
        return False
    if _SEND_SITE_RE.search(line) is not None:
        return True
    # A fluent client can spell its verbs anything (`zoom.target(url).fire()`),
    # so relying on a known-verb list makes the gate brittle in the dangerous
    # direction. Any CALL that takes the endpoint as an argument counts, with
    # display/logging commands excluded above.
    tail = lexed.original[token.end:token.end + 4]
    return bool(re.match(r"\s*[,)]", tail)) and "(" in line[: line.find(
        token.contents[:20]
    ) if token.contents[:20] in line else len(line)]



def _read_source_text(path: Path) -> str:
    """Read source without universal-newline translation."""

    with path.open(
        "r", encoding="utf-8", errors="replace", newline=""
    ) as source_file:
        return source_file.read()


def _relative_module_candidates(
    source_path: Path, module: str, suffix: str, project_root: Path
) -> list[Path]:
    """Return bounded local-module candidates for JS/TS and Python imports."""

    if module.startswith("."):
        base = source_path.parent / module
    elif suffix == ".py":
        # Python commonly imports a sibling/top-level project module without a
        # leading dot. Resolve only beneath the scanned project root; package
        # dependencies are intentionally outside this static contract.
        base = project_root / module.replace(".", "/")
    else:
        return []
    candidates = [base]
    if base.suffix:
        return candidates
    if suffix in JS_TS_SUFFIXES:
        candidates.extend(base.with_suffix(ext) for ext in sorted(JS_TS_SUFFIXES))
        candidates.extend((base / "index").with_suffix(ext) for ext in sorted(JS_TS_SUFFIXES))
    elif suffix == ".py":
        candidates.extend((base.with_suffix(".py"), base / "__init__.py"))
    return candidates


def _exported_scalar(source: str, suffix: str, name: str) -> str | None:
    """Resolve one exported/top-level name when its value is a string literal."""

    lexed = lex_source(source, suffix)
    visible = lexed.without_comments
    escaped = re.escape(name)
    if suffix in JS_TS_SUFFIXES:
        assignment = re.search(
            rf"(?:\bexport\s+(?:const|let|var)\s+{escaped}"
            rf"|\b(?:module\s*\.\s*)?exports\s*\.\s*{escaped})"
            r"\s*=\s*(['\"])(?P<value>.*?)\1",
            visible,
            re.S,
        )
    elif suffix == ".py":
        assignment = re.search(
            rf"(?m)^[ \t]*{escaped}\s*=\s*(['\"])(?P<value>.*?)\1",
            visible,
        )
    else:
        assignment = None
    return assignment.group("value") if assignment is not None else None


def external_static_values(
    path: Path, project_root: Path, source: str, suffix: str
) -> dict[str, str]:
    """Resolve relative named imports to statically exported scalar strings.

    This deliberately follows only explicit relative modules and literal
    exports. Dynamic/package imports stay unknown instead of being guessed.
    """

    lexed = lex_source(source, suffix)
    visible = lexed.without_comments
    imports: list[tuple[str, str, str]] = []
    if suffix in JS_TS_SUFFIXES:
        for match in re.finditer(
            r"\bimport\s*\{(?P<members>[^{}]*)\}\s*from\s*"
            r"(['\"])(?P<module>\.[^'\"]*)\2",
            visible,
        ):
            for member in match.group("members").split(","):
                parsed = re.fullmatch(
                    r"\s*(?P<export>[A-Za-z_$]\w*)"
                    r"(?:\s+as\s+(?P<local>[A-Za-z_$]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    imports.append(
                        (
                            match.group("module"),
                            parsed.group("export"),
                            parsed.group("local") or parsed.group("export"),
                        )
                    )
        for match in re.finditer(
            r"\b(?:const|let|var)\s*\{(?P<members>[^{}]*)\}\s*=\s*"
            r"require\s*\(\s*(['\"])(?P<module>\.[^'\"]*)\2\s*\)",
            visible,
        ):
            for member in match.group("members").split(","):
                parsed = re.fullmatch(
                    r"\s*(?P<export>[A-Za-z_$]\w*)"
                    r"(?:\s*:\s*(?P<local>[A-Za-z_$]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    imports.append(
                        (
                            match.group("module"),
                            parsed.group("export"),
                            parsed.group("local") or parsed.group("export"),
                        )
                    )
    elif suffix == ".py":
        for match in re.finditer(
            r"(?m)^\s*from\s+(?P<module>\.*[A-Za-z_][\w.]*)\s+import\s+"
            r"(?P<members>[^\r\n]+)",
            visible,
        ):
            for member in match.group("members").split(","):
                parsed = re.fullmatch(
                    r"\s*(?P<export>[A-Za-z_]\w*)"
                    r"(?:\s+as\s+(?P<local>[A-Za-z_]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    dots = len(match.group("module")) - len(match.group("module").lstrip("."))
                    module_tail = match.group("module")[dots:].replace(".", "/")
                    relative = "../" * max(0, dots - 1) + module_tail
                    imports.append(
                        (
                            "./" + relative if dots else match.group("module"),
                            parsed.group("export"),
                            parsed.group("local") or parsed.group("export"),
                        )
                    )

    resolved: dict[str, str] = {}
    for module, exported, local in imports:
        for candidate in _relative_module_candidates(
            path, module, suffix, project_root
        ):
            if not candidate.is_file():
                continue
            target_suffix = canonical_suffix(candidate)
            value = _exported_scalar(
                _read_source_text(candidate), target_suffix, exported
            )
            if value is not None:
                resolved[local] = value
            break
    return resolved


def external_reference_names(source: str, suffix: str) -> set[str]:
    """Return local names whose values originate outside the current file.

    Exact static exports are resolved separately. This index covers the wider
    language-level import boundary so an unresolved mutating request fails
    closed instead of silently passing. Sentinels are intentionally narrow:
    uppercase constants after require/include, qualified package/class members,
    and shell variables only when a source command is present.
    """

    visible = lex_source(source, suffix).without_comments
    names: set[str] = set()
    if suffix in JS_TS_SUFFIXES:
        for match in re.finditer(
            r"\bimport\s*\{(?P<members>[^{}]*)\}\s*from\s*"
            r"(['\"])\.[^'\"]*\2",
            visible,
        ):
            for member in match.group("members").split(","):
                parsed = re.fullmatch(
                    r"\s*([A-Za-z_$]\w*)(?:\s+as\s+([A-Za-z_$]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    names.add((parsed.group(2) or parsed.group(1)).lstrip("$"))
        names.update(
            match.group(1)
            for match in re.finditer(
                r"\bimport\s+\*\s+as\s+([A-Za-z_$]\w*)\s+from\s*"
                r"(['\"])\.[^'\"]*\2",
                visible,
            )
        )
        names.update(
            match.group(1)
            for match in re.finditer(
                r"\b(?:const|let|var)\s+([A-Za-z_$]\w*)\s*=\s*"
                r"require\s*\(\s*(['\"])\.[^'\"]*\2",
                visible,
            )
        )
        for match in re.finditer(
            r"\b(?:const|let|var)\s*\{(?P<members>[^{}]*)\}\s*=\s*"
            r"require\s*\(\s*(['\"])\.[^'\"]*\2",
            visible,
        ):
            for member in match.group("members").split(","):
                parsed = re.fullmatch(
                    r"\s*([A-Za-z_$]\w*)(?:\s*:\s*([A-Za-z_$]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    names.add((parsed.group(2) or parsed.group(1)).lstrip("$"))
    elif suffix == ".py":
        for match in re.finditer(r"(?m)^\s*from\s+[\w.]+\s+import\s+([^\r\n]+)", visible):
            for member in match.group(1).split(","):
                parsed = re.fullmatch(
                    r"\s*([A-Za-z_]\w*)(?:\s+as\s+([A-Za-z_]\w*))?\s*",
                    member,
                )
                if parsed is not None:
                    names.add(parsed.group(2) or parsed.group(1))
        for match in re.finditer(
            r"(?m)^\s*import\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)"
            r"(?:\s+as\s+([A-Za-z_]\w*))?",
            visible,
        ):
            names.add(match.group(2) or match.group(1).split(".")[0])
    elif suffix == ".rb" and re.search(r"(?m)^\s*require(?:_relative)?\b", visible):
        names.update({"<uppercase>", "<qualified>"})
    elif suffix == ".php" and re.search(r"\b(?:require|require_once|include|include_once)\b", visible):
        names.update({"<uppercase>", "<qualified>"})
    elif suffix == ".go" and re.search(r"(?m)^\s*import\b", visible):
        names.add("<qualified>")
        for match in re.finditer(
            r"(?m)^\s*(?:import\s+)?(?:(\w+)\s+)?['\"]([^'\"]+)['\"]",
            visible,
        ):
            names.add(match.group(1) or match.group(2).rsplit("/", 1)[-1])
    elif suffix == ".java" and re.search(r"(?m)^\s*import\b", visible):
        names.update({"<uppercase>", "<qualified>"})
        names.update(
            match.group(1)
            for match in re.finditer(
                r"(?m)^\s*import\s+(?:static\s+)?(?:[\w$]+\.)*([A-Za-z_$]\w*)\s*;",
                visible,
            )
        )
    elif suffix == ".cs" and re.search(r"(?m)^\s*using\b", visible):
        names.update({"<uppercase>", "<qualified>"})
    elif suffix == ".sh" and re.search(
        r"(?m)^\s*(?:source\s+|\.\s+)[^\r\n]+", visible
    ):
        names.add("<shell>")
    return names


def analyze_file(path: Path, project_root: Path) -> tuple[int, list[str]]:
    # newline="" is required: Path.read_text() performs universal-newline
    # translation, destroying bare-CR and CRLF source boundaries before the
    # lexer and grep-line protocol can agree on them.
    source = _read_source_text(path)
    source = executable_source(path, source)
    suffix = canonical_suffix(path)
    lexed = lex_source(source, suffix)
    sdk_calls = calls_matching(lexed, SDK_CALL_RE) + sdk_alias_calls(lexed)
    fetch_calls = calls_matching(lexed, FETCH_CALL_RE)
    shell_curls = shell_curl_calls(lexed) if suffix == ".sh" else []
    required_calls: list[tuple[Call, bool]] = [(call, True) for call in sdk_calls]
    source_resolver = SourceEndpointResolver(
        lexed,
        suffix,
        external_static_values(path, project_root, source, suffix),
        external_reference_names(source, suffix),
    )
    profile_resolver = PayloadStateResolver(
        lexed,
        suffix,
        PROFILE_NAMES,
        require_value=True,
        source=source_resolver,
    )

    seen_rest_contexts: set[tuple[int, int]] = set()
    endpoint_calls = shell_curls if suffix == ".sh" else fetch_calls
    if endpoint_calls:
        for context in endpoint_calls:
            is_required = (
                source_resolver.shell_curl_is_required(context)
                if suffix == ".sh"
                else source_resolver.request_is_required(context)
            )
            if is_required:
                seen_rest_contexts.add((context.start, context.end))
                required_calls.append((context, False))

    # Literal-driven safety net: required container-member paths the
    # call-centric resolver never evaluated stay reported unless provably
    # unused (see member_net_contexts). A miss is worse than an extra report.
    evaluated_spans = [(c.start, c.end) for c in endpoint_calls]
    flagged_spans = [
        (c.start, c.end) for c, sdk in required_calls if not sdk
    ]
    for context in member_net_contexts(
        lexed, suffix, evaluated_spans, flagged_spans
    ):
        key = (context.start, context.end)
        if key not in seen_rest_contexts:
            seen_rest_contexts.add(key)
            required_calls.append((context, False))

    required_calls.sort(key=lambda item: (item[0].start, item[0].end))
    missing: list[str] = []
    for call, sdk_call in required_calls:
        if call_has_profile(
            lexed,
            call,
            suffix,
            path,
            project_root,
            sdk_call=sdk_call,
            resolver=profile_resolver,
        ):
            continue
        detail = call_detail(path, lexed, call)
        if call.start in source_resolver.unverified_external_calls:
            detail += (
                "  [could not resolve the imported endpoint for this mutating "
                "request; verify messaging_profile_id manually]"
            )
        missing.append(detail)

    # Fail-safe backstop: a required endpoint the analysis never accounted for
    # is reported for manual verification rather than passed silently.
    # BLOCKING, provenance-based. A required endpoint that NO analysed send
    # consumed is reported as "could not verify" - a distinct outcome from
    # "missing profile". Attribution is by CONSUMPTION, so each send accounts
    # only for the literals it actually resolved: multiple sends in one file are
    # independent, and a recognised send never suppresses an unrecognised one.
    analysed = list(endpoint_calls) + [call for call, _ in required_calls]
    unresolved = unresolved_endpoint_tokens(lexed, suffix, analysed)
    for token in unresolved:
        bounds = line_bounds(source, token.start)
        missing.append(
            finding_row(
                path,
                line_number(source, token.start),
                f"{source[bounds[0]:bounds[1]].strip()}"
                "  [could not verify this send - the endpoint was found but no "
                "recognized request consumed it; verify messaging_profile_id manually]",
            )
        )
    # An unresolved endpoint is a CANDIDATE send, so it counts toward the total.
    # Reporting it while excluding it from the count produced total=0 with
    # missing=1, breaking the missing <= total contract every caller assumes.
    return len(required_calls) + len(unresolved), missing


def at_object_member_start(
    code: str, start: int, end: int, offset: int
) -> bool:
    """Return true when offset starts a direct object-literal member."""

    root_depth = payload_root_depth(code, start, end)
    if root_depth[2] == 0 or structural_depth(code, start, offset) != root_depth:
        return False
    cursor = offset - 1
    while cursor >= start and code[cursor].isspace():
        cursor -= 1
    return cursor >= start and code[cursor] in {"{", ","}


def region_has_message_body(
    lexed: LexedSource, start: int, end: int, suffix: str
) -> bool:
    """Recognize a real top-level message body field in one payload region."""

    body_identifier = re.compile(r"(?<![\w$])body(?!\w)")
    for match in body_identifier.finditer(lexed.code, start, end):
        if not at_payload_root(lexed.code, start, end, match.start()):
            continue
        after = lexed.code[match.end() : end]
        if re.match(r"\s*(?::|=(?!=))", after):
            return True
        if (
            suffix in JS_TS_SUFFIXES
            and at_object_member_start(
                lexed.code, start, end, match.start()
            )
            and re.match(r"\s*(?=[,}])", after)
        ):
            return True

    for token in lexed.strings:
        if token.contents != "body" or token.start < start or token.end > end:
            continue
        after = lexed.without_comments[token.end : end]
        if (
            at_payload_root(lexed.code, start, end, token.start)
            and re.match(r"\s*(?::|=>|=(?!=))", after)
        ):
            return True
        if suffix not in JS_TS_SUFFIXES:
            continue
        prefix = lexed.code[start : token.start]
        computed = re.search(r"\[\s*$", prefix)
        if computed is None or not re.match(r"\s*\]\s*:", after):
            continue
        opening = start + computed.start()
        if at_object_member_start(lexed.code, start, end, opening):
            return True
    return False


def call_belongs_to_kept_product(
    lexed: LexedSource,
    call: Call,
    kept_products: set[str],
    pattern: re.Pattern[str],
) -> bool:
    """Recognize product-qualified calls that intentionally remain on Twilio."""

    call_head = lexed.code[call.start:call.open_paren]
    # A retained Twilio Messaging client uses messages.create({body: ...}).
    # Do not waive Telnyx-only messages.send({body: ...}) calls in the same
    # hybrid file.
    if pattern is MESSAGE_BODY_CALL_RE and "messaging" in kept_products and re.search(
        r"\bcreate\s*$", call_head, re.IGNORECASE
    ):
        return True

    if "conversations" not in kept_products and "conversation" not in kept_products:
        return False

    # Bind the waiver to the immediate receiver of `.messages`, not to any
    # conversation-looking identifier earlier on the line. Preserve newlines
    # inside a fluent `client.conversations(id)\n  .messages.create(...)` chain.
    statement_start = max(
        lexed.code.rfind(";", 0, call.start),
        lexed.code.rfind("{", 0, call.start),
        lexed.code.rfind("}", 0, call.start),
    ) + 1
    receiver = lexed.code[statement_start:call.start].strip()
    return bool(
        re.search(r"(?:^|[^\w$])(?:conversation|channel)\s*$", receiver, re.I)
        or re.search(
            r"\.\s*conversations?\s*\([^;{}]*\)\s*$", receiver, re.I
        )
    )


def message_body_fields(
    path: Path, pattern: re.Pattern[str], kept_products: set[str] | None = None
) -> list[str]:
    """Return real top-level body fields from selected messaging calls."""

    source = _read_source_text(path)
    source = executable_source(path, source)
    suffix = canonical_suffix(path)
    lexed = lex_source(source, suffix)
    source_resolver = SourceEndpointResolver(lexed, suffix)
    resolver = PayloadStateResolver(
        lexed,
        suffix,
        ("body", "Body"),
        require_value=False,
        source=source_resolver,
    )
    matches: list[str] = []
    for call in calls_matching(lexed, pattern):
        if call_belongs_to_kept_product(
            lexed, call, kept_products or set(), pattern
        ):
            continue
        states = [
            resolver.span_presence(start, end, call.start)
            for start, end in payload_spans(
                lexed, call, suffix, "body"
            )
        ]
        if any(
            state.state == PRESENT
            or (state.state == MAYBE and state.evidence)
            for state in states
        ):
            matches.append(call_detail(path, lexed, call))
    return matches


def main(argv: list[str]) -> int:
    source_modes = {
        "--twilio-body-fields": TWILIO_MESSAGE_CREATE_RE,
        "--message-body-fields": MESSAGE_BODY_CALL_RE,
    }
    if len(argv) in {3, 5} and argv[1] in source_modes:
        kept_products: set[str] = set()
        if len(argv) == 5:
            if argv[2] != "--kept-products":
                print("Error: expected --kept-products", file=sys.stderr)
                return 2
            kept_products = {
                product.strip().lower()
                for product in argv[3].split(",")
                if product.strip()
            }
        project_root = Path(argv[-1]).resolve()
        if not project_root.is_dir():
            print(f"Error: '{project_root}' is not a directory", file=sys.stderr)
            return 2
        findings: list[str] = []
        for path in iter_source_files(project_root):
            try:
                findings.extend(
                    message_body_fields(path, source_modes[argv[1]], kept_products)
                )
            except Exception as error:  # noqa: BLE001 - fail safe per file
                findings.append(
                    finding_row(
                        path,
                        1,
                        f"  [could not analyze this file "
                        f"({type(error).__name__}) - verify body fields manually]",
                    )
                )
        print("\n".join(findings))
        return 0
    if len(argv) != 2:
        print(
            f"Usage: {Path(argv[0]).name} "
            "[--twilio-body-fields|--message-body-fields] "
            "[--kept-products <csv>] <project-root>",
            file=sys.stderr,
        )
        return 2
    project_root = Path(argv[1]).resolve()
    if not project_root.is_dir():
        print(f"Error: '{project_root}' is not a directory", file=sys.stderr)
        return 2

    total = 0
    missing: list[str] = []
    for path in iter_source_files(project_root):
        try:
            file_total, file_missing = analyze_file(path, project_root)
        except Exception as error:  # noqa: BLE001 - one file must not abort the scan
            # A pathological file previously took the WHOLE run down, so every
            # other file went unanalysed and the project was reported clean.
            # Fail safe instead: keep scanning and surface the file for manual
            # review rather than silently dropping it.
            total += 1
            missing.append(
                finding_row(
                    path,
                    1,
                    f"  [could not analyze this file "
                    f"({type(error).__name__}) - verify messaging_profile_id manually]",
                )
            )
            continue
        total += file_total
        missing.extend(file_missing)

    print(total)
    print("\n".join(missing))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
