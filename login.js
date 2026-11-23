import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

const form = document.getElementById("login-form");
 
form.addEventListener("submit", async (event) => {
  event.preventDefault();               // stop the page from reloading

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "target.html";   // success → go to target page
  } catch (error) {
    alert(error.message);               // e.g. "password too weak"
  }
});

const loginMessage = document.getElementById("login-message");

document.getElementById("forgot-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    loginMessage.textContent = "Type your email above first, then click Forgot password.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    loginMessage.textContent = "If that email has an account, a reset link is on its way. Check your spam folder too.";
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});