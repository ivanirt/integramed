# IntegraMed Clinic

Clínica FHIR R4. Interfaz Next.js 15 (tono Maferefun) y proxy Express para el almacén FHIR local o Medblocks.

Los datos clínicos se escriben en recursos FHIR. No hay Postgres para pacientes, citas ni notas. El cliente Vite anterior está en `legacy-client/`.

## Local

1. Copia `.env.example` a `.env` si falta `SESSION_SECRET` y `FHIR_PROXY_URL`.
2. `npm install`
3. `npm run dev`

- UI: [http://localhost:3000](http://localhost:3000)
- FHIR proxy: [http://localhost:3001](http://localhost:3001) (`GET /fhir/metadata`)

Acceso de demostración: usuario `ivan`, contraseña `IntegraMed27`. El primer login crea el Practitioner si el FHIR está vacío. Quien no tiene contraseña propia sigue usando esa clave maestra.

## Usuario ivanirt@gmail.com

Crea el Practitioner del propietario sin contraseña (el comando es idempotente y no guarda claves en el repo):

```bash
npm run create-user -- ivanirt@gmail.com --given Ivan --family Renteria --role admin
```

Esa cuenta no acepta `IntegraMed27`. Con `npm run dev` en marcha:

1. Abre [http://localhost:3000/acceso](http://localhost:3000/acceso).
2. Pulsa «¿Olvidaste tu contraseña?».
3. Escribe `ivanirt@gmail.com`.
4. Si SMTP no está en `.env`, el enlace sale en la consola del proceso `web` (no en la del proxy FHIR). Dura 45 minutos y es de un solo uso.
5. Ábrelo, elige la contraseña y entra con ese correo.

Opcional, solo en la terminal: `CREATE_USER_PASSWORD='una-clave-larga-1' npm run create-user -- ivanirt@gmail.com --given Ivan --family Renteria --role admin`. No guardes esa variable en un archivo que se suba al repositorio.

## Correo con Gmail

Copia `.env.example` a `.env` y rellena:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ivanirt@gmail.com
SMTP_PASS=la-contraseña-de-aplicación
MAIL_FROM=ivanirt@gmail.com
APP_BASE_URL=http://localhost:3000
```

`SMTP_PASS` no es la contraseña normal de Google. En la cuenta: Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones → crear una para Correo. Pega los 16 caracteres en `SMTP_PASS`. `MAIL_FROM` debe ser esa misma cuenta. Sin `SMTP_HOST` y `MAIL_FROM` el restablecimiento no falla: el enlace se imprime en la consola de Next.js.

## Usuarios de prueba por rol

Crea un Practitioner por cada rol definido en `src/lib/roles.ts`. Los correos son `qa+<rol>@integramed.local`. La contraseña se genera al ejecutar y solo se escribe en `.local/test-users.json` (no se commitea y no se imprime).

```bash
npm run seed:test-users
npm run seed:test-users -- --rotate   # regenera contraseñas, sin duplicar usuarios
npm run remove-test-users             # borra solo esos usuarios de prueba
```

Qué probar con cada rol: [docs/QA.md](docs/QA.md).

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
