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
