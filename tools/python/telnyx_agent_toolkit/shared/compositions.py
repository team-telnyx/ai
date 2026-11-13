"""Small, explicit read-only compositions. No mutation fallback or route guessing."""

from __future__ import annotations

import asyncio
import re
from collections.abc import Awaitable, Callable
from typing import Any

# Uses the existing single-tool dispatch so transport/encoding stays centralized.
ReadTool = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]


async def execute_composition(
    name: str, args: dict[str, Any], read_tool: ReadTool
) -> dict[str, Any]:
    """Execute a named composition using only its declared GET dependencies."""
    args = dict(args)
    if name == "get_voice_clone":
        return await _get_voice_clone(args, read_tool)
    if name != "bulk_lookup_numbers":
        raise ValueError(f"Unknown composition: {name}")
    numbers = args.get("phone_numbers")
    concurrency = args.get("concurrency", 5)
    if (
        set(args) - {"phone_numbers", "concurrency", "type"}
        or not isinstance(numbers, list)
        or not 1 <= len(numbers) <= 100
        or any(
            not isinstance(n, str) or not re.fullmatch(r"\+[1-9][0-9]{1,14}", n)
            for n in numbers
        )
        or type(concurrency) is not int
        or not 1 <= concurrency <= 10
        or (
            args.get("type") is not None
            and args["type"] not in ("carrier", "caller-name")
        )
    ):
        raise ValueError(
            "Invalid bulk_lookup_numbers arguments: expected 1-100 E.164 numbers, "
            "concurrency 1-10 and optional lookup type"
        )
    numbers = list(numbers)  # Freeze validated membership across network awaits.
    results: list[dict[str, Any]] = [{} for _ in numbers]
    cursor = 0

    async def worker() -> None:
        nonlocal cursor
        while cursor < len(numbers):
            index = cursor
            cursor += 1
            number = numbers[index]
            lookup_args = {"phone_number": number}
            if args.get("type") is not None:
                lookup_args["type"] = args["type"]
            try:
                response = await read_tool("lookup_number", lookup_args)
                results[index] = {"phone_number": number, "response": response}
            except Exception as exc:
                results[index] = {"phone_number": number, "error": str(exc)}

    await asyncio.gather(*(worker() for _ in range(min(concurrency, len(numbers)))))
    failed = sum("error" in result for result in results)
    return {"results": results, "succeeded": len(results) - failed, "failed": failed}


async def _get_voice_clone(args: dict[str, Any], read_tool: ReadTool) -> dict[str, Any]:
    clone_id = args.get("id")
    size = args.get("page_size", 100)
    limit = args.get("max_pages", 20)
    if (
        set(args) - {"id", "page_size", "max_pages"}
        or not isinstance(clone_id, str)
        or not clone_id.strip()
        or type(size) is not int
        or not 1 <= size <= 250
        or type(limit) is not int
        or not 1 <= limit <= 100
    ):
        raise ValueError(
            "Invalid get_voice_clone arguments: expected id, "
            "page_size 1-250 and max_pages 1-100"
        )
    for page in range(1, limit + 1):
        response = await read_tool(
            "list_voice_clones", {"page_number": page, "page_size": size}
        )
        data = response.get("data")
        if not isinstance(data, list) or any(
            not isinstance(item, dict) or not isinstance(item.get("id"), str)
            for item in data
        ):
            raise ValueError("Invalid voice clone list response")
        meta = response.get("meta")
        if not isinstance(meta, dict):
            raise ValueError("Invalid voice clone pagination metadata")
        total = meta.get("total_pages")
        current = meta.get("page_number")
        if (
            type(total) is not int
            or type(current) is not int
            or current != page
            or total < 0
            or (total == 0 and (page != 1 or data))
            or (total > 0 and page > total)
        ):
            raise ValueError("Invalid voice clone pagination metadata")
        for clone in data:
            if clone["id"] == clone_id:
                return {"data": clone}
        if page >= total:
            return {"data": None, "status": "not_found", "pages_scanned": page}
    return {"data": None, "status": "incomplete", "pages_scanned": limit}
