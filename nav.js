import { auth, db, SEASON } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const status = document.getElementById("user-status");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "seasons", SEASON, "players", user.uid));

    if (snap.exists()) {
      status.textContent = `Logged in as ${snap.data().name}`;
    } else {
      status.textContent = `Logged in as ${user.email}`;   // no player doc yet
    }
  } else {
    status.textContent = "Not logged in";
  }
});

const form = document.getElementById("logout-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

