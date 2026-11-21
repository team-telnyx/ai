#!/usr/bin/env python3
"""Read local dependency declarations; never resolve packages over the network.

Exit zero only for positive evidence. Unresolved external Maven parents,
properties, and unsupported Gradle expressions deliberately remain warnings.
TOML manifests use stdlib tomllib on Python 3.11+ and a bounded literal fallback
on older Python. Gradle catalogs still require tomllib; no packages are installed.
"""
from __future__ import annotations

import ast
import codecs
import configparser
from functools import lru_cache
import json
import importlib.util
import os
from pathlib import Path
import re
import sys
import tokenize
import xml.etree.ElementTree as ET

try:
    import tomllib
except ImportError:
    tomllib = None

JVM_ARTIFACTS = {"telnyx", "telnyx-core", "telnyx-client-okhttp"}


def version_is_constrained(value: object) -> bool:
    """Literal JVM releases and numeric hard requirements, not dynamic selectors."""
    if not isinstance(value, str):
        return False
    release = r"\d+\.\d+(?:[.][0-9]+)*(?:-[A-Za-z0-9][A-Za-z0-9.-]*)?"
    value = value.strip()
    if re.fullmatch(release, value) or re.fullmatch(r"\[" + release + r"\]", value):
        return True
    interval = re.fullmatch(r"[\[(]\s*(.*?)\s*,\s*(.*?)\s*[\])]", value)
    return bool(interval and any(interval.groups()) and all(
        not bound or re.fullmatch(release, bound) for bound in interval.groups()
    ))


def read_text(path: Path) -> str:
    try:
        # Python source and pip requirements honor PEP 263 declarations. npm's
        # JSON reader accepts a leading UTF-8 BOM; TOML does not share that rule.
        if path.name == "setup.py":
            with tokenize.open(path) as source:
                return source.read()
        if path.name == "requirements.txt":
            data = path.read_bytes()
            # pip checks BOMs before coding comments, and UTF-32 before UTF-16.
            for boms, encoding in (((codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE), "utf-32"),
                                   ((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE), "utf-16"),
                                   ((codecs.BOM_UTF8,), "utf-8-sig")):
                if data.startswith(boms):
                    return data.decode(encoding)
            for line in data.split(b"\n")[:2]:
                cookie = re.search(br"coding[:=]\s*([-\w.]+)", line) if line.startswith(b"#") else None
                if cookie:
                    return data.decode(cookie[1].decode("ascii"))
            return data.decode("utf-8")
        return path.read_text(encoding="utf-8-sig" if path.name == "package.json" else "utf-8")
    except (OSError, UnicodeError, SyntaxError, LookupError):
        return ""


def toml_string(raw: str) -> str:
    """Decode TOML 1.0 string escapes without Python's extra escape forms."""
    quote = raw[0]
    width = 3 if raw.startswith(quote * 3) else 1
    if not raw.endswith(quote * width):
        raise ValueError("unterminated TOML string")
    value = raw[width:-width]
    if width == 3:
        value = re.sub(r"^\r?\n", "", value)
    if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", value):
        raise ValueError("control character in TOML string")
    if width == 1 and ("\n" in value or "\r" in value):
        raise ValueError("newline in single-line TOML string")
    if quote == "'":
        return value
    escapes = {'b': '\b', 't': '\t', 'n': '\n', 'f': '\f', 'r': '\r', '"': '"', '\\': '\\'}

    def decode(match):
        escaped = match[0][1:]
        if escaped in escapes:
            return escapes[escaped]
        if re.fullmatch(r"u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}", escaped):
            number = int(escaped[1:], 16)
            if number <= 0x10ffff and not 0xd800 <= number <= 0xdfff:
                return chr(number)
        if width == 3 and re.fullmatch(r"[ \t]*\r?\n[ \t\r\n]*", escaped):
            return ""
        raise ValueError("invalid TOML escape")

    return re.sub(r'\\(?:u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}|[ \t]*\r?\n[ \t\r\n]*|.|$)',
                  decode, value)


def literal_toml_mapping(source: str) -> dict:
    """Python 3.10 fallback: tables, literal strings, arrays and inline tables.

    This is intentionally not a general TOML implementation. It accepts the
    dependency forms used below without evaluating code. Unsupported
    values remain unresolved; masked strings cannot introduce table headers.
    """
    ownership = source_ownership()
    analyzer = ownership.load_script("lint-required-messaging-profile")
    lexed = ownership.lexed_source(source, ".py")
    strings = {token.start: token for token in lexed.strings}
    key = r'''(?:[A-Za-z0-9_-]+|"(?:[^"\\\n]|\\.)*"|'[^'\n]*')'''
    data, cursor = {}, 0
    table = data
    headers = set()

    def table_at(parts: list[str]) -> dict | None:
        target = data
        for part in parts:
            if not isinstance(target.setdefault(part, {}), dict):
                return None
            target = target[part]
        return target

    while cursor < len(source):
        whitespace = re.match(r"\s*", lexed.without_comments[cursor:])
        cursor += whitespace.end()
        if cursor >= len(source):
            break
        end = source.find("\n", cursor)
        end = len(source) if end < 0 else end
        line = lexed.without_comments[cursor:end].strip()
        if lexed.code[cursor:cursor + 1] == "[":
            header = re.fullmatch(r"\[\s*(" + key + r"(?:\s*\.\s*" + key + r")*)\s*\]", line)
            if header:
                try:
                    parts = tuple(toml_string(part) if part.startswith(('"', "'")) else part
                                  for part in re.findall(key, header[1]))
                except ValueError:
                    return {}
                if parts in headers:
                    return {}
                headers.add(parts)
                table = table_at(list(parts))
            else:
                table = None
            cursor = end
            continue
        assignment = re.match(r"(" + key + r"(?:\s*\.\s*" + key + r")*)\s*=\s*", lexed.without_comments[cursor:])
        if assignment is None:
            cursor = end
            continue
        try:
            parts = [toml_string(part) if part.startswith(('"', "'")) else part
                     for part in re.findall(key, assignment[1])]
        except ValueError:
            return {}
        start = cursor + assignment.end()
        token = strings.get(start)
        if token:
            end = token.end
        elif source[start:start + 1] in {"[", "{"}:
            opening = source[start]
            closing = analyzer.matching_delimiter(lexed.code, start, opening, "]" if opening == "[" else "}")
            if closing is None:
                return {}  # Cannot safely find the next declaration.
            end = closing + 1
        expression = lexed.without_comments[start:end]
        replacements = []
        supported = True
        for token in lexed.strings:
            if start <= token.start < end:
                try:
                    decoded = toml_string(source[token.start:token.end])
                except ValueError:
                    supported = False
                    decoded = ""
                replacements.append((token.start - start, token.end - start, repr(decoded)))
        code = lexed.code[start:end]
        if any(character in code for character in "():"):
            return {}  # Python tuples and JSON colon maps are not TOML.
        for field in re.finditer(r"\b([A-Za-z_][\w-]*)\s*(?==)", code):
            replacements.append((field.start(1), field.end(1), repr(field[1])))
        for equal in re.finditer("=", code):
            replacements.append((equal.start(), equal.end(), ":"))
        for boolean in re.finditer(r"\b(true|false)\b", code):
            replacements.append((boolean.start(), boolean.end(), boolean[1].title()))
        for first, last, replacement in sorted(replacements, reverse=True):
            expression = expression[:first] + replacement + expression[last:]
        cursor = end
        line_end = source.find("\n", end)
        line_end = len(source) if line_end < 0 else line_end
        if lexed.without_comments[end:line_end].strip():
            cursor = line_end
            continue  # Do not certify a prefix of an unsupported expression.
        if table is None or not supported:
            continue
        try:
            tree = ast.parse(expression.strip(), mode="eval")
            for node in ast.walk(tree):
                if isinstance(node, ast.Dict):
                    keys = [ast.literal_eval(key) for key in node.keys]
                    if not all(isinstance(key, str) for key in keys) or len(keys) != len(set(keys)):
                        return {}
            value = ast.literal_eval(tree)
        except (ValueError, SyntaxError):
            continue
        target = table
        for part in parts[:-1]:
            target = target.setdefault(part, {})
            if not isinstance(target, dict):
                break
        if isinstance(target, dict):
            if parts[-1] in target:
                return {}  # Duplicate keys are invalid TOML, not extra evidence.
            target[parts[-1]] = value
    return data


def read_mapping(path: Path, toml: bool = False) -> dict:
    try:
        if toml:
            source = read_text(path)
            data = tomllib.loads(source) if tomllib else literal_toml_mapping(source)
        else:
            data = json.loads(read_text(path))
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


def node_dependencies(root: Path) -> list[tuple[str, str]]:
    data = read_mapping(root / "package.json")
    return [(name, value.strip())
            for section in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies")
            if isinstance(data.get(section), dict)
            for name, value in data[section].items()
            if (name == "telnyx" or name.startswith("@telnyx/"))
            and isinstance(value, str)]


def node_version_is_constrained(value: str) -> bool:
    # Registry versions/ranges only; tags, URLs and workspace expressions stay
    # warnings. Every OR branch must provide numeric version evidence.
    release = r"v?\d+(?:\.\d+){0,2}(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?"
    wildcard = r"\d+(?:\.\d+)?\.[xX*]"
    for branch in value.split("||"):
        branch = re.sub(r"([~^<>=]+)\s+", r"\1", branch.strip())
        if re.fullmatch(release + r"\s+-\s+" + release, branch):
            continue
        if not branch or not all(re.fullmatch(
            r"(?:\^|~|>=|<=|>|<|=)?(?:" + release + "|" + wildcard + ")", token)
            for token in branch.split()):
            return False
    return True


def python_requirement(value: object) -> list[str]:
    if not isinstance(value, str):
        return []
    requirement = re.fullmatch(r"telnyx\s*(?:\[[\w, -]+\])?\s*(.*)",
                               value.strip(), re.IGNORECASE)
    if not requirement:
        return []
    suffix = requirement[1]
    # Do not mistake a different distribution, e.g. telnyx-tools, for Telnyx.
    if suffix and suffix[0] not in "<>=~!(@;":
        return []
    return [suffix.split(";", 1)[0].strip().strip("() ")]


_SETUP_FUNCTION = object()


class _SetupModule:
    """Static import identity, never an imported or executed Python module."""


_SETUP_MODULE = _SetupModule()


def setup_import_bindings(statement: ast.Import | ast.ImportFrom) -> dict:
    """Names replaced by an import; None denotes an unrecognized owner."""
    result = {}
    for alias in statement.names:
        name = alias.asname or alias.name.split(".")[0]
        result[name] = None
        if isinstance(statement, ast.Import):
            if alias.name == "setuptools" or (not alias.asname and alias.name.startswith("setuptools.")):
                result[name] = _SETUP_MODULE
        elif not statement.level and statement.module in {"setuptools", "distutils.core"} and alias.name == "setup":
            result[name] = _SETUP_FUNCTION
        elif not statement.level and statement.module == "setuptools" and alias.name == "*":
            # setuptools explicitly exports these names through __all__. Do
            # not erase unrelated local requirements or aliases on this import.
            result = dict.fromkeys(("Command", "Distribution", "Extension", "Require",
                                    "SetuptoolsDeprecationWarning", "find_namespace_packages", "find_packages"))
            result["setup"] = _SETUP_FUNCTION
    return result


def setup_literal(node: ast.AST, bindings: dict, depth: int = 0):
    """Resolve only local literal data, never execute setup code or imports."""
    if depth > 20:
        raise ValueError("literal binding depth")
    resolve = lambda child: setup_literal(child, bindings, depth + 1)
    if isinstance(node, ast.Name):
        return bindings[node.id]
    if isinstance(node, ast.Attribute) and node.attr == "setup" and isinstance(resolve(node.value), _SetupModule):
        return _SETUP_FUNCTION
    if isinstance(node, (ast.List, ast.Tuple)):
        values = [resolve(child) for child in node.elts]
        return tuple(values) if isinstance(node, ast.Tuple) else values
    if isinstance(node, ast.Dict) and all(key is not None for key in node.keys):
        return {resolve(key): resolve(value) for key, value in zip(node.keys, node.values)}
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = resolve(node.left), resolve(node.right)
        if type(left) is type(right) and isinstance(left, (str, list, tuple)):
            return left + right
        raise ValueError("nonliteral concatenation")
    return ast.literal_eval(node)


def setup_bindings(tree: ast.AST, call: ast.Call) -> dict:
    """Snapshot preceding straight-line assignments in the call's own scopes.

    Conditional writes and unknown mutations invalidate evidence. In particular,
    never borrow a later assignment or a binding from an unrelated function.
    """
    parents = {child: parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}
    path, child = [], call
    while child in parents:
        parent = parents[child]
        path.append((parent, child))
        child = parent
    bindings = {}

    def local_nodes(node):
        yield node
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            return
        for child in ast.iter_child_nodes(node):
            yield from local_nodes(child)

    def invalidate(names, mutation=False):
        # Containers can own aliases too, e.g. config={"requires": requirements}.
        def mutable_objects(value):
            objects = {id(value)} if isinstance(value, (list, dict, _SetupModule)) else set()
            children = value.values() if isinstance(value, dict) else value if isinstance(value, (list, tuple)) else ()
            for child in children:
                objects.update(mutable_objects(child))
            return objects

        objects = set().union(*(mutable_objects(bindings[name]) for name in names if name in bindings))
        if mutation and class_outer is not None:
            # Class-local rebinding stays local; mutating a shared outer module
            # or container does not. Never restore its stale entry snapshot.
            for name in list(class_outer):
                if mutable_objects(class_outer[name]) & objects:
                    del class_outer[name]
        for name in list(bindings):
            if name in names or mutable_objects(bindings[name]) & objects:
                del bindings[name]

    def preceding(statement):
        nonlocal bindings
        common_imports = {}
        if isinstance(statement, (ast.If, ast.Try)):
            # Reuse the same statement handling on each alternative, but merge
            # only import identity -- never conditional literal requirements.
            paths = []
            if isinstance(statement, ast.If):
                paths = [(statement.body, None, []), (statement.orelse, None, [])]
                headers = [statement.test]
            else:
                paths = [(statement.body + statement.orelse, None, statement.finalbody)]
                paths += [(handler.body, handler.name, statement.finalbody) for handler in statement.handlers]
                headers = [handler.type for handler in statement.handlers if handler.type is not None]
            if not any(isinstance(node, (ast.Call, ast.NamedExpr)) for header in headers for node in ast.walk(header)):
                incoming, alternatives = bindings, []
                try:
                    for body, exception_name, finalbody in paths:
                        bindings = incoming.copy()
                        if exception_name:
                            bindings.pop(exception_name, None)
                        for item in body:
                            preceding(item)
                        if exception_name:
                            bindings.pop(exception_name, None)
                        for item in finalbody:
                            preceding(item)
                        alternatives.append({name: value for name, value in bindings.items()
                                             if value is _SETUP_FUNCTION or value is _SETUP_MODULE})
                finally:
                    bindings = incoming
                common_imports = {name: value for name, value in alternatives[0].items()
                                  if all(other.get(name) is value for other in alternatives[1:])}
        nodes = list(local_nodes(statement))
        mutated = set()
        for node in nodes:
            if isinstance(node, ast.Call):
                try:
                    known_setup = setup_literal(node.func, bindings) is _SETUP_FUNCTION
                except (KeyError, ValueError, TypeError, SyntaxError):
                    known_setup = False
                operands = [*node.args, *(kw.value for kw in node.keywords)] if known_setup else [node]
                mutated.update(item.id for operand in operands for item in ast.walk(operand) if isinstance(item, ast.Name))
            elif isinstance(node, (ast.Attribute, ast.Subscript)) and isinstance(node.ctx, (ast.Store, ast.Del)):
                mutated.update(item.id for item in ast.walk(node.value) if isinstance(item, ast.Name))
        invalidate(mutated, mutation=True)
        if isinstance(statement, (ast.Assign, ast.AnnAssign)):
            targets = statement.targets if isinstance(statement, ast.Assign) else [statement.target]
            try:
                value = setup_literal(statement.value, bindings)
                resolved = True
            except (KeyError, ValueError, TypeError, SyntaxError):
                resolved = False
            for target in targets:
                if isinstance(target, ast.Name):
                    bindings.pop(target.id, None)
                    if resolved:
                        bindings[target.id] = value
                else:
                    invalidate({node.id for node in ast.walk(target) if isinstance(node, ast.Name)})
            return
        invalidate({node.id for node in nodes if isinstance(node, ast.Name)
                    and isinstance(node.ctx, (ast.Store, ast.Del))})
        # Conditional imports/definitions also replace names, even though the
        # AST represents them without Name(Store) nodes.
        for node in nodes:
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                effects = setup_import_bindings(node)
                if "*" in effects:
                    bindings.clear()
                invalidate(set(effects))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                bindings.pop(node.name, None)
        if isinstance(statement, (ast.Import, ast.ImportFrom)):
            bindings.update({name: value for name, value in setup_import_bindings(statement).items() if value is not None})
        bindings.update(common_imports)

    class_outer = None
    for parent, child in reversed(path):
        if class_outer is not None and isinstance(parent, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            # Only the outermost iterator is evaluated in the class namespace;
            # the comprehension body has its own enclosing lexical scope.
            if not any(node is call for node in ast.walk(parent.generators[0].iter)):
                bindings = class_outer
                class_outer = None
        if isinstance(parent, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            # A class body executes with its own locals, but is not a closure
            # for methods or nested classes. Preserve the outer lexical scope.
            if class_outer is not None:
                bindings = class_outer
                class_outer = None
            if isinstance(parent, ast.ClassDef):
                class_outer = bindings.copy()
        if isinstance(parent, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            # Python locals shadow outer names throughout the function, including
            # before their assignment. Parameters are unknown, not outer literals.
            statements = parent.body if isinstance(parent.body, list) else []
            locals_ = {node.id for statement in statements
                       for node in local_nodes(statement) if isinstance(node, ast.Name)
                       and isinstance(node.ctx, (ast.Store, ast.Del))}
            locals_.update(node.arg for node in ast.walk(parent.args) if isinstance(node, ast.arg))
            for statement in statements:
                for node in local_nodes(statement):
                    if isinstance(node, (ast.Import, ast.ImportFrom)):
                        locals_.update(alias.asname or alias.name.split(".")[0] for alias in node.names)
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                        locals_.add(node.name)
            for name in locals_:
                bindings.pop(name, None)
        if isinstance(parent, (ast.For, ast.AsyncFor, ast.With, ast.AsyncWith,
                               ast.ExceptHandler, ast.comprehension)):
            # These names are rebound by the header, before its body executes.
            targets = [parent.target] if isinstance(parent, (ast.For, ast.AsyncFor, ast.comprehension)) else (
                [item.optional_vars for item in parent.items if item.optional_vars is not None]
                if isinstance(parent, (ast.With, ast.AsyncWith)) else [])
            if isinstance(parent, ast.comprehension) and child is parent.iter:
                targets = []
            names = {node.id for target in targets for node in ast.walk(target) if isinstance(node, ast.Name)}
            if isinstance(parent, ast.ExceptHandler) and parent.name:
                names.add(parent.name)
            for name in names:
                bindings.pop(name, None)
        if isinstance(parent, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            visible = parent.generators
            for index, generator in enumerate(parent.generators):
                if any(node is call for node in ast.walk(generator.iter)):
                    visible = parent.generators[:index]
                    break
                if any(node is call for condition in generator.ifs for node in ast.walk(condition)):
                    visible = parent.generators[:index + 1]
                    break
            for generator in visible:
                for node in ast.walk(generator.target):
                    if isinstance(node, ast.Name):
                        bindings.pop(node.id, None)
        if isinstance(parent, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.With, ast.AsyncWith)):
            # Calls in a control-flow header may mutate the incoming data.
            headers = [parent.test] if isinstance(parent, (ast.If, ast.While)) else (
                [parent.iter] if isinstance(parent, (ast.For, ast.AsyncFor)) else
                [item.context_expr for item in parent.items])
            invalidate({name.id for header in headers for node in ast.walk(header)
                        if isinstance(node, ast.Call) for name in ast.walk(node) if isinstance(name, ast.Name)}, mutation=True)
        for _, children in ast.iter_fields(parent):
            if isinstance(children, list) and child in children and isinstance(child, ast.stmt):
                for previous in children[:children.index(child)]:
                    if isinstance(previous, ast.stmt):
                        preceding(previous)
    return bindings


def python_dependencies(root: Path) -> list[tuple[str, bool]]:
    """Read declared literal requirements; never execute setup.py or imports."""
    result = []

    def requirements(values: object) -> None:
        if isinstance(values, (list, tuple)):
            for value in values:
                result.extend((constraint, False) for constraint in python_requirement(value))

    def package_table(table: object, poetry: bool = False) -> None:
        if not isinstance(table, dict):
            return
        for name, value in table.items():
            if name.lower() == "telnyx":
                if isinstance(value, dict):
                    value = value.get("version", "")
                if isinstance(value, str):
                    result.append((value.strip(), poetry))

    # pip joins physical lines before removing comments. Per-requirement options
    # belong to pip, not to the PEP 440 version constraint (nor another package).
    source = re.sub(r"\\\r?\n", "", read_text(root / "requirements.txt"))
    requirements([re.split(r"\s+--(?:hash|config-settings)(?==|\s|$)",
                          re.sub(r"(^|\s+)#.*", "", line), maxsplit=1)[0]
                  for line in source.splitlines()])
    pipfile = read_mapping(root / "Pipfile", toml=True)
    for section in ("packages", "dev-packages"):
        package_table(pipfile.get(section))
    project = read_mapping(root / "pyproject.toml", toml=True)
    metadata = project.get("project", {})
    if isinstance(metadata, dict):
        requirements(metadata.get("dependencies"))
        optional = metadata.get("optional-dependencies", {})
        if isinstance(optional, dict):
            for values in optional.values():
                requirements(values)
    tool = project.get("tool", {})
    poetry = tool.get("poetry", {}) if isinstance(tool, dict) else {}
    if isinstance(poetry, dict):
        for section in ("dependencies", "dev-dependencies"):
            package_table(poetry.get(section), poetry=True)
        groups = poetry.get("group", {})
        if isinstance(groups, dict):
            for group in groups.values():
                if isinstance(group, dict):
                    package_table(group.get("dependencies"), poetry=True)
    config = configparser.ConfigParser(interpolation=None)
    try:
        config.read_string(read_text(root / "setup.cfg"))
        requirements(config.get("options", "install_requires", fallback="").splitlines())
        if config.has_section("options.extras_require"):
            for _, values in config.items("options.extras_require"):
                requirements(values.splitlines())
    except configparser.Error:
        pass
    try:
        tree = ast.parse(read_text(root / "setup.py"))
        for call in ast.walk(tree):
            if not isinstance(call, ast.Call):
                continue
            bindings = setup_bindings(tree, call)
            try:
                if setup_literal(call.func, bindings) is not _SETUP_FUNCTION:
                    continue
            except (KeyError, ValueError, TypeError, SyntaxError):
                continue
            for keyword in call.keywords:
                if keyword.arg not in {"install_requires", "extras_require"}:
                    continue
                try:
                    value = setup_literal(keyword.value, bindings)
                except (KeyError, ValueError, TypeError, SyntaxError):
                    continue
                if keyword.arg == "extras_require" and isinstance(value, dict):
                    for values in value.values():
                        requirements(values)
                elif keyword.arg == "install_requires":
                    requirements(value)
    except (ValueError, SyntaxError):
        pass
    return result


def python_version_is_constrained(value: str, poetry: bool = False) -> bool:
    """Bounded PEP 440 specifiers, with Poetry's table-only caret/tilde syntax."""
    numeric = r"(?:[0-9]+!)?[0-9]+(?:\.[0-9]+)*"
    release = (r"v?" + numeric
               + r"(?:[-_.]?(?:a|b|c|rc|alpha|beta|pre|preview)[-_.]?[0-9]*)?"
               + r"(?:-[0-9]+|[-_.]?(?:post|rev|r)[-_.]?[0-9]*)?"
               + r"(?:[-_.]?dev[-_.]?[0-9]*)?")
    local = r"(?:\+[a-z0-9]+(?:[-_.][a-z0-9]+)*)?"
    for token in value.split(","):
        match = re.fullmatch(r"(===|==|~=|>=|<=|!=|>|<|\^|~)?\s*(\S+)", token.strip())
        if not match:
            return False
        operator, version = match.groups()
        if operator == "===":
            continue  # PEP 440 explicitly permits arbitrary equality strings.
        if operator in {None, "^", "~"} and not poetry:
            return False
        if re.fullmatch(numeric + r"\.\*", version):
            if operator not in ({None, "==", "!="} if poetry else {"==", "!="}):
                return False
            continue
        if not re.fullmatch(release + local, version, re.IGNORECASE):
            return False
        if "+" in version and operator not in {None, "==", "!="}:
            return False
        if operator == "~=" and not re.match(r"v?(?:[0-9]+!)?[0-9]+\.[0-9]+", version):
            return False
    return True


@lru_cache(maxsize=1)
def source_ownership():
    spec = importlib.util.spec_from_file_location(
        "sdk_source_ownership", Path(__file__).with_name("sdk-source-ownership.py"))
    ownership = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ownership)
    return ownership


def ruby_dependencies(root: Path) -> list[str]:
    """Literal gem calls, bounded by arguments rather than whole source lines."""
    source = read_text(root / "Gemfile")
    if not source:
        return []
    ownership = source_ownership()
    lexed = ownership.lexed_source(source, ".rb")
    strings = {token.start: token for token in lexed.strings}
    result = []

    def literal(token) -> bool:
        raw = source[token.start:token.end]
        return (raw.startswith(("'", '"', "%q", "%Q"))
                and "#{" not in token.contents and "\\" not in token.contents)

    def skip_space(cursor: int) -> int:
        # The shared lexer masks percent strings even in without_comments.
        # Stop at their token boundary rather than eating the literal as space.
        while cursor < len(source) and cursor not in strings and lexed.without_comments[cursor].isspace():
            cursor += 1
        return cursor

    for call in re.finditer(r"(?<![\w.:])gem\b", lexed.code):
        cursor = skip_space(call.end())
        if source[cursor:cursor + 1] == "(":
            cursor = skip_space(cursor + 1)
        token = strings.get(cursor)
        if token is None or not literal(token) or token.contents != "telnyx":
            continue
        if not re.match(r"[ \t]*(?=[,;\n)]|(?:if|unless)\b|$)", lexed.without_comments[token.end:]):
            continue  # The package name is an expression, not this literal.
        cursor, constraints = token.end, []
        while True:
            comma = re.match(r"[ \t]*(?:\r?\n[ \t]*)?,", lexed.without_comments[cursor:])
            if comma is None:
                break
            token = strings.get(skip_space(cursor + comma.end()))
            if token is None or not literal(token):
                break
            if not re.match(r"[ \t]*(?=[,;\n)]|(?:if|unless)\b|$)", lexed.without_comments[token.end:]):
                break
            constraints.append(token.contents)
            cursor = token.end
        result.append(",".join(constraints))
    return result


def ruby_version_is_constrained(value: str) -> bool:
    return bool(value and all(re.fullmatch(
        r"(?:~>|>=|<=|!=|>|<|=)?\s*\d+(?:\.[0-9A-Za-z]+)*(?:-[0-9A-Za-z.-]+)?",
        token.strip()) for token in value.split(",")))


def go_dependencies(root: Path) -> list[str]:
    source = read_text(root / "go.mod")
    result, block = [], False
    for line in source.splitlines():
        line = line.split("//", 1)[0].strip()
        if re.fullmatch(r"require\s*\(", line):
            block = True
            continue
        if line == ")":
            block = False
            continue
        if not block:
            match = re.match(r"require\s+(.+)", line)
            if not match:
                continue
            line = match[1]
        dependency = re.fullmatch(
            r'"?github\.com/team-telnyx/telnyx-go(?:/v[0-9]+)?"?\s+"?(v[^"\s]+)"?', line)
        if dependency:
            result.append(dependency[1])
    return result


def other_declared(root: Path) -> bool:
    # Match the validator's existing root + two directory levels for these
    # manifests. Version checking remains root-scoped, as before.
    for directory, dirs, _ in os.walk(root):
        path = Path(directory)
        dirs[:] = [name for name in dirs if name not in {
            ".git", "node_modules", "vendor", ".venv", "build"}
            and len(path.relative_to(root).parts) < 2]
        if python_dependencies(path) or node_dependencies(path) or ruby_dependencies(path):
            return True
    return bool(go_dependencies(root))


def other_pinned(root: Path) -> bool:
    return (any(python_version_is_constrained(value, poetry) for value, poetry in python_dependencies(root))
            or any(name == "telnyx" and node_version_is_constrained(value)
                   for name, value in node_dependencies(root))
            or any(ruby_version_is_constrained(value) for value in ruby_dependencies(root))
            or any(re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", value)
                   for value in go_dependencies(root)))


def composer_constraints(root: Path, package: str = "telnyx/telnyx-php") -> list[str]:
    """Read only real dependency links, shared by presence and version checks."""
    try:
        data = json.loads((root / "composer.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(data, dict):
        return []
    return [
        data[section][package].strip()
        for section in ("require", "require-dev")
        if isinstance(data.get(section), dict)
        and isinstance(data[section].get(package), str)
        and bool(data[section][package].strip())
    ]


def composer_declared(root: Path, package: str = "telnyx/telnyx-php") -> bool:
    return bool(composer_constraints(root, package))


def composer_version_is_constrained(value: object) -> bool:
    """Recognize common Composer constraints, not resolve or solve them.

    Exact releases, numeric ranges/wildcards, and explicit dev branches supply
    version evidence. Bare wildcards and stability-only flags do not. Every OR
    alternative must constrain a version; an AND may contain a neutral wildcard.
    Unsupported syntax (including inline aliases) conservatively stays a warning.
    A constraint is not a lockfile or a guarantee against breaking upgrades.
    See https://getcomposer.org/doc/articles/versions.md and the schema's links.
    """
    if not isinstance(value, str) or not value.strip():
        return False
    release = (r"v?[0-9]+(?:\.[0-9]+){0,3}"
               r"(?:[._-]?(?:stable|alpha|a|beta|b|RC|patch|pl|p)"
               r"(?:[.-]?[0-9]+(?:[.-][0-9]+)*)?)?(?:[.-]?dev)?"
               r"(?:\+[A-Za-z0-9.-]+)?")
    wildcard = r"v?[0-9]+(?:\.[0-9]+){0,2}(?:\.[x*]){1,3}"
    stability = r"@(dev|stable|alpha|beta|RC)$"

    def atom(token: str) -> bool | None:
        if not token:
            return None
        token = re.sub(stability, "", token, flags=re.IGNORECASE)
        if not token or re.fullmatch(r"[x*](?:\.[x*])*", token, re.IGNORECASE):
            return False
        if re.fullmatch(r"(?:dev-[A-Za-z0-9_][A-Za-z0-9_./-]*|"
                        + wildcard + r"-dev)(?:#[A-Za-z0-9]+)?",
                        token, re.IGNORECASE):
            return True
        if re.fullmatch(r"(?:\^|~|>=|<=|!=|<>|==|=|>|<)?" + release,
                        token, re.IGNORECASE):
            return True
        if re.fullmatch(wildcard, token, re.IGNORECASE):
            return True
        return None

    for alternative in re.split(r"\|\|?", value.strip()):
        alternative = alternative.strip()
        if re.fullmatch(release + r"\s+-\s+" + release,
                        alternative, re.IGNORECASE):
            continue
        # Whitespace after an operator belongs to that atom, not to an AND.
        alternative = re.sub(r"([~^<>=!]+)\s+", r"\1", alternative)
        atoms = [atom(token) for token in re.split(r"\s*,\s*|\s+", alternative)]
        if None in atoms or not any(atoms):
            return False
    return True


def composer_pinned(root: Path, package: str = "telnyx/telnyx-php") -> bool:
    return any(composer_version_is_constrained(value)
               for value in composer_constraints(root, package))


def maven_dependencies(path: Path) -> list[tuple[str, str, str]]:
    try:
        text = path.read_text(encoding="utf-8")
        # Manifests need no entities. Avoid entity expansion on untrusted input.
        if "<!DOCTYPE" in text or "<!ENTITY" in text:
            return []
        project = ET.fromstring(text)
    except (OSError, ValueError, ET.ParseError):
        return []
    for node in project.iter():
        node.tag = node.tag.rsplit("}", 1)[-1]
    if project.tag != "project":
        return []
    properties = {node.tag: (node.text or "").strip()
                  for node in project.findall("./properties/*")}

    def resolve(value: str) -> str:
        seen = set()
        while re.fullmatch(r"\$\{[^}]+\}", value) and value not in seen:
            seen.add(value)
            value = properties.get(value[2:-1], "")
        return value

    def field(node: ET.Element, name: str) -> str:
        return resolve((node.findtext(name) or "").strip())

    managed = {
        (field(dep, "groupId"), field(dep, "artifactId")): field(dep, "version")
        for dep in project.findall("./dependencyManagement/dependencies/dependency")
    }
    dependencies = []
    for dep in project.findall("./dependencies/dependency"):
        group, artifact = field(dep, "groupId"), field(dep, "artifactId")
        # An explicit unresolved version must not fall back to management.
        version = (field(dep, "version") if dep.find("version") is not None
                   else managed.get((group, artifact), ""))
        dependencies.append((group, artifact, version))
    return dependencies


def maven_pinned(path: Path) -> bool:
    return any(group == "com.telnyx.sdk" and artifact in JVM_ARTIFACTS
               and version_is_constrained(version)
               for group, artifact, version in maven_dependencies(path))


def groovy_slashy_ranges(source: str, code: str) -> list[tuple[int, int]]:
    """Exclude Groovy's additional string delimiters from declaration evidence.

    Ordinary quotes/comments are already masked by the shared lexer. Slashy
    strings are expressions, so a division operator after an operand isn't an
    opener. This does not evaluate interpolation or arbitrary build programs.
    """
    ranges = []
    end = 0
    for match in re.finditer(r"\$/|/(?![/*])", code):
        start = match.start()
        if start < end:
            continue
        dollar = match[0] == "$/"
        prefix = code[:start].rstrip()
        if not dollar and prefix and prefix[-1] not in "=(:,[!?{" and not re.search(r"\breturn$", prefix):
            continue
        cursor = match.end()
        while cursor < len(source):
            if dollar and source.startswith("/$", cursor):
                cursor += 2
                break
            if not dollar and source[cursor] == "/":
                cursor += 1
                break
            if (dollar and source[cursor] == "$" and cursor + 1 < len(source)
                    and source[cursor + 1] in "$/") or (not dollar and source[cursor] == "\\"):
                cursor += 2
            else:
                cursor += 1
        end = cursor
        ranges.append((start, end))
    return ranges


def gradle_dependencies(root: Path, catalog_root: Path | None = None) -> list[tuple[str, str, object]]:
    ownership = source_ownership()
    analyzer = ownership.load_script("lint-required-messaging-profile")
    dependencies = []
    accessors = set()
    for name in ("build.gradle", "build.gradle.kts"):
        try:
            source = (root / name).read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        # Reuse source masking: inline comments and help strings aren't code.
        lexed = ownership.lexed_source(source, ".kt" if name.endswith(".kts") else ".java")
        strings = {token.start: token for token in lexed.strings}
        inert_ranges = groovy_slashy_ranges(source, lexed.code) if name == "build.gradle" else []
        declaration = r"\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\b"
        for match in re.finditer(declaration, lexed.code):
            if any(start <= match.start() < end for start, end in inert_ranges):
                continue
            prefix = re.match(r"\s*\(?\s*", lexed.without_comments[match.end():])
            start = match.end() + prefix.end()
            token = strings.get(start)
            if token:
                parts = token.contents.split(":")
                if len(parts) in {2, 3}:
                    dependencies.append((parts[0], parts[1], parts[2] if len(parts) == 3 else ""))
            else:
                accessor = re.match(r"libs\.([\w.]+)", lexed.code[start:])
                if accessor:
                    accessors.add(accessor[1])
                    continue
                # Groovy also accepts named-map dependency notation:
                # implementation group: 'g', name: 'a', version: '1.2.3'
                # and the equivalent parenthesized call. Read only string
                # tokens belonging to this declaration, so comments and prose
                # cannot contribute coordinates.
                cursor = match.end()
                while (cursor < len(lexed.code)
                       and lexed.code[cursor] in " \t\r"):
                    cursor += 1
                parenthesized = (cursor < len(lexed.code)
                                 and lexed.code[cursor] == "(")
                if parenthesized:
                    closing = analyzer.matching_delimiter(
                        lexed.code, cursor, "(", ")")
                    if closing is None:
                        continue
                    argument_start, argument_end = cursor + 1, closing
                else:
                    argument_start, argument_end = cursor, len(lexed.code)
                fields = {}
                cursor = argument_start
                continued = parenthesized
                while cursor < argument_end:
                    while (cursor < argument_end
                           and lexed.code[cursor].isspace()
                           and (continued or lexed.code[cursor] != "\n")):
                        cursor += 1
                    field = re.match(r"(group|name|version)\s*:",
                                     lexed.code[cursor:argument_end])
                    if field is None:
                        break
                    value_start = cursor + field.end()
                    while (value_start < argument_end
                           and lexed.without_comments[value_start].isspace()):
                        value_start += 1
                    token = strings.get(value_start)
                    if token and token.end <= argument_end:
                        fields[field[1]] = token.contents
                        cursor = token.end
                    else:
                        # Dynamic/unsupported values invalidate an earlier
                        # duplicate literal instead of leaving stale evidence.
                        fields[field[1]] = None
                        boundary = re.search(r"[,;\n})]",
                                             lexed.code[value_start:argument_end])
                        cursor = (argument_end if boundary is None else
                                  value_start + boundary.start())
                    while (cursor < argument_end
                           and lexed.code[cursor] in " \t\r"):
                        cursor += 1
                    if cursor >= argument_end or lexed.code[cursor] != ",":
                        break
                    cursor += 1
                    continued = True
                if "group" in fields and "name" in fields:
                    dependencies.append((fields["group"], fields["name"],
                                         fields.get("version", "")))
    if tomllib is None:
        return dependencies
    try:
        catalog = tomllib.loads(((catalog_root or root) / "gradle/libs.versions.toml").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return dependencies
    libraries, versions = catalog.get("libraries", {}), catalog.get("versions", {})
    if not isinstance(libraries, dict) or not isinstance(versions, dict):
        return dependencies
    for alias, entry in libraries.items():
        accessor = re.sub(r"[-_]", ".", alias)
        if accessor not in accessors:
            continue
        if isinstance(entry, str):
            parts = entry.split(":")
            if len(parts) != 3:
                continue
            group, artifact, version = parts
        elif isinstance(entry, dict):
            module = entry.get("module")
            if isinstance(module, str) and module.count(":") == 1:
                group, artifact = module.split(":")
            else:
                group, artifact = entry.get("group"), entry.get("name")
            version = entry.get("version")
            if isinstance(version, dict):
                reference = version.get("ref")
                if isinstance(reference, str):
                    version = versions.get(reference)
                if isinstance(version, dict):
                    # Rich catalog versions are still attached to the consumed
                    # library. Preferences alone are not a hard requirement.
                    version = version.get("strictly", version.get("require"))
        else:
            continue
        dependencies.append((group, artifact, version))
    return dependencies


def gradle_pinned(root: Path) -> bool:
    return any(group == "com.telnyx.sdk" and artifact in JVM_ARTIFACTS
               and version_is_constrained(version)
               for group, artifact, version in gradle_dependencies(root))


def jvm_declared(root: Path, vendor: str) -> bool:
    for directory, dirs, names in os.walk(root):
        relative = Path(directory).relative_to(root)
        dirs[:] = [name for name in dirs if name not in {
            ".git", "node_modules", "build", "vendor", ".gradle", ".venv"}
            and len(relative.parts) < 3]
        path = Path(directory)
        dependencies = maven_dependencies(path / "pom.xml") if "pom.xml" in names else []
        if "build.gradle" in names or "build.gradle.kts" in names:
            dependencies.extend(gradle_dependencies(path, root))
        if any((group == "com.telnyx.sdk" and artifact in JVM_ARTIFACTS)
               if vendor == "telnyx" else (group == "com.twilio.sdk" and artifact == "twilio")
               for group, artifact, _ in dependencies):
            return True
    return False


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in {"composer", "composer-pinned", "jvm-pinned", "jvm-declared", "twilio-jvm-declared", "other-declared", "other-pinned"}:
        return 2
    root = Path(sys.argv[2])
    mode = sys.argv[1]
    if mode == "other-declared":
        found = other_declared(root)
    elif mode == "other-pinned":
        found = other_pinned(root)
    elif mode == "composer":
        found = composer_declared(root)
    elif mode == "composer-pinned":
        found = composer_pinned(root)
    elif mode.endswith("declared"):
        found = jvm_declared(root, "twilio" if mode.startswith("twilio") else "telnyx")
    else:
        found = maven_pinned(root / "pom.xml") or gradle_pinned(root)
    return 0 if found else 1


if __name__ == "__main__":
    sys.exit(main())
