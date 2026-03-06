// signup.js

window.selectedRole       = 'freelancer';
window.selectedClientType = 'individual';

function selectRole(role) {
  window.selectedRole = role;
  document.getElementById('role-freelancer').classList.toggle('active', role === 'freelancer');
  document.getElementById('role-client').classList.toggle('active', role === 'client');

  // show/hide the client type picker
  var wrap = document.getElementById('client-type-wrap');
  if (wrap) wrap.style.display = role === 'client' ? 'block' : 'none';

  // reset to individual when switching back to client
  if (role === 'client') selectClientType('individual');
}

function selectClientType(type) {
  window.selectedClientType = type;

  document.getElementById('radio-individual').classList.toggle('active', type === 'individual');
  document.getElementById('radio-business').classList.toggle('active', type === 'business');

  document.getElementById('fields-individual').style.display = type === 'individual' ? 'block' : 'none';
  document.getElementById('fields-business').style.display   = type === 'business'   ? 'block' : 'none';
}

async function handleSignup() {
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var role     = window.selectedRole;
  var btn      = document.querySelector('.submit-btn');

  hideAlert('error-box');

  // build full_name depending on role + client type
  var full_name = '';

  if (role === 'freelancer') {
    full_name = document.getElementById('name').value.trim();
    if (!full_name) {
      setAlertText('error-box', 'Please enter your full name.');
      showAlert('error-box'); return;
    }
  } else if (role === 'client') {
    if (window.selectedClientType === 'individual') {
      full_name = document.getElementById('name').value.trim();
      if (!full_name) {
        setAlertText('error-box', 'Please enter your full name.');
        showAlert('error-box'); return;
      }
    } else {
      var bizName    = document.getElementById('biz-name').value.trim();
      var bizContact = document.getElementById('biz-contact').value.trim();
      var bizIndustry = document.getElementById('biz-industry').value;
      if (!bizName) {
        setAlertText('error-box', 'Please enter your business name.');
        showAlert('error-box'); return;
      }
      if (!bizContact) {
        setAlertText('error-box', 'Please enter a contact person name.');
        showAlert('error-box'); return;
      }
      if (!bizIndustry) {
        setAlertText('error-box', 'Please select your industry.');
        showAlert('error-box'); return;
      }
      full_name = bizName; // use biz name as the account display name
    }
  }

  if (!email) {
    setAlertText('error-box', 'Please enter your email address.');
    showAlert('error-box'); return;
  }
  if (password.length < 8) {
    setAlertText('error-box', 'Password must be at least 8 characters.');
    showAlert('error-box'); return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    // bundle any extra metadata to send
    var meta = {};
    if (role === 'client' && window.selectedClientType === 'business') {
      meta.account_type = 'business';
      meta.rc_number    = document.getElementById('biz-rc').value.trim();
      meta.industry     = document.getElementById('biz-industry').value;
      meta.contact_name = document.getElementById('biz-contact').value.trim();
    } else {
      meta.account_type = 'individual';
      meta.phone        = (document.getElementById('phone') || {}).value || '';
    }

    await Api.signup(full_name, email, password, role, meta);

    window.location.href = role === 'client'
      ? 'dashboard-client.html'
      : 'dashboard-freelancer.html';

  } catch (err) {
    setAlertText('error-box', err.message || 'Signup failed. Please try again.');
    showAlert('error-box');
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (Api.getToken()) {
    var user = Api.getUser();
    window.location.href = user && user.role === 'client'
      ? 'dashboard-client.html'
      : 'dashboard-freelancer.html';
    return;
  }
  document.getElementById('password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleSignup();
  });
});