import { auth, db, SEASON } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { collection, getDocs, doc, writeBatch } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const ADMIN_EMAIL = "dwang27@ucc.on.ca";   // ← your login email
const message = document.getElementById("admin-message");

// Only show the page to you
onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.replace("./");
  } else {
    document.getElementById("admin-content").style.display = "";
  }
});

document.getElementById("start-btn").addEventListener("click", async () => {
  if (!confirm("Start the game? This assigns everyone a target.")) return;

  try {
    // 1. Load all players and keep just their IDs
    const snap = await getDocs(collection(db, "seasons", SEASON, "players"));
    const ids = snap.docs.map((d) => d.id);

    if (ids.length < 2) {
      message.textContent = "Need at least 2 players.";
      return;
    }

    // 2. Shuffle — paste your Fisher–Yates loop here, using `ids` instead of `players`

    // 3. Assign targets with a batch
    const batch = writeBatch(db);

    // YOUR TURN: your practice loop goes here, but instead of
    //   targets[hunter] = target;
    // write:
    //   batch.update(doc(db, "seasons", SEASON, "players", hunter), { targetId: target, alive: true });

    batch.set(doc(db, "seasons", SEASON), { status: "active" }, { merge: true });

    await batch.commit();
    message.textContent = `Game started with ${ids.length} players! 🧦`;
  } catch (error) {
    message.textContent = error.message;
  }
});