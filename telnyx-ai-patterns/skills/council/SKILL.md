---
name: telnyx-council
description: >-
  Parallel AI debugging pattern for breaking out of loops. When stuck after
  2+ failed attempts, spawn multiple Telnyx LLM models simultaneously with
  the same problem brief. Each model diagnoses independently — you read all
  responses before acting. Models have different blind spots; parallel diagnosis
  surfaces what sequential misses.
metadata:
  author: telnyx
  product: ai-inference
  language: python
  requires:
    env:
      - TELNYX_API_KEY
---

# The Council: Parallel AI Debugging

You know the feeling. You have been staring at the same bug for an hour. You have tried three fixes. Each one made sense at the time. None of them worked. You are going in circles, and every next attempt looks suspiciously like a variation of the last one.

That is the loop. And the reason you cannot break out of it is not a skill problem. It is an anchoring problem. Once your brain (or your AI assistant) commits to a theory of what is wrong, every subsequent attempt orbits that theory. You need a second opinion. Better yet, you need three, and they all need to form independently.

## The Pattern

The Council is simple:

1. **Stop.** After two failed fix attempts, do not try a third.
2. **Write a brief.** Describe the problem, what you tried, and what happened. Be specific.
3. **Spawn three models in parallel.** Send the same brief to three different LLMs on Telnyx's inference API at the same time.
4. **Read all three responses before acting.** Do not read one and start implementing. Read all of them. Look for where they agree, where they disagree, and what each one caught that the others missed.
5. **Synthesize and act.** Now you have a map of the problem space, not just one path through it.

The parallel part is not optional. If you send the brief to one model, read its answer, then send to the next, the first answer will color how you read the second. You will unconsciously favor whichever diagnosis you saw first. That is anchoring bias, and it is exactly what got you stuck in the first place.

## The Council Brief Template

Before spawning the council, fill this out. The quality of your brief determines the quality of the diagnoses.

```
COUNCIL BRIEF
=============
Problem: [One sentence. What is broken?]

Context: [What does this code/system do? Include the relevant file paths,
function names, error messages. Paste the actual error, not a summary.]

Attempts so far:
  1. [What you tried] -> [What happened]
  2. [What you tried] -> [What happened]

Constraints: [Anything the fix must respect: backwards compatibility,
no new dependencies, must work on Python 3.9+, etc.]

Question: What is the root cause, and what should I try next?
```

## Setup

Export your Telnyx API key:

```bash
export TELNYX_API_KEY="your-api-key-here"
```

## Python Implementation

This script sends the same problem brief to three Telnyx-hosted models in parallel using `concurrent.futures` and prints all responses together.

```python
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import HTTPError

TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY")
if not TELNYX_API_KEY:
    raise RuntimeError("Set TELNYX_API_KEY environment variable before running")

API_URL = "https://api.telnyx.com/v2/ai/chat/completions"

COUNCIL_MODELS = [
    "Qwen/Qwen3-235B-A22B",
    "moonshotai/Kimi-K2.5",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
]

SYSTEM_PROMPT = (
    "You are a senior debugging advisor. The developer is stuck and has already "
    "tried multiple fixes that failed. Analyze the problem from first principles. "
    "Do not repeat their previous attempts. Focus on root causes they may have "
    "overlooked. Be specific and actionable."
)


def query_model(model: str, brief: str) -> dict:
    """Send the council brief to a single model and return the response."""
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": brief},
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }).encode("utf-8")

    req = Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {TELNYX_API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            return {"model": model, "response": content, "error": None}
    except HTTPError as e:
        return {"model": model, "response": None, "error": f"HTTP {e.code}: {e.read().decode()}"}
    except Exception as e:
        return {"model": model, "response": None, "error": str(e)}


def run_council(brief: str) -> list[dict]:
    """Spawn all council models in parallel and collect responses."""
    results = []
    with ThreadPoolExecutor(max_workers=len(COUNCIL_MODELS)) as pool:
        futures = {
            pool.submit(query_model, model, brief): model
            for model in COUNCIL_MODELS
        }
        for future in as_completed(futures):
            results.append(future.result())
    return results


def print_council(results: list[dict]) -> None:
    """Print all council responses in a readable format."""
    print("=" * 70)
    print("COUNCIL RESPONSES")
    print("=" * 70)
    for i, r in enumerate(results, 1):
        print(f"\n--- Model {i}: {r['model']} ---\n")
        if r["error"]:
            print(f"[ERROR] {r['error']}")
        else:
            print(r["response"])
        print()
    print("=" * 70)
    print("Read all three before acting. Look for agreement and disagreement.")
    print("=" * 70)


if __name__ == "__main__":
    brief = """
COUNCIL BRIEF
=============
Problem: WebSocket connections drop after exactly 60 seconds in production
but work fine locally.

Context: FastAPI app using websockets library. The handler at
/ws/chat keeps connections alive with ping/pong frames every 30s.
Deployed on Kubernetes behind an nginx ingress controller.
Error in client logs: "WebSocket connection to 'wss://...' failed"
No error in server logs at all.

Attempts so far:
  1. Increased websocket ping interval to 15s -> Still drops at 60s
  2. Added explicit timeout=None to websockets.serve() -> No change

Constraints: Cannot modify the nginx ingress controller config directly
(managed by platform team), but can add annotations to the Ingress resource.

Question: What is the root cause, and what should I try next?
    """.strip()

    results = run_council(brief)
    print_council(results)
```

## Example Output

Here is what a real council session looks like. Three models, same brief, different angles:

```
======================================================================
COUNCIL RESPONSES
======================================================================

--- Model 1: Qwen/Qwen3-235B-A22B ---

The 60-second timeout is almost certainly nginx's `proxy_read_timeout`
default, not a WebSocket issue. Your ping/pong frames are application-level
WebSocket frames, but nginx's timeout operates at the HTTP/proxy layer.
nginx considers the connection idle if it has not proxied any data in 60
seconds, regardless of WebSocket control frames.

Add these annotations to your Kubernetes Ingress resource:

    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"

The reason you see no server-side error is that nginx terminates the
upstream connection silently. Your FastAPI server sees a clean close,
not an error.

--- Model 2: moonshotai/Kimi-K2.5 ---

Two things are happening here:

1. The nginx ingress controller has a default `proxy_read_timeout` of 60s.
   This is the immediate cause. Fix it with ingress annotations.

2. But there is a deeper issue: your ping/pong frames at 30s should reset
   the timeout, yet they do not. This means your nginx is not configured
   for WebSocket upgrade properly. Check that you have:

       nginx.ingress.kubernetes.io/websocket-services: "your-service-name"

   Without this, nginx may be treating the connection as plain HTTP and
   not forwarding WebSocket frames bidirectionally. The timeout annotation
   alone will mask this problem, not fix it.

Also verify your Ingress has the annotation:
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"

--- Model 3: meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8 ---

This is the classic nginx 60-second proxy timeout. Your WebSocket pings
are not visible to nginx because they are WebSocket-layer frames, not
HTTP-layer activity.

Fix: add `proxy-read-timeout` and `proxy-send-timeout` annotations to
your Ingress resource, set to something like 3600.

But before you do that, check one more thing: do you have multiple
replicas behind a Service? If the Service has `sessionAffinity: None`,
reconnection attempts after the drop may hit a different pod, losing
session state. Set `sessionAffinity: ClientIP` or use sticky sessions
in the ingress if your app requires it.

======================================================================
Read all three before acting. Look for agreement and disagreement.
======================================================================
```

**What you get from the council that no single model gives you:**

- All three agree on the root cause (nginx `proxy_read_timeout`), so you can act with high confidence.
- Model 2 caught a deeper issue: the WebSocket upgrade might not be configured properly, which means the timeout annotation alone could be a band-aid.
- Model 3 flagged a completely different concern (session affinity) that was not in the original brief at all.

If you had asked just one model and started implementing, you would have added the timeout annotation and called it done. The council surfaced two additional issues that would have bitten you later.

## Why Parallel, Not Sequential

When you read Model 1's answer first, your brain files it as "probably right" and evaluates everything after it through that lens. This is anchoring bias, and it is well-documented in decision science.

In the example above, if you had read Model 1 first (just add the timeout annotation), you might have dismissed Model 2's point about WebSocket upgrade configuration as "overthinking it." But Model 2 was right: the timeout annotation alone would mask a real misconfiguration.

Parallel execution means you see all three at once. No anchor. You evaluate them as peers, not as a first answer and two follow-ups.

## Customizing the Council

**Swap models:** Replace any model in `COUNCIL_MODELS` with another model available on Telnyx's inference API. Different model families have different strengths.

**Adjust temperature:** The default is 0.7. Higher values (0.8-1.0) produce more diverse diagnoses but may introduce noise. Lower values (0.3-0.5) produce more focused but potentially more similar responses.

**Change the system prompt:** The default prompt tells models to think from first principles and avoid repeating failed attempts. Adjust this if your problem domain needs different framing.

**Add more models:** The pattern works with any number of council members. Three is a good default because it balances diversity against reading time.

## Troubleshooting

**"Set TELNYX_API_KEY environment variable before running"**
You have not exported your API key. Run `export TELNYX_API_KEY="your-key"` in your terminal, or add it to your shell profile.

**One model returns an error while others succeed**
This is normal. Models have different availability windows and rate limits. The council still works with two responses. If all three fail, check your API key and network connectivity.

**Responses are too similar**
Try increasing the temperature to 0.9 or swapping in a model from a different family. Models from the same family (e.g., two Llama variants) will tend to agree more than models from different families.

**Responses are too long or unfocused**
Your brief is probably too vague. The more specific your problem description and error messages, the more targeted the responses. Paste actual error output, not summaries.

**Timeout errors**
The default timeout is 120 seconds per model. Large models generating long responses may need more time. Increase the `timeout` parameter in the `urlopen` call.

## When to Use the Council

- After 2+ failed debugging attempts on the same issue
- When you suspect your mental model of the bug is wrong but cannot see how
- Before making an irreversible change (database migration, production deploy) based on a single diagnosis
- When the bug is in an unfamiliar codebase or technology

## When Not to Use It

- For straightforward bugs where you know the cause and just need the syntax
- As a replacement for reading documentation or understanding the system
- On every single problem (save it for when you are genuinely stuck)
