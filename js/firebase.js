import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBn0UbIgs49aakcX_Skwe5IqnNGeFju86M",
  authDomain: "trustlance-9855c.firebaseapp.com",
  projectId: "trustlance-9855c",
  storageBucket: "trustlance-9855c.firebasestorage.app",
  messagingSenderId: "739183602235",
  appId: "1:739183602235:web:f80e0c33eadc10c157ca1e"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result   = await signInWithPopup(auth, provider);
  return await result.user.getIdToken();
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  const result   = await signInWithPopup(auth, provider);
  return await result.user.getIdToken();
}
