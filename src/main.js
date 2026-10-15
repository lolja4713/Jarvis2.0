const { app, BrowserWindow, ipcMain, shell, dialog, desktopCapturer, net } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

let win;
let installedApps = [];
const userDir = app.getPath('userData');
const dataFile = path.join(userDir, 'jarvis-data.json');
function safeAppPath(name) { try { return app.getPath(name); } catch { return null; } }
const allowedFolders = ['home', 'documents', 'desktop', 'downloads'].map(safeAppPath).filter(Boolean);

function readData() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
  catch { return { settings: {}, usage: {}, favorites: [], history: [] }; }
}
function writeData(value) { fs.mkdirSync(userDir, { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(value, null, 2), 'utf8'); }
function legacyAiHistory(messages) {
  const result = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i]?.role === 'user' && messages[i + 1]?.role === 'assistant') result.push({ question: String(messages[i].content || ''), answer: String(messages[i + 1].content || ''), at: new Date().toISOString() });
  }
  return result;
}
function getAiHistory(d) { return Array.isArray(d.aiHistory) ? d.aiHistory.filter(item => item && typeof item.question === 'string' && typeof item.answer === 'string') : legacyAiHistory(Array.isArray(d.aiMessages) ? d.aiMessages : []); }
function publicData(d) { return { settings: d.settings || {}, usage: d.usage || {}, favorites: d.favorites || [], history: d.history || [], ai: { configured: true, messages: d.aiMessages || [], history: getAiHistory(d) } }; }

function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 800, minWidth: 900, minHeight: 620, backgroundColor: '#080b12', title: 'Jarvis 2.0', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('settings:get', () => publicData(readData()));
ipcMain.handle('shell:open-external', (_e, url) => /^https:\/\/ollama\.com\/download\/?$/.test(String(url)) ? shell.openExternal(url) : false);
ipcMain.handle('settings:save', (_e, value) => { const d = readData(); d.settings = { ...d.settings, ...value }; writeData(d); return d.settings; });
ipcMain.handle('usage:record', (_e, label) => { const d = readData(); const key = String(label).trim().toLowerCase(); if (key) d.usage[key] = (d.usage[key] || 0) + 1; d.history.unshift({ label: String(label), at: new Date().toISOString() }); d.history = d.history.slice(0, 40); writeData(d); return publicData(d); });
ipcMain.handle('ai:models', async () => {
  try { const response = await net.fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(5000) }); if (!response.ok) return { ok: false, models: [], message: 'Ollama no estÃ¡ iniciado. InÃ­cialo para usar IA local.' }; const result = await response.json(); const models = (result.models || []).map(m => m.name).filter(Boolean); return { ok: true, models, message: models.length ? 'IA local lista. Tus mensajes no salen de este equipo.' : 'Ollama está iniciado, pero todavía no hay modelos descargados.' }; }
  catch { return { ok: false, models: [], message: 'Ollama no estÃ¡ disponible. InstÃ¡lalo e inicia un modelo para usar IA gratis y local.' }; }
});
ipcMain.handle('ai:save-config', (_e, config) => { const d = readData(); d.settings = { ...d.settings, aiModel: String(config?.model || '').slice(0, 120), personality: ['amable', 'profesional', 'divertida'].includes(config?.personality) ? config.personality : 'amable' }; writeData(d); return { ...d.settings }; });
ipcMain.handle('ai:clear-chat', () => { const d = readData(); d.aiHistory = getAiHistory(d); d.aiMessages = []; writeData(d); return []; });
ipcMain.handle('ai:chat', async (_e, prompt) => {
  const text = String(prompt || '').trim().slice(0, 6000); if (!text) return { ok: false, message: 'Escribe una pregunta o instrucciÃ³n.' };
  const d = readData(); const model = String(d.settings.aiModel || '').slice(0, 120);
  if (!model) return { ok: false, message: 'Primero actualiza la lista y selecciona un modelo local de Ollama.' };
  const personalities = { amable: 'Responde de forma amable, natural y clara.', profesional: 'Responde de forma profesional, directa y ordenada.', divertida: 'Responde con calidez y humor ligero, sin distraerte de la tarea.' };
  const history = Array.isArray(d.aiMessages) ? d.aiMessages.slice(-12).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 6000) })) : [];
  let response;
  try { response = await net.fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: `Eres Jarvis 2.0, un asistente personal en espaÃ±ol. ${personalities[d.settings.personality] || personalities.amable} Responde en el idioma del usuario. No afirmes haber ejecutado acciones en su computadora: aquÃ­ solo conversas y generas texto.` }, ...history, { role: 'user', content: text }] }), signal: AbortSignal.timeout(180000) }); }
  catch { return { ok: false, message: 'No pude conectar con Ollama. Comprueba que estÃ© iniciado y que tengas descargado un modelo.' }; }
  if (!response.ok) return { ok: false, message: response.status === 404 ? 'No encuentro ese modelo. Actualiza la lista de modelos locales.' : `Ollama respondiÃ³ con error ${response.status}.` };
  let result; try { result = await response.json(); } catch { return { ok: false, message: 'No se pudo leer la respuesta del modelo local.' }; }
  const answer = String(result.message?.content || '').trim(); if (!answer) return { ok: false, message: 'El modelo local no devolviÃ³ texto esta vez.' };
  const askedAt = new Date().toISOString(); const aiHistory = getAiHistory(d);
  d.aiMessages = [...history, { role: 'user', content: text }, { role: 'assistant', content: answer }].slice(-40);
  d.aiHistory = [...aiHistory, { question: text, answer, at: askedAt }].slice(-100);
  writeData(d); return { ok: true, answer, messages: d.aiMessages, history: d.aiHistory };
});ipcMain.handle('files:search', async (_e, query) => {
  const needle = String(query || '').trim().toLowerCase(); if (!needle) return [];
  const found = []; const seen = new Set(); const roots = [...new Set(allowedFolders)];
  for (const root of roots) {
    const stack = [root]; let scanned = 0;
    while (stack.length && scanned < 10000 && found.length < 60) {
      const dir = stack.pop(); let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        scanned++; if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'AppData') continue;
        const full = path.join(dir, entry.name);
        const normalized = path.resolve(full).toLowerCase();
        if (entry.name.toLowerCase().includes(needle) && !seen.has(normalized)) { seen.add(normalized); found.push({ name: entry.name, path: full, directory: entry.isDirectory() }); }
        if (entry.isDirectory() && stack.length < 200) stack.push(full);
        if (found.length >= 60 || scanned >= 10000) break;
      }
    }
  }
  return found;
});
ipcMain.handle('files:open', async (_e, file) => { if (typeof file !== 'string') return false; const resolved = path.resolve(file); if (!allowedFolders.some(root => resolved.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep))) return false; await shell.openPath(resolved); return true; });
ipcMain.handle('apps:open', async (_e, name) => {
  const target = String(name || '').trim(); if (!target || target.length > 120) return { ok: false, message: 'Escribe el nombre de una aplicaciÃ³n.' };
  if (process.platform === 'win32') {
    const found = installedApps.find(item => item.name.toLowerCase() === target.toLowerCase() || item.appId.toLowerCase() === target.toLowerCase());
    if (found) { execFile('explorer.exe', [`shell:AppsFolder\\${found.appId}`], { windowsHide: true }, () => {}); return { ok: true, message: `Abriendo ${found.name}.` }; }
  }
  if (/^(minecraft|minecraft launcher)$/i.test(target)) {
    const candidates = ['C:\\XboxGames\\Minecraft Launcher\\Content\\Minecraft.exe', path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Minecraft Launcher', 'Minecraft.exe'), path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Minecraft Launcher', 'MinecraftLauncher.exe')];
    const exe = candidates.find(p => p && fs.existsSync(p));
    if (exe) { execFile(exe, [], { windowsHide: true }, () => {}); return { ok: true, message: 'Abriendo Minecraft.' }; }
    const uri = await shell.openExternal('minecraft://'); return { ok: true, message: 'Buscando Minecraft en el sistema.' };
  }
  const common = { calculadora: 'calc.exe', calculator: 'calc.exe', bloc: 'notepad.exe', notepad: 'notepad.exe', notas: 'notepad.exe', paint: 'mspaint.exe', explorador: 'explorer.exe', navegador: 'https://www.google.com', chrome: 'chrome.exe' };
  const program = common[target.toLowerCase()];
  if (!program) return { ok: false, message: `AÃºn no tengo una acciÃ³n segura para abrir Â«${target}Â». Puedes aÃ±adirla en PersonalizaciÃ³n.` };
  if (/^https?:/.test(program)) await shell.openExternal(program); else execFile('cmd.exe', ['/c', 'start', '', program], { windowsHide: true }, () => {});
  return { ok: true, message: `Abriendo ${target}.` };
});
ipcMain.handle('apps:list', () => new Promise(resolve => {
  if (process.platform !== 'win32') return resolve([]);
  const script = 'Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress';
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
    if (error) return resolve([]);
    try { const value = JSON.parse(stdout.trim()); const items = (Array.isArray(value) ? value : [value]).filter(x => x && typeof x.Name === 'string' && typeof x.AppID === 'string').map(x => ({ name: x.Name.trim(), appId: x.AppID.trim() })).filter(x => x.name && x.appId); installedApps = [...new Map(items.map(x => [x.appId, x])).values()].slice(0, 500); resolve(installedApps.map(({ name, appId }) => ({ name, appId }))); }
    catch { resolve([]); }
  });
}));
ipcMain.handle('images:open', async () => {
  const result = await dialog.showOpenDialog(win, { title: 'Abrir imagen', properties: ['openFile'], filters: [{ name: 'ImÃ¡genes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }] });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  const file = result.filePaths[0]; const ext = path.extname(file).toLowerCase(); const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bmp': 'image/bmp', '.gif': 'image/gif' })[ext];
  try { const bytes = fs.readFileSync(file); if (bytes.length > 25 * 1024 * 1024) return { ok: false, message: 'La imagen supera el lÃ­mite de 25 MB.' }; return { ok: true, name: path.basename(file), dataUrl: `data:${mime};base64,${bytes.toString('base64')}` }; }
  catch { return { ok: false, message: 'No se pudo leer esa imagen.' }; }
});
ipcMain.handle('images:save', async (_e, dataUrl) => {
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 45 * 1024 * 1024) return { ok: false, message: 'La imagen no tiene un formato PNG vÃ¡lido.' };
  const result = await dialog.showSaveDialog(win, { title: 'Guardar imagen', defaultPath: path.join(app.getPath('pictures'), 'Jarvis-creacion.png'), filters: [{ name: 'Imagen PNG', extensions: ['png'] }] });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  try { const payload = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'); if (payload.length > 32 * 1024 * 1024) return { ok: false, message: 'La imagen supera el lÃ­mite de 32 MB.' }; fs.writeFileSync(result.filePath, payload); return { ok: true, path: result.filePath }; }
  catch { return { ok: false, message: 'No se pudo guardar la imagen.' }; }
});
ipcMain.handle('system:metrics', async () => {
  const before = os.cpus(); const idleBefore = before.reduce((sum, c) => sum + c.times.idle, 0); const totalBefore = before.reduce((sum, c) => sum + Object.values(c.times).reduce((a, b) => a + b, 0), 0);
  await new Promise(resolve => setTimeout(resolve, 250)); const after = os.cpus(); const idleAfter = after.reduce((sum, c) => sum + c.times.idle, 0); const totalAfter = after.reduce((sum, c) => sum + Object.values(c.times).reduce((a, b) => a + b, 0), 0);
  return { cpu: Math.round((1 - (idleAfter - idleBefore) / Math.max(1, totalAfter - totalBefore)) * 100), memory: Math.round((1 - os.freemem() / os.totalmem()) * 100), totalMemory: Math.round(os.totalmem() / 1073741824), freeMemory: Math.round(os.freemem() / 1073741824), uptime: Math.floor(os.uptime()), platform: os.platform(), release: os.release() };
});
ipcMain.handle('system:screenshot', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
  const screen = sources[0]; if (!screen || screen.thumbnail.isEmpty()) return { ok: false, message: 'No pude capturar la pantalla.' };
  const target = path.join(app.getPath('pictures'), `Jarvis-captura-${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, screen.thumbnail.toPNG()); return { ok: true, path: target };
});
ipcMain.handle('system:power', async (_e, action) => {
  if (!['shutdown', 'restart'].includes(action)) return { ok: false };
  const args = action === 'shutdown' ? ['/s', '/t', '30'] : ['/r', '/t', '30'];
  execFile('shutdown.exe', args, { windowsHide: true }, error => { if (error && win) win.webContents.send('system:power-result', { ok: false, message: 'Windows rechazÃ³ la solicitud.' }); });
  return { ok: true, message: `Windows se ${action === 'shutdown' ? 'apagarÃ¡' : 'reiniciarÃ¡'} en 30 segundos. Puedes cancelar con â€œcancelar apagadoâ€.` };
});
ipcMain.handle('system:cancel-power', () => new Promise(resolve => execFile('shutdown.exe', ['/a'], { windowsHide: true }, error => resolve({ ok: !error, message: error ? 'No hay un apagado pendiente.' : 'Apagado cancelado.' }))));
ipcMain.handle('system:volume', (_e, level) => {
  const n = Number(level); if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, message: 'El volumen debe estar entre 0 y 100.' };
  return { ok: false, message: 'El control de volumen necesita una integraciÃ³n nativa de audio de Windows que aÃºn no estÃ¡ instalada.' };
});
ipcMain.handle('system:brightness', (_e, level) => {
  const n = Number(level); if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, message: 'El brillo debe estar entre 0 y 100.' };
  return { ok: false, message: 'El control de brillo no estÃ¡ disponible en todos los monitores y requiere integraciÃ³n compatible.' };
});
ipcMain.handle('web:search', async (_e, query) => { const q = String(query || '').trim().slice(0, 300); if (!q) return { ok: false, message: 'Escribe quÃ© quieres buscar.' }; await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`); return { ok: true, message: `AbrÃ­ una bÃºsqueda de ${q}.` }; });
ipcMain.handle('web:translate', async (_e, text) => { const q = String(text || '').trim().slice(0, 1000); if (!q) return { ok: false, message: 'Escribe el texto que quieres traducir.' }; await shell.openExternal(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(q)}&op=translate`); return { ok: true, message: 'AbrÃ­ el traductor con tu texto.' }; });
ipcMain.handle('documents:create', async (_e, input) => {
  const title = String(input?.title || 'Documento').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 100) || 'Documento';
  const ext = input?.type === 'markdown' ? '.md' : '.txt'; const body = String(input?.content || '').slice(0, 1000000);
  const { canceled, filePath } = await dialog.showSaveDialog(win, { title: 'Guardar documento', defaultPath: path.join(app.getPath('documents'), title + ext), filters: [{ name: ext === '.md' ? 'Markdown' : 'Texto', extensions: [ext.slice(1)] }] });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, body, 'utf8'); return { ok: true, path: filePath };
});
ipcMain.handle('blender:export-model', async (_e, input) => {
  const safeName = value => String(value || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 60) || 'Modelo';
  const objects = Array.isArray(input?.objects) ? input.objects.slice(0, 100) : [];
  if (!objects.length) return { ok: false, message: 'Añade al menos una forma a la escena.' };
  const allowed = new Set(['cube', 'sphere', 'cylinder', 'cone', 'torus']);
  const objLines = ['# Modelo creado en Jarvis 2.0', `mtllib ${safeName(input?.name)}.mtl`];
  const mtlLines = [`# Materiales de ${safeName(input?.name)}`]; let vertexOffset = 1;
  const pushMesh = (object, objectIndex, vertices, faces) => {
    const type = allowed.has(object.type) ? object.type : 'cube';
    const values = ['x','y','z','sx','sy','sz','rx','ry','rz'].map(key => Number(object[key] ?? (key.startsWith('s') ? 1 : 0)));
    if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 1000)) throw new Error('Revisa las posiciones, escalas y giros del modelo.');
    const [x,y,z,sx,sy,sz,rx,ry,rz] = values; if (sx <= 0 || sy <= 0 || sz <= 0) throw new Error('La escala de cada objeto debe ser mayor que cero.');
    const color = /^#[0-9a-f]{6}$/i.test(object.color) ? object.color.slice(1) : '52d9ff';
    const mat = `jarvis_mat_${objectIndex + 1}`; mtlLines.push(`newmtl ${mat}`, 'Ka 0.100 0.100 0.100', 'Kd ' + [0,2,4].map(i => (parseInt(color.slice(i,i+2),16)/255).toFixed(4)).join(' '), 'Ks 0.250 0.250 0.250', 'Ns 32', '');
    const label = safeName(object.name || `${type}_${objectIndex + 1}`).replace(/\s+/g, '_'); objLines.push(`o ${label}`, `usemtl ${mat}`, 's 1');
    const ax=rx*Math.PI/180, ay=ry*Math.PI/180, az=rz*Math.PI/180;
    for(const [vx,vy,vz] of vertices){let px=vx*sx, py=vy*sy, pz=vz*sz; let qy=py*Math.cos(ax)-pz*Math.sin(ax), qz=py*Math.sin(ax)+pz*Math.cos(ax); py=qy;pz=qz;let qx=px*Math.cos(ay)+pz*Math.sin(ay);qz=-px*Math.sin(ay)+pz*Math.cos(ay);px=qx;pz=qz;qx=px*Math.cos(az)-py*Math.sin(az);qy=px*Math.sin(az)+py*Math.cos(az);px=qx;py=qy;objLines.push(`v ${(px+x).toFixed(6)} ${(pz+y).toFixed(6)} ${(py+z).toFixed(6)}`);}
    for(const face of faces)objLines.push('f '+face.map(index=>index+vertexOffset-1).join(' ')); vertexOffset+=vertices.length;
  };
  const cube=()=>({v:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],f:[[1,4,3,2],[5,6,7,8],[1,2,6,5],[2,3,7,6],[3,4,8,7],[4,1,5,8]]});
  const radial=(type)=>{const n=20,v=[],f=[];if(type==='sphere'){const rings=10;for(let j=0;j<=rings;j++){const p=Math.PI*j/rings;for(let i=0;i<n;i++){const t=2*Math.PI*i/n;v.push([Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t)]);}}for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const a=j*n+i+1,b=j*n+(i+1)%n+1,c=(j+1)*n+(i+1)%n+1,d=(j+1)*n+i+1;f.push([a,b,c,d]);}}else if(type==='torus'){const m=10,R=.72,r=.28;for(let j=0;j<m;j++)for(let i=0;i<n;i++){const u=2*Math.PI*i/n,t=2*Math.PI*j/m;v.push([(R+r*Math.cos(t))*Math.cos(u),r*Math.sin(t),(R+r*Math.cos(t))*Math.sin(u)]);}for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*n+i+1,b=j*n+(i+1)%n+1,c=((j+1)%m)*n+(i+1)%n+1,d=((j+1)%m)*n+i+1;f.push([a,b,c,d]);}}else{for(let i=0;i<n;i++){const t=2*Math.PI*i/n;v.push([Math.cos(t),-1,Math.sin(t)]);}if(type==='cylinder'){for(let i=0;i<n;i++){const t=2*Math.PI*i/n;v.push([Math.cos(t),1,Math.sin(t)]);}v.push([0,-1,0],[0,1,0]);}else v.push([0,1,0],[0,-1,0]);for(let i=0;i<n;i++){const next=(i+1)%n+1;if(type==='cylinder'){f.push([i+1,next,n+next,n+i+1]);f.push([n*2+1,next,i+1]);f.push([n*2+2,n+i+1,n+next]);}else{f.push([i+1,next,n+1]);f.push([n+2,next,i+1]);}}}return{v,f};};
  try { objects.forEach((object,index)=>{const shape=allowed.has(object.type)?object.type:'cube';const mesh=shape==='cube'?cube():radial(shape);pushMesh(object,index,mesh.v,mesh.f);}); }
  catch(error){return {ok:false,message:error.message||'No pude preparar la geometría.'};}
  const { canceled, filePath } = await dialog.showSaveDialog(win,{title:'Exportar modelo 3D para Blender',defaultPath:path.join(safeAppPath('documents')||app.getPath('home'),`${safeName(input?.name)}.obj`),filters:[{name:'Modelo 3D OBJ',extensions:['obj']}]});
  if(canceled||!filePath)return {ok:false,canceled:true};
  try { const mtlName=path.basename(filePath,path.extname(filePath)).replace(/\s+/g,'_')+'.mtl'; const mtlPath=path.join(path.dirname(filePath),mtlName); objLines[1]=`mtllib ${mtlName}`; fs.writeFileSync(mtlPath,mtlLines.join('\n'),'utf8'); fs.writeFileSync(filePath,objLines.join('\n'),'utf8'); return {ok:true,path:filePath,materialPath:mtlPath}; }
  catch{return {ok:false,message:'No se pudo exportar el modelo 3D.'};}
});
ipcMain.handle('github:backup', async (_e, repo) => {
  const url = String(repo || '').trim();
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(url)) return { ok: false, message: 'Pega el enlace HTTPS de un repositorio de GitHub.' };
  const dest = path.join(app.getPath('documents'), 'Jarvis-Backups'); fs.mkdirSync(dest, { recursive: true });
  const name = url.split('/').pop().replace(/\.git$/, ''); const folder = path.join(dest, name);
  if (fs.existsSync(path.join(folder, '.git'))) return { ok: false, message: `Ya existe ${folder}. Para actualizarlo, Ã¡brelo con Git.` };
  execFile('git', ['clone', '--depth', '1', url, folder], { windowsHide: true, timeout: 120000 }, (err) => { if (err && win) win.webContents.send('github:result', { ok: false, message: 'No se pudo clonar el repositorio. Revisa el enlace, Git y tu conexiÃ³n.' }); else if (win) win.webContents.send('github:result', { ok: true, message: `Respaldo descargado en ${folder}` }); });
  return { ok: true, message: 'Iniciando descarga de respaldoâ€¦' };
});

