import { auth, db, SEASON } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"; // authentication
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js"; // firestore

const nameEl = document.getElementById("target-name");        // NEW
const messageEl = document.getElementById("target-message");  // NEW

onAuthStateChanged(auth, async (user) => {                     // NEW: async
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    document.getElementById("target-content").style.display = "";

    // 1. Read MY player document
    const mySnap = await getDoc(doc(db, "seasons", SEASON, "players", user.uid));

    if (!mySnap.exists()) {
        nameEl.textContent = "—";
        messageEl.textContent = "You're not signed up for this season.";
        return;
    }

    const me = mySnap.data();

      document.getElementById("hearts").textContent = `${"❤️".repeat(me.lives ?? 2)} · 🗡️ ${me.kills ?? 0} kills`;

    // 2. Handle the special cases first
    if (me.alive === false) {
        nameEl.textContent = "☠️ Eliminated";
        messageEl.textContent = "Better luck next season!";
        return;
    }

    if (me.targetId === null) {
        nameEl.textContent = "No target right now";
        messageEl.textContent = "You'll get a new target at the weekly shuffle.";
        return;
    }

    if (me.targetId === user.uid) {
        nameEl.textContent = "🏆 You won!";
        messageEl.textContent = "You're the last one standing.";
        return;
    }

    // 3. Read my TARGET's document and show their name
    const targetSnap = await getDoc(doc(db, "seasons", SEASON, "players", me.targetId));
    nameEl.textContent = targetSnap.data().name;

      // Show the claim form (only reached if I'm alive and have a target)
    const form = document.getElementById("claim-form");
    form.style.display = "";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await addDoc(collection(db, "seasons", SEASON, "claims"), {
          hunterId: user.uid,
          victimId: me.targetId,
          videoLink: document.getElementById("video-link").value,
          status: "pending",
          createdAt: serverTimestamp()
        });
        form.style.display = "none";
        messageEl.textContent = "Claim sent! Waiting for the game master.";
      } catch (error) {
        messageEl.textContent = error.message;
      }
    });
});

messageEl.textContent = "Waiting for the game master to add you to the game.";