# MediCita — Corte 3

Aplicación web de gestión de citas médicas desarrollada con Node.js, Express, MySQL y HTML/CSS/JavaScript.

## Contenido del proyecto

- `src/`: API REST, autenticación, servicios, controladores y persistencia.
- `public/`: interfaz web y recursos visuales.
- `database/medicita.sql`: esquema SQL del proyecto.
- `docs/openapi.yaml`: contrato OpenAPI, disponible mediante Swagger UI.
- `postman/`: colección de peticiones REST.
- `scripts/`: auditoría y migración de contraseñas.
- `tests/`: pruebas automatizadas.
- `.env.example`: plantilla de variables de entorno sin credenciales reales.

## Instalación y ejecución

1. Instala Node.js y MySQL.
2. Clona el repositorio y abre su carpeta.
3. Ejecuta `npm install`.
4. Importa `database/medicita.sql` en MySQL.
5. Copia `.env.example` como `.env` y configura la conexión de tu base de datos y un `SESSION_SECRET` aleatorio. Nunca publiques el archivo `.env`.
6. Ejecuta `npm start`.
7. Abre `http://localhost:5000/` en tu navegador.
8. Para la documentación REST, abre `http://localhost:5000/api-docs`.

## Pruebas

- `npm test`: pruebas automatizadas.
- `npm run audit:passwords`: auditoría de contraseñas (requiere base de datos configurada).
- `npm run format:check`: validación del formato.

## Seguridad

No publiques contraseñas, tokens, datos reales de pacientes, la carpeta `private_images/` ni las dependencias instaladas en `node_modules/`.

## Alcance

Este repositorio contiene el código fuente, la interfaz, el modelo SQL, la documentación de API y las pruebas del proyecto académico MediCita. Para verificar el funcionamiento se necesita configurar una base de datos MySQL local.
