import { auth, db, SEASON, ADMIN_EMAIL } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { collection, getDocs, getDoc, doc, writeBatch, query, where, updateDoc, increment } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const message = document.getElementById("admin-message");
const seasonRef = doc(db, "seasons", SEASON);
const STARTING_LIVES = 2;

// ---------- Helpers ----------

// All player documents, without the game master
async function getPlayers() {
  const snap = await getDocs(collection(db, "seasons", SEASON, "players"));
  return snap.docs.filter((d) => d.data().email !== ADMIN_EMAIL);
}

// Fisher–Yates shuffle (changes the list in place)
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function refresh() {
  loadPlayers();
  loadClaims();
}

// ---------- Start a brand-new game ----------

async function startGame() {
  if (!confirm("Start a NEW game? Everyone gets full hearts and a new target.")) return;

  if (prompt('This RESETS the whole game. Type RESTART to continue.') !== "RESTART") return;

  try {
    const players = await getPlayers();
    if (players.length < 2) {
      message.textContent = "Need at least 2 players.";
      return;
    }

    shuffle(players);
    const batch = writeBatch(db);

    players.forEach((d, i) => {
      const next = players[(i + 1) % players.length];
      batch.update(d.ref, {
        targetId: next.id,
        alive: true,
        lives: STARTING_LIVES,
        killedThisWeek: false,
        kills: 0
      });
    });

    batch.set(seasonRef, {
      status: "active",
      winner: null,
      alive: players.map((d) => d.data().name).sort()
    }, { merge: true });

    await batch.commit();
    message.textContent = `Game started with ${players.length} players! 🧦`;
    refresh();
  } catch (error) {
    message.textContent = error.message;
  }
}

// ---------- A player gets tagged: take one heart ----------

async function eliminatePlayer(victimId, victimName) {
  if (!confirm(`Take a heart from ${victimName}?`)) return false;

  try {
    const players = await getPlayers();
    const victimDoc = players.find((d) => d.id === victimId);
    const hunterDoc = players.find((d) =>
      d.id !== victimId && d.data().alive && d.data().targetId === victimId);

    if (!victimDoc || !victimDoc.data().alive || !hunterDoc) {
      message.textContent = `${victimName} isn't being hunted right now.`;
      return false;
    }

    const victim = victimDoc.data();
    const hunter = hunterDoc.data();
    const livesLeft = (victim.lives ?? STARTING_LIVES) - 1;
    const victimDies = livesLeft <= 0;

    const batch = writeBatch(db);

    // The victim leaves the circle either way: out for good, or sitting out until the shuffle
    if (victimDies) {
      batch.update(victimDoc.ref, { lives: 0, alive: false, targetId: null });
    } else {
      batch.update(victimDoc.ref, { lives: livesLeft, targetId: null });
    }

    // Who else is still alive (counting the victim only if they survived)?
    const othersAlive = players.filter((d) =>
      d.id !== hunterDoc.id &&
      d.data().alive &&
      !(d.id === victimId && victimDies));

    let hunterTarget;
    if (othersAlive.length === 0) {
      hunterTarget = hunterDoc.id;   // last one standing → winner
      batch.set(seasonRef, { status: "finished", winner: hunter.name }, { merge: true });
    } else if (victim.targetId === hunterDoc.id) {
      hunterTarget = null;           // the circle ran out → wait for the shuffle
    } else {
      hunterTarget = victim.targetId; // hunter moves on to the victim's target
    }

    batch.update(hunterDoc.ref, { targetId: hunterTarget, killedThisWeek: true, kills: increment(1) });

    await batch.commit();

    if (othersAlive.length === 0) {
      message.textContent = `🏆 ${hunter.name} wins!`;
    } else if (victimDies) {
      message.textContent = `${victimName} is out!`;
    } else {
      message.textContent = `${victimName} lost a heart and sits out until the shuffle.`;
    }

    refresh();
    return true;
  } catch (error) {
    message.textContent = error.message;
    return false;
  }
}

// ---------- Weekly shuffle ----------

async function weeklyShuffle() {
  const ok = confirm(
    "Run the weekly shuffle?\n\n" +
    "Approve or reject all of this week's claims FIRST.\n" +
    "Anyone who was hunting but didn't tag their target loses a heart."
  );
  if (!ok) return;

  try {
    const pending = await getDocs(query(collection(db, "seasons", SEASON, "claims"), where("status", "==", "pending")));
    if (!pending.empty) {
      message.textContent = `There are ${pending.size} claims still waiting. Approve or reject them first.`;
      return;
    }

    const seasonSnap = await getDoc(seasonRef);
    if (seasonSnap.exists() && seasonSnap.data().status === "finished") {
      message.textContent = "The game is already over.";
      return;
    }

    const players = await getPlayers();
    const batch = writeBatch(db);
    const penalized = [];
    const survivors = [];

    players.forEach((d) => {
      const p = d.data();
      if (!p.alive) return;

      let lives = p.lives ?? STARTING_LIVES;
      const wasHunting = p.targetId && p.targetId !== d.id;

      // No-kill rule: lose a heart
      if (wasHunting && !p.killedThisWeek) {
        lives -= 1;
        penalized.push(p.name);
      }

      if (lives <= 0) {
        batch.update(d.ref, { alive: false, lives: 0, targetId: null, killedThisWeek: false });
      } else {
        survivors.push({ ref: d.ref, id: d.id, name: p.name, lives });
      }
    });

    if (survivors.length === 0) {
      message.textContent = "Nobody would survive this shuffle, so nothing was changed.";
      return;   // the batch is never committed
    }

    if (survivors.length === 1) {
      const winner = survivors[0];
      batch.update(winner.ref, { lives: winner.lives, targetId: winner.id, killedThisWeek: false });
      batch.set(seasonRef, { status: "finished", winner: winner.name, alive: [winner.name] }, { merge: true });
    } else {
      shuffle(survivors);
      survivors.forEach((s, i) => {
        const next = survivors[(i + 1) % survivors.length];
        batch.update(s.ref, { lives: s.lives, targetId: next.id, killedThisWeek: false });
      });
      batch.set(seasonRef, { alive: survivors.map((s) => s.name).sort() }, { merge: true });
    }

    await batch.commit();

    let text = `Shuffled ${survivors.length} players into a new circle.`;
    if (penalized.length > 0) {
      text += ` Lost a heart for not tagging: ${penalized.join(", ")}.`;
    }
    message.textContent = text;
    refresh();
  } catch (error) {
    message.textContent = error.message;
  }
}

// ---------- Update the home page ring mid-week (optional) ----------

async function publishAlive() {
  try {
    const players = await getPlayers();
    const aliveNames = players
      .map((d) => d.data())
      .filter((p) => p.alive)
      .map((p) => p.name)
      .sort();

    await updateDoc(seasonRef, { alive: aliveNames });
    message.textContent = `Home page updated: ${aliveNames.length} players shown.`;
  } catch (error) {
    message.textContent = error.message;
  }
}

// ---------- Players list ----------

async function loadPlayers() {
  const players = await getPlayers();
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  // victim's id → name of the person hunting them
  const hunterOf = {};
  players.forEach((d) => {
    const p = d.data();
    if (p.alive && p.targetId) hunterOf[p.targetId] = p.name;
  });

  players.forEach((d) => {
    const p = d.data();
    if (!p.alive) return;

    const hearts = "❤️".repeat(p.lives ?? STARTING_LIVES);
    const hunterName = hunterOf[d.id];

    let status;
    if (p.targetId === d.id) {
      status = "🏆 winner";
    } else if (hunterName) {
      status = `hunted by ${hunterName}`;
    } else {
      status = "sitting out until the shuffle";
    }

    const tagged = p.killedThisWeek ? " · ✅ tagged this week" : "";

    const li = document.createElement("li");
    li.textContent = `${p.name} ${hearts} · 🗡️ ${p.kills ?? 0} · ${status}${tagged} `;

    if (hunterName && p.targetId !== d.id) {
      const btn = document.createElement("button");
      btn.textContent = "Take a heart";
      btn.addEventListener("click", () => eliminatePlayer(d.id, p.name));
      li.appendChild(btn);
    }

    list.appendChild(li);
  });
}

// ---------- Claims ----------

async function loadClaims() {
  const list = document.getElementById("claim-list");
  list.innerHTML = "";

  const players = await getPlayers();
  const names = {};
  players.forEach((d) => { names[d.id] = d.data().name; });

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

// ---------- Page setup ----------

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.replace("./");
  } else {
    document.getElementById("admin-content").style.display = "";
    refresh();
  }
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("shuffle-btn").addEventListener("click", weeklyShuffle);
document.getElementById("publish-btn").addEventListener("click", publishAlive);