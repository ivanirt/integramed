# IntegraMed — FHIR R4 Patient Management Application

A clinical-grade Patient Management web application connected to a live **FHIR R4 Server** via a secure Node.js Express FHIR Proxy. All patient records are read and written in real-time strictly following HL7 FHIR R4 REST API specifications.

---

## 🌟 Key Features

1. **Live Patient Registry**:
   - Fetches and displays all patient records on initial load from the FHIR server.
   - Extracts and displays full name (`name[0].given` array + `name[0].family` string), gender badge, date of birth (`birthDate`), formatted age, and MRN/ID.
   - Switchable **Table View** and **Card Grid View**.
   - Client-side gender filtering pills (*All*, *Male*, *Female*, *Other*).

2. **Patient Details Page (`/patient/[id]`)**:
   - Each patient in the list/grid is clickable and navigates to their clinical profile page.
   - **Demographics Header**: Full name, gender badge, date of birth, calculated age, and MRN/ID.
   - **Vital Signs Section** (`GET /Observation?subject=Patient/[id]&code=...`):
     - Interactive **Time-Series Line Charts** for all 8 clinical parameters:
       - **Heart rate**: LOINC `8867-4` (bpm)
       - **Temperature**: LOINC `8310-5` (°C / °F)
       - **Respiratory rate**: LOINC `9279-1` (breaths/min)
       - **Oxygen saturation (SpO2)**: LOINC `59408-5` (%)
       - **Height**: LOINC `8302-2` (cm)
       - **Weight**: LOINC `29463-7` (kg)
       - **BMI**: LOINC `39156-5` (kg/m²)
       - **Blood pressure**: Dual-line chart showing Systolic (LOINC `8480-6`) and Diastolic (LOINC `8462-4`) on the same chart with custom legend and colors.
     - **Toggle View**: Switch smoothly between **Chart View** (interactive SVG charts with hover tooltips and normal ranges) and **Table View** (tabular list with date/type filter).
   - **Conditions Table** (`GET /Condition?patient=[id]`): Displays condition/diagnosis name, onset date, and clinical status badges.
   - **Medications Table** (`GET /MedicationRequest?patient=[id]`): Displays medication name, status, and prescription date.

3. **Create Patient (POST /Patient)**:
   - Modern modal dialog with strict client-side validation.
   - Fields: Given name(s), Family name, Gender (`male`, `female`, `other`, `unknown`), and Date of Birth (`YYYY-MM-DD`).
   - Live **FHIR R4 JSON preview tab** displaying the exact payload formatted for the server.
   - Dispatches `POST /api/fhir/Patient` with `Content-Type: application/fhir+json` and automatically refreshes the registry.

4. **Edit & Update Patient (PUT /Patient/:id)**:
   - Dedicated "Edit" button on each patient record pre-fills the form with existing details.
   - Dispatches `PUT /api/fhir/Patient/{id}` and updates the server resource while preserving metadata and identifiers.
   - Automatically refreshes upon successful update.

5. **Search by Name (GET /Patient?name=...)**:
   - Debounced search bar (300ms) with instant clear trigger.
   - Executes real-time FHIR queries using the `name` search parameter supporting partial matching.

6. **FHIR Resource Inspector & Details**:
   - Dedicated drawer displaying complete demographics, identifiers, and a syntax-highlighted raw FHIR R4 JSON viewer with a one-click copy button.

7. **Bilingual English & Spanish Support (EN / ES)**:
   - Instant language switcher in the header with persistence in `localStorage`.
   - Complete translations across all views: patient directory, search, vitals charts, conditions, medications, forms, validation messages, gender badges, date/age formats, modals, settings, and toasts.

8. **Robust Backend FHIR Proxy**:
   - Built with Express, securely injecting `Authorization: Bearer <token>` and `application/fhir+json` headers.
   - Supports `GET`, `POST`, `PUT`, `DELETE` operations.
   - Health check endpoint (`/api/health`) and runtime configuration modal.

 8. **Design & Aesthetics**:
    - IntegraMed clinical design system featuring emerald/teal palettes, Plus Jakarta Sans typography, skeleton loaders, toast alerts, and responsive layouts.
    - **Collapsible Icon-Only Sidebar**: Compact 72px icon mode for maximum screen workspace, expandable to 240px with persistent preference storage.

 9. **Authentication & Multi-Role Staff Access (`/login`)**:
    - Split hero layout with clinic branding and credentials validation.
    - Multi-role practitioner architecture supporting Doctors, Therapists, Nurses, Receptionists, Administrators, and Lab Technicians.
    - Active clinical duty switcher allowing users with multiple roles to switch roles on the fly.
    - Unified master demo password: `IntegraMed27`.

 10. **Clinical Agenda & Calendar (`/agenda`)**:
     - Interactive calendar view with date selection and day-specific appointment slot tracking.
     - Fast appointment creation modal with patient lookup, practitioner assignment, and schedule validation.

 11. **Clinical Consultation (`/consulta`)**:
     - Complete clinical encounter interface with patient summary, chief complaint, SOAP notes, vital signs capture, and diagnosis coding.

 12. **Medical Prescription Builder (`/recetas`, `/prescriptions`)**:
     - Searchable medication database with dosage and frequency autocomplete.
     - Real-time printable digital prescription sheet with clinic letterhead, doctor credentials, and QR verification stamp.
     - Clinical safety alerts (allergy contraindications and dosage warnings).
     - Direct synchronization to FHIR `MedicationRequest` resources.

 13. **Patient Laboratories & Studies (`/laboratorios`, `/labs`)**:
     - Drag-and-drop study ingestion dropzone with support for PDF, DICOM, and image files.
     - Category-based accordion panels (Biomarkers, Imaging, Genetic Panels) with real-time range indicators.
     - Interactive AI Clinical Findings Summary card with detailed study interrogation modal.

 14. **Advanced Clinic Schedule & Holidays Management (`/configuracion`)**:
     - Customizable working hours per day with split-shift support (morning and afternoon blocks).
     - Date-specific schedule overrides for custom operating hours on specific dates.
     - Clinic-wide official holiday manager with interactive calendar date picker.
     - Practitioner-specific non-working day manager (conferences, personal leaves, vacations).

---

## 🚀 Getting Started

### 1. Environment Configuration

The application reads server settings from `.env`:

```env
PORT=3001
FHIR_BASE_URL=https://fhir.medblocks.com/fhir/TToGVwSNQRT31aCbNZcTooaMez8BgI1i
FHIR_AUTH_TOKEN=eyJhbGciOiJIUzUxMiJ9...
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Environment

To run both the backend proxy (`localhost:3001`) and Vite frontend (`localhost:5173`) concurrently:

```bash
npm run dev
```

Or run them individually:
- Backend proxy: `npm run dev:server` (or `node server/index.js`)
- Frontend client: `npm run dev:client` (or `npx vite`)

### 5. Context vault

Open [http://localhost:5173/boveda](http://localhost:5173/boveda) (sidebar: **Context vault** / **Bóveda de contexto**).

- Catalog shows topic, author, source and date. Toggle sources on the left so AI and search ignore disabled ones.
- Import Congress, YouTube, NotebookLM or a `.md` file. Export writes a zip of Markdown notes.
- Authoring rules: `docs/vault-context-files.md` (also the **MD rules** tab). NotebookLM prompt: `docs/notebooklm/PROMPT.md`.
- Auto-link writes `[[wikilinks]]`. Congruence flags dose / pregnancy disagreements.

### 6. Local FHIR R4 server

The proxy always serves a local FHIR R4 store at `http://localhost:3001/fhir` (`GET /fhir/metadata`).

In **Settings → FHIR**, switch between **IntegraMed local FHIR R4** (`FHIR_MODE=local`) and the remote Medblocks proxy. Local resources live in `data/fhir/` (gitignored).

```env
FHIR_MODE=local
```

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 📡 FHIR R4 Resource Mapping

| UI Field | FHIR R4 Path | Data Type / Format |
|---|---|---|
| Given Name | `name[0].given` | `string[]` (e.g. `["John", "Alexander"]`) |
| Family Name | `name[0].family` | `string` (e.g. `"Doe"`) |
| Gender | `gender` | `code` (`male` \| `female` \| `other` \| `unknown`) |
| Date of Birth | `birthDate` | `date` (`YYYY-MM-DD`) |
| Identifier | `identifier[].value` | `string` (MRN, SSN, etc.) |
| Resource ID | `id` | `id` |
