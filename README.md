# IntegraMed Clinic

Clínica FHIR R4. Interfaz Next.js 15 (tono Maferefun) y proxy Express para el almacén FHIR local o Medblocks.

Los datos clínicos se escriben en recursos FHIR. No hay Postgres para pacientes, citas ni notas.

## Local

1. Copia `.env.example` a `.env`.
2. Define secretos propios (no dejes los valores vacíos en un entorno real):
   - `SESSION_SECRET` — `openssl rand -base64 48` (mínimo 32 caracteres; el valor de ejemplo antiguo se rechaza).
   - `FHIR_PROXY_SECRET` — otro secreto, con el mismo comando. Lo comparten Next.js y el proxy.
3. `npm install`
4. `npm run dev`

Si omites `SESSION_SECRET` o `FHIR_PROXY_SECRET`, `npm run dev` inventa un secreto aleatorio solo para ese proceso. No se imprime ni se guarda. En producción el proceso no arranca sin ellos.

- UI: [http://localhost:3000](http://localhost:3000)
- Proxy FHIR: solo en `127.0.0.1:3001` (no lo publiques). La UI habla con él en el mismo equipo.

El acceso es con la contraseña personal de cada Practitioner. No hay contraseña compartida de clínica: si `CLINIC_MASTER_PASSWORD` sigue en el entorno, el login la ignora. Quien aún no tiene contraseña personal usa «¿Olvidaste tu contraseña?». El enlace solo sale al correo fijado en `accounts.json` por `create-user` o `set-password`. Si ese correo no está fijado, la respuesta es la misma y no se envía nada. Cambiar el email del Practitioner en FHIR no cambia el destino.

El login ya no crea al Practitioner `ivan` solo. El primer administrador se da de alta con `npm run create-user` (abajo) o tiene que existir ya en FHIR.

## Usuario ivanirt@gmail.com

Crea el Practitioner del propietario sin contraseña (el comando es idempotente y no guarda claves en el repo):

```bash
npm run create-user -- ivanirt@gmail.com --given Ivan --family Renteria --role admin
```

Para asignar la contraseña desde el servidor, sin escribirla en un archivo ni en el registro:

```bash
SET_PASSWORD='…' npm run set-password -- ivanirt@gmail.com
```

La contraseña se lee de `SET_PASSWORD` (o de una línea en stdin). No la pongas como argumento del comando. El mismo comando la reemplaza si ya existía. `CREATE_USER_PASSWORD` en el entorno hace lo mismo solo al crear, y no pisa una contraseña que ya esté guardada.

Con SMTP configurado, o en local con `PASSWORD_RESET_LOG_LINK=1`:

1. Abre [http://localhost:3000/acceso](http://localhost:3000/acceso).
2. Pulsa «¿Olvidaste tu contraseña?».
3. Escribe `ivanirt@gmail.com`.
4. Sin SMTP el enlace no se imprime, salvo ese flag en desarrollo. Sale en la consola del proceso `web` (no en la del proxy FHIR). Dura 45 minutos y es de un solo uso.
5. Ábrelo, elige la contraseña y entra con ese correo.

Si faltan `SMTP_HOST` o `MAIL_FROM`, `npm run dev` y el arranque de producción avisan en el registro. La respuesta al usuario sigue siendo la misma y no incluye enlace.

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

`SMTP_PASS` no es la contraseña normal de Google. En la cuenta: Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones → crear una para Correo. Pega los 16 caracteres en `SMTP_PASS`. `MAIL_FROM` debe ser esa misma cuenta.

En producción, si faltan `SMTP_HOST` o `MAIL_FROM`, el proceso avisa al arrancar. La solicitud responde igual que si el correo existiera y no escribe el enlace en ningún registro. Un fallo de SMTP tampoco escribe el enlace. En ese caso la contraseña se asigna con `npm run set-password`.

## Usuarios de prueba por rol

Crea un Practitioner por cada rol definido en `src/lib/roles.ts`. Los correos son `qa+<rol>@integramed.local`. La contraseña se genera al ejecutar y solo se escribe en `.local/test-users.json` (no se commitea y no se imprime).

```bash
npm run seed:test-users
npm run seed:test-users -- --rotate   # regenera contraseñas, sin duplicar usuarios
npm run remove-test-users             # borra solo esos usuarios de prueba
```

Qué probar con cada rol: [docs/QA.md](docs/QA.md).

## Producción (Dokploy)

Publica solo el puerto 3000. No publiques el 3001. Variables obligatorias en el servicio: `SESSION_SECRET` y `FHIR_PROXY_SECRET`. `FHIR_MODE`, `FHIR_BASE_URL` y `FHIR_AUTH_TOKEN` se leen del entorno; la pantalla `/config/fhir` ya no los cambia en caliente. La IA clínica usa `CLINICAL_AI_KEY` y `CLINICAL_AI_BASE` (host en `CLINICAL_AI_HOST_ALLOWLIST`, por defecto `openrouter.ai`).

Para que el restablecimiento llegue por correo también hacen falta `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` y `APP_BASE_URL` (el origen público https, sin barra final). En producción, si `APP_BASE_URL` falta o no es https, el arranque avisa, la respuesta sigue siendo la misma y no se genera enlace. No definas `PASSWORD_RESET_LOG_LINK` en producción: se ignora.

Las contraseñas y los tokens viven en `accounts.json`, dentro de `INTEGRAMED_AUTH_ROOT` (por defecto `data/auth`, en la imagen `/app/data/auth`). El almacén FHIR local vive en `INTEGRAMED_FHIR_ROOT` (por defecto `data/fhir`, en la imagen `/app/data/fhir`). En Dokploy monta los dos volúmenes persistentes: `/app/data/auth` y `/app/data/fhir`. Sin el de auth, un redeploy borra las contraseñas. Sin el de FHIR, las contraseñas siguen y el Practitioner no: el login responde 401 y el registro avisa qué cuenta quedó sin Practitioner. Si el directorio de auth no se puede escribir, Next sale con error y el contenedor termina con un código distinto de cero. Si el proxy se cae, el contenedor también termina.

Quien ya tenía sesión sigue con esa cookie hasta que expire, hasta que cambies `SESSION_SECRET`, o hasta que cambie su contraseña. El middleware de borde comprueba la firma, la caducidad y el rol. No lee `accounts.json`, así que no ve si la contraseña cambió. Las rutas sensibles, por ejemplo `/api/cie`, llaman a `getSession()`, que sí rechaza una cookie anterior al cambio de contraseña.

Quien nunca definió contraseña usa «¿Olvidaste tu contraseña?» y necesita el correo ya fijado en `accounts.json`. El login responde «Contraseña incorrecta.» igual si el usuario no existe, si no tiene contraseña o si la contraseña no coincide.

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
