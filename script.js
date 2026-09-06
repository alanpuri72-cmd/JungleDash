const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');
const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const endTitle = document.getElementById('endTitle');
const endEyebrow = document.getElementById('endEyebrow');
const endMessage = document.getElementById('endMessage');
const finalScore = document.getElementById('finalScore');

const world = { width: 3400, height: 540, gravity: 0.68, ground: 468 };
const keys = {};
let state = 'ready';
let lastTime = 0;
let elapsed = 0;
let remainingTime = 60;
let cameraX = 0;
let score = 0;
let lives = 3;
let jumpWasPressed = false;

const platforms = [
  { x: 0, y: 468, w: 580, h: 72 }, { x: 680, y: 468, w: 470, h: 72 },
  { x: 1250, y: 468, w: 590, h: 72 }, { x: 1930, y: 468, w: 430, h: 72 },
  { x: 2450, y: 468, w: 950, h: 72 },
  { x: 330, y: 375, w: 170, h: 18 }, { x: 785, y: 350, w: 175, h: 18 },
  { x: 1030, y: 400, w: 120, h: 18 }, { x: 1360, y: 360, w: 210, h: 18 },
  { x: 1650, y: 300, w: 160, h: 18 }, { x: 2020, y: 375, w: 160, h: 18 },
  { x: 2240, y: 310, w: 140, h: 18 }, { x: 2660, y: 365, w: 170, h: 18 },
  { x: 2960, y: 285, w: 180, h: 18 }
];
const coinSpots = [[230, 420], [380, 330], [470, 330], [750, 420], [830, 305], [1050, 355], [1180, 420], [1400, 315], [1510, 315], [1680, 255], [2050, 330], [2270, 265], [2580, 420], [2700, 320], [2870, 420], [3010, 235], [3160, 420]];
const enemies = [
  { x: 475, y: 428, w: 34, h: 40, min: 390, max: 545, speed: 0.8, alive: true },
  { x: 890, y: 310, w: 34, h: 40, min: 785, max: 925, speed: 0.7, alive: true },
  { x: 1460, y: 428, w: 34, h: 40, min: 1300, max: 1740, speed: 1, alive: true },
  { x: 2140, y: 335, w: 34, h: 40, min: 2020, max: 2145, speed: 0.8, alive: true },
  { x: 2800, y: 428, w: 34, h: 40, min: 2500, max: 3000, speed: 1.2, alive: true }
];
const player = { x: 90, y: 390, w: 30, h: 48, vx: 0, vy: 0, speed: 3.8, jump: -12, grounded: false, invulnerable: 0 };
let coins = [];

function resetGame() {
  player.x = 90; player.y = 390; player.vx = 0; player.vy = 0; player.invulnerable = 0;
  coins = coinSpots.map(([x, y]) => ({ x, y, collected: false, phase: Math.random() * 7 }));
  enemies.forEach((enemy) => { enemy.alive = true; enemy.x = enemy.min; });
  score = 0; lives = 3; remainingTime = 60; cameraX = 0; elapsed = 0;
  updateHud();
}

function startGame() { resetGame(); state = 'playing'; startScreen.classList.add('hidden'); endScreen.classList.add('hidden'); }
function endGame(won) {
  state = won ? 'won' : 'lost';
  finalScore.textContent = String(score).padStart(4, '0');
  endEyebrow.textContent = won ? 'EXPEDITION COMPLETE' : 'EXPEDITION ENDED';
  endTitle.textContent = won ? 'You made it!' : 'The jungle wins';
  endMessage.textContent = won ? 'The ancient gate opens. Your haul is impressive.' : 'The trail is still out there. Take another run at it.';
  endScreen.classList.remove('hidden');
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(4, '0');
  livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives);
  timerEl.textContent = Math.max(0, Math.ceil(remainingTime));
}

function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function update(delta) {
  if (state !== 'playing') return;
  elapsed += delta;
  remainingTime -= delta / 1000;
  if (remainingTime <= 0) { remainingTime = 0; updateHud(); endGame(false); return; }
  const left = keys.ArrowLeft || keys.a;
  const right = keys.ArrowRight || keys.d;
  player.vx = (right ? player.speed : 0) - (left ? player.speed : 0);
  if ((keys.Space || keys.ArrowUp || keys.w) && !jumpWasPressed && player.grounded) { player.vy = player.jump; player.grounded = false; }
  jumpWasPressed = Boolean(keys.Space || keys.ArrowUp || keys.w);
  player.vy += world.gravity;
  player.x += player.vx;
  player.x = Math.max(0, Math.min(world.width - player.w, player.x));
  const oldBottom = player.y + player.h;
  player.y += player.vy;
  player.grounded = false;
  for (const platform of platforms) {
    if (player.x + player.w > platform.x && player.x < platform.x + platform.w && oldBottom <= platform.y && player.y + player.h >= platform.y && player.vy >= 0) {
      player.y = platform.y - player.h; player.vy = 0; player.grounded = true;
    }
  }
  if (player.y > world.height + 50) loseLife();
  if (player.invulnerable > 0) player.invulnerable -= delta;
  for (const coin of coins) {
    if (!coin.collected && overlaps(player, { x: coin.x - 12, y: coin.y - 12, w: 24, h: 24 })) { coin.collected = true; score += 100; }
  }
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.speed;
    if (enemy.x > enemy.max || enemy.x < enemy.min) enemy.speed *= -1;
    if (overlaps(player, enemy)) {
      if (player.vy > 1 && player.y + player.h - enemy.y < 20) { enemy.alive = false; player.vy = -8; score += 250; }
      else if (player.invulnerable <= 0) loseLife();
    }
  }
  if (player.x > 3220) { score += Math.ceil(remainingTime) * 10; updateHud(); endGame(true); return; }
  cameraX += (player.x - cameraX - 300) * 0.08;
  cameraX = Math.max(0, Math.min(world.width - canvas.width, cameraX));
  updateHud();
}

function loseLife() {
  lives -= 1;
  if (lives <= 0) { updateHud(); endGame(false); return; }
  player.x = Math.max(40, player.x - 110); player.y = 330; player.vy = 0; player.invulnerable = 1600;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  ctx.save(); ctx.translate(-cameraX, 0);
  platforms.forEach(drawPlatform);
  coins.forEach(drawCoin);
  enemies.forEach(drawEnemy);
  drawGate(); drawPlayer();
  ctx.restore();
  if (state === 'playing') drawProgress();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height); sky.addColorStop(0, '#206761'); sky.addColorStop(1, '#8dbb78'); ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(244, 238, 223, .2)'; ctx.beginPath(); ctx.arc(790, 100, 50, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#377764';
  for (let x = -100 - (cameraX * .18 % 240); x < canvas.width + 300; x += 190) { ctx.beginPath(); ctx.moveTo(x, 450); ctx.lineTo(x + 90, 160); ctx.lineTo(x + 180, 450); ctx.fill(); }
  ctx.fillStyle = '#285d51';
  for (let x = -100 - (cameraX * .35 % 170); x < canvas.width + 200; x += 145) { ctx.beginPath(); ctx.moveTo(x, 468); ctx.lineTo(x + 70, 230); ctx.lineTo(x + 145, 468); ctx.fill(); }
  ctx.fillStyle = 'rgba(232, 240, 111, .42)'; ctx.fillRect(0, 120, canvas.width, 2);
}

function drawPlatform(platform) {
  ctx.fillStyle = '#a96743'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  ctx.fillStyle = '#d2c66e'; ctx.fillRect(platform.x, platform.y, platform.w, 8);
  ctx.fillStyle = 'rgba(74, 41, 35, .28)';
  for (let x = platform.x + 16; x < platform.x + platform.w; x += 34) ctx.fillRect(x, platform.y + 20, 4, Math.max(10, platform.h - 28));
}

function drawCoin(coin) {
  if (coin.collected) return;
  const bob = Math.sin(elapsed / 200 + coin.phase) * 4;
  ctx.fillStyle = '#e8f06f'; ctx.beginPath(); ctx.arc(coin.x, coin.y + bob, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#75843b'; ctx.fillRect(coin.x - 2, coin.y - 6 + bob, 4, 12);
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  ctx.fillStyle = '#e15c4d'; ctx.beginPath(); ctx.roundRect(enemy.x, enemy.y, enemy.w, enemy.h, 10); ctx.fill();
  ctx.fillStyle = '#f4eedf'; ctx.fillRect(enemy.x + 7, enemy.y + 10, 7, 8); ctx.fillRect(enemy.x + 20, enemy.y + 10, 7, 8);
  ctx.fillStyle = '#17352f'; ctx.fillRect(enemy.x + 10, enemy.y + 13, 4, 5); ctx.fillRect(enemy.x + 23, enemy.y + 13, 4, 5);
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 100) % 2 === 0) return;
  ctx.fillStyle = '#17352f'; ctx.fillRect(player.x + 3, player.y + 12, player.w - 6, player.h - 12);
  ctx.fillStyle = '#e8f06f'; ctx.beginPath(); ctx.arc(player.x + 15, player.y + 12, 14, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#f4eedf'; ctx.fillRect(player.x + 8, player.y + 17, 5, 6); ctx.fillRect(player.x + 19, player.y + 17, 5, 6);
  ctx.fillStyle = '#f26f52'; ctx.fillRect(player.x, player.y + 38, 12, 10); ctx.fillRect(player.x + 19, player.y + 38, 12, 10);
}

function drawGate() {
  ctx.fillStyle = '#e8f06f'; ctx.fillRect(3260, 265, 12, 203); ctx.fillRect(3370, 265, 12, 203); ctx.fillRect(3260, 245, 122, 20);
  ctx.fillStyle = '#f26f52'; ctx.beginPath(); ctx.moveTo(3272, 270); ctx.lineTo(3332, 290); ctx.lineTo(3272, 310); ctx.fill();
  ctx.fillStyle = '#17352f'; ctx.font = '11px DM Mono'; ctx.fillText('EXIT', 3290, 232);
}

function drawProgress() { ctx.fillStyle = 'rgba(23, 53, 47, .45)'; ctx.fillRect(20, 20, 180, 5); ctx.fillStyle = '#e8f06f'; ctx.fillRect(20, 20, 180 * Math.min(1, player.x / 3260), 5); }

function loop(timestamp) { const delta = Math.min(32, timestamp - lastTime || 16); lastTime = timestamp; update(delta); draw(); requestAnimationFrame(loop); }

window.addEventListener('keydown', (event) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault(); keys[event.key] = true; keys[event.code] = true; });
window.addEventListener('keyup', (event) => { keys[event.key] = false; keys[event.code] = false; });
document.getElementById('playButton').addEventListener('click', startGame);
document.getElementById('replayButton').addEventListener('click', startGame);
resetGame(); requestAnimationFrame(loop);