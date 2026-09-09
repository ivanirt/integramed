---
type: Skill
title: playbook template
description: Vault concept (.skills/alt-med-vault/assets/playbook-template.md).
tags: [alt-med, okf]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:13:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: vault-curation
    resource: boericke-vault/
    title: Agent vault curation (structure, playbooks, indexes)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:13:00Z
---

# Playbook — {{title}}

Load `DISCLAIMER.md` first. Interview order lives in the skill file `references/domains.md`.

## Rank

| Signal | Weight |
|---|---|
| Native pattern match (keynote / zang-fu / goal) | high |
| Contraindication | veto |
| Evidence / source fidelity | high |
| Relationship graph (compare vs complement) | medium |

## Output

1. Ranked 3–7 entries with one-line why
2. Differentials
3. Questions still missing
4. Clinician / red-flag reminder
