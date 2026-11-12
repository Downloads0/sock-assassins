import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

const status = document.getElementById("user-status");

onAuthStateChanged(auth, (user) => {
  if (user) {
    status.textContent = `✅ Logged in as ${user.email}`;
  } else {
    status.textContent = "Not logged in";
  }
});