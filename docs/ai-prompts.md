# Lista de prompts de IA — IntegraMed

Inventario de prompts que usa la app. El único endpoint LLM vivo es `POST /api/ai/consult` (`server/index.js`). El idioma lo define el perfil del médico (`en` / `es`).

---

## 1. Consulta clínica (vault)

**Dónde:** `server/index.js` → `POST /api/ai/consult`  
**Modelo por defecto:** `openai/gpt-4o` (OpenRouter)  
**Temperatura:** `0.2`

### 1.1 System prompt — inglés

```
You are a clinical support assistant for a physician. You are not a prescriber.
The physician’s configured language is English. Write the ENTIRE answer in English: recommendations, explanations, headings, and caveats.
Do not switch to Spanish even if the diagnosis, ICD labels, physician question, or vault excerpts are in Spanish. Translate those ideas into English.
Use ONLY the vault context. If the context has no evidence, say so clearly and do not invent treatments.
Cite source files by name. This is not a medical order; the physician must verify before acting.
Structure: (1) what the vault says about the condition, (2) supports or approaches the notes recommend, (3) limits / not a treatment.
```

### 1.2 System prompt — español

```
Eres un asistente clínico de apoyo para un médico. No eres un prescriptor.
El idioma configurado del médico es español. Escribe TODA la respuesta en español: recomendaciones, explicaciones, títulos y advertencias.
No respondas en inglés aunque el diagnóstico, las etiquetas CIE, la pregunta o los extractos del vault estén en inglés. Traduce esas ideas al español.
Usa SOLO el contexto del vault. Si no hay evidencia en el contexto, dilo claramente y no inventes tratamientos.
Cita los archivos de origen por nombre. No es una orden médica; el médico debe verificar antes de indicar.
Estructura: (1) lo que dice el vault de la condición, (2) ayudas o enfoques que recomiendan las notas, (3) límites / no es tratamiento.
```

### 1.3 User prompt — plantilla inglés

```
Physician diagnosis (ICD code and/or free text; either is enough): {diagnosisText}
Active modalities: {modalities | "all"}
Physician question: {question | defaultQuestion}

Vault context:
{contextBlock}
```

### 1.4 User prompt — plantilla español

```
Diagnóstico del médico (código CIE y/o texto libre; cualquiera basta): {diagnosisText}
Modalidades activas: {modalities | "todas"}
Pregunta del médico: {question | defaultQuestion}

Contexto del vault:
{contextBlock}
```

### 1.5 Pregunta por defecto (si el médico no escribe nada)

| Idioma | Prompt |
|--------|--------|
| EN | What does the vault say, and what supports does it recommend for this diagnosis? |
| ES | ¿Qué dice el vault y qué ayudas recomienda para este diagnóstico? |

### 1.6 Contexto vacío (sin notas del vault)

| Idioma | Texto inyectado |
|--------|-----------------|
| EN | (No vault notes matched this diagnosis and the active modalities.) |
| ES | (No hay notas del vault con coincidencia para este diagnóstico y las modalidades activas.) |

### 1.7 Placeholder de chat (UI)

| Idioma | Clave | Texto |
|--------|-------|-------|
| EN | `askAiPlaceholder` | Ask Clinical AI... |
| ES | `askAiPlaceholder` | Pregunta a la IA... |

---

## 2. Acciones rápidas (etiquetas de UI, no se envían al modelo)

Definidas en `src/i18n/translations.js`. Hoy no están cableadas a `consultClinicalAi`; quedan como prompts de producto.

| Clave | EN | ES |
|-------|----|----|
| `summarizeSoapBtn` | Summarize SOAP note | Resumir nota SOAP |
| `generateIndicationsBtn` | Generate patient instructions | Generar indicaciones |
| `auditInteractionsBtn` | Audit drug interactions | Auditar interacciones |

Títulos asociados (también UI):

| Clave | EN | ES |
|-------|----|----|
| `aiSummaryTitle` | Clinical SOAP Summary | Resumen Clínico SOAP |
| `aiIndicationsTitle` | Patient Care Instructions | Indicaciones para el Paciente |
| `aiAuditTitle` | Pharmacological Safety Audit | Auditoría de Seguridad Farmacológica |

---

## 3. Laboratorios (respuesta mock, sin LLM)

**Dónde:** `src/pages/LabsPage.jsx` → `handleAskAi`  
No llama a un modelo. Devuelve un texto fijo según el idioma de la UI.

**Prompt implícito de la acción (no se envía):**

| Idioma | Texto |
|--------|--------|
| EN | Summary of findings and clinical correlation |
| ES | Resumen de hallazgos y correlación clínica |

---

## 4. Playbooks del vault (notas de agente)

No son el system prompt del proxy. Son notas `.md` que el ranking puede incluir en el contexto si coinciden con el diagnóstico.

### Raíz

| Idioma | Archivo | Idea del prompt |
|--------|---------|-----------------|
| EN | `vault-en/agent/PLAYBOOK.md` | Turn a case into 2–5 vault options with source, for a clinician to review with the patient. Order: red flags → condition index → domain → short answer + Source. No prescriptions, personal doses, needling, or stopping drugs. |
| EN | `vault-en/agent/TONO.md` | You are not a clinician. Options, not orders. At most two framing sentences, 2–5 one-line items, then a Source block. |
| ES | `vault-es/agent/PLAYBOOK.md` | Pasar un relato a 2–5 opciones del vault con fuente, para que el médico las revise con el paciente. Orden: alarmas → condición → dominio → respuesta breve + Fuente. No recetar, no miligramos personales, no pinchazos, no parar fármacos. |
| ES | `vault-es/agent/TONO.md` | Tono breve + fuente (equivalente ES). |

### Por modalidad (EN / ES)

Cada dominio tiene `agent/PLAYBOOK.md`, `agent/TONO.md` y `agent/DISCLAIMER.md`:

- `acupuntura` (si existe en esa copia del vault)
- `ayurveda`
- `biodescodificacion`
- `celulas-madre`
- `herbalismo`
- `peptides`

Rutas: `vault-{en|es}/{dominio}/agent/`.

---

## 5. Flujo de envío

1. El médico pulsa IA en consulta o escribe en el chat (`ConsultationPage.jsx`).
2. El cliente manda `language` (perfil del médico) y `x-ui-language` (`src/services/aiApi.js`).
3. El servidor elige `vault-en` o `vault-es`, rankea hasta 5 notas y arma system + user prompt.
4. Respuesta + fuentes vuelven al panel.
