const { app, BrowserWindow, ipcMain, shell, dialog, desktopCapturer } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

let win;
let installedApps = [];
const userDir = app.getPath('userData');
const dataFile = path.join(userDir, 'jarvis-data.json');
const allowedFolders = [app.getPath('home'), app.getPath('documents'), app.getPath('desktop'), app.getPath('downloads')];

function readData() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
  catch { return { settings: {}, usage: {}, favorites: [], history: [] }; }
}
function writeData(value) { fs.mkdirSync(userDir, { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(value, null, 2), 'utf8'); }

function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 800, minWidth: 900, minHeight: 620, backgroundColor: '#080b12', title: 'Jarvis 2.0', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('settings:get', () => readData());
ipcMain.handle('settings:save', (_e, value) => { const d = readData(); d.settings = { ...d.settings, ...value }; writeData(d); return d.settings; });
ipcMain.handle('usage:record', (_e, label) => { const d = readData(); const key = String(label).trim().toLowerCase(); if (key) d.usage[key] = (d.usage[key] || 0) + 1; d.history.unshift({ label: String(label), at: new Date().toISOString() }); d.history = d.history.slice(0, 40); writeData(d); return d; });
ipcMain.handle('files:search', async (_e, query) => {
  const needle = String(query || '').trim().toLowerCase(); if (!needle) return [];
  const found = []; const roots = [...new Set(allowedFolders)];
  for (const root of roots) {
    const stack = [root]; let scanned = 0;
    while (stack.length && scanned < 10000 && found.length < 60) {
      const dir = stack.pop(); let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        scanned++; if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'AppData') continue;
        const full = path.join(dir, entry.name);
        if (entry.name.toLowerCase().includes(needle)) found.push({ name: entry.name, path: full, directory: entry.isDirectory() });
        if (entry.isDirectory() && stack.length < 200) stack.push(full);
        if (found.length >= 60 || scanned >= 10000) break;
      }
    }
  }
  return found;
});
ipcMain.handle('files:open', async (_e, file) => { if (typeof file !== 'string') return false; const resolved = path.resolve(file); if (!allowedFolders.some(root => resolved.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep))) return false; await shell.openPath(resolved); return true; });
ipcMain.handle('apps:open', async (_e, name) => {
  const target = String(name || '').trim(); if (!target || target.length > 120) return { ok: false, message: 'Escribe el nombre de una aplicación.' };
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
  if (!program) return { ok: false, message: `Aún no tengo una acción segura para abrir «${target}». Puedes añadirla en Personalización.` };
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
  const result = await dialog.showOpenDialog(win, { title: 'Abrir imagen', properties: ['openFile'], filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }] });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  const file = result.filePaths[0]; const ext = path.extname(file).toLowerCase(); const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bmp': 'image/bmp', '.gif': 'image/gif' })[ext];
  try { const bytes = fs.readFileSync(file); if (bytes.length > 25 * 1024 * 1024) return { ok: false, message: 'La imagen supera el límite de 25 MB.' }; return { ok: true, name: path.basename(file), dataUrl: `data:${mime};base64,${bytes.toString('base64')}` }; }
  catch { return { ok: false, message: 'No se pudo leer esa imagen.' }; }
});
ipcMain.handle('images:save', async (_e, dataUrl) => {
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 45 * 1024 * 1024) return { ok: false, message: 'La imagen no tiene un formato PNG válido.' };
  const result = await dialog.showSaveDialog(win, { title: 'Guardar imagen', defaultPath: path.join(app.getPath('pictures'), 'Jarvis-creacion.png'), filters: [{ name: 'Imagen PNG', extensions: ['png'] }] });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  try { const payload = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'); if (payload.length > 32 * 1024 * 1024) return { ok: false, message: 'La imagen supera el límite de 32 MB.' }; fs.writeFileSync(result.filePath, payload); return { ok: true, path: result.filePath }; }
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
  execFile('shutdown.exe', args, { windowsHide: true }, error => { if (error && win) win.webContents.send('system:power-result', { ok: false, message: 'Windows rechazó la solicitud.' }); });
  return { ok: true, message: `Windows se ${action === 'shutdown' ? 'apagará' : 'reiniciará'} en 30 segundos. Puedes cancelar con “cancelar apagado”.` };
});
ipcMain.handle('system:cancel-power', () => new Promise(resolve => execFile('shutdown.exe', ['/a'], { windowsHide: true }, error => resolve({ ok: !error, message: error ? 'No hay un apagado pendiente.' : 'Apagado cancelado.' }))));
ipcMain.handle('system:volume', (_e, level) => {
  const n = Number(level); if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, message: 'El volumen debe estar entre 0 y 100.' };
  return { ok: false, message: 'El control de volumen necesita una integración nativa de audio de Windows que aún no está instalada.' };
});
ipcMain.handle('system:brightness', (_e, level) => {
  const n = Number(level); if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, message: 'El brillo debe estar entre 0 y 100.' };
  return { ok: false, message: 'El control de brillo no está disponible en todos los monitores y requiere integración compatible.' };
});
ipcMain.handle('web:search', async (_e, query) => { const q = String(query || '').trim().slice(0, 300); if (!q) return { ok: false, message: 'Escribe qué quieres buscar.' }; await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(q)}`); return { ok: true, message: `Abrí una búsqueda de ${q}.` }; });
ipcMain.handle('web:translate', async (_e, text) => { const q = String(text || '').trim().slice(0, 1000); if (!q) return { ok: false, message: 'Escribe el texto que quieres traducir.' }; await shell.openExternal(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(q)}&op=translate`); return { ok: true, message: 'Abrí el traductor con tu texto.' }; });
ipcMain.handle('documents:create', async (_e, input) => {
  const title = String(input?.title || 'Documento').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 100) || 'Documento';
  const ext = input?.type === 'markdown' ? '.md' : '.txt'; const body = String(input?.content || '').slice(0, 1000000);
  const { canceled, filePath } = await dialog.showSaveDialog(win, { title: 'Guardar documento', defaultPath: path.join(app.getPath('documents'), title + ext), filters: [{ name: ext === '.md' ? 'Markdown' : 'Texto', extensions: [ext.slice(1)] }] });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, body, 'utf8'); return { ok: true, path: filePath };
});
ipcMain.handle('github:backup', async (_e, repo) => {
  const url = String(repo || '').trim();
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(url)) return { ok: false, message: 'Pega el enlace HTTPS de un repositorio de GitHub.' };
  const dest = path.join(app.getPath('documents'), 'Jarvis-Backups'); fs.mkdirSync(dest, { recursive: true });
  const name = url.split('/').pop().replace(/\.git$/, ''); const folder = path.join(dest, name);
  if (fs.existsSync(path.join(folder, '.git'))) return { ok: false, message: `Ya existe ${folder}. Para actualizarlo, ábrelo con Git.` };
  execFile('git', ['clone', '--depth', '1', url, folder], { windowsHide: true, timeout: 120000 }, (err) => { if (err && win) win.webContents.send('github:result', { ok: false, message: 'No se pudo clonar el repositorio. Revisa el enlace, Git y tu conexión.' }); else if (win) win.webContents.send('github:result', { ok: true, message: `Respaldo descargado en ${folder}` }); });
  return { ok: true, message: 'Iniciando descarga de respaldo…' };
});
