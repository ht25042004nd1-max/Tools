// main.js
// Tien trinh chinh (main process) cua Electron.
// Chiu trach nhiem tao cua so chinh, quan ly BrowserView de hien thi trang AI,
// va xu ly cac lenh IPC tu renderer (chon tai khoan, chon model, chay, reload, back/forward).

const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Chieu cao vung header (px) - phai khop voi CSS trong renderer/styles.css
const HEADER_HEIGHT = 110;

let mainWindow = null;
let currentView = null; // BrowserView dang hien thi trang AI

const ACCOUNTS_PATH = path.join(__dirname, 'data', 'accounts.json');
const MODELS_PATH = path.join(__dirname, 'data', 'models.json');

// ===== Ham helper dieu huong tien/lui, tuong thich nhieu phien ban Electron =====
// API "webContents.navigationHistory.*" chi co tu Electron 31 tro len.
// Voi Electron <31, phai dung API cu "webContents.canGoBack()/goBack()...".
// Cac ham duoi day tu kiem tra API nao ton tai de tranh loi "is not a function".
function navCanGoBack(webContents) {
  if (webContents.navigationHistory && typeof webContents.navigationHistory.canGoBack === 'function') {
    return webContents.navigationHistory.canGoBack();
  }
  return webContents.canGoBack();
}

function navCanGoForward(webContents) {
  if (webContents.navigationHistory && typeof webContents.navigationHistory.canGoForward === 'function') {
    return webContents.navigationHistory.canGoForward();
  }
  return webContents.canGoForward();
}

function navGoBack(webContents) {
  if (webContents.navigationHistory && typeof webContents.navigationHistory.goBack === 'function') {
    webContents.navigationHistory.goBack();
  } else {
    webContents.goBack();
  }
}

function navGoForward(webContents) {
  if (webContents.navigationHistory && typeof webContents.navigationHistory.goForward === 'function') {
    webContents.navigationHistory.goForward();
  } else {
    webContents.goForward();
  }
}

// ===== Doc / ghi du lieu cau hinh (accounts, models) tu thu muc data/ =====
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Khong doc duoc file cau hinh:', filePath, err.message);
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getAccounts() {
  return readJSON(ACCOUNTS_PATH);
}

function getModels() {
  return readJSON(MODELS_PATH);
}

// Tao id duy nhat tu chuoi ten (vd "Hoàng Work" -> "hoang_work_a1b2")
function slugify(text) {
  const base = text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bo dau tieng Viet
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'item'}_${suffix}`;
}

// ===== Tao cua so chinh =====
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'AI Session Browser',
    webPreferences: {
      // Renderer KHONG duoc bat nodeIntegration, chi giao tiep qua preload + contextBridge
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Khi resize cua so, can cap nhat lai kich thuoc BrowserView (neu dang co)
  mainWindow.on('resize', () => {
    updateViewBounds();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    currentView = null;
  });
}

// Cap nhat vi tri/kich thuoc cua BrowserView de no luon nam DUOI header,
// khong bao gio che mat vung dieu khien phia tren.
function updateViewBounds() {
  if (!mainWindow || !currentView) return;
  const [width, height] = mainWindow.getContentSize();
  currentView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: width,
    height: Math.max(height - HEADER_HEIGHT, 0)
  });
}

// Tao (hoac tai su dung) BrowserView gan voi mot session partition cu the,
// roi load URL tuong ung. Moi tai khoan = mot partition rieng => cookie/cache rieng.
function loadPageWithSession(url, partition) {
  if (!mainWindow) return;

  // QUAN TRONG: partition phai bat dau bang "persist:" de Electron luu session
  // xuong dia (ben vung qua cac lan mo app), khong bi mat khi tat app.
  const ses = session.fromPartition(partition);

  // Neu da co view cu, go bo truoc khi tao view moi voi session khac
  if (currentView) {
    mainWindow.removeBrowserView(currentView);
    currentView = null;
  }

  const view = new BrowserView({
    webPreferences: {
      session: ses,
      // Vung hien thi trang AI la mot trang web binh thuong, khong can node access
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setBrowserView(view);
  currentView = view;
  updateViewBounds();

  // Bao trang thai "dang tai" / "tai xong" / "loi" ve cho renderer
  view.webContents.on('did-start-loading', () => {
    sendStatus('loading');
  });
  view.webContents.on('did-finish-load', () => {
    sendStatus('loaded');
    sendNavState();
  });
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    // -3 la ABORTED, thuong xay ra khi dieu huong lien tuc, khong tinh la loi that su
    if (errorCode !== -3) {
      console.error('Tai trang that bai:', errorDescription);
      sendStatus('error');
    }
  });

  view.webContents.loadURL(url);
}

function sendStatus(status) {
  if (mainWindow) {
    mainWindow.webContents.send('status-update', status);
  }
}

function sendNavState() {
  if (mainWindow && currentView) {
    mainWindow.webContents.send('nav-state', {
      canGoBack: navCanGoBack(currentView.webContents),
      canGoForward: navCanGoForward(currentView.webContents)
    });
  }
}

// ===== Dang ky cac kenh IPC ma preload.js se goi toi =====

// Tra ve danh sach accounts + models cho renderer hien thi dropdown
ipcMain.handle('get-config', () => {
  return {
    accounts: getAccounts(),
    models: getModels()
  };
});

// ===== CRUD: Tai khoan =====

// Them tai khoan moi. Partition se tu sinh theo id de dam bao luon hop le va khong trung.
ipcMain.handle('add-account', (event, { name, note }) => {
  if (!name || !name.trim()) {
    return { ok: false, message: 'Tên tài khoản không được để trống' };
  }
  const accounts = getAccounts();
  const id = 'acc_' + slugify(name);
  const partition = 'persist:' + id.replace(/^acc_/, '');
  accounts.push({ id, name: name.trim(), partition, note: (note || '').trim() });
  writeJSON(ACCOUNTS_PATH, accounts);
  return { ok: true, accounts };
});

// Sua thong tin tai khoan (chi cho sua name/note, KHONG cho sua partition
// de tranh lam "lac" session da dang nhap truoc do).
ipcMain.handle('update-account', (event, { id, name, note }) => {
  const accounts = getAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { ok: false, message: 'Không tìm thấy tài khoản' };
  }
  if (!name || !name.trim()) {
    return { ok: false, message: 'Tên tài khoản không được để trống' };
  }
  target.name = name.trim();
  target.note = (note || '').trim();
  writeJSON(ACCOUNTS_PATH, accounts);
  return { ok: true, accounts };
});

// Xoa tai khoan khoi danh sach. Luu y: thao tac nay CHI xoa khoi accounts.json,
// KHONG xoa du lieu session/cookie da luu trong partition (nguoi dung tu xoa
// theo huong dan trong README neu muon xoa han).
ipcMain.handle('delete-account', (event, { id }) => {
  let accounts = getAccounts();
  const before = accounts.length;
  accounts = accounts.filter((a) => a.id !== id);
  if (accounts.length === before) {
    return { ok: false, message: 'Không tìm thấy tài khoản' };
  }
  writeJSON(ACCOUNTS_PATH, accounts);
  return { ok: true, accounts };
});

// ===== CRUD: Model AI =====

ipcMain.handle('add-model', (event, { name, url }) => {
  if (!name || !name.trim()) {
    return { ok: false, message: 'Tên model không được để trống' };
  }
  if (!url || !/^https?:\/\//i.test(url.trim())) {
    return { ok: false, message: 'URL phải bắt đầu bằng http:// hoặc https://' };
  }
  const models = getModels();
  const id = slugify(name);
  models.push({ id, name: name.trim(), url: url.trim() });
  writeJSON(MODELS_PATH, models);
  return { ok: true, models };
});

ipcMain.handle('update-model', (event, { id, name, url }) => {
  const models = getModels();
  const target = models.find((m) => m.id === id);
  if (!target) {
    return { ok: false, message: 'Không tìm thấy model' };
  }
  if (!name || !name.trim()) {
    return { ok: false, message: 'Tên model không được để trống' };
  }
  if (!url || !/^https?:\/\//i.test(url.trim())) {
    return { ok: false, message: 'URL phải bắt đầu bằng http:// hoặc https://' };
  }
  target.name = name.trim();
  target.url = url.trim();
  writeJSON(MODELS_PATH, models);
  return { ok: true, models };
});

ipcMain.handle('delete-model', (event, { id }) => {
  let models = getModels();
  const before = models.length;
  models = models.filter((m) => m.id !== id);
  if (models.length === before) {
    return { ok: false, message: 'Không tìm thấy model' };
  }
  writeJSON(MODELS_PATH, models);
  return { ok: true, models };
});

// Nhan lenh "Chay": load URL cua model bang session partition cua account
ipcMain.handle('load-page', (event, { partition, url }) => {
  if (!partition || !url) {
    return { ok: false, message: 'Thieu partition hoac url' };
  }
  try {
    loadPageWithSession(url, partition);
    return { ok: true };
  } catch (err) {
    console.error('Loi khi load-page:', err.message);
    return { ok: false, message: err.message };
  }
});

// Reload trang dang hien thi
ipcMain.handle('reload-page', () => {
  if (currentView) {
    currentView.webContents.reload();
    return { ok: true };
  }
  return { ok: false, message: 'Chua co trang nao duoc tai' };
});

// Quay lai trang truoc trong lich su cua BrowserView hien tai
ipcMain.handle('go-back', () => {
  if (currentView && navCanGoBack(currentView.webContents)) {
    navGoBack(currentView.webContents);
    return { ok: true };
  }
  return { ok: false };
});

// Tien toi trang sau trong lich su
ipcMain.handle('go-forward', () => {
  if (currentView && navCanGoForward(currentView.webContents)) {
    navGoForward(currentView.webContents);
    return { ok: true };
  }
  return { ok: false };
});

// ===== Vong doi ung dung =====
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});