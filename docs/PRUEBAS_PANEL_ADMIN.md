# Validación del panel administrativo — Corte 3

## Precondiciones

- MySQL `medicita_db` existente, respaldo completo y servidor Express iniciado.
- Cuenta de prueba registrada con hash scrypt y asignada de forma autorizada al rol admin en la base de pruebas.
- Una cuenta de prueba paciente distinta para controles negativos.

## Pruebas funcionales

1. Iniciar sesión con administrador: debe aparecer Gestión en la barra superior.
2. Iniciar sesión con paciente: Gestión no debe aparecer. Un `GET /api/patients` con su token debe responder 403.
3. Crear especialidad ficticia y verificarla en MySQL; editar su nombre; eliminarla si no tiene médicos asociados.
4. Crear médico ficticio con una especialidad existente; actualizar precio y horario. Confirmar los registros en la tabla doctors. No eliminar médicos vinculados a citas existentes.
5. Crear horario ficticio en doctor_schedules para ese médico, modificarlo y eliminarlo tras la prueba.
6. Consultar pacientes, editar un dato ficticio y verificar la actualización. Evitar modificar pacientes con datos reales.
7. Consultar citas y cambiar el estado de una cita de prueba, verificando en MySQL.
8. Consultar cuentas: email y rol visibles, hash y contraseña nunca mostrados.
9. Interrumpir MySQL de manera controlada en un entorno de pruebas: debe aparecer un mensaje de error, no un éxito falso.
10. Repetir las operaciones con la cuenta paciente normal y comprobar la denegación en los recursos protegidos.

## Limitaciones que deben documentarse

- El catálogo de médicos del endpoint GET /doctors solo devuelve médicos activos, por lo que un médico desactivado deja de aparecer en el listado del panel hasta que se implemente una consulta administrativa específica.
- El acceso al panel no crea administradores automáticamente. El alta de un rol privilegiado requiere una operación autorizada sobre la base de pruebas.
- El CRUD de cuentas está limitado deliberadamente: la API no permite editar contraseñas ni eliminar usuarios por las rutas genéricas.
- Se exige verificar el comportamiento contra MySQL del estudiante y registrar capturas antes de afirmar aprobación de las pruebas funcionales.
