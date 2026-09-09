---
type: Skill
title: router
description: Vault concept (.skills/alt-med-vault/references/router.md).
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

# Domain router

Detect from user language, then load only that domain playbook.

| Cues | Domain folder |
|---|---|
| modalities better/worse, keynote, potency, Boericke, repertory, polychrest | homeopathy |
| BPC, TB-500, CJC, GLP-1, stack, vial, bioregulator, GH secretagogue | peptides |
| herb, tincture, tea, Latin binomial, energetic (damp, dry), monograph | herbal |
| qi, yang, zang-fu, tongue, pulse TCM, formula granules | tcm |
| dosha, agni, ama, rasayana, prakriti | ayurveda |
| mixed “what should I take” with no system | ask which literature to search; default to listing domains not a blend |

Cross-domain only for **warnings** (e.g. herb + anticoagulant; peptide + active malignancy discussion).
