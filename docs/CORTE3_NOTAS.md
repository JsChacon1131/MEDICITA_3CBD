# Corte 3 — Estado de implementación

Este proyecto parte de la API REST del corte 2, que almacenaba y comparaba contraseñas en texto plano. La interfaz de `public/` se basa en la estructura y las pantallas del prototipo Figma proporcionado por el equipo, pero requiere validación visual y de flujos contra el diseño definitivo.

## Seguridad implementada

La versión del corte 3 utiliza `crypto.scrypt` de Node.js con un salt aleatorio de 16 bytes, salida de 64 bytes y comparación de tiempo constante. El registro de usuarios transforma la contraseña en el servidor antes de escribirla. El login solo acepta hashes `scrypt$<salt>$<hash>`. La API nunca devuelve el hash en respuestas de usuario ni login.

El paso de migración se ejecuta manualmente tras un respaldo: `CONFIRM_PASSWORD_MIGRATION=YES npm run migrate:passwords` (en Windows PowerShell: `$env:CONFIRM_PASSWORD_MIGRATION='YES'; npm run migrate:passwords`). El script usa una transacción para actualizar todas las filas sin hash y conserva las filas ya migradas. Una contraseña antigua, aunque tenga menos de 10 caracteres, puede migrarse. Los registros nuevos deben tener al menos 10 caracteres. Si el proceso falla, se revierte la transacción. No ejecutar el script en bases de producción sin revisar respaldo y acceso restringido.

## Riesgo adicional y mejora propuesta

Los intentos masivos de autenticación siguen siendo posibles: el hash con salt protege mejor la base de credenciales ante su filtración, pero no impide ataques de fuerza bruta en el endpoint. Se propone incorporar una limitación de intentos por cuenta y dirección IP con retardo progresivo y registro de actividad anómala. Es pertinente porque los pacientes acceden a datos clínicos. No se implementó en este corte para priorizar la migración y la integración de los flujos; sería necesario evaluar proxy inverso, entornos de múltiples instancias y tasas permitidas de acceso.

Referencia: OWASP Foundation, *Authentication Cheat Sheet*, secciones «Protect Against Automated Attacks» y «Login Throttling»: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

Referencia: OWASP Foundation, *Password Storage Cheat Sheet*, sección «scrypt»: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Limitaciones por verificar

- La integración contra MySQL debe probarse con datos de ejemplo válidos y en ejecución local.
- El registro del corte 2 se realiza en dos POST independientes (`/patients` y `/users`); una mejora recomendada consiste en un registro transaccional único para evitar registros de pacientes sin cuenta.
- La API acepta email en el login. La autenticación por RUT mostrada en el prototipo de Figma no existe en el backend y no se simula.
- Las funciones de exportación financiera, validación biométrica, telemedicina y certificado ISO que puedan figurar en el diseño no están implementadas en la API original; no se deben presentar como funcionalidades operativas.
- El proyecto es una demostración académica y no debe operarse con información clínica real sin revisión adicional de privacidad, seguridad y despliegue.

## Evolución de las citas en la versión consolidada

El corte 3 añade cancelación y reprogramación para pacientes titulares de citas futuras. `PATCH /appointments/{id}` permite cambiar `status` a `cancelled` para pacientes, o enviar `starts_at` para reprogramar. La reprogramación usa transacción, bloqueo del médico y verificación del horario y los conflictos, excluyendo la cita que se está moviendo. Los administradores conservan la edición de estado y eliminación. Se añadió traducción de estados y formato legible de horarios en el frontend. La funcionalidad requiere prueba integrada contra MySQL antes de ser reportada como verificada en el informe final.
