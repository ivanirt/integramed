export const VAULT_CONTEXT_RULES = {
  version: '1.0',
  filename: 'kebab-case.md',
  requiredFrontmatter: [
    'type',
    'title',
    'description',
    'tags',
    'status',
    'sources'
  ],
  sourceKinds: ['book', 'congress', 'youtube', 'notebooklm', 'article', 'vault'],
  sections: ['Qué', 'Por qué', 'Cómo', 'Cuándo / Cuánto', 'Fuente']
};

export function vaultRulesMarkdown(language = 'es') {
  if (language === 'en') {
    return `# Context file rules (IntegraMed vault)

Create one Markdown file per plant, substance, condition, or imported source. Files live under \`vault-en/\` or \`vault-es/\`.

## File name
- ASCII kebab-case: \`Withania-somnifera.md\`, \`Herpes-labial.md\`
- No spaces. Match the Latin or common name.
- Put the file in the domain folder: \`ayurveda/plantas/\`, \`herbalismo/plantas/\`, \`condiciones/\`, \`inbox/congress/\`, \`inbox/youtube/\`, \`inbox/notebooklm/\`

## Frontmatter (required)

\`\`\`yaml
---
type: Herb            # Herb | Compound | Condition | Index | Playbook | SourceNote
title: Withania somnifera
description: "One-line reason this note exists."
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
\`\`\`

## Body structure (required clinical card)

\`\`\`markdown
# Withania somnifera — Ashwagandha

## Qué
Plant / substance (Latin + common name).

## Por qué
Why it is in the vault: indication, clinical intent, not a slogan.

## Cómo
How it is said to act (mechanism or traditional frame). Keep to the source.

## Cuándo / Cuánto
How it is taken and dose **as stated in the source**. If the source has no dose, write "No posology in source".

## Fuente
- Source title, author, date
- Link: https://...
- Wikilink related notes: [[ayurveda/teoria/Doshas]]
\`\`\`

## Linking
- Use Obsidian wikilinks: \`[[folder/Note-name]]\`
- Link conditions, plants, cautions, and theory notes
- Do not invent a note that does not exist; the vault will flag broken links

## Congruence
- Do not copy doses from a different book into this note
- If sources disagree, keep both claims and cite each source
- Flag pregnancy, children, and drug-stop advice as cautions, not orders
- Never write personal milligrams for a named patient

## NotebookLM
Paste the prompt in \`docs/notebooklm/PROMPT.md\` into NotebookLM, export the report as Markdown (copy or extension), then import it from the vault screen with source kind **NotebookLM**.
`;
  }

  return `# Reglas de archivos de contexto (bóveda IntegraMed)

Un archivo Markdown por planta, sustancia, condición o fuente importada. Viven en \`vault-es/\` o \`vault-en/\`.

## Nombre de archivo
- ASCII kebab-case: \`Withania-somnifera.md\`, \`Herpes-labial.md\`
- Sin espacios. Que coincida con el nombre latino o común.
- Carpeta de dominio: \`ayurveda/plantas/\`, \`herbalismo/plantas/\`, \`condiciones/\`, \`inbox/congress/\`, \`inbox/youtube/\`, \`inbox/notebooklm/\`

## Frontmatter (obligatorio)

\`\`\`yaml
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
\`\`\`

## Cuerpo (ficha clínica obligatoria)

\`\`\`markdown
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
- Enlace: https://...
- Wikilinks a notas relacionadas: [[ayurveda/teoria/Doshas]]
\`\`\`

## Enlaces
- Wikilinks de Obsidian: \`[[carpeta/Nombre-nota]]\`
- Enlazar condiciones, plantas, cautelas y teoría
- No inventar una nota que no exista; la bóveda marcará enlaces rotos

## Congruencia
- No copiar dosis de un libro a una nota de otro
- Si las fuentes discrepan, dejar ambas afirmaciones y citar cada fuente
- Embarazo, niños y suspender fármacos: cautela, no orden
- Nunca miligramos personales para un paciente nominado

## NotebookLM
Pega el prompt de \`docs/notebooklm/PROMPT.md\` en NotebookLM, exporta el informe en Markdown (copiar o extensión) e impórtalo desde la pantalla de la bóveda con tipo **NotebookLM**.
`;
}
