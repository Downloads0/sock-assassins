const players = ["Alex", "Ben", "Chloe", "Dev", "Ella"];

// Shuffle (the "Fisher–Yates" method — a standard fair shuffle)
for (let i = players.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [players[i], players[j]] = [players[j], players[i]];
}

const targets = {};   // se.g. targets["Alex"] = "Chloe"

// YOUR TURN: loop through players so each one targets the NEXT person,
// and the LAST person targets the FIRST.
// Hint: (i + 1) % players.length   ← try it on paper with i = 4 and length 5
for (let i = 0; i < players.length; i++) {
  const hunter = players[i];
  const target = players[(i + 1) % players.length];
  targets[hunter] = target;
}

function eliminate(victim) {
  // 1. Find the hunter: whose target is the victim?
  let hunter;
  for (const name in targets) {
    if (targets[name] === victim) {
      hunter = name;
    }
  }
  targets[hunter] = targets[victim];   // hunter now targets victim's target
  delete targets[victim];   // remove the victim from the game
  if (hunter === targets[hunter]) {
    console.log(`${hunter} is the last player standing!`);
  }
}

console.log("Start:", { ...targets });

for (let round = 1; round <= 4; round++) {
  eliminate(Object.keys(targets)[0]);
  console.log("After round", round, { ...targets });
}

if (!hunter) {
  console.log(`${victim} isn't in the game`);
  return;   // stop the function here
}