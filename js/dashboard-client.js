// js/dashboard-client.js

document.addEventListener('DOMContentLoaded', async function() {
  if (!Api.requireClient()) return;

  var user = Api.getUser();
  if (user) {
    document.getElementById('user-avatar').textContent = (user.full_name || user.email)[0].toUpperCase();
    document.getElementById('user-name').textContent   = user.full_name || user.email;
  }

  await loadPaymentHistory();
});

async function loadPaymentHistory() {
  try {
    var data     = await Api.getPaymentHistory();
    var payments = data.payments || [];
    renderStats(payments);
    renderPayments(payments);
  } catch (err) {
    renderStats([]);
    renderPayments([]);
    console.error('Payment history error:', err.message);
  }
}

function renderStats(payments) {
  var total    = payments.reduce(function(s, p) { return s + (p.amount_usd || 0); }, 0);
  var unique   = new Set(payments.map(function(p) { return p.freelancer_email; })).size;
  var now      = new Date();
  var month    = payments.filter(function(p) {
    var d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var monthTotal = month.reduce(function(s, p) { return s + (p.amount_usd || 0); }, 0);

  document.getElementById('total-paid').textContent        = formatUSD(total);
  document.getElementById('total-freelancers').textContent = unique;
  document.getElementById('total-month').textContent       = formatUSD(monthTotal);
}

function renderPayments(payments) {
  var el = document.getElementById('payment-list');

  if (!payments.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">' +
          '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">' +
            '<rect x="1" y="4" width="22" height="16" rx="2"/>' +
            '<line x1="1" y1="10" x2="23" y2="10"/>' +
          '</svg>' +
        '</div>' +
        '<div class="empty-state-title">No payments yet</div>' +
        '<div class="empty-state-sub">When you pay a freelancer via their link, it will appear here.</div>' +
      '</div>';
    return;
  }

  el.innerHTML = payments.map(function(p) {
    var date = new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    return (
      '<div class="payment-row">' +
        '<div class="payment-row-left">' +
          '<div class="payment-icon">' +
            '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
              '<rect x="1" y="4" width="22" height="16" rx="2"/>' +
              '<line x1="1" y1="10" x2="23" y2="10"/>' +
            '</svg>' +
          '</div>' +
          '<div>' +
            '<div class="payment-title">' + (p.title || 'Payment') + '</div>' +
            '<div class="payment-meta">To: ' + (p.freelancer_name || p.freelancer_email) + ' · ' + date + '</div>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="payment-amount">' + formatUSD(p.amount_usd) + '</div>' +
          '<div class="payment-ref">' + (p.reference || '') + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}
