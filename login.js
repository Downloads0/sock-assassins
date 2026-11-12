import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

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