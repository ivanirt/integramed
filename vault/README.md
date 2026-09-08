# Vault clínico (export de Obsidian)

Copia aquí las notas `.md` exportadas de Obsidian. IntegraMed las lee en `POST /api/ai/consult`.

Ruta por defecto: esta carpeta (`vault/`). Cámbiala con `CLINICAL_VAULT_PATH` en `.env`.

## Frontmatter

```yaml
---
title: Hipertensión y movimiento Agua
condition: Hipertensión arterial
tags: [mtc, tcm]
---
```

- `tags`: deben cruzarse con las modalidades del doctor (`mtc` / `tcm`, `acupuntura`, `stem_cells`, etc.) o incluir `general`.
- El título o `condition` ayudan a localizar la nota cuando el diagnóstico coincide.

Las notas de este directorio son material de apoyo educativo. No sustituyen el criterio clínico.
