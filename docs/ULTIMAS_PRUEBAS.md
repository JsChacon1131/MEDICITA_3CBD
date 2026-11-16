# MediCita · Validación final del caso 7 y corte 3

Trabajar solamente con información ficticia en una base local. Todas las pruebas deben registrarse como **aprobada, fallida o pendiente**, con evidencia de navegador y consulta SQL. No certificar un módulo solo por mostrar una pantalla.

## Instalación

1. Respaldar `medicita_db` en MySQL Workbench antes de migraciones. No ejecutar `database/medicita.sql` sobre la base existente.
2. Copiar `.env.example` a `.env` y ajustar la conexión y `SESSION_SECRET`; el archivo está excluido por `.gitignore`.
3. Ejecutar `npm.cmd ci`, `npm.cmd test` y `npm.cmd start` desde la raíz del ZIP. Abrir `http://localhost:5000/`.
4. Entrar con la cuenta paciente y con la cuenta de administrador de pruebas.

## Autenticación segura

- Registrar un paciente nuevo y consultar en MySQL un prefijo `scrypt$` en `users.password` (no mostrar el hash entero en capturas).
- Comprobar login válido e inválido, estado de error y sesión cerrada.
- Auditar contraseñas anteriores: `npm.cmd run audit:passwords` (puede salir con código 1 si detecta claves antiguas).
- Con un **respaldo comprobado**, en PowerShell: `$env:CONFIRM_PASSWORD_MIGRATION='YES'`; luego `npm.cmd run migrate:passwords`; después `Remove-Item Env:\CONFIRM_PASSWORD_MIGRATION`; volver a auditar hasta obtener `Contraseñas antiguas pendientes: 0` e `inválidas: 0`.
- Probar login de un usuario antiguo con su contraseña original y comprobar que el hash migrado es diferente del texto original. No revelar credenciales.

## Paciente

- Buscar por nombre y filtrar especialidad; comprobar imágenes predeterminadas.
- Reservar una cita futura, comprobar su ID en MySQL y la desaparición del horario ocupado.
- Reprogramarla y verificar **mismo ID** y nueva hora; cancelarla y verificar `status=cancelled` y liberación del horario.
- Consultar resultados numéricos (valor, unidad y rango), cualitativos (hallazgo) y de imagenología (informe e imagen protegida, solo si existe archivo de prueba). La ficha no debe mostrar JSON.
- En **Reseñas**, verificar que una cita `scheduled` **no** permita reseña. Desde Gestión, marcar una cita realmente atendida de prueba como `completed`; regresar al usuario paciente y publicar calificación, comentario opcional, espera opcional y etiquetas si existen en `/review-tags`. Comprobar en MySQL tablas `reviews` y `review_tag_assignments`. No se admiten reseñas de citas ajenas.

## Administración

- Verificar que **Gestión** solo aparece con rol administrador; probar que un usuario paciente recibe `403` al consultar `/api/admin/finance` con su token.
- Alta, consulta, edición y eliminación de especialistas y especialidades de prueba, sin afectar especialistas con citas existentes.
- Alta, edición y eliminación de horarios de prueba: comprobar siempre el **ID** del horario editado y no afectar el horario original. Corregir el error que se detectó antes en una sesión de pruebas si se reproduce.
- Consultar pacientes registrados y cambiar estado de citas de prueba.
- En **Citas del día**, verificar filtro de fecha actual del servidor y nombres reales.
- En **Reporte financiero**, comprobar el total y la distribución `scheduled`, `completed`, `cancelled` mediante `appointments.price_at_booking`; comparar contra SQL y probar los filtros de fecha. Exportar CSV y revisar filas. No presentarlo como dinero cobrado.

Consulta de cotejo financiero:

```sql
SELECT status, COUNT(*) AS appointment_count,
       COALESCE(SUM(price_at_booking), 0) AS total_value
FROM medicita_db.appointments
GROUP BY status;
```

## UX, permisos y entrega

- Capturar al menos una pantalla de **carga**, una de **error** y una de **confirmación**; probar con ancho de ventana reducido.
- Comprobar que la API no permite consultar resultados ni citas de otro paciente.
- Ejecutar nuevamente `npm.cmd test`; corregir cada fallo real antes de entregar.
- Revisar nombres en inglés, manejo de errores, variables configurables, comentarios, emojis, archivos sin uso, `.gitignore`, rutas REST, commits descriptivos y permisos de lectura del repositorio.
- Preparar informe IEEE en LaTeX/Overleaf y compilarlo a PDF; conclusiones centradas en las necesidades del cliente, no en la experiencia del curso. Añadir propuesta de seguridad argumentada, por ejemplo limitación de intentos de login y MFA, citando NIST/OWASP, y documentar evolución desde texto plano en corte 2 a scrypt con salt en corte 3.
- Grabar video de **máximo cinco minutos** mostrando solo uso real: registro, login, agendar, cambiar/cancelar, reseñas, resultados, gestión, reportes, carga, error y confirmación. Subir a YouTube público o no listado.
