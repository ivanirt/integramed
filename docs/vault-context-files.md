# Reglas de archivos de contexto (bóveda IntegraMed)

Un archivo Markdown por planta, sustancia, condición o fuente importada. Viven en `vault-es/` o `vault-en/`. También se listan en la app: **Bóveda de contexto → Reglas MD**.

## Nombre de archivo

- ASCII kebab-case: `Withania-somnifera.md`, `Herpes-labial.md`
- Sin espacios. Que coincida con el nombre latino o común.
- Carpeta de dominio: `ayurveda/plantas/`, `herbalismo/plantas/`, `condiciones/`, `inbox/congress/`, `inbox/youtube/`, `inbox/notebooklm/`

## Frontmatter (obligatorio)

```yaml
---
type: Herb            # Herb | Compound | Condition | Index | Playbook | SourceNote
title: Withania somnifera
description: "Una línea: por qué existe esta nota."
tags: [alt-med, ayurveda]
status: draft         # draft | reviewed
stale_after: 2027-09-01
sources:
  - id: amalraj-rsc-ayurveda-2023
    title: Chemistry of Medicinal Plants in Ayurveda (RSC 2023)
    author: human:Augustine-Amalraj
    kind: book          # book | congress | youtube | notebooklm | article
    last_modified: 2023-01-01T00:00:00Z
    url: https://example.org/paper
    resource: attachments/amalraj-2023.pdf
---
```

## Cuerpo (ficha clínica obligatoria)

```markdown
# Withania somnifera — Ashwagandha

## Qué
Planta / sustancia (latín + nombre común).

## Por qué
Por qué está en la bóveda: indicación, intención clínica, no un eslogan.

## Cómo
Cómo actúa según la fuente (mecanismo o marco tradicional). No inventar.

## Cuándo / Cuánto
Cómo se toma y la dosis **tal como la escribe la fuente**. Si no hay dosis: "No posología en la fuente".

## Fuente
- Título, autor, fecha
- Link: https://...
- Wikilinks a notas relacionadas: [[ayurveda/teoria/Doshas]]
```

## Enlaces

- Wikilinks de Obsidian: `[[carpeta/Nombre-nota]]`
- Enlazar condiciones, plantas, cautelas y teoría
- No inventar una nota que no exista; la bóveda marcará enlaces rotos

## Congruencia

- No copiar dosis de un libro a una nota de otro
- Si las fuentes discrepan, dejar ambas afirmaciones y citar cada fuente
- Embarazo, niños y suspender fármacos: cautela, no orden
- Nunca miligramos personales para un paciente nominado

## Importar desde fuera

1. Congreso o YouTube: pega título, autor, fecha, URL y texto en **Importar**.
2. NotebookLM: usa `docs/notebooklm/PROMPT.md`, exporta Markdown y pégalo o súbelo.
3. Archivo `.md` ya formado: arrástralo o pégalo; si trae las secciones, se conservan.

English copy of the same rules is served by `GET /api/vault/rules?language=en`.
