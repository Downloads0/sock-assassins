import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");   // not logged in → kick to login
  }
  else {
    document.getElementById("target-content").style.display = "block";   // logged in → show target content
  }
});