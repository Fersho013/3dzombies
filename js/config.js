// ===== ESTADO GLOBAL (config.js) =====
var gameSpeed = 0, gameStarted = false, isWaveActive = false, currentWave = 1;
var waveTimer = 180, prepTimeDefault = 180, zombieMult = 1;
var cameraMode = 'orbit', gameMode = 'spectator', customBaseMode = 'spectator';
var viewMode = 'fps', uiMode = 'pc', playerIndex = -1;
var scene, camera, renderer, controls, clock;
var FIXED_STEP = 1 / 60;
var CART_DISABLED = true;
var survivors = [], zombies = [], crates = [], barricades = [], projectiles = [];
var towers = [], turretPosts = [], traps = [], walls = [], dummies = [], loots = [], outposts = [];
var airUnits = [], missiles = [], grenades = [], healFXs = [];
var playerInput = { f: false, b: false, l: false, r: false, sprint: false, fire: false, ads: false };
var selectedSurvivor = null;
var airCooldowns = { missile: 0, supply: 0, material: 0, heal: 0, wall: 0 };
var cameraTargets = { orbit: true, followIdx: 0, baseIdx: 0 };
var baseResources = { scrap: 0, ammo: 30, med: 3, food: 5, heavy: 0, armor: 0 };
var tank = { pieces: 0, assembled: false, mesh: null, hp: 10000, maxHp: 10000, armor: 0, crew: [], yard: null };
var STATS = { kills: 0, built: 0, cratesPicked: 0 };
var ZONES = {
  MALL:    { name: 'MALL',    pos: [0, 0, 0],      color: 0x38bdf8, active: false, hp: 6000, maxHp: 6000, depot: null, turret: null, house: null },
  HOUSES:  { name: 'HOUSES',  pos: [-62, 0, 28],   color: 0xf59e0b, active: false, hp: 6000, maxHp: 6000, depot: null, turret: null, house: null },
  PARK:    { name: 'PARK',    pos: [58, 0, 42],    color: 0x10b981, active: false, hp: 6000, maxHp: 6000, depot: null, turret: null, house: null },
  PARKING: { name: 'PARKING', pos: [10, 0, -62],   color: 0xa78bfa, active: false, hp: 6000, maxHp: 6000, depot: null, turret: null, house: null }
};
var activeShelterKeys = [];
var WEAPONS = {
  pistol:  { name: 'Pistola 9mm',    dmg: [12, 22], range: 18, cd: 0.38, color: 0x94a3b8, len: 0.35 },
  rifle:   { name: 'Rifle de asalto',dmg: [22, 38], range: 26, cd: 0.20, color: 0x22c55e, len: 0.7 },
  shotgun: { name: 'Escopeta',       dmg: [16, 26], range: 13, cd: 0.95, color: 0xf59e0b, len: 0.65, pellets: 5 },
  sniper:  { name: 'Precisión',      dmg: [70, 110],range: 42, cd: 1.40, color: 0x38bdf8, len: 0.9 },
  smg:     { name: 'Subfusil',       dmg: [14, 24], range: 22, cd: 0.13, color: 0xec4899, len: 0.5 }
};
var ZOMBIE_TYPES = {
  crawler: { name: 'Rastrero',   hpMul: 1.0, spdMul: 1.5, dmgMul: 0.8, scale: 0.85, color: 0x84cc16 },
  brute:   { name: 'Corpulento', hpMul: 2.8, spdMul: 0.9, dmgMul: 1.6, scale: 1.35, color: 0xf97316 },
  titan:   { name: 'Titán',      hpMul: 6.5, spdMul: 0.55,dmgMul: 3.4, scale: 1.8,  color: 0xef4444 }
};
var BUILD_RECIPES = [
  { id: 'lookout', name: 'Torre vigía', cost: 15, work: 400, desc: 'Plataforma + misiles auto + 2 plazas rifle' },
  { id: 'mgtower', name: 'Torre ametralladora (operable Z)', cost: 25, work: 300, desc: 'MG 38m 18-32 DMG 0.09s, operable' },
  { id: 'turret_fast', name: 'Torreta rápida', cost: 40, work: 0, desc: 'Auto 30m 25-40 DMG 0.35s' },
  { id: 'turret_mg', name: 'Torreta MG auto', cost: 60, work: 0, desc: 'Auto 36m 18-30 DMG 0.09s' },
  { id: 'turret_mis', name: 'Torreta misiles', cost: 55, work: 0, desc: 'Área 30m 90-130 DMG 2.2s' },
  { id: 'perim', name: 'Tramo perímetro', cost: 10, work: 20, desc: 'Barricada inmediata' },
  { id: 'wall', name: 'Pared reforzada', cost: 8, work: 0, desc: '300 HP fija' },
  { id: 'spike', name: 'Trampa pinchos', cost: 5, work: 0, desc: '25 DMG/s en 3m' },
  { id: 'shelter', name: 'Refugio + perímetro (Outpost)', cost: 30, work: 120, desc: 'Funda outpost donde estás (O diseña)' },
  { id: 'tankpart', name: 'Pieza tanque + patio ámbar', cost: 500, work: 300, desc: 'Patio fijo 12m, 5 piezas = Tanque 10k HP' },
  { id: 'dummy', name: 'Señuelo bomba', cost: 20, work: 4, desc: '200 HP explota (máx 3). +1 granada' }
];
var customSettings = { zombieMult: 1, startRes: 2, prepTime: 180 };
function log(msg) {
  var box = document.getElementById('game-log');
  if (!box) { console.log(msg); return; }
  var d = document.createElement('div'); d.textContent = msg;
  box.prepend(d);
  while (box.children.length > 40) box.removeChild(box.lastChild);
}
function toast(msg) {
  var box = document.getElementById('toast-box'); if (!box) return;
  var d = document.createElement('div'); d.textContent = msg; box.appendChild(d);
  setTimeout(function(){ d.remove(); }, 3500);
}
function rand(a, b) { return a + Math.random() * (b - a); }
function dist2D(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx*dx + dz*dz); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
