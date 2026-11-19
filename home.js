import { db, SEASON } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const ring = document.getElementById("ring");
const countEl = document.getElementById("alive-count");
const banner = document.getElementById("winner-banner");

const RADIUS = 140;            // how far the names sit from the center (pixels)
const SECONDS_PER_TURN = 60;   // how long one full lap takes

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Listen to the season document — runs again every time it changes
onSnapshot(doc(db, "seasons", SEASON), (snap) => {
  const season = snap.exists() ? snap.data() : {};
  const alive = season.alive || [];

  // Winner banner
  if (season.status === "finished") {
    banner.textContent = `🏆 ${season.winner} is the last one standing!`;
    banner.style.display = "";
  } else {
    banner.style.display = "none";
  }

  // Counter
  if (season.status === "active") {
    countEl.textContent = `${alive.length} assassins remain`;
  } else if (season.status !== "finished") {
    countEl.textContent = "The game hasn't started yet.";
  } else {
    countEl.textContent = "";
  }

  // Rebuild the name labels (positions are set by placeNames)
  ring.innerHTML = "";
  alive.forEach((name) => {
    const slot = document.createElement("div");
    slot.className = "ring-name";

    const label = document.createElement("span");
    label.textContent = name;

    slot.appendChild(label);
    ring.appendChild(slot);
  });

  requestAnimationFrame(loop);
});

// Put every name at its spot on the circle for a given moment in time
function placeNames(time) {
  const spin = (time / 1000 / SECONDS_PER_TURN) * Math.PI * 2;
  const slots = ring.querySelectorAll(".ring-name");

  slots.forEach((slot, i) => {
    const angle = spin + (i / slots.length) * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS;
    const y = Math.sin(angle) * RADIUS;
    slot.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

// Animation loop: reposition the names about 60 times a second
function loop(time) {
  placeNames(time);
  requestAnimationFrame(loop);
}

if (!reduceMotion) requestAnimationFrame(loop);