(() => {
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const ui = {
  score: document.getElementById("scoreValue"), territory: document.getElementById("territoryValue"), kills: document.getElementById("killsValue"), status: document.getElementById("statusValue"), leaderboard: document.getElementById("leaderboardList"), survival: document.getElementById("survivalValue"), speed: document.getElementById("speedValue"), shield: document.getElementById("shieldValue"), theme: document.getElementById("themeValue"), menu: document.getElementById("menuOverlay"), message: document.getElementById("messageOverlay"), messageEyebrow: document.getElementById("messageEyebrow"), messageTitle: document.getElementById("messageTitle"), messageBody: document.getElementById("messageBody"), play: document.getElementById("playButton"), respawn: document.getElementById("respawnButton"), restart: document.getElementById("restartButton"), pause: document.getElementById("pauseButton"), characterGrid: document.getElementById("characterGrid"), characterSummary: document.getElementById("characterSummary")
};
const cfg = { w: 180, h: 180, cell: 24, speed: 7.2, boost: 11.6, bots: 8, respawn: 3.5, powerEvery: 9, powerLife: 15, maxPower: 4 };
const themes = ["Neon Grid", "Solar Fade", "Aqua Field"];
const colors = ["#4df2c2", "#ffb84d", "#ff667d", "#8c7bff", "#f46cff", "#ffe066", "#4db8ff", "#7efc5a", "#ff885a"];
const profiles = [
  { name: "Nova", aggro: .78, caution: .52, expand: .84, react: .94 },
  { name: "Ember", aggro: .88, caution: .42, expand: .68, react: .82 },
  { name: "Glint", aggro: .51, caution: .76, expand: .73, react: .88 },
  { name: "Rift", aggro: .66, caution: .47, expand: .89, react: .92 },
  { name: "Moss", aggro: .32, caution: .82, expand: .58, react: .66 },
  { name: "Vex", aggro: .95, caution: .30, expand: .77, react: .95 },
  { name: "Quartz", aggro: .45, caution: .86, expand: .62, react: .72 },
  { name: "Pulse", aggro: .72, caution: .58, expand: .90, react: .85 }
];
const characters = [
  { id: "volt", name: "Volt", color: "#4df2c2", shape: "square", blurb: "Balanced runner with a clean square trail.", ability: "Boost pickups last longer and your base speed is slightly higher." },
  { id: "nova", name: "Nova", color: "#ff7f6b", shape: "diamond", blurb: "Sharp diamond frame that stands out in crowded fights.", ability: "Closed loops grab a little extra land around the captured zone." },
  { id: "glacier", name: "Glacier", color: "#6cc7ff", shape: "circle", blurb: "Round core and cool palette for easy tracking.", ability: "Shields last longer and respawns begin with a brief shield." },
  { id: "shade", name: "Shade", color: "#d67cff", shape: "triangle", blurb: "Angular wedge for aggressive-looking runs.", ability: "Moves faster while outside owned land, ideal for risky trail cuts." }
];
const world = { cells: [] };
const state = { phase: "menu", paused: false, entities: [], player: null, powerUps: [], camera: { x: 0, y: 0 }, input: { up: false, down: false, left: false, right: false }, match: 0, nextPower: 4, theme: 0, kills: 0, flash: 0, noticeAt: 0, character: characters[0] };
const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const spawns = [{ x: 12, y: 12, w: 10, h: 10 }, { x: 150, y: 12, w: 10, h: 10 }, { x: 12, y: 150, w: 10, h: 10 }, { x: 150, y: 150, w: 10, h: 10 }, { x: 84, y: 14, w: 10, h: 10 }, { x: 84, y: 150, w: 10, h: 10 }, { x: 14, y: 84, w: 10, h: 10 }, { x: 150, y: 84, w: 10, h: 10 }, { x: 84, y: 84, w: 10, h: 10 }];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const idx = (x, y) => y * cfg.w + x;
const inBounds = (x, y) => x >= 0 && y >= 0 && x < cfg.w && y < cfg.h;
const ownerAt = (x, y) => inBounds(x, y) ? world.cells[idx(x, y)] : -1;
const setOwner = (x, y, id) => { if (inBounds(x, y)) world.cells[idx(x, y)] = id; };
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const distSq = (a, b) => { const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy; };
const dirPick = () => ({ ...dirs[rand(0, dirs.length - 1)] });
const parseCell = (key) => { const [x, y] = key.split(",").map(Number); return { x, y }; };
const trailHas = (trail, x, y) => trail.indexOf(`${x},${y}`) !== -1;
const dirAngle = (dir) => dir.x === 1 ? 0 : dir.x === -1 ? Math.PI : dir.y === 1 ? Math.PI / 2 : -Math.PI / 2;
const lerpAngle = (a, b, t) => { const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + diff * t; };
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function show(el) { el.classList.remove("hidden"); el.classList.add("visible"); }
function hide(el) { el.classList.remove("visible"); el.classList.add("hidden"); }
function createEntity(id, name, color, rect, profile, isPlayer, shape, abilityId) {
  return { id, name, color, rect, profile, isPlayer: !!isPlayer, shape: shape || "square", abilityId: abilityId || null, alive: true, x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, dir: dirPick(), nextDir: dirPick(), facing: { x: 1, y: 0 }, renderAngle: 0, trail: [], outside: false, respawn: 0, shield: 0, speedBoost: 0, think: 0, territory: 0, kills: 0, score: 0, baseSpeed: cfg.speed, outsideBoost: 0, boostBonus: 0, captureBurst: 0 };
}
function applyCharacterStats(entity, character) {
  entity.abilityId = character.id;
  entity.baseSpeed = cfg.speed + (character.id === "volt" ? 0.35 : 0);
  entity.outsideBoost = character.id === "shade" ? 1.2 : 0;
  entity.boostBonus = character.id === "volt" ? 1.8 : 0;
  entity.captureBurst = character.id === "nova" ? 1 : 0;
  if (character.id === "glacier") entity.shield = Math.max(entity.shield, 1.8);
}
function seedRect(entity) { for (let y = entity.rect.y; y < entity.rect.y + entity.rect.h; y++) for (let x = entity.rect.x; x < entity.rect.x + entity.rect.w; x++) setOwner(x, y, entity.id); }
function emptyWorld() { world.cells = new Array(cfg.w * cfg.h).fill(0); }
function computeStats() {
  const map = new Map();
  state.entities.forEach((e) => { e.territory = 0; map.set(e.id, e); });
  world.cells.forEach((id) => { const e = map.get(id); if (e) e.territory++; });
  state.entities.forEach((e) => { e.score = e.territory * 10 + e.kills * 150; });
}
function updateHud() {
  const total = cfg.w * cfg.h, p = state.player, pct = p ? (p.territory / total) * 100 : 0;
  ui.score.textContent = String(Math.round(p ? p.score : 0));
  ui.territory.textContent = `${pct.toFixed(2)}%`;
  ui.kills.textContent = String(state.kills);
  ui.survival.textContent = `${Math.floor(state.match)}s`;
  ui.speed.textContent = p && p.speedBoost > 0 ? `${p.speedBoost.toFixed(1)}s` : "Ready";
  ui.shield.textContent = p && p.shield > 0 ? `${p.shield.toFixed(1)}s` : "Offline";
  const sorted = state.entities.slice().sort((a, b) => b.territory - a.territory);
  ui.leaderboard.innerHTML = "";
  sorted.forEach((e) => { const li = document.createElement("li"); li.style.color = e.color; li.textContent = `${e.name}: ${((e.territory / total) * 100).toFixed(1)}%${e.alive ? "" : " (respawning)"}`; ui.leaderboard.appendChild(li); });
  if (state.phase === "playing" && sorted[0] && p && sorted[0].id === p.id && pct > 18 && performance.now() > state.noticeAt) {
    popup("Top Of The Grid", "You are leading the match. Hold the crown and keep expanding.", false);
    state.noticeAt = performance.now() + 10000;
    setTimeout(() => { if (state.phase === "playing") hide(ui.message); }, 1300);
  }
}
function renderCharacterMenu() {
  ui.characterGrid.innerHTML = "";
  characters.forEach((character) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `character-card${state.character.id === character.id ? " active" : ""}`;
    card.innerHTML = `<div class="character-chip ${character.shape}" style="background:${character.color}"></div><h3>${character.name}</h3><p>${character.blurb}</p>`;
    card.addEventListener("click", () => { state.character = character; renderCharacterMenu(); updateCharacterSummary(); });
    ui.characterGrid.appendChild(card);
  });
}
function updateCharacterSummary() { ui.characterSummary.textContent = `${state.character.name} selected. ${state.character.ability}`; }
function resetMatch() {
  emptyWorld(); state.entities = []; state.powerUps = []; state.match = 0; state.nextPower = 4; state.kills = 0; state.flash = 0; state.noticeAt = 0; state.theme = (state.theme + 1) % themes.length; ui.theme.textContent = themes[state.theme];
  const player = createEntity(1, state.character.name, state.character.color, spawns[0], null, true, state.character.shape, state.character.id); player.dir = { x: 1, y: 0 }; player.nextDir = { x: 1, y: 0 }; player.facing = { x: 1, y: 0 }; applyCharacterStats(player, state.character); state.player = player; state.entities.push(player); seedRect(player);
  for (let i = 0; i < cfg.bots; i++) { const bot = createEntity(i + 2, profiles[i].name, colors[i + 1], spawns[i + 1], profiles[i], false, "square", null); state.entities.push(bot); seedRect(bot); }
  computeStats(); updateHud();
}
function start() { resetMatch(); state.phase = "playing"; state.paused = false; ui.status.textContent = "Live"; hide(ui.menu); hide(ui.message); }
function popup(title, body, respawn) { ui.messageEyebrow.textContent = title === "Game Over" ? "Eliminated" : "Alert"; ui.messageTitle.textContent = title; ui.messageBody.textContent = body; ui.respawn.style.display = respawn ? "inline-flex" : "none"; show(ui.message); }
function distanceToHome(x, y, id) {
  let best = 99;
  for (let yy = clamp(y - 8, 0, cfg.h - 1); yy <= clamp(y + 8, 0, cfg.h - 1); yy++) for (let xx = clamp(x - 8, 0, cfg.w - 1); xx <= clamp(x + 8, 0, cfg.w - 1); xx++) if (ownerAt(xx, yy) === id) best = Math.min(best, Math.abs(xx - x) + Math.abs(yy - y));
  return best;
}
function trailThreat(pos, trail) { for (const key of trail) { const c = parseCell(key); if (Math.abs(c.x - pos.x) + Math.abs(c.y - pos.y) <= 2) return true; } return false; }
function choosePlayerDir() {
  const h = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0), v = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);
  if (Math.abs(h) > Math.abs(v)) return h ? { x: Math.sign(h), y: 0 } : null;
  return v ? { x: 0, y: Math.sign(v) } : null;
}
function chooseBotDir(bot) {
  const opts = dirs.filter((d) => !(d.x === -bot.dir.x && d.y === -bot.dir.y));
  let best = bot.dir, bestScore = -999;
  for (const d of opts) {
    const tx = clamp(Math.floor(bot.x) + d.x * 4, 1, cfg.w - 2), ty = clamp(Math.floor(bot.y) + d.y * 4, 1, cfg.h - 2); let score = Math.random() * .25; const owner = ownerAt(tx, ty);
    score += owner === bot.id ? (bot.outside ? .3 : bot.profile.caution) : bot.profile.expand;
    if (tx <= 2 || ty <= 2 || tx >= cfg.w - 3 || ty >= cfg.h - 3) score -= 1.2;
    if (state.player.alive) {
      const probe = { x: bot.x + d.x * 6, y: bot.y + d.y * 6 };
      score += clamp((80 - Math.sqrt(distSq(probe, state.player))) / 80, -.4, .9) * bot.profile.aggro;
      if (state.player.outside && trailThreat(probe, state.player.trail)) score += 1.6 * bot.profile.aggro;
    }
    for (const other of state.entities) if (other.alive && other.id !== bot.id && other.outside && trailThreat({ x: tx, y: ty }, other.trail)) score += 1.35 * bot.profile.aggro;
    if (bot.outside) score -= distanceToHome(tx, ty, bot.id) * bot.profile.caution * .05; else if (owner !== bot.id && Math.random() < bot.profile.expand) score += .45;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return { ...best };
}
function moveEntity(e, dt) {
  const outsideSpeed = e.outside ? e.outsideBoost : 0;
  const speed = (e.speedBoost > 0 ? cfg.boost : e.baseSpeed) + outsideSpeed;
  e.x = clamp(e.x + e.dir.x * speed * dt, 1, cfg.w - 2);
  e.y = clamp(e.y + e.dir.y * speed * dt, 1, cfg.h - 2);
  if (e.dir.x || e.dir.y) e.facing = { x: e.dir.x, y: e.dir.y };
  e.renderAngle = lerpAngle(e.renderAngle, dirAngle(e.facing), clamp(dt * 12, 0, 1));
  const x = Math.floor(e.x), y = Math.floor(e.y), own = ownerAt(x, y) === e.id;
  if (own) { if (e.outside && e.trail.length >= 3) closeLoop(e); e.outside = false; }
  else { e.outside = true; const key = `${x},${y}`; if (e.trail[e.trail.length - 1] !== key) e.trail.push(key); }
}
function addCaptureBurst(e, minX, maxX, minY, maxY) {
  if (!e.captureBurst) return;
  for (let y = clamp(minY - 1, 0, cfg.h - 1); y <= clamp(maxY + 1, 0, cfg.h - 1); y++) {
    for (let x = clamp(minX - 1, 0, cfg.w - 1); x <= clamp(maxX + 1, 0, cfg.w - 1); x++) {
      if (ownerAt(x, y) === e.id) continue;
      if (ownerAt(x + 1, y) === e.id || ownerAt(x - 1, y) === e.id || ownerAt(x, y + 1) === e.id || ownerAt(x, y - 1) === e.id) setOwner(x, y, e.id);
    }
  }
}
function closeLoop(e) {
  const pts = e.trail.map(parseCell);
  if (pts.length < 3) { e.trail = []; e.outside = false; return; }
  pts.forEach((p) => setOwner(p.x, p.y, e.id));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = clamp(Math.min(...xs) - 1, 0, cfg.w - 1), maxX = clamp(Math.max(...xs) + 1, 0, cfg.w - 1), minY = clamp(Math.min(...ys) - 1, 0, cfg.h - 1), maxY = clamp(Math.max(...ys) + 1, 0, cfg.h - 1);
  const trailWalls = new Set(pts.map((p) => `${p.x},${p.y}`));
  const seen = new Set();
  const q = [];
  const isWall = (x, y) => trailWalls.has(`${x},${y}`) || ownerAt(x, y) === e.id;
  for (let x = minX; x <= maxX; x++) { q.push({ x, y: minY }); q.push({ x, y: maxY }); }
  for (let y = minY; y <= maxY; y++) { q.push({ x: minX, y }); q.push({ x: maxX, y }); }
  while (q.length) {
    const c = q.shift(), key = `${c.x},${c.y}`;
    if (!inBounds(c.x, c.y) || c.x < minX || c.x > maxX || c.y < minY || c.y > maxY || seen.has(key) || isWall(c.x, c.y)) continue;
    seen.add(key);
    q.push({ x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 });
  }
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (!isWall(x, y) && !seen.has(`${x},${y}`)) setOwner(x, y, e.id);
  addCaptureBurst(e, minX, maxX, minY, maxY);
  e.trail = []; e.outside = false; computeStats();
}
function kill(target, attacker) {
  if (!target.alive) return;
  target.alive = false; target.outside = false; target.respawn = cfg.respawn; target.x = -100; target.y = -100; target.trail = [];
  if (attacker) { attacker.kills++; if (attacker.isPlayer) { state.kills++; state.flash = 1; } }
  if (target.isPlayer) { state.phase = "dead"; ui.status.textContent = "Down"; popup("Game Over", "A rival cut your trail while you were exposed. Respawn or restart the match.", true); }
  computeStats(); updateHud();
}
function respawn(e) {
  e.alive = true; e.outside = false; e.trail = []; e.shield = 0; e.speedBoost = 0; e.x = e.rect.x + e.rect.w / 2; e.y = e.rect.y + e.rect.h / 2; e.dir = dirPick(); e.nextDir = { ...e.dir }; e.facing = { ...e.dir }; if (e.isPlayer) applyCharacterStats(e, state.character); seedRect(e); computeStats();
}
function spawnPower() {
  if (state.powerUps.length >= cfg.maxPower) return;
  const kind = Math.random() > .5 ? "boost" : "shield";
  for (let i = 0; i < 20; i++) { const x = rand(8, cfg.w - 8), y = rand(8, cfg.h - 8); if (ownerAt(x, y) === 0) { state.powerUps.push({ kind, x: x + .5, y: y + .5, ttl: cfg.powerLife }); break; } }
}
function tickPower(dt) {
  state.powerUps.forEach((p) => p.ttl -= dt);
  state.powerUps = state.powerUps.filter((p) => p.ttl > 0);
  if (state.match >= state.nextPower) { spawnPower(); state.nextPower = state.match + cfg.powerEvery; }
  for (const e of state.entities) {
    if (!e.alive) continue;
    if (e.speedBoost > 0) e.speedBoost -= dt;
    if (e.shield > 0) e.shield -= dt;
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
      if (distSq(e, state.powerUps[i]) < 1.3) {
        if (state.powerUps[i].kind === "boost") e.speedBoost = 4.5 + e.boostBonus;
        else e.shield = e.abilityId === "glacier" ? 7 : 5.5;
        state.powerUps.splice(i, 1);
      }
    }
  }
}
function stepEntities(dt) {
  for (const e of state.entities) {
    if (!e.alive) continue;
    if (e.isPlayer) { const wanted = choosePlayerDir(); if (wanted) e.nextDir = wanted; }
    else { e.think -= dt; if (e.think <= 0) { e.think = lerp(.12, .45, Math.random() * (1 - e.profile.react)); e.nextDir = chooseBotDir(e); } }
    if (e.nextDir.x !== -e.dir.x || e.nextDir.y !== -e.dir.y || !e.outside) e.dir = e.nextDir;
    moveEntity(e, dt);
  }
}
function checkHits() {
  for (const e of state.entities) {
    if (!e.alive) continue;
    const x = Math.floor(e.x), y = Math.floor(e.y);
    if (x <= 0 || y <= 0 || x >= cfg.w - 1 || y >= cfg.h - 1) e.nextDir = dirPick();
    for (const other of state.entities) if (other.alive && other.id !== e.id && other.outside && trailHas(other.trail, x, y) && other.shield <= 0) kill(other, e);
  }
}
function stepRespawns(dt) {
  for (const e of state.entities) {
    if (e.alive) continue;
    e.respawn -= dt;
    if (e.respawn <= 0) { respawn(e); if (e.isPlayer) { state.phase = "playing"; hide(ui.message); ui.status.textContent = "Live"; } }
  }
}
function tick(dt) {
  if ((state.phase !== "playing" && state.phase !== "dead") || state.paused) return;
  if (state.phase === "playing") state.match += dt;
  if (state.flash > 0) state.flash -= dt;
  tickPower(dt); stepEntities(dt); checkHits(); stepRespawns(dt); computeStats(); updateHud();
  const focus = state.player && state.player.alive ? state.player : { x: cfg.w / 2, y: cfg.h / 2 };
  const tx = focus.x * cfg.cell - window.innerWidth / 2, ty = focus.y * cfg.cell - window.innerHeight / 2;
  state.camera.x = lerp(state.camera.x, clamp(tx, 0, Math.max(0, cfg.w * cfg.cell - window.innerWidth)), clamp(dt * 4, 0, 1));
  state.camera.y = lerp(state.camera.y, clamp(ty, 0, Math.max(0, cfg.h * cfg.cell - window.innerHeight)), clamp(dt * 4, 0, 1));
}
function drawBg(w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h), sets = [["#07101e", "#16335b"], ["#171211", "#4f2f1a"], ["#08191b", "#15595a"]];
  g.addColorStop(0, sets[state.theme][0]); g.addColorStop(1, sets[state.theme][1]); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function drawWorld() {
  const sx = Math.floor(state.camera.x / cfg.cell), sy = Math.floor(state.camera.y / cfg.cell), ex = clamp(sx + Math.ceil(window.innerWidth / cfg.cell) + 2, 0, cfg.w), ey = clamp(sy + Math.ceil(window.innerHeight / cfg.cell) + 2, 0, cfg.h);
  for (let y = sy; y < ey; y++) for (let x = sx; x < ex; x++) {
    let fill = "rgba(255,255,255,0.04)"; const id = ownerAt(x, y); if (id > 0) { const e = state.entities.find((n) => n.id === id); if (e) fill = `${e.color}33`; }
    const px = x * cfg.cell, py = y * cfg.cell; ctx.fillStyle = fill; ctx.fillRect(px, py, cfg.cell, cfg.cell); ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.strokeRect(px, py, cfg.cell, cfg.cell);
  }
}
function drawTrails() {
  for (const e of state.entities) {
    if (!e.alive || !e.trail.length) continue; ctx.fillStyle = e.shield > 0 ? "#ffffff" : e.color;
    e.trail.forEach((key) => { const c = parseCell(key), px = c.x * cfg.cell + cfg.cell * .12, py = c.y * cfg.cell + cfg.cell * .12, size = cfg.cell * .76; ctx.fillRect(px, py, size, size); });
  }
}
function drawPowerUps() {
  for (const p of state.powerUps) {
    const px = p.x * cfg.cell, py = p.y * cfg.cell; ctx.save(); ctx.translate(px, py); ctx.rotate(performance.now() / 500); ctx.fillStyle = p.kind === "boost" ? "#ffe066" : "#9ff5ff"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20; ctx.fillRect(-8, -8, 16, 16); ctx.restore();
  }
}
function drawShape(e, px, py, size) {
  const bob = Math.sin(performance.now() / 90 + px * .01 + py * .01) * (e.outside ? 1.4 : .6);
  ctx.save();
  ctx.translate(px, py + bob);
  ctx.rotate(e.renderAngle);
  ctx.beginPath();
  if (e.shape === "circle") ctx.arc(0, 0, size * .48, 0, Math.PI * 2);
  else if (e.shape === "diamond") { ctx.moveTo(0, -size * .62); ctx.lineTo(size * .58, 0); ctx.lineTo(0, size * .62); ctx.lineTo(-size * .58, 0); ctx.closePath(); }
  else if (e.shape === "triangle") { ctx.moveTo(size * .62, 0); ctx.lineTo(-size * .5, -size * .52); ctx.lineTo(-size * .5, size * .52); ctx.closePath(); }
  else ctx.rect(-size / 2, -size / 2, size, size);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  if (e.shape === "circle") ctx.beginPath(), ctx.arc(size * .18, 0, size * .14, 0, Math.PI * 2), ctx.fill();
  else ctx.fillRect(size * .08, -size * .12, size * .28, size * .24);
  ctx.restore();
}
function drawEntities() {
  for (const e of state.entities) {
    if (!e.alive) continue; const px = e.x * cfg.cell, py = e.y * cfg.cell, size = cfg.cell * .7;
    ctx.fillStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = e.isPlayer || state.flash > 0 ? 22 : 10; drawShape(e, px, py, size); ctx.shadowBlur = 0;
    if (e.shield > 0) { ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, cfg.cell * .52, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "#ffffff"; ctx.font = "12px Space Grotesk"; ctx.textAlign = "center"; ctx.fillText(e.name, px, py - cfg.cell * .95);
  }
}
function drawCenter(text) { ctx.fillStyle = "rgba(4,8,18,0.48)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight); ctx.fillStyle = "#eff6ff"; ctx.font = "700 42px Space Grotesk"; ctx.textAlign = "center"; ctx.fillText(text, window.innerWidth / 2, window.innerHeight / 2); }
function render() {
  const w = window.innerWidth, h = window.innerHeight; ctx.clearRect(0, 0, w, h); drawBg(w, h); ctx.save(); ctx.translate(-state.camera.x, -state.camera.y); drawWorld(); drawPowerUps(); drawTrails(); drawEntities(); ctx.restore(); if (state.paused && state.phase !== "menu") drawCenter("Paused");
}
function loop(ts) { if (!loop.last) loop.last = ts; const dt = clamp((ts - loop.last) / 1000, 0, .033); loop.last = ts; tick(dt); render(); requestAnimationFrame(loop); }
function togglePause() { if (state.phase === "menu") return; state.paused = !state.paused; ui.status.textContent = state.paused ? "Paused" : state.phase === "dead" ? "Down" : "Live"; }
window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); if (k === "arrowup" || k === "w") state.input.up = true; if (k === "arrowdown" || k === "s") state.input.down = true; if (k === "arrowleft" || k === "a") state.input.left = true; if (k === "arrowright" || k === "d") state.input.right = true; if (k === "p" || k === "escape") togglePause(); });
window.addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if (k === "arrowup" || k === "w") state.input.up = false; if (k === "arrowdown" || k === "s") state.input.down = false; if (k === "arrowleft" || k === "a") state.input.left = false; if (k === "arrowright" || k === "d") state.input.right = false; });
ui.play.addEventListener("click", start);
ui.respawn.addEventListener("click", () => { if (state.player && !state.player.alive) state.player.respawn = 0; });
ui.restart.addEventListener("click", start);
ui.pause.addEventListener("click", togglePause);
resize(); emptyWorld(); renderCharacterMenu(); updateCharacterSummary(); updateHud(); requestAnimationFrame(loop);
})();
