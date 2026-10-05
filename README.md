# IntegraMed Clinic

Clínica FHIR R4. Interfaz Next.js 15 (tono Maferefun) y proxy Express para el almacén FHIR local o Medblocks.

Los datos clínicos se escriben en recursos FHIR. No hay Postgres para pacientes, citas ni notas.

## Local

1. Copia `.env.example` a `.env`.
2. Define secretos propios (no dejes los valores vacíos en un entorno real):
   - `SESSION_SECRET` — `openssl rand -base64 48` (mínimo 32 caracteres; el valor de ejemplo antiguo se rechaza).
   - `FHIR_PROXY_SECRET` — otro secreto, con el mismo comando. Lo comparten Next.js y el proxy.
   - `CLINIC_MASTER_PASSWORD` — si no está definido, el login maestro queda desactivado.
3. `npm install`
4. `npm run dev`

Si omites `SESSION_SECRET` o `FHIR_PROXY_SECRET`, `npm run dev` inventa un secreto aleatorio solo para ese proceso. No se imprime ni se guarda. En producción el proceso no arranca sin ellos.

- UI: [http://localhost:3000](http://localhost:3000)
- Proxy FHIR: solo en `127.0.0.1:3001` (no lo publiques). La UI habla con él en el mismo equipo.

El primer acceso con el usuario `ivan` crea el Practitioner si el FHIR está vacío. La contraseña es la de `CLINIC_MASTER_PASSWORD`.

## Producción (Dokploy)

Publica solo el puerto 3000. No publiques el 3001. Variables obligatorias en el servicio: `SESSION_SECRET`, `FHIR_PROXY_SECRET`, `CLINIC_MASTER_PASSWORD`. `FHIR_MODE`, `FHIR_BASE_URL` y `FHIR_AUTH_TOKEN` se leen del entorno; la pantalla `/config/fhir` ya no los cambia en caliente. La IA clínica usa `CLINICAL_AI_KEY` y `CLINICAL_AI_BASE` (host en `CLINICAL_AI_HOST_ALLOWLIST`, por defecto `openrouter.ai`).

## Clínica Yeshua

Con el proxy en marcha y el mismo `.env` (`SESSION_SECRET`, `FHIR_PROXY_SECRET`, `FHIR_PROXY_URL` en loopback):

```bash
npm run seed:yeshua
```

Crea la organización, la sede de Naucalpan, los consultorios, los servicios y los profesionales (correo y rol). No guarda contraseñas. Firma una sesión corta de administración con `SESSION_SECRET` y la envía al proxy junto con `FHIR_PROXY_SECRET`. Si el recurso ya existe, lo actualiza sin duplicarlo.

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
