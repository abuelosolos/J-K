// dashboard-freelancer.js

document.addEventListener('DOMContentLoaded', async function() {
  if (!Api.requireFreelancer()) return;

  var user = Api.getUser();
  if (user) {
    var initial = (user.full_name || user.email || 'U')[0].toUpperCase();
    document.getElementById('user-avatar').textContent = initial;
    document.getElementById('user-name').textContent   = user.full_name || user.email;
    document.getElementById('dash-title').textContent  =
      user.full_name ? user.full_name.split(' ')[0] + "'s wallet" : 'Dashboard';
  }

  await loadWallet();
  await loadTransactions();
  checkKYC();
});


// ── KYC flow ──────────────────────────────────────────────────

function checkKYC() {
  var kycStatus = localStorage.getItem('fara_kyc');

  if (!kycStatus) {
    // first time — show the flow
    showOverlay('kyc-bvn');
  } else if (kycStatus === 'pending') {
    document.getElementById('kyc-badge').style.display = 'flex';
  }
  // 'verified' = show nothing
}

function showOverlay(id) {
  // hide all kyc overlays first
  ['kyc-bvn', 'kyc-nin', 'kyc-bank', 'kyc-done'].forEach(function(oid) {
    var el = document.getElementById(oid);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(id);
  if (target) target.style.display = 'flex';
}

function showKYCError(id, msg) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function hideKYCError(id) {
  var el = document.getElementById(id);
  el.style.display = 'none';
}

function submitBVN() {
  var val = document.getElementById('kyc-bvn-input').value.replace(/\D/g, '');
  hideKYCError('bvn-error');

  if (val.length !== 11) {
    showKYCError('bvn-error', 'BVN must be exactly 11 digits.');
    return;
  }

  // store locally for now — real verification goes to backend
  localStorage.setItem('fara_kyc_bvn', val);
  showOverlay('kyc-nin');
}

function submitNIN() {
  var val = document.getElementById('kyc-nin-input').value.replace(/\D/g, '');
  hideKYCError('nin-error');

  if (val.length !== 11) {
    showKYCError('nin-error', 'NIN must be exactly 11 digits.');
    return;
  }

  localStorage.setItem('fara_kyc_nin', val);
  showOverlay('kyc-bank');
}

function submitBank() {
  var bankCode = document.getElementById('kyc-bank-code').value.trim();
  var acctNum  = document.getElementById('kyc-acct-number').value.replace(/\D/g, '');
  var acctName = document.getElementById('kyc-acct-name').value.trim();
  hideKYCError('bank-error');

  if (!bankCode) {
    showKYCError('bank-error', 'Please enter your bank code.');
    return;
  }
  if (acctNum.length !== 10) {
    showKYCError('bank-error', 'Account number must be exactly 10 digits.');
    return;
  }
  if (!acctName) {
    showKYCError('bank-error', 'Please enter the account name.');
    return;
  }

  localStorage.setItem('fara_kyc_bank', JSON.stringify({ bankCode, acctNum, acctName }));
  showOverlay('kyc-done');
}

function skipKYC() {
  // hide all modals, mark as pending so badge shows
  ['kyc-bvn', 'kyc-nin', 'kyc-bank', 'kyc-done'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  localStorage.setItem('fara_kyc', 'pending');
  document.getElementById('kyc-badge').style.display = 'flex';
}

function finishKYC() {
  document.getElementById('kyc-done').style.display = 'none';
  localStorage.setItem('fara_kyc', 'pending');
  document.getElementById('kyc-badge').style.display = 'flex';
  toast('KYC submitted — we\'ll review within 1–2 business days', 'success');
}


// ── Wallet ────────────────────────────────────────────────────

async function loadWallet() {
  try {
    var data = await Api.getWallet();
    document.getElementById('balance-amount').textContent = formatNGN(data.balance_ngn);
  } catch (err) {
    document.getElementById('balance-amount').textContent = '—';
    console.error('Wallet error:', err.message);
  }
}


// ── Transactions ──────────────────────────────────────────────

async function loadTransactions() {
  try {
    var data = await Api.getTransactions();
    var list = data.transactions || [];
    renderTransactions(list);

    // update stats
    var earned = list
      .filter(function(t) { return t.type === 'credit'; })
      .reduce(function(sum, t) { return sum + parseFloat(t.amount_ngn); }, 0);
    var paid = list.filter(function(t) { return t.type === 'credit'; }).length;

    document.getElementById('stat-earned').textContent = formatNGN(earned);
    document.getElementById('stat-paid').textContent   = paid;

    if (list.length) {
      document.getElementById('tx-count').textContent = list.length + ' transactions';
    }
  } catch (err) {
    renderTransactions([]);
    console.error('Transactions error:', err.message);
  }
}

function renderTransactions(list) {
  var el = document.getElementById('tx-list');

  if (!list.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">' +
          '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">' +
            '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' +
          '</svg>' +
        '</div>' +
        '<div class="empty-state-title">No transactions yet</div>' +
        '<div class="empty-state-sub">Create an invoice and share the link to get paid.</div>' +
      '</div>';
    return;
  }

  var up   = '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>';
  var down = '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>';

  el.innerHTML = list.slice(0, 10).map(function(tx) {
    var isCredit = tx.type === 'credit';
    var date = new Date(tx.created_at).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    return (
      '<div class="tx-item">' +
        '<div class="tx-item-left">' +
          '<div class="tx-icon ' + tx.type + '">' + (isCredit ? up : down) + '</div>' +
          '<div>' +
            '<div class="tx-desc">' + tx.description + '</div>' +
            '<div class="tx-date">' + date + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tx-amount ' + tx.type + '">' + (isCredit ? '+' : '−') + formatNGN(tx.amount_ngn) + '</div>' +
      '</div>'
    );
  }).join('');
}


// ── Create invoice ─────────────────────────────────────────────

async function handleCreateInvoice() {
  var title  = document.getElementById('new-title').value.trim();
  var amount = parseFloat(document.getElementById('new-amount').value);
  var btn    = document.querySelector('#create-modal .modal-btn-primary');
  var errEl  = document.getElementById('create-error');

  errEl.style.display = 'none';

  if (!title) {
    errEl.textContent = 'Enter a job description.';
    errEl.style.display = 'block';
    return;
  }
  if (!amount || amount < 3) {
    errEl.textContent = 'Minimum amount is $3.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creating…';

  try {
    var data = await Api.createInvoice(title, amount);
    var link = window.location.origin + '/pages/pay.html?job=' + data.job.token;

    document.getElementById('new-title').value  = '';
    document.getElementById('new-amount').value = '';
    closeModal('create-modal');

    document.getElementById('detail-title').textContent  = data.job.title;
    document.getElementById('detail-amount').textContent = formatUSD(data.job.amount_usd);
    document.getElementById('detail-net').textContent    = formatUSD(data.job.amount_usd - 2);
    document.getElementById('detail-ngn').textContent    = formatNGN((data.job.amount_usd - 2) * 1580);
    document.getElementById('detail-link').textContent   = link;
    document.getElementById('detail-link').dataset.link  = link;
    openModal('invoice-modal');

    toast('Invoice created', 'success');
  } catch (err) {
    errEl.textContent   = err.message || 'Failed to create invoice.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create invoice';
  }
}

function copyInvoiceLink() {
  var text = document.getElementById('detail-link').dataset.link
          || document.getElementById('detail-link').textContent;
  copyToClipboard(text, 'Link copied ✓');
}


// ── Modal helpers ──────────────────────────────────────────────

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}


// ── Withdraw ───────────────────────────────────────────────────

function openWithdrawModal() {
  document.getElementById('w-available').textContent = document.getElementById('balance-amount').textContent;
  document.getElementById('w-error').style.display = 'none';
  openModal('withdraw-modal');
}

async function handleWithdraw() {
  var amount = parseFloat(document.getElementById('w-amount').value);
  var bank   = document.getElementById('w-bank').value.trim();
  var acct   = document.getElementById('w-acct').value.replace(/\D/g, '');
  var name   = document.getElementById('w-name').value.trim();
  var pass   = document.getElementById('w-pass').value;
  var btn    = document.querySelector('#withdraw-modal .modal-btn-primary');
  var errEl  = document.getElementById('w-error');

  errEl.style.display = 'none';

  if (!amount || !bank || !acct || !name || !pass) {
    errEl.textContent = 'All fields are required.';
    errEl.style.display = 'block';
    return;
  }
  if (amount < 15800) {
    errEl.textContent = 'Minimum withdrawal is ₦15,800.';
    errEl.style.display = 'block';
    return;
  }
  if (acct.length !== 10) {
    errEl.textContent = 'Account number must be 10 digits.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Processing…';

  try {
    await Api.withdraw(amount, bank, acct, name, pass);
    ['w-amount', 'w-bank', 'w-acct', 'w-name', 'w-pass'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    closeModal('withdraw-modal');
    toast('Withdrawal initiated · processing', 'success');
    await loadWallet();
    await loadTransactions();
  } catch (err) {
    errEl.textContent   = err.message || 'Withdrawal failed.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Confirm withdrawal';
  }
}