import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

const form = document.getElementById("logout-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});