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
- Proxy FHIR: solo en `127.0.0.1:3001` (no lo publiques). La UI habla con él en el mismo equipo. El puerto del proxy es `FHIR_PROXY_PORT` (por defecto 3001). `PORT` no mueve ni a Next ni al proxy.

El acceso es con la contraseña personal de cada Practitioner. No hay contraseña compartida de clínica: si `CLINIC_MASTER_PASSWORD` sigue en el entorno, el login la ignora. Quien aún no tiene contraseña personal usa «¿Olvidaste tu contraseña?». El enlace solo sale al correo fijado en `accounts.json` por `create-user` o `set-password`. Si ese correo no está fijado, la respuesta es la misma y no se envía nada. Cambiar el email del Practitioner en FHIR no cambia el destino.

El login ya no crea al Practitioner `ivan` solo. El primer administrador se da de alta con `npm run create-user` (abajo) o tiene que existir ya en FHIR.

## Usuario ivanirt@gmail.com

Crea el Practitioner del propietario sin contraseña (el comando es idempotente y no guarda claves en el repo):

```bash
npm run create-user -- --email ivanirt@gmail.com --given Ivan --family Renteria --role admin
```

El correo también puede ir como primer argumento, sin `--email`.

Para dejar una contraseña temporal que hay que cambiar al entrar, el mismo comando pide la clave en un prompt oculto (y hay que repetirla). No queda en los argumentos, en el entorno, en el historial ni en el registro:

```bash
npm run create-user -- --email <correo> --role admin --must-change
```

Para asignar o reemplazar la contraseña de alguien que ya existe, `set-password` deja la contraseña como temporal (hay que cambiarla al entrar). `--must-change` es lo mismo. `--no-must-change` es lo que quita el flag:

```bash
npm run set-password -- <correo>
npm run set-password -- <correo> --must-change
npm run set-password -- <correo> --no-must-change
```

En un terminal, la contraseña se escribe oculta y se confirma. Sin terminal (un script, o `docker exec` sin `-t`), se lee una sola línea de stdin y no se confirma. No hay forma de pasarla por argv ni por el entorno: `--password`, `--pass` y `-p` se rechazan sin imprimir el valor. `SET_PASSWORD` y `CREATE_USER_PASSWORD` están en desuso: si siguen definidas, el comando avisa y las ignora.

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

En producción, si faltan `SMTP_HOST` o `MAIL_FROM`, el proceso avisa al arrancar. La solicitud responde igual que si el correo existiera y no escribe el enlace en ningún registro. Un fallo de SMTP tampoco escribe el enlace. En ese caso la contraseña se asigna con `npm run set-password -- <correo>` (prompt oculto o stdin).

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

Next escucha en el puerto 3000 (`next start -p 3000`). El proxy FHIR escucha en `127.0.0.1` y en `FHIR_PROXY_PORT` (por defecto 3001; `FHIR_PROXY_URL` tiene que coincidir). La imagen no define `PORT`. Si Dokploy lo inyecta, los dos procesos lo ignoran: no pasa el proxy al puerto público ni saca a Next del 3000.

El HEALTHCHECK del contenedor pide `GET http://127.0.0.1:3000/healthz` (Next, el puerto publicado). No lleva cookie ni secreto. Next, a su vez, pide `GET /healthz` del proxy (`FHIR_PROXY_URL`, 1 segundo, sin secreto) y responde `{ "ok": true }` solo si ese probe contesta. Si el proxy no responde, la respuesta es 503 `{ "ok": false }`. No reenvía el cuerpo del proxy ni consulta el FHIR remoto. El estado FHIR sigue en `GET /api/health` del proxy y pide sesión.

El proceso corre como el usuario `integramed` (uid 1001, gid 1001). Los volúmenes `/app/data/auth` y `/app/data/fhir` tienen que ser escribibles por ese uid. Si el volumen se creó con la imagen anterior (root), un `chown` a `1001:1001` en el host deja las contraseñas y el FHIR escribibles. Sin permiso de escritura en auth, Next sale y el contenedor termina.

Para que el restablecimiento llegue por correo también hacen falta `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` y `APP_BASE_URL` (el origen público https, sin barra final). En producción, si `APP_BASE_URL` falta o no es https, el arranque avisa, la respuesta sigue siendo la misma y no se genera enlace. No definas `PASSWORD_RESET_LOG_LINK` en producción: se ignora.

Las contraseñas y los tokens viven en `accounts.json`, dentro de `INTEGRAMED_AUTH_ROOT` (por defecto `data/auth`, en la imagen `/app/data/auth`). El almacén FHIR local vive en `INTEGRAMED_FHIR_ROOT` (por defecto `data/fhir`, en la imagen `/app/data/fhir`). En Dokploy monta los dos volúmenes persistentes: `/app/data/auth` y `/app/data/fhir`. Sin el de auth, un redeploy borra las contraseñas. Sin el de FHIR, las contraseñas siguen y el Practitioner no: el login responde 401 y el registro avisa qué cuenta quedó sin Practitioner. Si el directorio de auth no se puede escribir, Next sale con error y el contenedor termina con un código distinto de cero. Si el directorio existe pero el usuario del contenedor (uid 1001) no puede escribir, el mensaje pide `chown -R 1001:1001` sobre ese volumen. Con `FHIR_MODE=local`, el proxy hace la misma prueba sobre `INTEGRAMED_FHIR_ROOT` antes de escuchar: si no puede escribir, sale enseguida en lugar de marcarse sano y caer en la primera escritura clínica. `node scripts/supervise.mjs` es el proceso principal. Si Next o el proxy salen solos, aunque el código sea 0, el contenedor termina distinto de cero. `docker stop` (SIGTERM a ese proceso) termina con código 0.

Quien ya tenía sesión sigue con esa cookie hasta que expire, hasta que cambies `SESSION_SECRET`, o hasta que cambie su contraseña. El middleware de borde comprueba la firma, la caducidad, el rol y, si la cookie lo trae, que la contraseña sea temporal (`mustChange`). No lee `accounts.json`, así que no ve un cambio de contraseña posterior ni un flag que se haya activado después de emitir la cookie. `getSession()`, las páginas, las server actions, las rutas `/api` y el proxy FHIR sí leen `accounts.json`: si `mustChangePassword` es true, o si el archivo no se puede leer, no dejan pasar datos clínicos. Una cookie vieja no basta para saltarse el flag.

Con ese flag la sesión solo abre `/cuenta/contrasena`, la acción de cambiar la contraseña, salir (`POST /api/auth/logout`) y los estáticos. `GET /healthz` de Next y del proxy sigue sin sesión y sin secreto: el flag no lo bloquea y no devuelve datos clínicos. El resto redirige a esa pantalla o responde 403 sin cuerpo clínico. El proxy aplica el mismo corte en `requireClinicAccess` leyendo `accounts.json`. Al guardar, la contraseña nueva tiene que cumplir la misma regla que el restablecimiento (12 caracteres, una letra, un número, y no ser una contraseña común), no puede ser igual a la actual, se borra el flag, cambia `passwordChangedAt` y se firma otra cookie: las sesiones anteriores dejan de servir. La misma pantalla sirve para cambiar la contraseña en cualquier momento, desde el menú o desde Perfil, aunque el flag no esté puesto.

Quien nunca definió contraseña usa «¿Olvidaste tu contraseña?» y necesita el correo ya fijado en `accounts.json`. El login responde «Contraseña incorrecta.» igual si el usuario no existe, si no tiene contraseña o si la contraseña no coincide.

### Administrador con contraseña temporal, dentro del contenedor

La imagen define `INTEGRAMED_AUTH_ROOT=/app/data/auth` y `INTEGRAMED_FHIR_ROOT=/app/data/fhir`, y corre como uid 1001. `docker exec` hereda esas variables, así que el Practitioner y `accounts.json` quedan en los volúmenes montados en `/app/data/fhir` y `/app/data/auth`. El exec va como ese mismo usuario. `-it` hace falta para que el prompt oculte lo que se escribe. La contraseña no va en el comando, ni en `-e`, ni en un archivo.

```bash
docker exec -it --user 1001 <contenedor> npm run create-user -- --email <correo> --role admin --must-change
```

Escribe la contraseña cuando pida `Contraseña:` y otra vez en `Repite la contraseña:`. Al primer acceso la clínica solo abre la pantalla para cambiarla.

Para marcar como temporal la contraseña de una cuenta que ya existe:

```bash
docker exec -it --user 1001 <contenedor> npm run set-password -- <correo> --must-change
```

Sin `--must-change` el resultado es el mismo: la contraseña queda temporal. Para dejarla definitiva:

```bash
docker exec -it --user 1001 <contenedor> npm run set-password -- <correo> --no-must-change
```

`-t` hace que el prompt oculte la entrada y pida confirmación. Sin terminal, el mismo comando lee una sola línea de stdin y no la confirma. Por ejemplo, un script puede redirigir esa línea al `docker exec -i` (sin `-t`). La contraseña no va en argv, en `-e`, ni en un archivo. `--password`, `--pass` y `-p` se rechazan. Si `SET_PASSWORD` o `CREATE_USER_PASSWORD` están definidas, el comando avisa y las ignora.

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
