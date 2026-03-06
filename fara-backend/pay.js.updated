// js/pay.js

// Load job details from the token in the URL
document.addEventListener('DOMContentLoaded', async function() {
  var params = new URLSearchParams(window.location.search);
  var token  = params.get('job');

  if (!token) {
    showError('Invalid payment link.');
    return;
  }

  try {
    var res  = await fetch('http://localhost:4000/api/payments/job/' + token);
    var data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Payment link not found.');
      return;
    }

    var job = data.job;
    document.getElementById('job-title').textContent     = job.title;
    document.getElementById('job-amount').textContent    = '$' + parseFloat(job.amount_usd).toFixed(2);
    document.getElementById('job-freelancer').textContent = job.freelancer_name || job.freelancer_email;
    document.getElementById('job-fee').textContent       = '$2.00';
    document.getElementById('job-total').textContent     = '$' + parseFloat(job.amount_usd).toFixed(2);

    // Store token for payment
    document.getElementById('pay-btn').dataset.token = token;

  } catch (err) {
    showError('Could not load payment details. Please try again.');
  }
});

async function handlePayment() {
  var btn        = document.getElementById('pay-btn');
  var token      = btn.dataset.token;
  var payerName  = document.getElementById('payer-name').value.trim();
  var payerEmail = document.getElementById('payer-email').value.trim();

  if (!payerName || !payerEmail) {
    toast('Please enter your name and email.', 'error');
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Processing…';

  try {
    var res  = await fetch('http://localhost:4000/api/payments/pay/' + token, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payer_name: payerName, payer_email: payerEmail }),
    });
    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Payment failed.');
    }

    // Show success
    document.getElementById('pay-view').style.display     = 'none';
    document.getElementById('success-view').style.display = 'flex';
    document.getElementById('success-ref').textContent    = data.reference;

  } catch (err) {
    toast(err.message || 'Payment failed. Please try again.', 'error');
    btn.disabled  = false;
    btn.innerHTML = 'Pay now';
  }
}

function showError(msg) {
  document.getElementById('pay-view').style.display   = 'none';
  document.getElementById('error-view').style.display = 'flex';
  document.getElementById('error-msg').textContent    = msg;
}
