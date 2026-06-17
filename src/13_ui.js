// =========================================================================
// UI UTILITIES — toast, dialog, drawer helpers.
// Extracted from 99_legacy_main.js. No dependencies on other UI code.
// =========================================================================

import { state } from './state.js';
import { dom } from './dom.js';

// -- Toast -------------------------------------------------------------------

export function showToast(msg, type = 'info', duration = 3000) {
  while (dom.toastContainer.firstChild) {
    dom.toastContainer.firstChild.remove();
  }
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  dom.toastContainer.appendChild(toast);
  toast.offsetHeight; // force reflow
  setTimeout(function() {
    toast.classList.add('toast-exit');
    toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
  }, duration);
}

// -- Dialog ------------------------------------------------------------------

export function showConfirm(msg, onConfirm) {
  dom.dialogConfirm.textContent = '确认';
  dom.dialogConfirm.className = 'btn btn-danger';
  dom.dialogCancel.textContent = '取消';
  dom.dialogCancel.style.display = '';
  state.pendingConfirmAction = onConfirm;
  dom.dialogBody.innerHTML = msg;
  dom.dialogOverlay.style.display = 'flex';
}

export function hideConfirm() {
  state.pendingConfirmAction = null;
  dom.dialogCancel.style.display = '';
  if (dom.dialogOverlay.style.display === 'none') return;
  dom.dialogOverlay.classList.add('dialog-overlay-exit', 'dialog-exit');
  dom.dialogOverlay.querySelector('.dialog').addEventListener('animationend', function() {
    dom.dialogOverlay.style.display = 'none';
    dom.dialogOverlay.classList.remove('dialog-overlay-exit', 'dialog-exit');
  }, { once: true });
}

export function showRenameDialog(id, currentTitle) {
  state.pendingRenameId = id;
  dom.renameInput.value = currentTitle || '';
  dom.renameDialogOverlay.style.display = 'flex';
  setTimeout(() => dom.renameInput.focus(), 100);
}

export function hideRenameDialog() {
  state.pendingRenameId = null;
  if (dom.renameDialogOverlay.style.display === 'none') return;
  dom.renameDialogOverlay.classList.add('dialog-overlay-exit', 'dialog-exit');
  var dialog = dom.renameDialogOverlay.querySelector('.dialog');
  if (dialog) {
    dialog.addEventListener('animationend', function() {
      dom.renameDialogOverlay.style.display = 'none';
      dom.renameDialogOverlay.classList.remove('dialog-overlay-exit', 'dialog-exit');
    }, { once: true });
  } else {
    dom.renameDialogOverlay.style.display = 'none';
  }
}

export function showUpdateDialog() {
  dom.dialogBody.innerHTML = '发现新版本，已下载就绪。<br><br>是否立即重启应用？';
  dom.dialogConfirm.textContent = '重启更新';
  dom.dialogConfirm.className = 'btn btn-primary';
  dom.dialogCancel.textContent = '稍后';
  dom.dialogOverlay.style.display = 'flex';

  state.pendingConfirmAction = function () {
    hideConfirm();
    if (window.__pendingWorker) {
      window.__pendingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(function () {
      window.location.reload();
    }, 1500);
  };
}
