// js/settings.js

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('[data-tab="' + name + '"]').classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

function goToStep(step) {
  document.querySelectorAll('.step').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('step-' + step).classList.add('active');
}

function saveProfile() {
  // TODO: wire to PUT /api/auth/profile
  toast('Profile saved', 'success');
}

async function requestPasswordChange() {
  var current = document.getElementById('cur-pass').value;
  var newPass  = document.getElementById('new-pass').value;
  var confirm  = document.getElementById('confirm-pass').value;
  var btn      = document.querySelector('#step-form .btn--primary');

  hideAlert('pass-error');

  if (!current || !newPass || !confirm) {
    setAlertText('pass-error', 'Please fill in all fields.');
    showAlert('pass-error'); return;
  }
  if (newPass.length < 8) {
    setAlertText('pass-error', 'New password must be at least 8 characters.');
    showAlert('pass-error'); return;
  }
  if (newPass !== confirm) {
    setAlertText('pass-error', 'New passwords do not match.');
    showAlert('pass-error'); return;
  }

  btn.disabled    = true;
  btn.textContent = 'Sending code…';

  try {
    await Api.requestPasswordChange(current, newPass);
    goToStep('verify');
    toast('Verification code sent to your email', 'success');
  } catch (err) {
    setAlertText('pass-error', err.message || 'Request failed.');
    showAlert('pass-error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Send verification code';
  }
}

async function confirmPasswordChange() {
  var code = document.getElementById('verify-code').value;
  var btn  = document.querySelector('#step-verify .btn--primary');

  hideAlert('verify-error');

  if (code.length !== 6) {
    setAlertText('verify-error', 'Enter your 6-digit code.');
    showAlert('verify-error'); return;
  }

  btn.disabled    = true;
  btn.textContent = 'Confirming…';

  try {
    await Api.confirmPasswordChange(code);
    goToStep('done');
    toast('Password updated successfully', 'success');
  } catch (err) {
    setAlertText('verify-error', err.message || 'Invalid or expired code.');
    showAlert('verify-error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Confirm';
  }
}

function resetPasswordForm() {
  ['cur-pass', 'new-pass', 'confirm-pass', 'verify-code'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  goToStep('form');
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof Api !== 'undefined' && !Api.requireAuth()) return;

  var user = Api.getUser();
  if (user) {
    var nameEl  = document.getElementById('p-name');
    var emailEl = document.getElementById('p-email');
    var avatarEl = document.getElementById('profile-avatar');
    var nameDisplayEl  = document.getElementById('profile-name');
    var emailDisplayEl = document.getElementById('profile-email');
    if (nameEl)         nameEl.value          = user.full_name || '';
    if (emailEl)        emailEl.value         = user.email     || '';
    if (avatarEl)       avatarEl.textContent  = (user.full_name || user.email)[0].toUpperCase();
    if (nameDisplayEl)  nameDisplayEl.textContent  = user.full_name || '';
    if (emailDisplayEl) emailDisplayEl.textContent = user.email     || '';
  }

  goToStep('form');
});
