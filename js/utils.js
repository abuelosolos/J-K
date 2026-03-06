// js/utils.js

function toast(message, type) {
  var wrap = document.getElementById('toast-wrap');
  var el   = document.createElement('div');
  el.className   = 'toast';
  el.textContent = message;
  if (type === 'success') el.style.borderLeft = '3px solid var(--green)';
  if (type === 'error')   el.style.borderLeft = '3px solid var(--red)';
  wrap.appendChild(el);
  setTimeout(function() {
    el.classList.add('removing');
    setTimeout(function() { el.remove(); }, 220);
  }, 2800);
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showAlert(id) {
  var el = document.getElementById(id);
  el.style.display = 'flex';
}

function hideAlert(id) {
  var el = document.getElementById(id);
  el.style.display = 'none';
}

function setAlertText(id, text) {
  var el = document.getElementById(id);
  el.querySelector('span').textContent = text;
}

function copyToClipboard(text, label) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  toast(label || 'Copied ✓', 'success');
}

function formatNGN(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function formatUSD(amount) {
  return '$' + Number(amount).toFixed(2);
}
