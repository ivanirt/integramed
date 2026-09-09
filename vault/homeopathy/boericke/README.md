# Boericke Pocket Manual — Agent Vault

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
