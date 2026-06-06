const roster = window.siteContent.players.map(({ number, nameplate }) => ({ number, nameplate }));
const gameStats = window.siteContent.gameStats || {};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const $ = (selector) => document.querySelector(selector);

const lines = {
  goal: [
    "The goalie needed Google Maps for that one.",
    "That puck had a parking pass for the back of the net.",
    "Goalie slid across like a fridge on wet tile.",
    "Buried. Absolutely processed meat behavior.",
  ],
  save: [
    "Saved. Sadly, the goalie discovered lateral movement.",
    "Denied. That shot had all bun, no dog.",
    "Goalie got a piece. Unfortunate competence.",
    "No goal. The scouting report says shoot literally anywhere else.",
  ],
  miss: [
    "Missed the net. Great velocity, suspicious geography.",
    "That one found the glass. The glass remains undefeated.",
    "Wide of the cage. The puck requested a forwarding address.",
    "No goal. The net was available for comment and felt ignored.",
  ],
  start: [
    "Breakaway time. Deke, shoot, embarrass.",
    "One-on-one. You versus a goalie with suspicious confidence.",
    "Crash the net. Protect the brand.",
    "The crowd wants a move. Give them a receipt.",
  ],
};

const state = {
  running: false,
  result: null,
  score: 0,
  round: 1,
  facing: "right",
  player: { x: 50, y: 80 },
  velocity: { x: 0, y: 0 },
  target: null,
  pointerActive: false,
  lastFacing: null,
  goalieX: 50,
  puck: null,
  keys: {},
  skater: null,
};

const net = { left: 39, right: 61, line: 32 };

const skater = $("[data-skater]");
const goalie = $("[data-goalie]");
const puck = $("[data-puck]");
const rink = $("[data-game-rink]");
const shell = $(".game-shell");
const overlay = $("[data-game-overlay]");
const message = $("[data-game-message]");
const playerSelect = $("[data-game-player-select]");
const startPanel = $("[data-start-panel]");
const leaderboard = $("[data-game-leaderboard]");
let lastTapAction = 0;

function playerKey(player, stat) {
  return `${gameStats.keyPrefix || "utahglizzies-breakaway-v1"}-${String(player.number).replace(/[^a-z0-9]/gi, "x")}-${String(player.nameplate).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stat}`;
}

async function statRequest(action, key) {
  if (!gameStats.apiBase) return 0;
  const response = await fetch(`${gameStats.apiBase}/${action}/${key}`);
  if (!response.ok) throw new Error("Stats service unavailable");
  const data = await response.json();
  return Number(data.value || data.count || 0);
}

async function recordStat(player, stat) {
  try {
    await statRequest("hit", playerKey(player, stat));
    renderLeaderboard();
  } catch {
    const localKey = `breakaway-${playerKey(player, stat)}`;
    localStorage.setItem(localKey, String((Number(localStorage.getItem(localKey)) || 0) + 1));
    renderLeaderboard();
  }
}

function pickPlayer() {
  const selected = playerSelect?.value;
  state.skater = roster.find((player) => `${player.number}-${player.nameplate}` === selected) || null;
  $("[data-game-nameplate]").innerHTML = state.skater
    ? `<strong>${state.skater.nameplate}</strong><span>#${state.skater.number}</span>`
    : `<strong>Choose skater</strong><span>Then start</span>`;
}

function renderPlayerSelect() {
  if (!playerSelect) return;
  playerSelect.innerHTML = `
    <option value="">Select your skater...</option>
    ${roster.map((player) => `<option value="${player.number}-${player.nameplate}">#${player.number} ${player.nameplate}</option>`).join("")}
  `;
  playerSelect.value = "";
}

async function getPlayerLedger(player) {
  try {
    const [goals, saves] = await Promise.all([
      statRequest("get", playerKey(player, "goals")),
      statRequest("get", playerKey(player, "saves")),
    ]);
    return { ...player, goals, saves };
  } catch {
    const goals = Number(localStorage.getItem(`breakaway-${playerKey(player, "goals")}`)) || 0;
    const saves = Number(localStorage.getItem(`breakaway-${playerKey(player, "saves")}`)) || 0;
    return { ...player, goals, saves };
  }
}

async function renderLeaderboard() {
  if (!leaderboard) return;
  const rows = await Promise.all(roster.map(getPlayerLedger));
  rows.sort((a, b) => (b.goals + b.saves) - (a.goals + a.saves) || b.goals - a.goals);
  leaderboard.innerHTML = `
    <div class="leaderboard-row leaderboard-head"><span>Player</span><span>Played</span><span>Goals</span><span>Stopped</span><span>Scoring %</span></div>
    ${rows.map((player) => {
      const shots = player.goals + player.saves;
      const pct = shots ? Math.round((player.goals / shots) * 100) : 0;
      return `<div class="leaderboard-row"><span>#${player.number} ${player.nameplate}</span><strong>${shots}</strong><strong>${player.goals}</strong><strong>${player.saves}</strong><strong>${pct}%</strong></div>`;
    }).join("")}
  `;
}

function randomLine(type) {
  const list = lines[type];
  return list[Math.floor(Math.random() * list.length)];
}

function setMessage(text) {
  message.textContent = text;
}

function update() {
  $("[data-game-score]").textContent = state.score;
  $("[data-game-round]").textContent = state.round;
  if (state.lastFacing !== state.facing) {
    skater.src = `public/game/sprites/skater-${state.facing}.png`;
    state.lastFacing = state.facing;
  }
  skater.style.left = `${state.player.x}%`;
  skater.style.top = `${state.player.y}%`;
  goalie.style.left = `${state.goalieX}%`;
  const puckOffset = state.facing === "left" ? -7 : 8;
  if (state.puck) {
    puck.style.display = "block";
    puck.style.left = `${state.puck.x}%`;
    puck.style.top = `${state.puck.y}%`;
  } else if (state.running && !state.result) {
    puck.style.display = "block";
    puck.style.left = `${state.player.x + puckOffset}%`;
    puck.style.top = `${state.player.y - 1}%`;
  } else {
    puck.style.display = "none";
  }
}

function showStartPanel(text = "Choose a skater, then start the breakaway.") {
  state.running = false;
  state.result = null;
  state.puck = null;
  state.target = null;
  state.velocity = { x: 0, y: 0 };
  state.pointerActive = false;
  if (playerSelect) playerSelect.disabled = false;
  shell?.classList.add("is-selecting");
  startPanel?.classList.add("is-visible");
  overlay.classList.remove("is-visible");
  setMessage(text);
  update();
}

function startRound(reset = false) {
  pickPlayer();
  if (!state.skater) {
    showStartPanel("Pick your skater first. No accidental Froman point farming on our watch.");
    return;
  }
  if (reset) {
    state.score = 0;
    state.round = 1;
  } else {
    state.round += 1;
  }
  state.running = true;
  state.result = null;
  state.facing = Math.random() > 0.5 ? "right" : "left";
  state.player = { x: 50, y: 80 };
  state.velocity = { x: 0, y: 0 };
  state.target = null;
  state.pointerActive = false;
  state.goalieX = 50;
  state.puck = null;
  if (playerSelect) playerSelect.disabled = true;
  shell?.classList.remove("is-selecting");
  startPanel?.classList.remove("is-visible");
  setMessage(randomLine("start"));
  overlay.classList.remove("is-visible");
  update();
}

function endShot(result) {
  state.result = result;
  state.running = false;
  if (result === "goal") state.score += 1;
  recordStat(state.skater, result === "goal" ? "goals" : "saves");
  setMessage(randomLine(result));
  const title = result === "goal" ? "GOAL!" : result === "miss" ? "WIDE" : "SAVE";
  overlay.innerHTML = `<h1>${title}</h1><p>${message.textContent}</p><div class="game-overlay-actions"><button class="button primary" data-next-breakaway>Next Breakaway</button><button class="button secondary" data-change-skater>Change Skater</button></div>`;
  overlay.classList.add("is-visible");
  bindElementTap($("[data-next-breakaway]"), () => startRound(false));
  bindElementTap($("[data-change-skater]"), () => showStartPanel("Pick a different skater and start a fresh run."));
  update();
}

function deke(direction) {
  if (!state.running || state.result) return;
  state.facing = direction;
  state.velocity.x += direction === "left" ? -3.4 : 3.4;
  state.velocity.y -= 0.25;
  state.target = null;
  setMessage(direction === "left" ? "Deke left. Ankles have entered witness protection." : "Deke right. Goalie might need a software update.");
  update();
}

function shoot() {
  if (!state.running || state.puck || state.result) return;
  const puckOffset = state.facing === "left" ? -7 : 8;
  state.puck = { x: state.player.x + puckOffset, y: state.player.y - 7, speed: 7.8 };
  setMessage("Shot away. Please respect the art.");
  update();
}

function steerFromPoint(clientX, clientY) {
  if (!state.running || state.result || !rink) return;
  const rect = rink.getBoundingClientRect();
  const nextX = clamp(((clientX - rect.left) / rect.width) * 100, 12, 88);
  const nextY = clamp(((clientY - rect.top) / rect.height) * 100, 38, 83);
  if (Math.abs(nextX - state.player.x) > 0.25) {
    state.facing = nextX < state.player.x ? "left" : "right";
  }
  state.target = { x: nextX, y: nextY };
}

function clearSteerTarget() {
  state.pointerActive = false;
}

function bindElementTap(button, handler) {
  if (!button) return;
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    lastTapAction = Date.now();
    handler();
  }, { passive: false });
  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    event.preventDefault();
    lastTapAction = Date.now();
    handler();
  });
  button.addEventListener("click", (event) => {
    if (Date.now() - lastTapAction < 450) {
      event.preventDefault();
      return;
    }
    handler();
  });
}

function bindTap(selector, handler) {
  bindElementTap($(selector), handler);
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
  const gameKey = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code) || ["w", "a", "s", "d", "q", "e"].includes(event.key.toLowerCase());
  if (gameKey && !isTyping) event.preventDefault();
  state.keys[event.key.toLowerCase()] = true;
  if (!isTyping && event.code === "Space") shoot();
  if (!isTyping && event.key.toLowerCase() === "q") deke("left");
  if (!isTyping && event.key.toLowerCase() === "e") deke("right");
});

document.addEventListener("keyup", (event) => {
  state.keys[event.key.toLowerCase()] = false;
});

bindTap("[data-start-game]", () => startRound(true));
bindTap("[data-deke-left]", () => deke("left"));
bindTap("[data-deke-right]", () => deke("right"));
bindTap("[data-shoot]", () => shoot());

rink?.addEventListener("touchstart", (event) => {
  if (event.target.closest("button, select")) return;
  event.preventDefault();
  state.pointerActive = true;
  const touch = event.touches[0];
  steerFromPoint(touch.clientX, touch.clientY);
}, { passive: false });

rink?.addEventListener("touchmove", (event) => {
  if (event.target.closest("button, select")) return;
  event.preventDefault();
  state.pointerActive = true;
  const touch = event.touches[0];
  steerFromPoint(touch.clientX, touch.clientY);
}, { passive: false });

rink?.addEventListener("touchend", clearSteerTarget, { passive: true });
rink?.addEventListener("touchcancel", clearSteerTarget, { passive: true });

rink?.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch" || event.target.closest("button, select")) return;
  event.preventDefault();
  state.pointerActive = true;
  steerFromPoint(event.clientX, event.clientY);
});

rink?.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "touch" || event.target.closest("button, select")) return;
  if (event.buttons !== 1 && event.pressure === 0) return;
  event.preventDefault();
  state.pointerActive = true;
  steerFromPoint(event.clientX, event.clientY);
});

rink?.addEventListener("pointerup", clearSteerTarget);
rink?.addEventListener("pointercancel", clearSteerTarget);

let lastFrame = performance.now();

function tick(now = performance.now()) {
  const dt = Math.min((now - lastFrame) / 16.67, 2);
  lastFrame = now;
  if (!state.running || state.result) {
    requestAnimationFrame(tick);
    return;
  }
  const usingKeyboard = state.keys.arrowleft || state.keys.a || state.keys.arrowright || state.keys.d || state.keys.arrowup || state.keys.w || state.keys.arrowdown || state.keys.s;
  let desiredX = 0;
  let desiredY = -0.16;

  if (usingKeyboard) {
    state.target = null;
    desiredY = 0;
  }
  if (state.keys.arrowleft || state.keys.a) {
    desiredX -= 1.55;
    state.facing = "left";
  }
  if (state.keys.arrowright || state.keys.d) {
    desiredX += 1.55;
    state.facing = "right";
  }
  if (state.keys.arrowup || state.keys.w) desiredY -= 1.05;
  if (state.keys.arrowdown || state.keys.s) desiredY += 0.8;

  if (state.target && !usingKeyboard) {
    const dx = state.target.x - state.player.x;
    const dy = state.target.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.75 && !state.pointerActive) {
      state.target = null;
    } else if (distance > 0) {
      const speed = clamp(distance * 0.12, 0.25, 1.65);
      desiredX = (dx / distance) * speed;
      desiredY = (dy / distance) * speed;
    }
  }

  const response = usingKeyboard || state.target ? 0.22 : 0.12;
  state.velocity.x += (desiredX - state.velocity.x) * response * dt;
  state.velocity.y += (desiredY - state.velocity.y) * response * dt;
  state.player.x += state.velocity.x * dt;
  state.player.y += state.velocity.y * dt;
  state.velocity.x *= Math.pow(0.94, dt);
  state.velocity.y *= Math.pow(0.96, dt);

  state.player.y = clamp(state.player.y, 38, 83);
  state.player.x = clamp(state.player.x, 12, 88);
  if (state.player.x <= 12 || state.player.x >= 88) state.velocity.x *= -0.15;
  if (state.player.y <= 38 || state.player.y >= 83) state.velocity.y *= -0.15;
  state.goalieX += (state.player.x + Math.sin(Date.now() / 340) * 7 - state.goalieX) * 0.08;
  if (state.puck) {
    state.puck.y -= state.puck.speed * dt * 0.55;
    if (state.puck.y <= net.line) {
      const onNet = state.puck.x >= net.left && state.puck.x <= net.right;
      const blocked = Math.abs(state.puck.x - state.goalieX) < 12.5;
      state.puck = null;
      endShot(onNet && !blocked ? "goal" : onNet ? "save" : "miss");
    }
  }
  update();
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

renderPlayerSelect();
playerSelect?.addEventListener("change", () => pickPlayer());
pickPlayer();
renderLeaderboard();
showStartPanel("Choose a skater, then start the breakaway. The ledger will only credit the player you selected.");
update();
