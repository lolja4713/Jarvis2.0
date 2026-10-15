# Jarvis 2.0

Asistente de escritorio para Windows, en español, creado con Electron.

## Funciones incluidas

- Comandos por voz en el navegador integrado cuando Windows/Electron dispone de Speech Recognition: abrir aplicaciones, buscar archivos y navegar por la app.
- Búsqueda por nombre en carpetas personales (Inicio, Documentos, Escritorio y Descargas); limita cada carpeta a 10 000 entradas.
- Abrir aplicaciones frecuentes mediante un mapa de comandos seguro y ampliable.
- Detectar y listar las aplicaciones registradas en el menú Inicio de Windows de cada computadora; permite abrirlas desde su identificador instalado.
- Crear y editar imágenes localmente con un lienzo, dibujo, borrador, texto, deshacer, importación y exportación PNG.
- Crear documentos TXT y Markdown.
- Preferencias guardadas en el equipo: nombre, color, saludo y lectura en voz alta.
- Pantalla de carga animada y saludo hablado al inicio.
- Comandos de voz encadenados con “y luego”, por ejemplo abrir una app y después buscar un archivo.
- Panel de sistema con uso aproximado de CPU y memoria, captura de pantalla, y apagado/reinicio con confirmación y cuenta regresiva cancelable.
- Búsquedas web y traducción abren el navegador; no son respuestas de IA integradas.
- Chat inteligente conectado a la Responses API de OpenAI: conversación con contexto reciente, ayuda de redacción, resúmenes, idiomas y programación; modelo y tono configurables.
- Generación de imágenes nuevas y edición del lienzo actual mediante la herramienta de imagen de OpenAI; incluye también un editor manual local.
- Clave API cifrada mediante `safeStorage` de Electron en el equipo local; el historial de conversación permanece local y se puede borrar.
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

Instalador generado para Windows x64: [`Jarvis-2.0-Setup-1.0.4.exe`](release/Jarvis-2.0-Setup-1.0.4.exe).

Al iniciar, Jarvis muestra una pantalla animada de carga y, si el saludo y la voz están activados, dice: «Hola, estoy listo para ayudarte».

## Respaldo con GitHub

En Personalización, pega la URL HTTPS de un repositorio GitHub. Jarvis descargará el repositorio en `Documentos/Jarvis-Backups`. Para repositorios privados, configura previamente credenciales de Git. Esto no es una carga automática de cambios: primero habrá que inicializar y configurar un repositorio de respaldo de los datos que quieras sincronizar.

## Privacidad y límites

El historial y las preferencias se guardan en el directorio local de datos de la app; la búsqueda recorre carpetas personales localmente. El chat y la generación/edición de imágenes requieren una clave API de OpenAI y conexión a Internet. Los mensajes y hasta seis turnos recientes de contexto se envían a OpenAI para obtener la respuesta; para editar, también se envía el lienzo actual. El uso de API puede tener costo según el modelo, imágenes y cuenta. Jarvis no entrega comandos arbitrarios al modelo ni ejecuta directamente sus respuestas en Windows.

## Estado de la lista de capacidades

Esta versión implementa una base de escritorio, no las 100 capacidades completas. Están disponibles de forma básica: chat de IA por Responses API, generación/edición de imágenes por IA, lectura de respuestas mediante la voz del sistema (2), preferencias visuales (13, parcial), comandos encadenados sencillos (7 y 8, parcial), búsqueda de archivos (23), documentos TXT/Markdown (24), métricas CPU/RAM (29, aproximadas), búsqueda web externa (31), abrir páginas vía navegador (37, indirecto), captura de pantalla (22), apagado/reinicio confirmados (17) y clonación GitHub (63, solo descarga).

La conversación general y respuestas de conocimiento requieren integrar y configurar un proveedor de IA. El wake word (15), reconocimiento de personas/emociones (4 y 12), correo/calendario (33–35 y 40), análisis de seguridad, cámaras, domótica, robots/drones y agentes continuos necesitan servicios, credenciales, hardware y permisos que aún no están conectados. El instalador no debe presentarse como si esas funciones ya estuvieran disponibles.

El editor de imágenes incluido es local y no genera imágenes mediante IA. La detección de aplicaciones utiliza `Get-StartApps` de Windows; muestra las apps registradas en el menú Inicio y depende de PowerShell y del registro de lanzamiento que Windows exponga.
