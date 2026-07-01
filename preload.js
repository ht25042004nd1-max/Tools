// preload.js
// Cau noi an toan giua renderer (giao dien) va main process.
// Renderer KHONG co quyen Node.js truc tiep (nodeIntegration = false),
// nen moi giao tiep phai di qua contextBridge nhu duoi day.
// Khong expose bat ky API nao cho phep doc cookie/token thu cong.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Lay danh sach tai khoan + model tu main process
  getConfig: () => ipcRenderer.invoke('get-config'),

  // CRUD tai khoan
  addAccount: (data) => ipcRenderer.invoke('add-account', data),
  updateAccount: (data) => ipcRenderer.invoke('update-account', data),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', { id }),

  // CRUD model AI
  addModel: (data) => ipcRenderer.invoke('add-model', data),
  updateModel: (data) => ipcRenderer.invoke('update-model', data),
  deleteModel: (id) => ipcRenderer.invoke('delete-model', { id }),

  // Yeu cau main process load trang AI bang session cua tai khoan da chon
  loadPage: (partition, url) => ipcRenderer.invoke('load-page', { partition, url }),

  // Reload trang dang hien thi
  reloadPage: () => ipcRenderer.invoke('reload-page'),

  // Dieu huong qua lai trong lich su trinh duyet
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),

  // Lang nghe trang thai tu main process gui ve (loading/loaded/error...)
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, status) => callback(status));
  },

  // Lang nghe trang thai co the back/forward hay khong de cap nhat nut bam
  onNavState: (callback) => {
    ipcRenderer.on('nav-state', (event, state) => callback(state));
  }
});
