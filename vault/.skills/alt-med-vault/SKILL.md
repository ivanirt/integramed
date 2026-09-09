---
type: Skill
title: alt-med-vault
description: Vault concept (.skills/alt-med-vault/SKILL.md).
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
name: alt-med-vault
metadata:
  type: workflow
  version: "1.0"
---
# Alternative-medicine multi-vault

Operate one vault with isolated domains that share a safety layer and wikilink conventions. Do not mix repertory logic from homeopathy with peptide stacks or herbal energetics in the same ranking pass.

## Safety (always)

1. Read `references/safety.md` before recommendations.
2. State that output is literature mapping, not a diagnosis or prescription.
3. Red flags (chest pain, suicidality, anaphylaxis, pregnancy emergencies, severe infection, hypoglycemia) — stop matching and tell the user to seek urgent care.
4. Never give reconstitution math, injection technique, vendor links, or a personal dose for unapproved peptides.
5. Prefer labeled prescription products when the user goal is a regulated indication (for example GLP-1 for diabetes).

## Vault layout (canonical)

```
vault-root/
  README.md
  agent/
    DISCLAIMER.md
    ROUTER.md
  domains/
    homeopathy/
    peptides/
    herbal/
    tcm/
    ayurveda/
```

Each domain MUST contain

| File | Role |
|---|---|
| README.md | Scope, source edition, what the agent may do |
| agent/PLAYBOOK.md | Interview + scoring for THAT system only |
| agent/DISCLAIMER.md | Domain-specific legal/safety |
| indexes/FULL-LIST.md | Complete roster from the source |
| indexes/BY-GOAL.md or BY-SYSTEM.md | Fast routing |
| relationships/GRAPH.md | Compare / complement / avoid / stack |
| entries/*.md | One note per remedy, herb, peptide, formula |

Copy templates from `assets/`.

## When the user adds a new medicine system

1. Pick a slug (herbal, tcm, ayurveda, anthroposophy).
2. Run `scripts/scaffold-domain.sh <vault-root> <slug> "<Human title>"`.
3. Fill `indexes/FULL-LIST.md` from the table of contents or official roster of the cited book — names only if the work is copyrighted.
4. Write original entry notes (class, sphere, keynotes in your own words). Do not paste book chapters.
5. Wire `vault-root/agent/ROUTER.md` and root README.md with a wikilink to `domains/<slug>/README.md`.
6. Add relationship edges only inside that domain unless a cross-domain "do not combine" warning is needed.

## Agent runtime (user asks for help)

1. Open `agent/ROUTER.md` (or infer domain from the question).
2. Load that domain PLAYBOOK.md + DISCLAIMER.md.
3. Interview in the system native language — see `references/domains.md`.
4. Rank from indexes/ then open 3-7 entries/*.md.
5. Return ranked candidates with why, comparisons, what to ask a licensed clinician, and evidence tier.
6. If two domains apply, run them separately and label the lists. Do not fuse scores.

## Note quality rules

- YAML frontmatter required (see `assets/entry-template.md`).
- Wikilinks use path from vault root.
- Mark `[note]` in FULL-LIST only when the file exists.
- Copyrighted sources — roster + paraphrased keynotes, never long verbatim excerpts.
- Public-domain Boericke-style texts may be structured more closely but still prefer keynotes over page dumps.

## Do not

- Invent monographs the source never listed.
- Treat peptides, herbs, and homeopathic potencies as interchangeable doses.
- Recommend stopping prescribed medication.
- Create extra human README/CHANGELOG files inside this skill.

## Bundled files

- `references/safety.md`
- `references/router.md`
- `references/domains.md`
- `assets/entry-template.md`
- `assets/domain-readme-template.md`
- `assets/playbook-template.md`
- `scripts/scaffold-domain.sh`
