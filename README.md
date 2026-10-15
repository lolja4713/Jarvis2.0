# Jarvis 2.0

Asistente de escritorio para Windows con Electron. Es un proyecto en desarrollo: a?n no cubre las 100 capacidades solicitadas.

## Funciones disponibles

- Perfiles locales con contrase?a protegida por hash; en la sesi?n administradora de Windows se usa el perfil del equipo sin pedir otro usuario.
- Animaci?n de inicio, saludo hablado y selecci?n de voces del sistema. La disponibilidad de voz masculina depende de las voces instaladas en Windows.
- Comandos por voz cuando Chromium ofrece reconocimiento y se concedi? permiso. La palabra de activaci?n Jarvis es opcional y queda desactivada por defecto; el reconocimiento continuo depende del motor de voz del sistema.
- Conversaci?n con IA local mediante Ollama, historial, personalidad configurable y lectura de respuestas. Requiere instalar Ollama y descargar un modelo; no usa suscripci?n ni clave de pago.
- Las ?rdenes por voz que no coinciden con una acci?n abren el chat local para responder, si hay un modelo seleccionado.
- Lista y apertura de aplicaciones registradas en Inicio de Windows. Abrir Minecraft selecciona Minecraft Launcher si est? instalado.
- Aprendizaje local de las aplicaciones abiertas. Si se activa en Preferencias, Jarvis abre hasta tres apps frecuentes al d?a despu?s de registrar cinco usos correctos por app.
- B?squeda local en Inicio, Documentos, Escritorio y Descargas; creaci?n de documentos TXT/Markdown y carpetas; eliminaci?n de archivos individuales con confirmaci?n.
- Panel de CPU y RAM, detecci?n de GPU y su motor con mayor actividad, control de volumen, control de brillo en pantallas compatibles, captura de pantalla y lista de ventanas abiertas.
- Cierre de una aplicaci?n visible con confirmaci?n. Revisi?n local bajo demanda del firewall, Microsoft Defender, puertos en escucha e intentos fallidos recientes; no es vigilancia continua. Apagar o reiniciar Windows requiere confirmaci?n y tiene cuenta regresiva cancelable.
- Editor de im?genes manual y generaci?n/edici?n local con ComfyUI. ComfyUI detecta el checkpoint SD 1.5 y los modelos Z Image Turbo/Qwen; la generaci?n Z Image agot? la memoria de esta PC, as? que no se considera validada aqu?.
- Constructor 3D b?sico de primitivas con exportaci?n OBJ/MTL para continuar en Blender.
- B?squeda web y traducci?n abren p?ginas del navegador; a?n no son resultados web integrados en el chat.
- El respaldo de GitHub descarga un repositorio p?blico. No sube autom?ticamente el c?digo ni los datos personales de Jarvis.

## Requisitos locales

Windows 10/11, Node.js LTS, npm y Git. Para el chat, instala Ollama y un modelo local. Para im?genes IA, instala ComfyUI portable y modelos compatibles. Cada motor local puede requerir bastante espacio, RAM y VRAM.

Para ejecutar desde el c?digo: npm.cmd install y luego npm.cmd start. El lanzador elimina ELECTRON_RUN_AS_NODE solo del proceso de Electron para evitar que se ejecute como Node.

No crear una versi?n instalable nueva hasta terminar de corregir y revisar los problemas pendientes.

## Capacidades a?n pendientes

No est?n conectados el reconocimiento biom?trico de usuarios, an?lisis fiable de emociones, b?squedas en tiempo real respondidas dentro del chat, noticias, clima, correo, calendario, vigilancia continua y an?lisis avanzado de seguridad, c?maras/OCR/visi?n, dispositivos dom?sticos, robots, drones, simulaciones cient?ficas o coordinaci?n de agentes. Esas funciones requieren servicios, credenciales, permisos y/o hardware espec?ficos.

La palabra de activaci?n depende del reconocimiento de voz de Chromium y puede requerir conexi?n seg?n el motor instalado. La identificaci?n facial y el monitoreo continuo no est?n implementados.

## Privacidad y alcance

Los perfiles, preferencias e historial se guardan en los datos locales de la aplicaci?n. Ollama y ComfyUI procesan localmente cuando est?n instalados. El uso del reconocimiento de voz depende del proveedor del motor de Windows/Chromium. El bot?n de GitHub descarga repositorios; no sincroniza las conversaciones ni publica el perfil.

La lista de 100 funciones es un objetivo de desarrollo, no una afirmaci?n de que todas est?n disponibles. Algunas dependen de hardware, cuentas, permisos o servicios que no est?n presentes en este proyecto.
