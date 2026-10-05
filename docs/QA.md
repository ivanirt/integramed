# QA por rol

Los usuarios salen de `npm run seed:test-users`. El comando lee `ROLE_LABELS` en `src/lib/roles.ts` en cada ejecución; un rol nuevo entra solo si se agrega ahí. Correos: `qa+<rol>@integramed.local` (hoy: doctor, therapist, nurse, receptionist, admin, lab, pharmacist). La contraseña está solo en `.local/test-users.json`. Entrar en `/acceso` con ese correo. `npm run remove-test-users` borra esos Practitioner, su PractitionerRole y su credencial. No toca otros usuarios, pacientes, `samples/` ni `protocol.csv`.

Si se usa «¿Olvidaste tu contraseña?», la clave del archivo queda vieja. `npm run seed:test-users -- --rotate` la vuelve a alinear.

El menú y `canAccess` salen de `ROLE_SCREENS`. `perfil` siempre está permitido. `config` solo si el rol es `admin`. Apagar un módulo en Configuración → Módulos bloquea `home`, `agenda`, `patients`, `farmacia`, `personal` y `boveda`. `consulta`, `horario` y `ausencias` no miran ese interruptor.

| Pantalla | doctor | therapist | nurse | receptionist | admin | lab | pharmacist |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio `/` | sí | sí | sí | sí | sí | sí | sí |
| Agenda `/agenda` | sí | sí | sí | sí | sí | no | no |
| Pacientes `/pacientes` | sí | sí | sí | sí | sí | sí | sí |
| Consulta `/consulta` | sí | sí | sí | no | sí | no | no |
| Horario `/horario` | sí, el propio | sí, el propio | sí, el propio | no | sí, el de todos | no | no |
| Días libres `/ausencias` | sí, los propios | sí, los propios | sí, los propios | no | sí, los de todos | no | no |
| Farmacia `/farmacia` | no | no | no | no | sí | no | sí |
| Personal `/personal` | no | no | no | no | sí | no | no |
| Bóveda `/boveda` | sí | sí | sí | no | sí | sí | no |
| Configuración `/config` | no | no | no | no | sí | no | no |
| Perfil `/perfil` | sí | sí | sí | sí | sí | sí | sí |

«No» en una ruta directa redirige a `/?aviso=…` con el texto de que la pantalla no está disponible. El middleware comprueba la firma de la cookie y el rol conocido; cada página vuelve a mirar la pantalla con `requireScreen`.

## Login y logout

- Con la contraseña del archivo, el correo entra y el rol de la sesión es el de esa fila. La cookie va firmada; el proxy FHIR la exige igual que el middleware.
- Un correo que no existe responde «Contraseña incorrecta.»
- No hay contraseña compartida. Una cuenta sin hash personal, tenga o no `passwordRequired`, responde que hay que definirla con «¿Olvidaste tu contraseña?». `CLINIC_MASTER_PASSWORD` no abre sesión.
- «Salir» en el pie llama `POST /api/auth` con `action: logout`, borra la cookie y vuelve a `/acceso`.
- El selector de rol solo aparece si el Practitioner tiene más de un rol. Cada usuario de prueba tiene uno, así que no debe aparecer.

## Restablecer contraseña

- En `/acceso`, «¿Olvidaste tu contraseña?» abre `/acceso/recuperar`.
- Cualquier correo bien formado recibe el mismo texto: «Si la cuenta existe, enviamos un enlace para restablecer la contraseña.»
- Sin SMTP, la respuesta es la misma y no se genera enlace. En producción no se imprime. En local solo se imprime si `PASSWORD_RESET_LOG_LINK=1` (ese flag se ignora en producción). El arranque avisa que el correo no está configurado. `npm run set-password -- <correo>` con `SET_PASSWORD` en el entorno asigna o reemplaza la contraseña sin escribirla en un archivo ni en el registro. El enlace, cuando existe, dura 45 minutos, es de un solo uso, y otro pedido anula el anterior.
- `/acceso/restablecer?token=…` pide contraseña y confirmación (8 caracteres, una letra y un número).
- Después se entra con la clave nueva. La cookie anterior deja de servir.

## Menú

Lo que cada rol debe ver en el pie es la tabla de arriba (Horario, Días libres, Farmacia, Personal, Bóveda, Configuración). Inicio, Agenda y Pacientes están fijos en `ClinicShell` y no consultan `screens`.

Esperado según `roles.ts`: lab y pharmacist no tienen agenda. Hoy el enlace «Agenda» se dibuja igual, y al abrirlo los manda al inicio con el aviso. Inicio también muestra «Abrir agenda» y «Registrar paciente» a todos los que entran, incluidos lab y pharmacist.

## Modalidades en la consulta

Quien tiene `consulta` abre la nota SOAP. A la derecha, «Modalidades e IA» lista el catálogo (medicina china, acupuntura, ayurveda, funcional, homeopatía, iridología, biodescodificación, células madre). Lo marcado se guarda en la Composition, extensión de la nota, junto con el diagnóstico CIE o el texto libre. «IA · diagnóstico» y «IA · tratamiento» llaman a `/api/ai/clinical` y de ahí al proxy. Hace falta sesión y `CLINICAL_AI_KEY`. Sin clave, la consulta responde que falta configurarla.

El catálogo se edita en `/config/integrativa`, solo admin (la página cuelga de Configuración y el enlace «Editar catálogo» dentro de la consulta también exige `role === "admin"`). Iridología nace desactivada.

Enfermería, al abrir una consulta nueva o una que sigue en `arrived`, cae en `/consulta/:id/signos` (peso y signos → Observation). Médico, terapeuta y admin ven el aviso de triaje y pueden «Entrar sin triaje» (`?forzar=1`). Enfermería también puede forzar esa URL y llegar a la nota completa.

## Iridología

No hay flujo de foto de iris en esta app ni en `legacy-client/`: no existe subir imagen, elegir ojo derecho o izquierdo, alinear una plantilla, marcar regiones, exportar ni una nota distinta de la SOAP.

Lo que sí hay es la modalidad `iridology` («Iridología»), apagada por defecto. Si se activa en el catálogo y se marca en la visita, la IA pide al vault notas con etiqueta `iridology` / `iridologia`. El guardado sigue siendo la Composition de la consulta, vía el proxy FHIR. No hay `samples/` ni `protocol.csv` en el repositorio para ese estudio.

## FHIR

Las escrituras clínicas van al proxy (`FHIR_PROXY_URL`, `http://127.0.0.1:3001`): Patient, Appointment, Encounter, Composition, Observation, MedicationRequest, ServiceRequest, DiagnosticReport, Schedule, Basic. Con `FHIR_MODE=local` quedan en `data/fhir/`.

Quien tiene pacientes puede abrir la ficha. Recetas y estudios están en esa ficha (`/pacientes/:id/recetas`, `/pacientes/:id/estudios`). Guardar un estudio crea DiagnosticReport. Pedir un estudio crea ServiceRequest. La farmacia guarda inventario en Basic. Nada de eso vuelve a comprobar el rol dentro de la server action: la puerta es la página y, en el proxy, la sesión firmada.

El proxy escucha solo en loopback y pide el secreto interno más una sesión firmada de un rol de clínica. Next ya no deja pasar `/api/fhir` ni `/api/health` sin esa cookie. Las escrituras de la bóveda piden rol `admin`.

## Pacientes

- Lista: `/pacientes`, quien tenga la pantalla `patients` (todos los roles actuales).
- Alta: «Nuevo paciente» → `/pacientes/nuevo` → Patient con nombre, apellido, sexo y fecha.
- No hay caja de búsqueda: el listado muestra todos los Patient devueltos por el proxy.
- Desde el resumen, «Nueva consulta» se muestra aunque el rol no tenga `consulta`. Esos roles (recepción, lab, farmacia) reciben el aviso al seguir el enlace. La página `/pacientes/nuevo` no llama a `requireScreen`: hoy todos los roles tienen pacientes, pero si se apaga el módulo Pacientes la alta directa sigue abierta.

## Otros flujos

- Agenda: crear y mover citas (`Appointment`) quien tenga la pantalla. «Abrir consulta» crea el Encounter sin volver a mirar el rol en la action; la página de consulta sí lo mira.
- Horario y ausencias: admin ve a todo el personal. Los demás roles con esa pantalla solo editan lo propio (`requireSelfOrAdmin`).
- Personal: alta y edición de Practitioner, solo admin.
- Bóveda: lectura del vault para quien tenga la pantalla.
- Configuración: apertura, festivos, servicios, sedes, módulos, integrativa y FHIR. La página exige admin. Varias actions de ese grupo (`saveModulesAction`, sedes, servicios, inventario, paciente, SOAP, estudios) no repiten `requireAdmin` ni `requireScreen`.
- Signos: cualquier rol con `consulta` puede abrir `/consulta/:id/signos`, no solo enfermería.

## Donde el código no coincide con `roles.ts`

1. Inicio, Agenda y Pacientes del menú lateral no se filtran con `ROLE_SCREENS`. Lab y farmacia ven Agenda y, al entrar, el aviso.
2. Inicio ofrece «Abrir agenda» y «Registrar paciente» a cualquier rol con inicio, incluidos los que no tienen agenda.
3. El resumen del paciente muestra «Nueva consulta» a recepción, lab y farmacia, que no tienen `consulta`.
4. `/pacientes/nuevo` y `createPatientAction` no comprueban la pantalla `patients`. Apagar el módulo no cierra el alta.
5. `startConsultFromAppointment`, `saveSoapAction`, recetas, estudios, inventario, módulos, sedes y servicios no vuelven a aplicar el rol. La protección está en la página, no en la action ni en el proxy.
6. El proxy exige sesión firmada y rol conocido, pero no aplica `canAccess` pantalla por pantalla. Una sesión de laboratorio puede llamar al proxy si tiene el secreto interno (solo el servidor lo tiene).
7. `canAccess` deja pasar `consulta`, `horario` y `ausencias` aunque el mapa de módulos los quisiera apagar. Esos tres ni siquiera están en `DEFAULT_MODULES`.
8. Si se apaga el módulo Inicio, `requireScreen` redirige a `/`, que también exige inicio: la navegación puede entrar en bucle.
9. Enfermería puede saltarse el triaje con `?forzar=1` y usar la misma nota e IA que el médico. Terapeuta tiene las mismas pantallas que el médico, incluida la consulta.
10. La iridología de foto, overlay y regiones no está implementada. Solo existe como modalidad del catálogo y como etiqueta del vault.
