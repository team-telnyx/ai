#!/usr/bin/env python3
"""Shared, bounded SDK ownership for ambiguous JVM/PHP/Go discovery call names.

This is discovery evidence, not a whole-program type checker. A comment, string,
unrelated import, or receiver name alone never establishes SDK ownership.
"""
from __future__ import annotations

from functools import lru_cache
import importlib.util
from pathlib import Path
import re
import os
import sys


@lru_cache(maxsize=None)
def load_script(name: str):
    spec = importlib.util.spec_from_file_location(
        name.replace("-", "_"), Path(__file__).with_name(name + ".py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def lexed_source(source: str, suffix: str):
    analyzer = load_script("lint-required-messaging-profile")
    path = Path("source" + suffix)
    return analyzer.lex_source(analyzer.executable_source(path, source),
                               analyzer.canonical_suffix(path), analyzer.source_dialect(path))


def scala_import_bindings(code: str, products: dict[str, str]) -> list[tuple[int, dict, dict]]:
    """Read Scala 2/3 selectors, preserving renames and wildcard exclusions.

    Import positions are retained because Scala permits block-local imports.
    This recognizes literal package imports, not arbitrary stable-path aliases.
    """
    analyzer = load_script("lint-required-messaging-profile")
    prefix = "com.twilio.rest.api.v2010.account"
    result = []
    for statement in re.finditer(r"\bimport\s+((?:[.,]\s*\n\s*|[^;\n{}]|\{[^{}]*\})+)", code):
        for start, end in analyzer.split_arguments(code, statement.start(1), statement.end(1)):
            expression = code[start:end].strip()
            grouped = re.fullmatch(r"([\w.]+)\.\s*\{([^{}]*)\}", expression)
            if grouped:
                package, selectors = grouped[1], grouped[2].split(",")
            else:
                single = re.fullmatch(r"([\w.]+)\.\s*([\w*]+)(?:\s+as\s+(\w+))?", expression)
                if not single:
                    continue
                package = single[1]
                selectors = [single[2] + (" as " + single[3] if single[3] else "")]
            package = package.removeprefix("_root_.")
            explicit, wildcard, excluded = {}, False, set()
            for selector in selectors:
                member = re.fullmatch(r"\s*([\w*]+)(?:\s*(?:=>|\bas\b)\s*(\w+))?\s*", selector)
                if not member:
                    continue
                name, alias = member[1], member[2]
                if name in {"_", "*"} and alias is None:
                    wildcard = True
                else:
                    excluded.add(name)
                    if alias != "_":
                        explicit[alias or name] = products.get(name) if package == prefix else None
            wildcards = ({name: product for name, product in products.items() if name not in excluded}
                         if wildcard and package == prefix else {})
            result.append((statement.start(), explicit, wildcards))
    return result


def scala_indent_regions(code: str) -> list[tuple[int, int]]:
    """Index Scala 3 indentation regions alongside (not instead of) braces."""
    regions, stack = [], []
    previous, previous_indent, offset = "", 0, 0
    for line in code.splitlines(keepends=True):
        stripped = line.strip()
        if stripped:
            indent = len(line) - len(line.lstrip(" \t"))
            while stack and indent < stack[-1][0]:
                _, start = stack.pop()
                regions.append((start, offset))
            if indent > previous_indent and re.search(
                r"(?::|=|=>|\bthen|\bdo|\bmatch|\btry|\bcatch|\bfinally|\belse|\byield)$",
                previous,
            ):
                stack.append((indent, offset))
            previous, previous_indent = stripped, indent
        offset += len(line)
    regions.extend((start, len(code)) for _, start in stack)
    return regions


class CsharpGlobalUsings:
    """Index unconditional source global usings within project-directory bounds.

    This does not evaluate MSBuild or preprocessor symbols. Conditional imports
    are not promoted to project-wide evidence. Without a csproj, the scan root
    is the boundary; nested/sibling csproj directories never share imports.
    """

    def __init__(self, root: Path, paths: list[Path]):
        self.root = root
        self.projects = {path.parent for path in paths if path.suffix.lower() == ".csproj"}
        self.imports: dict[Path, list[str]] = {}
        for path in paths:
            if path.suffix.lower() != ".cs":
                continue
            try:
                source = path.read_text(encoding="utf-8-sig")
            except (OSError, UnicodeError):
                continue  # The scanner retains its own read-error policy.
            if "global" not in source or "\x00" in source:
                continue
            code = lexed_source(source, ".cs").code
            # Preserve offsets while removing conditional regions. A using in
            # one possible build configuration is not definite ownership.
            depth, unconditional = 0, []
            for line in code.splitlines(keepends=True):
                directive = re.match(r"\s*#\s*(if|endif)\b", line)
                if directive and directive[1] == "if":
                    depth += 1
                unconditional.append("\n" if depth or directive else line)
                if directive and directive[1] == "endif":
                    depth = max(0, depth - 1)
            code = "".join(unconditional)
            analyzer = load_script("lint-required-messaging-profile")
            for match in re.finditer(
                r"\bglobal\s+using\s+(?:static\s+)?(?:\w+\s*=\s*)?"
                r"(?:global\s*::\s*)?\w+(?:\s*\.\s*\w+)*\s*;", code
            ):
                # Global directives are compilation-unit declarations, never
                # members of a namespace/type body.
                if analyzer.curly_ancestry(code, match.start()):
                    continue
                self.imports.setdefault(self.owner(path), []).append(match[0])
        self.contexts = {owner: "\n".join(dict.fromkeys(imports))
                         for owner, imports in self.imports.items()
                         if any(re.search(r"\bTwilio\s*\.", item) for item in imports)}

    def owner(self, path: Path) -> Path:
        return next((parent for parent in path.parents if parent in self.projects), self.root)

    def for_file(self, path: Path) -> str:
        return self.contexts.get(self.owner(path), "")


def contextual_calls(source: str, suffix: str, global_using_code: str = "",
                     go_clients: frozenset[str] = frozenset()) -> list[tuple[int, str]]:
    lexed = lexed_source(source, suffix)
    code = lexed.code
    if suffix == ".go":
        return go_contextual_calls(source, lexed, go_clients)
    if suffix in {".cs", ".cshtml", ".razor"}:
        analyzer = load_script("lint-required-messaging-profile")
        if suffix in {".cshtml", ".razor"}:
            # Razor @using directives are newline-terminated, unlike C# using
            # declarations. Only executable lexer output can supply imports.
            directives = re.findall(
                r"(?m)^\s*@using\s+((?:static\s+)?(?:\w+\s*=\s*)?"
                r"(?:global\s*::\s*)?\w+(?:\s*\.\s*\w+)*)\s*;?\s*$", code)
            global_using_code += "\n" + "\n".join("using " + item + ";" for item in directives)
        resolver = analyzer.SourceEndpointResolver(lexed, ".cs")
        resources = (
            ("Twilio.Rest.Api.V2010.Account.MessageResource", "messaging"),
            ("Twilio.Rest.Api.V2010.Account.CallResource", "voice"),
            ("Twilio.Rest.Api.V2010.Account.IncomingPhoneNumberResource", "phone-numbers"),
            ("Twilio.Rest.Api.V2010.AccountResource", "general"),
            ("Twilio.Rest.Verify.V2.Service.VerificationResource", "verify"),
            ("Twilio.Rest.Fax.V1.FaxResource", "fax"),
            ("Twilio.Rest.Supersim.V1.SimResource", "iot"),
            ("Twilio.Rest.Wireless.V1.SimResource", "iot"),
            ("Twilio.Rest.Conversations.V1.ConversationResource", "conversations"),
            ("Twilio.Rest.Conversations.V1.Service.ConversationResource", "conversations"),
            ("Twilio.Rest.Notify.V1.Service.NotificationResource", "notify"),
            ("Twilio.Rest.Taskrouter.V1.Workspace.WorkflowResource", "taskrouter"),
        )
        methods = tuple(
            method + suffix
            for method in ("Create", "Read", "Update", "Fetch", "Delete", "List")
            for suffix in ("", "Async")
        )
        return [(source.count("\n", 0, call.start) + 1, product)
                for target, product in resources
                for call in analyzer.csharp_twilio_resource_calls(lexed,
                    target, methods, resolver, global_using_code)]
    result = []
    products = {"Message": "messaging", "Call": "voice",
                "IncomingPhoneNumber": "phone-numbers"}
    if suffix in {".java", ".kt", ".kts", ".scala"}:
        analyzer = load_script("lint-required-messaging-profile")
        resolver = analyzer.SourceEndpointResolver(lexed, ".java")
        indent_regions = scala_indent_regions(code) if suffix == ".scala" else []

        def scope_path(offset: int) -> tuple[int, ...]:
            return tuple(sorted((*analyzer.curly_ancestry(code, offset),
                                 *(start for start, end in indent_regions if start <= offset < end))))

        parameter_scopes = []
        parameter_headers = []
        if suffix != ".java":
            # Kotlin/Scala name:type parameters differ from Java Type name.
            # Keep that dialect distinction local to SDK ownership, without
            # changing the endpoint resolver's advertised Java contract.
            for function in re.finditer(r"\b(?:fun|def)\s+\w+\s*\(", code):
                opening = code.rfind("(", function.start(), function.end())
                closing = analyzer.matching_delimiter(code, opening, "(", ")")
                if closing is None:
                    continue
                parameter_headers.append((opening, closing))
                names = set(re.findall(r"(?:^|,)\s*(?:\w+\s+)*?(\w+)\s*:", code[opening + 1:closing]))
                expression = re.match(r"\s*(?::[^{}\n=]+)?\s*=\s*", code[closing + 1:])
                if expression:
                    start = closing + 1 + expression.end()
                    if start < len(code) and code[start] != "{":
                        end = analyzer.assignment_end(lexed, start, ".java")
                        # A multiline indentation body includes following
                        # expressions, but not a dedented sibling definition.
                        body_regions = [end for begin, end in indent_regions
                                        if closing < begin <= start < end]
                        parameter_scopes.append((start - 1, min(body_regions) if body_regions else end, names))
                        continue
                body = code.find("{", closing)
                if body < 0 or not re.fullmatch(r"\s*(?::[^{}\n=]+)?\s*=?\s*", code[closing + 1:body]):
                    continue
                end = analyzer.matching_delimiter(code, body, "{", "}")
                if end is not None:
                    parameter_scopes.append((body, end, names))
        prefix = "com.twilio.rest.api.v2010.account."
        imports = {}
        explicit = {}
        for match in re.finditer(r"\bimport\s+(com\.twilio\.rest\.api\.v2010\.account\.\*|[\w.]+)(?:\s+as\s+(\w+))?", code):
            target = match[1]
            if target == prefix + "*":
                imports.update(products)
            elif target.startswith(prefix) and target[len(prefix):] in products:
                explicit[match[2] or target.rsplit(".", 1)[-1]] = products[target[len(prefix):]]
            else:
                explicit[match[2] or target.rsplit(".", 1)[-1]] = None
        imports.update(explicit)  # Single imports shadow wildcard imports in either order.
        scala_imports = scala_import_bindings(code, products) if suffix == ".scala" else []
        scala_objects = list(re.finditer(r"\bobject\s+(\w+)", code)) if suffix == ".scala" else []
        for match in re.finditer(r"(?<![\w.])([\w.]+)\s*\.\s*creator\s*\(", code):
            receiver = match[1]
            first = receiver.split(".", 1)[0]
            use_scope = scope_path(match.start()) if suffix == ".scala" else ()
            binding_id = resolver.graph.visible_binding(first, resolver.scope_at(match.start()), match.start())
            bindings = ([resolver.graph.bindings[index]
                         for index in resolver.graph.bindings_by_name.get(first, [])]
                        if suffix == ".scala" else
                        [resolver.graph.bindings[binding_id]] if binding_id is not None else [])
            shadowed = False
            for binding in bindings:
                binding_scope = scope_path(binding.declaration_start) if suffix == ".scala" else ()
                if ((suffix == ".java" or binding.kind != "parameter")
                        and not any(start < binding.declaration_start < end
                                    for start, end in parameter_headers)
                        and (use_scope[:len(binding_scope)] == binding_scope if suffix == ".scala"
                             else analyzer.scope_contains(code, binding.declaration_start, match.start()))):
                    shadowed = True
                    break
            if shadowed or any(obj[1] == first and use_scope[:len(scope_path(obj.start()))] == scope_path(obj.start())
                               for obj in scala_objects):
                continue
            if any(start < match.start() < end and first in names
                   for start, end, names in parameter_scopes):
                continue
            product = imports.get(receiver)
            if suffix == ".scala":
                # A deeper lexical scope wins; within a scope, explicit
                # selectors take precedence over wildcard selectors.
                candidates = []
                for position, selected, wildcard in scala_imports:
                    import_scope = scope_path(position)
                    if position >= match.start() or use_scope[:len(import_scope)] != import_scope:
                        continue
                    depth = len(import_scope)
                    if receiver in selected:
                        candidates.append((depth, 1, position, selected[receiver]))
                    elif receiver in wildcard:
                        candidates.append((depth, 0, position, wildcard[receiver]))
                product = max(candidates, key=lambda item: item[:3])[3] if candidates else None
            if receiver.startswith(prefix):
                product = products.get(receiver[len(prefix):])
            if product:
                result.append((source.count("\n", 0, match.start()) + 1, product))
        return result

    namespaces = list(re.finditer(r"\bnamespace(?:\s+[\w\\]+)?\s*[;{]", code))

    def namespace_at(offset: int) -> int:
        return next((match.start() for match in reversed(namespaces)
                     if match.start() < offset), -1)

    def global_namespace(offset: int) -> bool:
        match = next((match for match in reversed(namespaces) if match.start() < offset), None)
        return match is None or bool(re.fullmatch(r"namespace\s*\{", match[0]))

    aliases = {}

    def kind(type_name: str, offset: int) -> str | None:
        normalized = type_name.lstrip("\\").lower()
        if normalized in {"twilio\\rest\\client", "twilio\\rest\\clientfactory"} and (type_name.startswith("\\") or global_namespace(offset)):
            return normalized.rsplit("\\", 1)[-1]
        if not type_name.startswith("\\"):
            first, separator, rest = normalized.partition("\\")
            imported = aliases.get((namespace_at(offset), first))
            expanded = imported + separator + rest if imported else ""
            if expanded in {"twilio\\rest\\client", "twilio\\rest\\clientfactory"}:
                return expanded.rsplit("\\", 1)[-1]
        return None

    analyzer = load_script("lint-required-messaging-profile")
    # Index braces once so bindings cannot leak between functions/classes.
    braces = {}
    stack = []
    for offset, character in enumerate(code):
        if character == "{":
            stack.append(offset)
        elif character == "}" and stack:
            braces[stack.pop()] = offset
    namespace_braces = {match.end() - 1 for match in namespaces if match[0].endswith("{")}
    for statement in re.finditer(r"\buse\s+([^;()]+);", code, re.I):
        # Trait uses and closure captures are not namespace imports.
        if re.match(r"(?:function|const)\b", statement[1], re.I):
            continue
        if any(start < statement.start() < end and start not in namespace_braces
               for start, end in braces.items()):
            continue
        for start, end in analyzer.split_arguments(code, statement.start(1), statement.end(1)):
            item = code[start:end].strip()
            group = re.fullmatch(r"(\\?[\w\\]+\\)\s*\{([^{}]*)\}", item)
            members = [(group[1], member) for member in group[2].split(",")] if group else [("", item)]
            for prefix, member in members:
                imported = re.fullmatch(r"\s*(\\?[A-Za-z_]\w*(?:\\[A-Za-z_]\w*)*)(?:\s+as\s+([A-Za-z_]\w*))?\s*", member, re.I)
                if imported:
                    qualified = (prefix + imported[1]).lstrip("\\").lower()
                    alias = (imported[2] or imported[1].rsplit("\\", 1)[-1]).lower()
                    aliases[(namespace_at(statement.start()), alias)] = qualified
    functions = []
    classes = []
    for pattern, spans in ((r"\bfunction\s*\w*\s*\([^;{]*\)[^;{]*\{", functions),
                           (r"\bclass\s+\w+[^;{]*\{", classes)):
        for match in re.finditer(pattern, code):
            opening = match.end() - 1
            if opening in braces:
                spans.append((match.start(), braces[opening]))

    def owner(offset: int, spans: list[tuple[int, int]]):
        return next((span for span in reversed(spans) if span[0] <= offset < span[1]), None)

    variable = r"\$[A-Za-z_]\w*(?:\s*->\s*[A-Za-z_]\w*)?"
    assignments = list(re.finditer(r"(" + variable + r")\s*=(?!=|>)\s*([^;\n]+)", code))
    typed = list(re.finditer(r"(?<![\w\\])([\\\w]+)\s+(\$\w+)\b", code))

    def compact(value: str) -> str:
        return re.sub(r"\s+", "", value)

    def resolve(expression: str, use: int, seen: frozenset = frozenset()) -> str | None:
        expression = expression.strip()
        identity = (expression, use)
        if identity in seen or len(seen) > 32:
            return None
        seen = seen | {identity}
        constructed = re.match(r"new\s+([\\\w]+)\s*\(", expression, re.I)
        if constructed:
            return kind(constructed[1], use)
        factory = re.match(r"(" + variable + r")\s*->\s*create\s*\(", expression, re.I)
        if factory:
            return "client" if resolve(factory[1], use, seen) == "clientfactory" else None
        if not re.fullmatch(variable, expression):
            return None
        name = compact(expression)
        candidates = []
        for match in assignments:
            if compact(match[1]) != name:
                continue
            if name.startswith("$this->"):
                # Only a constructor initializes an instance property for a
                # later method; arbitrary other method writes are not definite.
                function = owner(match.start(), functions)
                same_function = function == owner(use, functions)
                constructor = function and re.match(r"function\s+__construct\b", code[function[0]:], re.I)
                if owner(use, classes) is None or owner(use, classes) != owner(match.start(), classes) or not (same_function or constructor):
                    continue
                if same_function and match.start() >= use:
                    continue
            elif owner(use, functions) != owner(match.start(), functions):
                continue
            elif match.start() >= use:
                continue
            if namespace_at(match.start()) != namespace_at(use):
                continue
            if not name.startswith("$this->") and not analyzer.scope_contains(code, match.start(), use):
                continue
            # An assignment in the currently executing method overrides a
            # constructor initializer regardless of source declaration order.
            candidates.append((owner(match.start(), functions) == owner(use, functions), match.start(), match[2]))
        if candidates:
            _, offset, value = max(candidates)
            return resolve(value, offset, seen)
        for match in reversed(typed):
            if namespace_at(match.start()) != namespace_at(use):
                continue
            function = owner(match.start(), functions)
            # A type hint is in the parameter header, not `return $client` or
            # another keyword/expression in the function body.
            parameter = function is not None and match.start() < code.find("{", function[0])
            if parameter and match.start() < use and compact(match[2]) == name and owner(use, functions) == function:
                return kind(match[1], match.start())
            promoted = False
            if parameter:
                parameter_start = max(code.rfind("(", function[0], match.start()),
                                      code.rfind(",", function[0], match.start()))
                promoted = bool(re.search(
                    r"\b(?:public|protected|private)\b",
                    code[parameter_start + 1:match.start()],
                    re.I,
                ))
            if (promoted and name == "$this->" + match[2][1:]
                    and re.match(r"function\s+__construct\b", code[function[0]:], re.I)
                    and owner(use, classes) == owner(match.start(), classes)):
                return kind(match[1], match.start())
            if name == "$this->" + match[2][1:] and owner(match.start(), functions) is None and owner(use, classes) is not None and owner(use, classes) == owner(match.start(), classes):
                return kind(match[1], match.start())
        return None

    php_products = {"messages": "messaging", "calls": "voice", "verify": "verify",
                    "video": "video", "lookups": "lookup"}
    for match in re.finditer(r"(" + variable + r")\s*->\s*(messages|calls|verify|video|lookups)\b", code, re.I):
        if resolve(match[1], match.start()) == "client":
            result.append((source.count("\n", 0, match.start()) + 1, php_products[match[2].lower()]))
    return result


def go_import_packages(lexed) -> set[str]:
    """Return file-local names importing the actual Twilio Go SDK."""
    analyzer = load_script("lint-required-messaging-profile")
    code = lexed.code
    packages = set()
    for token in lexed.strings:
        if token.contents != "github.com/twilio/twilio-go":
            continue
        line_start = code.rfind("\n", 0, token.start) + 1
        prefix = code[line_start:token.start]
        single = re.fullmatch(r"\s*import\s+(?:(\w+)\s+)?", prefix)
        grouped = re.fullmatch(r"\s*(?:(\w+)\s+)?", prefix)
        group_start = code.rfind("import", 0, token.start)
        in_group = group_start >= 0 and re.match(r"import\s*\(", code[group_start:])
        if in_group:
            opening = code.find("(", group_start)
            closing = analyzer.matching_delimiter(code, opening, "(", ")")
            in_group = closing is not None and token.start < closing
        imported = single or (grouped if in_group else None)
        if imported:
            packages.add(imported[1] or "twilio")
    return packages


def go_var_declarations(code: str):
    """Yield Go var bindings; multi-name declarations only establish shadows."""
    analyzer = load_script("lint-required-messaging-profile")
    declaration = re.compile(r"([A-Za-z_]\w*)[ \t]*(?:[^=;,\n)]+)?(?P<equals>=)?")
    for keyword in re.finditer(r"\bvar\s+", code):
        start = keyword.end()
        if code[start:start + 1] == "(":
            end = analyzer.matching_delimiter(code, start, "(", ")")
            if end is None:
                continue
            starts, stack = [start + 1], []
            for position in range(start + 1, end):
                char = code[position]
                if char in "([{":
                    stack.append(char)
                elif char in ")]}":
                    if stack:
                        stack.pop()
                elif char in ";\n" and not stack:
                    starts.append(position + 1)
        else:
            starts, end = [start], len(code)
        for position in starts:
            while position < end and code[position] in " \t\r":
                position += 1
            multiple = re.compile(r"(?:\w+[ \t]*,[ \t]*)+\w+").match(code, position, end)
            if multiple:
                yield from re.compile(r"(\w+)(?P<equals>=)?").finditer(code, position, multiple.end())
                continue
            match = declaration.match(code, position, end)
            if match:
                yield match


class GoPackageClients:
    """Resolve static package client initializers without sharing file imports."""

    def __init__(self, paths: list[Path]):
        self.keys: dict[Path, tuple[Path, str]] = {}
        declarations: dict[tuple[Path, str], dict[str, list[tuple[bool, str]]]] = {}
        analyzer = load_script("lint-required-messaging-profile")
        for path in paths:
            if path.suffix != ".go":
                continue
            try:
                source = path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                continue
            lexed = lexed_source(source, ".go")
            package = re.search(r"\bpackage\s+(\w+)", lexed.code)
            if package is None:
                continue
            key = (path.parent, package[1])
            self.keys[path] = key
            # Test declarations and build-constrained variants must not seed
            # unconditional ownership in production files.
            if path.name.endswith("_test.go") or re.search(r"(?m)^\s*//\s*(?:go:build|\+build)\b", source):
                continue
            imports = go_import_packages(lexed)
            resolver = analyzer.SourceEndpointResolver(lexed, ".go")
            assignments = list(resolver.root_assignments)
            known_ends = {(match[1], match.end()) for match in assignments}
            assignments.extend(match for match in go_var_declarations(lexed.code)
                               if match["equals"] and (match[1], match.end()) not in known_ends)
            for match in assignments:
                if analyzer.curly_ancestry(lexed.code, match.start()):
                    continue
                value = re.match(r"[^;\n]+", lexed.code[match.end():])
                if not value:
                    continue
                expression = value[0].strip()
                constructor = re.match(r"(\w+)\s*\.\s*NewRestClient(?:WithParams)?\s*\(", expression)
                owned = bool(constructor and constructor[1] in imports)
                declarations.setdefault(key, {}).setdefault(match[1], []).append((owned, expression))
        self.clients: dict[tuple[Path, str], frozenset[str]] = {}
        for key, bindings in declarations.items():
            known: set[str] = set()
            for _ in range(len(bindings) + 1):
                added = {name for name, values in bindings.items() if len(values) == 1
                         and (values[0][0] or values[0][1] in known)} - known
                if not added:
                    break
                known.update(added)
            self.clients[key] = frozenset(known)

    def for_file(self, path: Path) -> frozenset[str]:
        return self.clients.get(self.keys.get(path), frozenset())


def go_contextual_calls(source: str, lexed, package_clients: frozenset[str] = frozenset()) -> list[tuple[int, str]]:
    """Attribute SDK calls through local bindings, then package initializers."""
    analyzer = load_script("lint-required-messaging-profile")
    code = lexed.code
    resolver = analyzer.SourceEndpointResolver(lexed, ".go")
    assignments = list(resolver.root_assignments)
    known_ends = {(match[1], match.end()) for match in assignments}
    for declaration in go_var_declarations(code):
        if declaration["equals"] and (declaration[1], declaration.end()) in known_ends:
            continue
        scope = resolver.scope_at(declaration.start())
        binding = resolver.graph.add_binding(declaration[1], scope, declaration.start(), declaration.start(), "declaration")
        if declaration["equals"]:
            assignments.append(declaration)
            resolver.assignment_bindings[declaration.start()] = binding
    packages = go_import_packages(lexed)
    # This shared pattern excludes selector suffixes (`holder.client = ...`),
    # which are mutations of a different binding.
    assignments.sort(key=lambda match: match.start())

    def assignment(name: str, before: int):
        use_binding = resolver.graph.visible_binding(
            name, resolver.scope_at(before), before)
        for match in reversed(assignments):
            if (match[1].lstrip("$") != name or match.start() >= before
                    or not analyzer.scope_contains(code, match.start(), before)):
                continue
            binding = resolver.assignment_bindings.get(match.start())
            if binding is None:
                binding = resolver.graph.visible_binding(
                    name, resolver.scope_at(match.start()), match.start())
            if binding == use_binding:
                value = re.match(r"([^;\n]+)", code[match.end():])
                return (match, value[1].strip()) if value else None
        return None

    def client(name: str, before: int, seen: frozenset = frozenset()) -> bool:
        identity = (name, before)
        if identity in seen or len(seen) >= 32:
            return False
        resolved = assignment(name, before)
        if resolved is None:
            binding = resolver.graph.visible_binding(name, resolver.scope_at(before), before)
            return name in package_clients and (binding is None or (
                resolver.graph.bindings[binding].kind != "parameter"
                and not analyzer.curly_ancestry(code, resolver.graph.bindings[binding].declaration_start)))
        match, value = resolved
        created = re.match(r"(\w+)\s*\.\s*NewRestClient(?:WithParams)?\s*\(", value)
        if created:
            package_binding = resolver.graph.visible_binding(
                created[1], resolver.scope_at(match.start()), match.start())
            return created[1] in packages and package_binding is None
        return bool(re.fullmatch(r"\w+", value) and client(value, match.start(), seen | {identity}))

    products = {"Api": {"Message": "messaging", "Call": "voice", "IncomingPhoneNumber": "phone-numbers"},
                "VerifyV2": {"Verification": "verify"},
                "LookupsV2": {"PhoneNumber": "lookup"},
                "VideoV1": {"Room": "video"}}
    result = []
    for match in re.finditer(r"\b(\w+)\s*\.\s*(\w+)\s*\.\s*"
                            r"(?:Create|Fetch|Update|Delete|Read|List)(\w+)\s*\(", code):
        product = products.get(match[2], {}).get(match[3])
        if product and client(match[1], match.start()):
            result.append((source.count("\n", 0, match.start()) + 1, product))
    return result


def main() -> int:
    if len(sys.argv) != 2:
        return 2
    root = Path(sys.argv[1])
    scanner = load_script("scan-twilio-deep")
    failed = False
    paths = list(scanner.walk_project(root))
    global_usings = CsharpGlobalUsings(root, paths)
    go_clients = GoPackageClients(paths)
    for path in paths:
        if path.suffix not in {".java", ".kt", ".kts", ".scala", ".php", ".phtml", ".go", ".cs", ".cshtml", ".razor"}:
            continue
        try:
            if not path.stat().st_mode & 0o444 or not os.access(path, os.R_OK):
                raise OSError("source is not readable")
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            print(f"Cannot inspect SDK ownership in {str(path)!r}: {error}", file=sys.stderr)
            failed = True
            continue
        if "\x00" in source:
            continue
        lines = source.splitlines()
        for line, product in contextual_calls(source, path.suffix, global_usings.for_file(path), go_clients.for_file(path)):
            for value in (str(path), product, lines[line - 1].strip()):
                sys.stdout.buffer.write(value.encode("utf-8") + b"\x00")
    return 2 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
