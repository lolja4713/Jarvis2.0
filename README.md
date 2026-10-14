# Jarvis 2.0

Asistente de escritorio para Windows, en español, creado con Electron.

## Funciones incluidas

- Comandos por voz en el navegador integrado cuando Windows/Electron dispone de Speech Recognition: abrir aplicaciones, buscar archivos y navegar por la app.
- Búsqueda por nombre en carpetas personales (Inicio, Documentos, Escritorio y Descargas); limita cada carpeta a 10 000 entradas.
- Abrir aplicaciones frecuentes mediante un mapa de comandos seguro y ampliable.
- Crear documentos TXT y Markdown.
- Preferencias guardadas en el equipo: nombre, color, saludo y lectura en voz alta.
- Registro local de actividad para mostrar patrones de uso. El aprendizaje de hábitos es descriptivo por ahora; todavía no ejecuta aplicaciones de forma automática.
- Descargar una copia local de un repositorio público de GitHub. El envío de cambios al repositorio requiere configurar Git y credenciales en el equipo.
- Generar un instalador de Windows NSIS.

## Requisitos

- Windows 10/11, Node.js LTS, npm y Git instalado y disponible en PATH.
- Para voz, el reconocimiento de voz de Chromium y permiso de micrófono deben estar disponibles. Puedes usar las funciones por texto si no lo están.

## Ejecutar desde el código

```powershell
npm.cmd install
npm.cmd start
```

## Crear el instalador

```powershell
npm.cmd run dist
```

El instalador aparecerá en `release/`.

## Respaldo con GitHub

En Personalización, pega la URL HTTPS de un repositorio GitHub. Jarvis descargará el repositorio en `Documentos/Jarvis-Backups`. Para repositorios privados, configura previamente credenciales de Git. Esto no es una carga automática de cambios: primero habrá que inicializar y configurar un repositorio de respaldo de los datos que quieras sincronizar.

## Privacidad y límites

El historial y las preferencias se guardan en el directorio local de datos de la app; la búsqueda recorre carpetas personales localmente. No se incluye un modelo de IA, ejecución de comandos arbitrarios, instalación de aplicaciones ni automatización basada en la hora: las acciones actuales son explícitas y limitadas.
