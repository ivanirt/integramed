# IntegraMed Clinic

Clínica FHIR R4. Interfaz Next.js 15 (tono Maferefun) y proxy Express para el almacén FHIR local o Medblocks.

Los datos clínicos se escriben en recursos FHIR. No hay Postgres para pacientes, citas ni notas.

## Local

1. Copia `.env.example` a `.env` si falta `SESSION_SECRET` y `FHIR_PROXY_URL`.
2. `npm install`
3. `npm run dev`

- UI: [http://localhost:3000](http://localhost:3000)
- FHIR proxy: [http://localhost:3001](http://localhost:3001) (`GET /fhir/metadata`)

Acceso de demostración: usuario `ivan`, contraseña `IntegraMed27`. El primer login crea el Practitioner si el FHIR está vacío.

## Clínica Yeshua

Con el proxy en marcha (`npm run dev:fhir`):

```bash
npm run seed:yeshua
```

Crea la organización, la sede de Naucalpan, los consultorios, los servicios y los profesionales (correo y rol). No guarda contraseñas. Lee `FHIR_PROXY_URL` (por defecto `http://localhost:3001`). Si el recurso ya existe, lo actualiza sin duplicarlo.

## Navegación

Trabajo del día: Inicio, Agenda, Pacientes. La ficha tiene Resumen, Consultas, Recetas y Estudios. Al pie, según rol: Farmacia, Personal, Bóveda, Configuración.

Configuración: `/config/horario`, `/config/servicios`, `/config/festivos`, `/config/ausencias`, `/config/sedes`, `/config/modulos`, `/config/fhir`.

## FHIR

| Pantalla | Recurso |
| --- | --- |
| Paciente | `Patient` |
| Personal | `Practitioner`, `PractitionerRole` |
| Cita | `Appointment` |
| Consulta | `Encounter`, `Composition`, `Observation` |
| Receta | `MedicationRequest` |
| Estudio | `ServiceRequest`, `DiagnosticReport` |
| Sede | `Organization`, `Location` |
| Servicio | `HealthcareService` |
| Horario / festivos / ausencias | `Schedule` |
| Módulos e inventario | `Basic` |
| Bóveda | archivos en `vault-es/` |
