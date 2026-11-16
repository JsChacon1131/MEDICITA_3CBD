# Procedimiento de verificación del corte 3

## 1. Entorno

Instalar dependencias con `npm.cmd ci`. Preparar `.env` a partir de `.env.example`; no subirlo a GitHub. Conservar la base `medicita_db` que se viene utilizando.

## 2. Respaldar MySQL antes de cambiar contraseñas

En MySQL Workbench: Server > Data Export > seleccionar `medicita_db` > Export to Self-Contained File > Start Export. Confirmar que el archivo de respaldo existe y puede recuperarse. Ejecutar el procedimiento únicamente con la base de prácticas y sin usuarios reales.

## 3. Auditar y migrar contraseñas

En la terminal PowerShell de VS Code, dentro de la carpeta del proyecto:

```powershell
npm.cmd run audit:passwords
$env:CONFIRM_PASSWORD_MIGRATION='YES'
npm.cmd run migrate:passwords
Remove-Item Env:\CONFIRM_PASSWORD_MIGRATION
npm.cmd run audit:passwords
```

La primera auditoría puede devolver código de salida 1 cuando encuentra credenciales por migrar: es esperado. El script de migración opera con una transacción y salta las contraseñas con hash scrypt válido. Si encuentra un hash scrypt mal formado, revierte la transacción. No muestra contraseñas. No volver a ejecutar SQL de creación de tablas sobre la base con registros.

Antes de migrar, verificar que el proceso de registro e inicio de sesión actualizado esté funcionando. Tras migrar, iniciar sesión con las cuentas anteriores y comprobar que la contraseña original sigue siendo válida. En caso de fallo, detenerse y revisar el respaldo.

## 4. Pruebas del paciente

- Registrar una cuenta ficticia nueva y verificar que su columna `users.password` empiece con `scrypt$` y que el valor sea diferente al texto original.
- Iniciar sesión y comprobar el mensaje de confirmación. Probar una contraseña incorrecta y documentar el mensaje de error.
- Buscar especialistas y consultar sus horarios.
- Reservar una cita y verificar con SELECT en `appointments`.
- Reprogramar, verificar el mismo ID y un nuevo `starts_at`.
- Cancelar, verificar `status=cancelled` y que el horario vuelva a estar disponible.
- Consultar resultados y comprobar las tres variantes de ficha (numérico, cualitativo e imagenología) si hay datos de prueba.

## 5. Panel administrativo y permisos

Iniciar sesión con una cuenta administradora previamente existente y migrada; no inventar ni registrar una clave de administrador en el repositorio. Confirmar la sección Gestión y probar un alta, modificación y eliminación usando registros ficticios. Un usuario paciente NO debe ver Gestión y el backend debe devolver 403 al llamar rutas exclusivas de administrador. Verificar que un paciente tampoco pueda modificar citas de otro paciente, ni consultar sus resultados.

## 6. Evidencias

Guardar capturas de resultados del navegador y consultas SQL sin contraseñas, tokens ni datos reales. Adjuntar evidencias al informe IEEE en LaTeX; compilar en Overleaf. Grabar un recorrido exclusivamente funcional de menos de 5 minutos y compartir el enlace de YouTube.

## 7. Pendientes de revisión manual

No se ha ejecutado la migración contra la base MySQL local del usuario ni se ha probado el panel administrativo con credenciales reales. El registro de exámenes duplicados en la tabla `medical_results` no se elimina de forma automática; si existen duplicados se deben revisar por ID, evitando borrar datos válidos. El informe final y su compilación a PDF requieren evidencias de esas pruebas.
