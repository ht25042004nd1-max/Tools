// renderer.js
// Xu ly logic giao dien: nap danh sach tai khoan/model, cap nhat URL,
// goi cac API duoc expose tu preload.js (window.api) de dieu khien BrowserView ben main process.

const accountSelect = document.getElementById('account-select');
const modelSelect = document.getElementById('model-select');
const urlInput = document.getElementById('url-input');
const statusText = document.getElementById('status-text');

const btnRun = document.getElementById('btn-run');
const btnReload = document.getElementById('btn-reload');
const btnBack = document.getElementById('btn-back');
const btnForward = document.getElementById('btn-forward');

let accounts = [];
let models = [];

// ===== Cac thong diep trang thai hien thi cho nguoi dung =====
const STATUS_MESSAGES = {
  ready: 'Sẵn sàng',
  loading: 'Đang tải...',
  loaded: 'Đã load xong',
  error: 'Không thể tải trang',
  noAccount: 'Chưa chọn tài khoản',
  noModel: 'Chưa chọn model'
};

function setStatus(key) {
  statusText.textContent = STATUS_MESSAGES[key] || key;
}

// ===== Khoi tao du lieu khi app mo =====
async function init() {
  const config = await window.api.getConfig();
  accounts = config.accounts || [];
  models = config.models || [];

  renderAccountOptions();
  renderModelOptions();

  // Mac dinh chon model dau tien (neu co) de hien URL mau
  if (models.length > 0) {
    modelSelect.value = models[0].id;
    updateUrlFromSelectedModel();
  }

  setStatus('ready');
  updateNavButtons({ canGoBack: false, canGoForward: false });
}

function renderAccountOptions() {
  accounts.forEach((acc) => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = `${acc.name}${acc.note ? ' - ' + acc.note : ''}`;
    accountSelect.appendChild(opt);
  });
}

function renderModelOptions() {
  models.forEach((model) => {
    const opt = document.createElement('option');
    opt.value = model.id;
    opt.textContent = model.name;
    modelSelect.appendChild(opt);
  });
}

function getSelectedAccount() {
  return accounts.find((a) => a.id === accountSelect.value) || null;
}

function getSelectedModel() {
  return models.find((m) => m.id === modelSelect.value) || null;
}

// Khi doi model, cap nhat lai o URL (readonly, chi de xem)
function updateUrlFromSelectedModel() {
  const model = getSelectedModel();
  urlInput.value = model ? model.url : '';
}

modelSelect.addEventListener('change', () => {
  updateUrlFromSelectedModel();
});

// ===== Nut "Chạy" =====
btnRun.addEventListener('click', async () => {
  const account = getSelectedAccount();
  const model = getSelectedModel();

  if (!account) {
    setStatus('noAccount');
    return;
  }
  if (!model) {
    setStatus('noModel');
    return;
  }

  setStatus('loading');
  const result = await window.api.loadPage(account.partition, model.url);
  if (!result.ok) {
    setStatus('error');
    console.error('Khong the chay trang:', result.message);
  }
  // Trang thai "loaded"/"error" tiep theo se duoc cap nhat tu su kien onStatusUpdate
});

// ===== Nut "Làm mới" =====
btnReload.addEventListener('click', async () => {
  await window.api.reloadPage();
});

// ===== Nut "Quay lại" =====
btnBack.addEventListener('click', async () => {
  await window.api.goBack();
});

// ===== Nut "Tiến tới" =====
btnForward.addEventListener('click', async () => {
  await window.api.goForward();
});

// ===== Cap nhat trang thai nut Back/Forward (bat/tat tuy lich su) =====
function updateNavButtons(state) {
  btnBack.disabled = !state.canGoBack;
  btnForward.disabled = !state.canGoForward;
}

// ===== Lang nghe trang thai tu main process =====
window.api.onStatusUpdate((status) => {
  setStatus(status);
});

window.api.onNavState((state) => {
  updateNavButtons(state);
});

// Khoi dong
init();

// ===========================================================================
// ===== PHAN QUAN LY (CRUD) TAI KHOAN VA MODEL =====
// ===========================================================================

const accountModal = document.getElementById('account-modal');
const modelModal = document.getElementById('model-modal');

const accountListEl = document.getElementById('account-list');
const modelListEl = document.getElementById('model-list');

// --- Cac phan tu form Tai khoan ---
const accFormTitle = document.getElementById('account-form-title');
const accFormId = document.getElementById('account-form-id');
const accFormName = document.getElementById('account-form-name');
const accFormNote = document.getElementById('account-form-note');
const btnAccountSave = document.getElementById('btn-account-save');
const btnAccountCancelEdit = document.getElementById('btn-account-cancel-edit');

// --- Cac phan tu form Model ---
const modelFormTitle = document.getElementById('model-form-title');
const modelFormId = document.getElementById('model-form-id');
const modelFormName = document.getElementById('model-form-name');
const modelFormUrl = document.getElementById('model-form-url');
const btnModelSave = document.getElementById('btn-model-save');
const btnModelCancelEdit = document.getElementById('btn-model-cancel-edit');

function openModal(modal) {
  modal.classList.remove('hidden');
}
function closeModal(modal) {
  modal.classList.add('hidden');
}

document.getElementById('btn-manage-accounts').addEventListener('click', () => {
  renderAccountList();
  openModal(accountModal);
});

document.getElementById('btn-manage-models').addEventListener('click', () => {
  renderModelList();
  openModal(modelModal);
});

// Dong modal khi bam nut X hoac click ra ngoai vung modal-box
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.close);
    closeModal(modal);
    resetAccountForm();
    resetModelForm();
  });
});
[accountModal, modelModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
      resetAccountForm();
      resetModelForm();
    }
  });
});

// Ham dung chung de cap nhat lai cac dropdown ngoai header sau khi CRUD xong,
// co gang giu nguyen lua chon hien tai neu item do van con ton tai.
function refreshAccountSelect(newAccounts, keepId) {
  accounts = newAccounts;
  const prev = keepId !== undefined ? keepId : accountSelect.value;
  accountSelect.innerHTML = '<option value="">-- Chọn tài khoản --</option>';
  renderAccountOptions();
  if (prev && accounts.some((a) => a.id === prev)) {
    accountSelect.value = prev;
  }
}

function refreshModelSelect(newModels, keepId) {
  models = newModels;
  const prev = keepId !== undefined ? keepId : modelSelect.value;
  modelSelect.innerHTML = '<option value="">-- Chọn model AI --</option>';
  renderModelOptions();
  if (prev && models.some((m) => m.id === prev)) {
    modelSelect.value = prev;
  } else {
    urlInput.value = '';
  }
  updateUrlFromSelectedModel();
}

// ===== Danh sach + thao tac trong modal Tai khoan =====
function renderAccountList() {
  accountListEl.innerHTML = '';
  if (accounts.length === 0) {
    accountListEl.innerHTML = '<li class="empty-hint">Chưa có tài khoản nào</li>';
    return;
  }
  accounts.forEach((acc) => {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${escapeHtml(acc.name)}</span>
        <span class="item-sub">${escapeHtml(acc.note || acc.partition)}</span>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-id="${acc.id}">Sửa</button>
        <button data-action="delete" data-id="${acc.id}" class="danger">Xoá</button>
      </div>
    `;
    accountListEl.appendChild(li);
  });
}

accountListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;

  if (btn.dataset.action === 'edit') {
    accFormTitle.textContent = 'Sửa tài khoản';
    accFormId.value = acc.id;
    accFormName.value = acc.name;
    accFormNote.value = acc.note || '';
    btnAccountCancelEdit.classList.remove('hidden');
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = confirm(`Xoá tài khoản "${acc.name}"? (Session đã lưu trên máy sẽ không bị xoá)`);
    if (!confirmed) return;
    const result = await window.api.deleteAccount(id);
    if (result.ok) {
      refreshAccountSelect(result.accounts, accountSelect.value === id ? '' : undefined);
      renderAccountList();
    } else {
      alert(result.message || 'Không thể xoá tài khoản');
    }
  }
});

btnAccountSave.addEventListener('click', async () => {
  const id = accFormId.value;
  const name = accFormName.value;
  const note = accFormNote.value;

  let result;
  if (id) {
    result = await window.api.updateAccount({ id, name, note });
  } else {
    result = await window.api.addAccount({ name, note });
  }

  if (!result.ok) {
    alert(result.message || 'Có lỗi xảy ra');
    return;
  }
  refreshAccountSelect(result.accounts);
  renderAccountList();
  resetAccountForm();
});

btnAccountCancelEdit.addEventListener('click', resetAccountForm);

function resetAccountForm() {
  accFormTitle.textContent = 'Thêm tài khoản mới';
  accFormId.value = '';
  accFormName.value = '';
  accFormNote.value = '';
  btnAccountCancelEdit.classList.add('hidden');
}

// ===== Danh sach + thao tac trong modal Model =====
function renderModelList() {
  modelListEl.innerHTML = '';
  if (models.length === 0) {
    modelListEl.innerHTML = '<li class="empty-hint">Chưa có model nào</li>';
    return;
  }
  models.forEach((model) => {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${escapeHtml(model.name)}</span>
        <span class="item-sub">${escapeHtml(model.url)}</span>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-id="${model.id}">Sửa</button>
        <button data-action="delete" data-id="${model.id}" class="danger">Xoá</button>
      </div>
    `;
    modelListEl.appendChild(li);
  });
}

modelListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const model = models.find((m) => m.id === id);
  if (!model) return;

  if (btn.dataset.action === 'edit') {
    modelFormTitle.textContent = 'Sửa model';
    modelFormId.value = model.id;
    modelFormName.value = model.name;
    modelFormUrl.value = model.url;
    btnModelCancelEdit.classList.remove('hidden');
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = confirm(`Xoá model "${model.name}"?`);
    if (!confirmed) return;
    const result = await window.api.deleteModel(id);
    if (result.ok) {
      refreshModelSelect(result.models, modelSelect.value === id ? '' : undefined);
      renderModelList();
    } else {
      alert(result.message || 'Không thể xoá model');
    }
  }
});

btnModelSave.addEventListener('click', async () => {
  const id = modelFormId.value;
  const name = modelFormName.value;
  const url = modelFormUrl.value;

  let result;
  if (id) {
    result = await window.api.updateModel({ id, name, url });
  } else {
    result = await window.api.addModel({ name, url });
  }

  if (!result.ok) {
    alert(result.message || 'Có lỗi xảy ra');
    return;
  }
  refreshModelSelect(result.models);
  renderModelList();
  resetModelForm();
});

btnModelCancelEdit.addEventListener('click', resetModelForm);

function resetModelForm() {
  modelFormTitle.textContent = 'Thêm model mới';
  modelFormId.value = '';
  modelFormName.value = '';
  modelFormUrl.value = '';
  btnModelCancelEdit.classList.add('hidden');
}

// Tranh loi XSS/render sai khi ten/note co ky tu dac biet
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
