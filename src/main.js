const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

let win;
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
