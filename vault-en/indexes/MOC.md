---
type: Index
title: MOC
description: Homeopathy index for agent routing (indexes/MOC.md).
tags: [alt-med, okf, homeopathy]
generated:
  by: process:grok-alt-med-vault
  at: 2026-09-09T03:13:00Z
status: draft
stale_after: 2027-09-09
sources:
  - id: boericke-1927-scan
    resource: attachments/_OceanofPDF.com_POCKET_MANUAL_OF_HOMEOPATHIC_MATERIA_MEDICA_AND_REPERTORY_-_William_Boericke.pdf
    title: Pocket Manual of Homoeopathic Materia Medica and Repertory (9th ed. reprint scan)
    author: human:William Boericke
    last_modified: 1927-01-01T00:00:00Z
  - id: vault-curation
    resource: boericke-vault/
    title: Agent vault curation (structure, playbooks, indexes)
    author: process:grok-alt-med-vault
    last_modified: 2026-09-09T03:13:00Z
---

# Map of content

```
README.md
agent/DISCLAIMER.md
agent/PLAYBOOK.md
indexes/MOC.md
indexes/FULL-REMEDY-LIST.md
indexes/REMEDY-INDEX.md
indexes/KEYNOTES.md
indexes/BY-SYSTEM.md
relationships/GRAPH.md
remedies/_TEMPLATE.md
remedies/<Latin name>.md
```

## Agent load order

1. [[agent/DISCLAIMER]]
2. [[agent/PLAYBOOK]]
3. [[indexes/KEYNOTES]]
4. Hit remedy notes + [[relationships/GRAPH]]
5. Fill gaps via [[indexes/BY-SYSTEM]]
6. Confirm the name exists in [[indexes/FULL-REMEDY-LIST]]

## Wikilink graph (core)

`Aconitum napellus` —complementary→ `Sulphur` (not yet a full note)
`Aethusa cynapium` —complementary→ `Calcarea` (not yet a full note)
`Aesculus hippocastanum` —compare→ `Sepia officinalis`
`Pulsatilla pratensis` —compare→ `Sepia officinalis`
`Aconitum napellus` —compare-fright→ `Opium`
`Aconitum napellus` —compare-collapse→ `Veratrum album`
`Agaricus muscarius` —compare-restless-feet→ `Zincum metallicum`
