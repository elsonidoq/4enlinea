---
name: feedback_never_print_secrets
description: "Never print secret/credential values in conversation text, even ones judged low-risk (sandbox, non-prod) — verify via hash/length/prefix or point to the source instead"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c216fe71-581c-46a4-9338-1fe6dee3fc31
  modified: 2026-07-18T15:47:37.888Z
---

**Never print a secret's actual value in the conversation, full stop — no "it's just sandbox" / "low blast radius" exception.**

**Why:** Printed a Paddle sandbox webhook notification secret in plain text twice while helping debug a signature-verification failure, reasoning it was low-risk (sandbox-only, no real money, staging deployment). The user corrected this: risk-based judgment calls about whether a secret is "risky enough" to protect are exactly the failure mode to avoid — the rule needs to be unconditional, not something I re-assess per secret. Conversation history can persist longer than the immediate debugging need, regardless of how contained the blast radius looks in the moment.

**How to apply:**
- When a value needs verifying against what's configured elsewhere (env var, dashboard, etc.), use a non-exposing comparison instead of the raw value: a truncated hash (e.g. first 8 hex chars of SHA-256), a length check, or at most a few leading/trailing characters.
- If a tool call's result contains a secret (e.g. Paddle's `notificationSettings.get`/`.create` returning `endpoint_secret_key`), it's fine to use that value internally (compute a hash, pass it to another call) — just don't echo it back into the visible response.
- Prefer pointing the user at the authoritative source ("check Railway's Variables tab") over relaying a value I already have.
- If a secret has already leaked into the transcript, default to *offering* rotation as the first response, even if the user ultimately declines — don't wait to be asked, and don't let "they might say no" stop the offer.
- Applies to all credential types: API keys, webhook/signing secrets, tokens, passwords — not just the Paddle case that surfaced this.

**Secret-shaped hits in this repo's git history are all placeholders.** A `git log -S`/pickaxe scan turning up `sb_secret_…`, `PASSWORD`, `whsec_…`, or `sk-ant-…` is not a live leak — no rotation is required. The full pickaxe evidence (the five inspected commits) lives in `docs/security_audit_fable.md`. When a secret scan lights up, read that doc before raising an alarm.
