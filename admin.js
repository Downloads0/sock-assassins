import { auth, db, SEASON, ADMIN_EMAIL } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { collection, getDocs, getDoc, doc, writeBatch, query, where, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const message = document.getElementById("admin-message");

async function eliminatePlayer(victimId, victimName) {
  if (!confirm(`Eliminate ${victimName}? This can't be undone.`)) return;

  try {
    // Read the victim's document (we need THEIR target)
    const victimRef = doc(db, "seasons", SEASON, "players", victimId);
    const victim = (await getDoc(victimRef)).data();

    if (victim.targetId === null) {
      message.textContent = "The game hasn't started yet.";
      return;
    }

    // 1. Find the hunter: whose targetId is the victim?
    const q = query(
      collection(db, "seasons", SEASON, "players"),
      where("targetId", "==", victimId)
    );
    const results = await getDocs(q);

    if (results.empty) {
      message.textContent = `Couldn't find who was hunting ${victimName}.`;
      return;
    }
    const hunterDoc = results.docs[0];

    const batch = writeBatch(db);

    // 2. Hunter gets the victim's target
    batch.update(hunterDoc.ref, { targetId: victim.targetId });

    // 3. Remove the victim
    batch.update(victimRef, { alive: false, targetId: null });

    batch.set(doc(db, "seasons", SEASON),
      { alive: arrayRemove(victimName) },
      { merge: true });

    // 4. Winner check: does the hunter now target themselves?
    if (victim.targetId === hunterDoc.id) {
      batch.set(doc(db, "seasons", SEASON),
        { status: "finished", winner: hunterDoc.data().name },
        { merge: true });
    }

    await batch.commit();
    message.textContent = `${victimName} is out. ${hunterDoc.data().name} has a new target.`;
    loadPlayers();   // refresh the list
    return true;
  } catch (error) {
    message.textContent = error.message;
  }
}

async function loadPlayers() {
    const snap = await getDocs(collection(db, "seasons", SEASON, "players"));
    const list = document.getElementById("player-list");
    list.innerHTML = "";   // clear the old list first
    const hunterOf = {};
    snap.docs.forEach((d) => {
        const p = d.data();
        if (p.targetId) {
            hunterOf[p.targetId] = p.name;
        }
    });
    snap.docs.forEach((d) => {
        const player = d.data();
        if (!player.alive || player.email === ADMIN_EMAIL) return; //skip eliminated players and the admin

        const li = document.createElement("li");
        const hunterName = hunterOf[d.id] || "no one yet";
    li.textContent = `[${player.name}] ← hunted by [${hunterName}] `;

        const btn = document.createElement("button");
        btn.textContent = "Eliminate";
        btn.addEventListener("click", () => eliminatePlayer(d.id, player.name));

        li.appendChild(btn);
        list.appendChild(li);
    });
}

async function loadClaims() {
  const list = document.getElementById("claim-list");
  list.innerHTML = "";

  // id → name table, so we can show names instead of IDs
  const players = await getDocs(collection(db, "seasons", SEASON, "players"));
  const names = {};
  players.docs.forEach((d) => { names[d.id] = d.data().name; });

  const q = query(collection(db, "seasons", SEASON, "claims"), where("status", "==", "pending"));
  const claims = await getDocs(q);

  if (claims.empty) {
    list.textContent = "No claims waiting.";
    return;
  }

  claims.docs.forEach((c) => {
    const claim = c.data();
    const li = document.createElement("li");
    li.textContent = `${names[claim.hunterId]} claims ${names[claim.victimId]} `;

    const link = document.createElement("a");
    link.href = claim.videoLink.startsWith("https://") ? claim.videoLink : "#";
    link.target = "_blank";
    link.textContent = "▶ Watch";

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.addEventListener("click", () => approveClaim(c.ref, claim, names));

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    rejectBtn.addEventListener("click", async () => {
      await updateDoc(c.ref, { status: "rejected" });
      loadClaims();
    });

    li.append(link, " ", approveBtn, " ", rejectBtn);
    list.appendChild(li);
  });
}

async function approveClaim(claimRef, claim, names) {
  // Safety check: is the hunter STILL hunting this victim?
  const hunter = (await getDoc(doc(db, "seasons", SEASON, "players", claim.hunterId))).data();
  if (hunter.targetId !== claim.victimId) {
    message.textContent = `Out of date: ${names[claim.hunterId]} isn't hunting ${names[claim.victimId]} anymore. Reject this claim.`;
    return;
  }

  const ok = await eliminatePlayer(claim.victimId, names[claim.victimId]);
  if (ok) {
    await updateDoc(claimRef, { status: "approved" });
    loadClaims();
  }
}

async function addLatePlayer(newId, newName) {
  if (!confirm(`Add ${newName} to the game?`)) return;

  try {
    const snap = await getDocs(collection(db, "seasons", SEASON, "players"));
    const inGame = snap.docs.filter((d) => d.data().alive && d.data().targetId);

    if (inGame.length === 0) {
      message.textContent = "Start the game first.";
      return;
    }

    // Pick a random player to insert the newcomer after
    const host = inGame[Math.floor(Math.random() * inGame.length)];

    const batch = writeBatch(db);
    batch.update(doc(db, "seasons", SEASON, "players", newId), { targetId: host.data().targetId });
    batch.update(host.ref, { targetId: newId });
    batch.set(doc(db, "seasons", SEASON), { alive: arrayUnion(newName) }, { merge: true });
    await batch.commit();

    message.textContent = `${newName} has joined the game.`;
    loadPlayers();
  } catch (error) {
    message.textContent = error.message;
  }
}

// Only show the page to you
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.replace("./");
    } else {
        document.getElementById("admin-content").style.display = "";
        loadPlayers();
        loadClaims();
    }
});

document.getElementById("start-btn").addEventListener("click", async () => {
    if (!confirm("Start the game? This assigns everyone a target.")) return;

    try {
        // 1. Load all players and keep just their IDs
        const snap = await getDocs(collection(db, "seasons", SEASON, "players"));
        const ids = snap.docs
            .filter((d) => d.data().email !== ADMIN_EMAIL)
            .map((d) => d.id);

        if (ids.length < 2) {
        message.textContent = "Need at least 2 players.";
        return;
        }

        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        // 3. Assign targets with a batch
        const batch = writeBatch(db);

        for (let i = 0; i < ids.length; i++) {
            const hunter = ids[i];
            const target = ids[(i + 1) % ids.length];
            batch.update(doc(db, "seasons", SEASON, "players", hunter), { targetId: target, alive: true });;
        }

        const aliveNames = snap.docs
          .filter((d) => d.data().email !== ADMIN_EMAIL)
          .map((d) => d.data().name)
          .sort();
        
        batch.set(doc(db, "seasons", SEASON),
          { status: "active", alive: aliveNames, winner: null },
          { merge: true });

        await batch.commit();
        loadPlayers();
        message.textContent = `Game started with ${ids.length} players`;
    } catch (error) {
        message.textContent = error.message;
    }
});