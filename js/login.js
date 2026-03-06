// js/login.js

async function handleLogin() {
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var btn      = document.querySelector('button[onclick="handleLogin()"]');

  hideAlert('error-box');

  if (!email || !password) {
    setAlertText('error-box', 'Please fill in all fields.');
    showAlert('error-box');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    var data = await Api.login(email, password);
    window.location.href = data.user.role === 'client'
      ? 'dashboard-client.html'
      : 'dashboard-freelancer.html';
  } catch (err) {
    setAlertText('error-box', err.message || 'Invalid credentials.');
    showAlert('error-box');
    btn.disabled    = false;
    btn.textContent = 'Sign in';
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
    if (e.key === 'Enter') handleLogin();
  });
});
