import { auth, db, SEASON } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password); // saves the results

    await setDoc(doc(db, "seasons", SEASON, "players", cred.user.uid), {
      name: name,
      email: email,
      alive: true,
      targetId: null,
      joinedAt: serverTimestamp()
    });

    window.location.href = "target.html";
  } catch (error) {
    alert(error.message);
  }
});