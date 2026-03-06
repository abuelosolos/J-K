// shared between login.html and signup.html
// handles the Google / Apple buttons

import { signInWithGoogle, signInWithApple } from './firebase.js';

// called by the social buttons
// provider = 'google' | 'apple'
// role is only needed on signup (null on login page)
async function handleSocialAuth(provider, role) {
  const btn = event.currentTarget;
  const original = btn.innerHTML;

  btn.innerHTML = '<span style="opacity:0.6">Connecting…</span>';
  btn.disabled  = true;

  try {
    const idToken = provider === 'google'
      ? await signInWithGoogle()
      : await signInWithApple();

    // send token + role to our backend
    const data = await Api.firebaseAuth(idToken, role);

    // backend returns our own JWT — same flow as email login
    window.location.href = data.user.role === 'client'
      ? 'dashboard-client.html'
      : 'dashboard-freelancer.html';

  } catch (err) {
    btn.innerHTML    = original;
    btn.disabled     = false;

    // user closed the popup — don't show an error
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;

    setAlertText('error-box', err.message || 'Sign-in failed. Please try again.');
    showAlert('error-box');
  }
}

window.handleSocialAuth = handleSocialAuth;
export { handleSocialAuth };