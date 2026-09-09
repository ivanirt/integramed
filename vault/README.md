---
type: Index
title: README
description: Vault concept (README.md).
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

# Vault

Source: William Boericke, *Pocket Manual of Homoeopathic Materia Medica* (9th ed., 1927 reprint scan).

This vault is a **structured knowledge graph** for an AI agent that:

1. Collects a symptom picture (mind + modalities + location + sensation + concomitants).
2. Matches it against remedy keynotes from Boericke.
3. Ranks candidates and surfaces **comparisons / complements / antidotes**.
4. Always treats output as **historical homeopathic literature**, not a medical diagnosis.

## Layout

| Path | Role |
|---|---|
| `agent/PLAYBOOK.md` | How the agent should interview, score, and recommend |
| `agent/DISCLAIMER.md` | Required safety language |
| `indexes/FULL-REMEDY-LIST.md` | Complete MM roster from this edition |
| `indexes/REMEDY-INDEX.md` | Notes that already have vault files |
| `indexes/BY-SYSTEM.md` | Region → candidate remedies |
| `indexes/KEYNOTES.md` | Fast pattern matching |
| `relationships/GRAPH.md` | Compare / complementary / antidote links |
| `remedies/*.md` | One note per remedy (YAML + sections) |
| `peptides/` | Separate domain: peptide + bioregulator agent graph |
| `acupuntura/` | Padilla *Curso de Acupuntura* — channels, points, patterns |
| `celulas-madre/` | Audet/Stanford MMB 482 stem-cell protocol catalog (no methods copied) |

## Wikilink convention

- Remedy notes: `[[Aconitum napellus]]`
- System pages: `[[indexes/BY-SYSTEM#Mind]]`
- Relationship: `[[relationships/GRAPH#Aconitum-napellus]]`

Frontmatter on every remedy:

```yaml
name:
common:
abbreviation:
sphere: []
modalities_worse: []
modalities_better: []
compare: []
complementary: []
antidotes: []
dose_boericke:
```

## Coverage note

The attached PDF is the **materia medica** portion (remedies A–Z). **Every main-article name is listed in** [[indexes/FULL-REMEDY-LIST]]. Individual `remedies/*.md` notes still prioritize polycrests plus the opening A-range; mark `[note]` in the full list when you add a file.

## Peptides add-on

Second source catalog: Hack Smith, *The Complete Guide to Peptides* (2025) — **TOC + class map only** (no chapter reprint).

Start here: [[peptides/README]] · playbook [[peptides/agent/PLAYBOOK]] · full roster [[peptides/indexes/FULL-LIST]]


Acupuntura (Padilla 2001): [[acupuntura/README]]

Células madre (MMB 482): [[celulas-madre/README]]

Biodescodificación: [[biodescodificacion/README]]

Ayurveda plantas (RSC 2023): [[ayurveda/README]]

Herbalismo Wallach/Ma Lan 2001: [[herbalismo/README]]

**Tono:** [[agent/TONO]] — asistente que ofrece opciones; el médico las revisa con el paciente.
Respuestas **breves** con **Fuente** (nota + libro/pág.) para que el médico profundice.

100 condiciones: [[indexes/POR-CONDICION]]
