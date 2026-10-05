// ===== PLAYER: menú, control CoD, viewmodel+ADS, menús B/G/I/O =====
var viewmodel = null, playerFireCd = 0, playerHealTarget = null, playerHealT = 0;
var selPlat = 'pc', selMode = 'spectator', selView = 'fps';
var openMenu = null;
function setupMainMenu() {
  document.querySelectorAll('.plat-btn').forEach(function (b) { b.onclick = function () { selPlat = b.dataset.plat; document.querySelectorAll('.plat-btn').forEach(function (x) { x.classList.remove('font-bold'); }); b.classList.add('font-bold'); }; });
  document.querySelectorAll('.mode-btn').forEach(function (b) { b.onclick = function () { selMode = b.dataset.mode; document.querySelectorAll('.mode-btn').forEach(function (x) { x.classList.remove('font-bold'); }); b.classList.add('font-bold'); document.getElementById('custom-box').classList.toggle('hidden', selMode !== 'custom'); }; });
  document.querySelectorAll('.view-btn').forEach(function (b) { b.onclick = function () { selView = b.dataset.view; document.querySelectorAll('.view-btn').forEach(function (x) { x.classList.remove('font-bold'); }); b.classList.add('font-bold'); }; });
  document.querySelectorAll('.cbtn').forEach(function (b) { b.onclick = function () { customSettings[b.dataset.k] = parseFloat(b.dataset.v); document.querySelectorAll('.cbtn[data-k="' + b.dataset.k + '"]').forEach(function (x) { x.classList.remove('font-bold'); }); b.classList.add('font-bold'); }; });
  document.getElementById('btn-play').onclick = menuStartGame;
}
function menuStartGame() {
  initAudioEngine();
  gameMode = selMode === 'custom' ? customBaseModeGuess() : selMode;
  viewMode = selView;
  zombieMult = selMode === 'custom' ? customSettings.zombieMult : 1;
  var startRes = selMode === 'custom' ? customSettings.startRes : 2;
  var prep = selMode === 'custom' ? customSettings.prepTime : 180;
  customSettings.prepTime = prep;
  baseResources.scrap = startRes * 20; baseResources.ammo = 30 + startRes * 20; baseResources.med = 1 + startRes; baseResources.food = 3 + startRes;
  setPlatform(selPlat);
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('hud-header').classList.remove('hidden');
  gameStarted = true; gameSpeed = 1;
  startWaveTimer();
  if (gameMode === 'participant' && playerIndex < 0) spawnPlayerSurvivor();
  if (gameMode === 'participant') { attachViewmodel(); setTimeout(lockPointer, 300); toast('Click en el mundo para capturar ratón · V cámara'); }
  else toast('Modo espectador: la IA juega sola');
  log('▶ Partida iniciada (' + gameMode + ' / ' + viewMode + ' / ' + uiMode + ')');
}
function customBaseModeGuess() { return 'participant'; }
function player() { return survivors[playerIndex]; }
function setPlatform(p) {
  uiMode = p;
  document.body.classList.toggle('mobile-mode', p === 'mobile');
  document.getElementById('touch-ui').classList.toggle('hidden', !(p === 'mobile' && gameMode === 'participant'));
  if (p === 'mobile') {
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); } catch (e) {}
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); } catch (e) {}
  }
}
function lockPointer() {
  if (uiMode !== 'pc' || gameMode !== 'participant') return;
  var el = renderer.domElement;
  if (document.pointerLockElement !== el && openMenu === null) { try { el.requestPointerLock(); } catch (e) {} }
}
function setupPlayerControls() {
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w') playerInput.f = true; if (k === 's') playerInput.b = true;
    if (k === 'a') playerInput.l = true; if (k === 'd') playerInput.r = true;
    if (k === 'shift') playerInput.sprint = true;
    if (gameMode !== 'participant' || playerIndex < 0) return;
    if (k === 'q') playerThrowGrenade();
    if (k === 'f') playerStartHeal();
    if (k === 'e') playerUse();
    if (k === 'b') toggleMenu('build');
    if (k === 'g') toggleMenu('weapons');
    if (k === 'i') toggleMenu('inv');
    if (k === 'o') toggleMenu('design');
    if (k === 't') rallyAllies();
    if (k === 'x') hammerHelp();
    if (k === 'z') toggleTower();
    if (k === 'v') { viewMode = viewMode === 'fps' ? 'tps' : 'fps'; toast('Vista: ' + viewMode.toUpperCase()); }
    if (k === 'escape') closeMenus();
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w') playerInput.f = false; if (k === 's') playerInput.b = false;
    if (k === 'a') playerInput.l = false; if (k === 'd') playerInput.r = false;
    if (k === 'shift') playerInput.sprint = false;
  });
  document.addEventListener('mousemove', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    var p = player(); if (!p || !p.alive) return;
    p.yaw -= e.movementX * 0.0024; p.pitch -= e.movementY * 0.0022;
    p.pitch = clamp(p.pitch, -1.2, 1.2);
  });
  document.addEventListener('mousedown', function (e) {
    if (gameMode !== 'participant' || openMenu !== null) return;
    if (document.pointerLockElement !== renderer.domElement) { lockPointer(); return; }
    if (e.button === 0) playerInput.fire = true;
    if (e.button === 2) playerInput.ads = true;
  });
  document.addEventListener('mouseup', function (e) {
    if (e.button === 0) playerInput.fire = false;
    if (e.button === 2) playerInput.ads = false;
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  renderer.domElement.addEventListener('click', function () { if (openMenu === null) lockPointer(); });
  setupTouch();
}
function attachViewmodel() {
  if (viewmodel) camera.remove(viewmodel);
  var p = player(); if (!p) return;
  viewmodel = createWeaponMesh(p.weaponKey);
  viewmodel.position.set(0.28, -0.24, -0.5);
  camera.add(viewmodel);
  scene.add(camera);
}
function updatePlayer(dt) {
  var p = player(); if (!p || !p.alive || gameMode !== 'participant') return;
  playerFireCd -= dt * gameSpeed;
  // ADS: FOV 62 -> 40
  var wantAds = playerInput.ads ? 1 : 0;
  p.ads += (wantAds - p.ads) * Math.min(1, dt * 10);
  var fov = 62 - (62 - 40) * p.ads;
  if (Math.abs(camera.fov - fov) > 0.2) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (viewmodel) {
    viewmodel.position.x = 0.28 * (1 - p.ads) + 0 * p.ads;
    viewmodel.position.y = -0.24 * (1 - p.ads) + -0.18 * p.ads;
  }
  // movimiento WASD relativo a yaw
  var sp = (playerInput.sprint && p.energy > 1 ? 9 : 5.2) * (playerInput.ads ? 0.55 : 1);
  var mx = (playerInput.r ? 1 : 0) - (playerInput.l ? 1 : 0);
  var mz = (playerInput.b ? 1 : 0) - (playerInput.f ? 1 : 0);
  var sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  // forward = -Z en yaw
  var wx = (mx * cos - mz * sin), wz = (-mx * sin - mz * cos) * -1;
  // corrección simple: forward hacia donde mira
  var fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  var rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  var vx = fx * (playerInput.f ? 1 : 0) + fx * -1 * (playerInput.b ? 1 : 0) + rx * mx;
  var vz = fz * (playerInput.f ? 1 : 0) + fz * -1 * (playerInput.b ? 1 : 0) + rz * mx;
  var l = Math.sqrt(vx * vx + vz * vz);
  if (l > 0) {
    p.mesh.position.x += vx / l * sp * dt * gameSpeed;
    p.mesh.position.z += vz / l * sp * dt * gameSpeed;
    p.mesh.rotation.y = p.yaw + Math.PI;
    animateEntityLimbs(p.mesh, dt, 1.4);
    p.energy = Math.max(0, p.energy - (playerInput.sprint ? 8 : 2) * dt);
  } else p.energy = Math.min(100, p.energy + 10 * dt);
  p.mesh.position.x = clamp(p.mesh.position.x, -105, 105);
  p.mesh.position.z = clamp(p.mesh.position.z, -105, 105);
  // cámara FPS/TPS o torre MG
  if (p.towerOp) {
    var np = p.towerOp.mesh.position;
    camera.position.set(np.x, np.y + 6.4, np.z - 2.5);
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    if (viewmodel) viewmodel.visible = false;
    p.mesh.visible = true;
    if (playerInput.fire && playerFireCd <= 0) {
      playerFireCd = 0.09;
      playSound('gun', { weapon: 'smg' });
      var dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      var hit = raycastZombie(camera.position, dir, 38 * 1.25);
      createMuzzleFlash(p.mesh.position, p.yaw + Math.PI);
      if (hit.z) damageZombie(hit.z, rand(18, 32), p);
    }
    return;
  }
  if (viewmodel) viewmodel.visible = (viewMode === 'fps');
  p.mesh.visible = (viewMode === 'tps') || cameraMode !== 'follow';
  if (viewMode === 'fps') {
    camera.position.set(p.mesh.position.x, 1.7, p.mesh.position.z);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ'; camera.rotation.y = p.yaw; camera.rotation.x = p.pitch;
    p.mesh.visible = false;
  } else {
    var bx = p.mesh.position.x + Math.sin(p.yaw) * 3.2, bz = p.mesh.position.z + Math.cos(p.yaw) * 3.2;
    camera.position.lerp(new THREE.Vector3(bx, 2.6, bz), Math.min(1, dt * 8));
    camera.rotation.order = 'YXZ'; camera.rotation.y = p.yaw + Math.PI; camera.rotation.x = p.pitch * 0.6;
    p.mesh.visible = true;
  }
  // disparo arma propia (MG si opera ya tratado)
  if (playerInput.fire && playerFireCd <= 0 && p.towerOp === null) {
    var w = WEAPONS[p.weaponKey];
    if (p.ammo <= 0) { if (baseResources.ammo > 0) { baseResources.ammo -= 10; p.ammo += 10; toast('Recargado'); } else { playerInput.fire = false; return; } }
    playerFireCd = w.cd; p.ammo--;
    playSound('gun', { weapon: p.weaponKey });
    var range = w.range * (playerInput.ads ? 1.25 : 1);
    var dir2 = new THREE.Vector3(); camera.getWorldDirection(dir2);
    var pellets = w.pellets || 1;
    for (var i = 0; i < pellets; i++) {
      var spread = playerInput.ads ? 0.008 : 0.045;
      var d2 = dir2.clone(); d2.x += rand(-spread, spread); d2.y += rand(-spread, spread); d2.z += rand(-spread, spread); d2.normalize();
      var hit2 = raycastZombie(camera.position, d2, range);
      fireBullet(camera.position, hit2.point, range, 0, p);
      if (hit2.z) damageZombie(hit2.z, rand(w.dmg[0], w.dmg[1]), p);
    }
    createMuzzleFlash(p.mesh.position, p.yaw + Math.PI);
  }
  // curación con F (canalizada)
  if (playerHealTarget) {
    playerHealT -= dt * gameSpeed;
    if (!playerHealTarget.alive || dist2D(p.mesh.position, playerHealTarget.mesh.position) > 3.5) { playerHealTarget = null; }
    else if (playerHealT <= 0) {
      playerHealTarget.hp = Math.min(playerHealTarget.maxHp, playerHealTarget.hp + 40);
      spawnHealFX(playerHealTarget.mesh.position);
      playSound('heal');
      if (p.meds > 0) p.meds--; else if (baseResources.med > 0) baseResources.med--;
      playerHealTarget = null; toast('Aliado curado +40');
    }
  }
  // recoger loot pisándolo
  for (var i = loots.length - 1; i >= 0; i--) {
    var lt = loots[i];
    if (dist2D(p.mesh.position, lt.mesh.position) < 1.5) {
      if (lt.kind === 'ammo') { p.ammo += 12; baseResources.ammo += 6; }
      if (lt.kind === 'med') baseResources.med++;
      if (lt.kind === 'scrap') baseResources.scrap = Math.min(1000, baseResources.scrap + 10);
      scene.remove(lt.mesh); loots.splice(i, 1); playSound('pickup');
    }
  }
}
function raycastZombie(origin, dir, range) {
  var best = null, bd = range;
  var end = origin.clone().add(dir.clone().multiplyScalar(range));
  zombies.forEach(function (z) {
    if (!z.alive) return;
    var zp = z.mesh.position.clone(); zp.y = 1.2;
    var to = zp.clone().sub(origin);
    var t = to.dot(dir);
    if (t < 0 || t > range) return;
    var perp = origin.clone().add(dir.clone().multiplyScalar(t)).distanceTo(zp);
    if (perp < 1.1 && t < bd) { bd = t; best = z; end = zp.clone(); }
  });
  return { z: best, point: end };
}
function playerThrowGrenade() { var p = player(); if (!p || p.grenades <= 0) { toast('Sin granadas'); return; } if (p.nadeCd > 0) return; p.nadeCd = 2; var dir = new THREE.Vector3(); camera.getWorldDirection(dir); var tp = p.mesh.position.clone().add(dir.multiplyScalar(12)); throwGrenade(p, tp); }
function playerStartHeal() {
  var p = player(); if (!p) return;
  var best = null, bd = 3;
  survivors.forEach(function (o) { if (o === p || !o.alive || o.hp > 90) return; var d = dist2D(p.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } });
  if (!best) { toast('Sin aliados heridos ≤3m'); return; }
  if (p.meds <= 0 && baseResources.med <= 0) { toast('Sin botiquines'); return; }
  playerHealTarget = best; playerHealT = 1.5;
  toast('Curando a ' + best.name + '…');
}
function playerUse() {
  var p = player(); if (!p) return;
  var c = nearestCrate(p.mesh.position, 2.5);
  if (c) {
    if (p.carriedCrate) { toast('Ya llevas caja (I para soltar)'); return; }
    pickupCrate(p, c); updatePlayerBars(); return;
  }
  // entregar en depósito
  for (var i = 0; i < activeShelterKeys.length; i++) {
    var z = ZONES[activeShelterKeys[i]];
    if (z.depot && dist2D(p.mesh.position, z.depot.mesh.position) < 5) {
      if (p.carriedCrate) { var k = p.carriedCrate; p.carriedCrate = null; if (p.pack) { p.mesh.remove(p.pack); p.pack = null; } applyCrateReward(k); toast('Caja entregada: ' + k); }
      else toast('Depósito: sin caja');
      return;
    }
  }
  // loot cercano
  for (var j = loots.length - 1; j >= 0; j--) {
    if (dist2D(p.mesh.position, loots[j].mesh.position) < 2.2) {
      var lt = loots[j];
      if (lt.kind === 'ammo') p.ammo += 12;
      if (lt.kind === 'med') baseResources.med++;
      if (lt.kind === 'scrap') baseResources.scrap = Math.min(1000, baseResources.scrap + 10);
      scene.remove(lt.mesh); loots.splice(j, 1); playSound('pickup');
      return;
    }
  }
}
function rallyAllies() {
  var p = player(); if (!p) return;
  survivors.forEach(function (s) { if (!s.isPlayer && s.alive && !s.towerOp) { s.mesh.position.set(p.mesh.position.x + rand(-3, 3), 0, p.mesh.position.z + rand(-3, 3)); } });
  toast('📯 Aliados reagrupados'); log('📯 Reagrupar en jugador');
}
function hammerHelp() {
  var p = player(); if (!p) return;
  var job = (window._buildJobs || []).find(function (j) { return !j.done; });
  if (!job) { toast('Sin obra activa'); return; }
  job.work -= 2; toast('🔨 +2s a obra (' + Math.ceil(job.work) + 's)');
  if (job.work <= 0) finishJob(job);
}
function toggleTower() {
  var p = player(); if (!p) return;
  if (p.towerOp) { dismountTower(p); return; }
  var post = nearestFreeTower(p.mesh.position);
  if (!post) { toast('Sin torre MG libre ≤12m'); return; }
  mountTower(p, post);
}
// ---- MENÚS B/G/I/O ----
function toggleMenu(which) {
  if (openMenu === which) { closeMenus(); return; }
  openMenu = which;
  document.exitPointerLock && document.exitPointerLock();
  ['menu-build', 'menu-weapons', 'menu-inv', 'menu-design'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); });
  if (which === 'build') { renderBuildMenu(); document.getElementById('menu-build').classList.remove('hidden'); }
  if (which === 'weapons') { renderWeaponMenu(); document.getElementById('menu-weapons').classList.remove('hidden'); }
  if (which === 'inv') { renderInv(); document.getElementById('menu-inv').classList.remove('hidden'); }
  if (which === 'design') { renderDesign(); document.getElementById('menu-design').classList.remove('hidden'); }
}
function closeMenus() { openMenu = null; ['menu-build', 'menu-weapons', 'menu-inv', 'menu-design'].forEach(function (id) { document.getElementById(id).classList.add('hidden'); }); document.getElementById('help-center').classList.add('hidden'); }
function renderBuildMenu() {
  var el = document.getElementById('build-list'); el.innerHTML = '';
  BUILD_RECIPES.forEach(function (r) {
    var d = document.createElement('div'); d.className = 'build-card';
    d.innerHTML = '<b>' + r.name + '</b> <span class="badge badge-amber">' + r.cost + ' esc</span><br><span class="opacity-70">' + r.desc + '</span><br><span class="opacity-60">Obra: ' + r.work + 's</span>';
    var b = document.createElement('button'); b.className = 'hud-btn'; b.textContent = '⚒ Construir';
    b.onclick = function () { playerBuild(r.id); };
    d.appendChild(b); el.appendChild(d);
  });
  document.getElementById('btn-close-build').onclick = closeMenus;
  document.getElementById('btn-call-help').onclick = function () { toast('📣 NPCs llamados a tu obra'); };
}
function playerBuild(id) {
  var p = player(); if (!p) { toast('Solo en modo participante'); return; }
  var r = BUILD_RECIPES.find(function (x) { return x.id === id; });
  if (baseResources.scrap < r.cost) { toast('Falta escombro (' + r.cost + ')'); return; }
  if (id === 'dummy' && !(p.grenades > 0)) { toast('Necesitas 1 granada'); return; }
  if ((id === 'lookout') && towers.length >= 2) { toast('Máx 2 torres'); return; }
  baseResources.scrap -= r.cost;
  if (id === 'dummy') p.grenades--;
  var pos = { x: p.mesh.position.x + 3, z: p.mesh.position.z + 3 };
  if (r.work === 0) { finishRecipe(id, pos); }
  else {
    var job = { id: id, work: r.work, pos: pos, done: false };
    window._buildJobs.push(job);
    toast('🚧 Obra iniciada: ' + r.name + ' (X aporta, llama NPCs)');
    log('🚧 Obra ' + r.name + ' en jugador');
  }
  closeMenus();
}
function finishJob(job) {
  job.done = true;
  finishRecipe(job.id, job.pos);
}
function finishRecipe(id, pos) {
  if (id === 'lookout') buildLookoutTower(pos);
  else if (id === 'mgtower') buildMGnest(pos);
  else if (id === 'turret_fast') buildTurretPost('fast', pos);
  else if (id === 'turret_mg') buildTurretPost('mg', pos);
  else if (id === 'turret_mis') buildTurretPost('mis', pos);
  else if (id === 'perim' || id === 'wall') buildWallAt(pos);
  else if (id === 'spike') buildSpikeTrap(pos);
  else if (id === 'dummy') buildDummyAt(pos);
  else if (id === 'shelter') { foundOutpostAt(pos, 14); }
  else if (id === 'tankpart') { defineTankYard(pos); addTankPiece(); }
  STATS.built++;
}
function renderWeaponMenu() {
  var el = document.getElementById('weapon-list'); el.innerHTML = '';
  var p = player();
  Object.keys(WEAPONS).forEach(function (k) {
    var w = WEAPONS[k];
    var d = document.createElement('div'); d.className = 'build-card';
    d.innerHTML = '<b>' + w.name + '</b> · ' + w.dmg[0] + '–' + w.dmg[1] + ' DMG · ' + w.range + 'm · ' + w.cd + 's' + (w.pellets ? ' · ' + w.pellets + ' perdigones' : '');
    var b = document.createElement('button'); b.className = 'hud-btn'; b.textContent = p && p.weaponKey === k ? '✓ Equipado' : 'Equipar [G]';
    b.onclick = function () {
      if (!p) return;
      p.weaponKey = k;
      if (p.gunMesh) p.mesh.remove(p.gunMesh);
      p.gunMesh = createWeaponMesh(k); p.gunMesh.position.set(0.36, 1.35, 0.4); p.mesh.add(p.gunMesh);
      attachViewmodel(); renderWeaponMenu(); updatePlayerBars();
    };
    d.appendChild(b); el.appendChild(d);
  });
  document.getElementById('btn-close-weapons').onclick = closeMenus;
}
function renderInv() {
  var p = player(); if (!p) return;
  document.getElementById('inv-body').innerHTML =
    '❤ Salud ' + Math.ceil(p.hp) + '/100 · ⚡ Energía ' + Math.ceil(p.energy) +
    '<br>🔫 ' + WEAPONS[p.weaponKey].name + ' · munición ' + p.ammo +
    '<br>💣 Granadas ' + p.grenades + ' · ⛑ Botiquines ' + p.meds + ' · 🛡 Armadura ' + p.armor +
    '<br>📦 Caja en espalda: ' + (p.carriedCrate || '—') +
    '<br><br>DEPÓSITO — escombro ' + Math.floor(baseResources.scrap) + ' · ammo ' + baseResources.ammo + ' · curas ' + baseResources.med + ' · comida ' + baseResources.food + ' · pesadas ' + baseResources.heavy;
  document.getElementById('btn-close-inv').onclick = closeMenus;
  document.getElementById('btn-use-med').onclick = function () {
    if (p.meds > 0 && p.hp < 100) { p.meds--; p.hp = Math.min(100, p.hp + 50); renderInv(); updatePlayerBars(); }
    else toast('Sin botiquín o HP lleno');
  };
  document.getElementById('btn-drop-crate').onclick = function () {
    if (p.carriedCrate) { spawnCrate([p.mesh.position.x + 1, 0, p.mesh.position.z + 1], p.carriedCrate); p.carriedCrate = null; if (p.pack) { p.mesh.remove(p.pack); p.pack = null; } renderInv(); }
  };
}
function renderDesign() {
  var el = document.getElementById('design-list'); el.innerHTML = '';
  var p = player();
  var op = p ? outpostAt(p.mesh.position) : outposts[outposts.length - 1];
  document.getElementById('design-outpost').textContent = op ? ('· ' + op.name + ' r=' + op.radius) : '· sin outpost: funda Refugio (B)';
  [['wall', 'Pared reforzada', 8], ['spike', 'Trampa pinchos', 5], ['turret_fast', 'Torreta rápida', 40], ['turret_mg', 'Torreta MG', 60], ['turret_mis', 'Torreta misiles', 55], ['mgtower', 'Torre MG operable', 25]].forEach(function (it) {
    var d = document.createElement('div'); d.className = 'build-card';
    d.innerHTML = '<b>' + it[1] + '</b> <span class="badge badge-amber">' + it[2] + ' esc</span>';
    var b = document.createElement('button'); b.className = 'hud-btn'; b.textContent = 'Colocar aquí';
    b.onclick = function () {
      if (!op) { toast('Funda un outpost primero (B→Refugio)'); return; }
      if (baseResources.scrap < it[2]) { toast('Falta escombro'); return; }
      baseResources.scrap -= it[2];
      var pp = { x: p.mesh.position.x + 2, z: p.mesh.position.z + 2 };
      if (it[0] === 'wall') buildWallAt(pp); else if (it[0] === 'spike') buildSpikeTrap(pp);
      else if (it[0] === 'mgtower') buildMGnest(pp); else buildTurretPost(it[0].replace('turret_', ''), pp);
      closeMenus();
    };
    d.appendChild(b); el.appendChild(d);
  });
  document.getElementById('btn-close-design').onclick = closeMenus;
}
// ---- táctil ----
var joy = { dx: 0, dy: 0, id: null };
function setupTouch() {
  var js = document.getElementById('joystick'), st = document.getElementById('stick');
  if (!js) return;
  js.addEventListener('touchstart', function (e) { joy.id = e.changedTouches[0].identifier; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joy.id) {
        var r = js.getBoundingClientRect();
        var dx = t.clientX - (r.left + 60), dy = t.clientY - (r.top + 60);
        var l = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(1, l / 50);
        joy.dx = dx / l * m; joy.dy = dy / l * m;
        st.style.left = (35 + joy.dx * 35) + 'px'; st.style.top = (35 + joy.dy * 35) + 'px';
        var p = player(); if (p) { playerInput.f = joy.dy < -0.3; playerInput.b = joy.dy > 0.3; playerInput.l = joy.dx < -0.3; playerInput.r = joy.dx > 0.3; }
      } else if (t.identifier === 'look') {
        var p2 = player(); if (p2) { p2.yaw -= (t.clientX - (joy.lx || t.clientX)) * 0.005; p2.pitch -= (t.clientY - (joy.ly || t.clientY)) * 0.004; }
        joy.lx = t.clientX; joy.ly = t.clientY;
      }
    }
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joy.id) { joy.id = null; joy.dx = joy.dy = 0; st.style.left = '35px'; st.style.top = '35px'; playerInput.f = playerInput.b = playerInput.l = playerInput.r = false; }
      if (e.changedTouches[i].identifier === 'look') { joy.lx = joy.ly = null; }
    }
  });
  // deslizar para girar (zona canvas)
  var lastT = null;
  document.getElementById('game-container').addEventListener('touchstart', function (e) {
    if (e.touches.length === 1 && e.touches[0].clientX > 160) { var t = e.touches[0]; t.identifier = 'look'; joy.lx = t.clientX; joy.ly = t.clientY; try { e._lk = true; } catch (x) {} }
  }, { passive: true });
  document.querySelectorAll('#touch-btns button').forEach(function (b) {
    b.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var k = b.dataset.t, p = player();
      if (k === 'fire') playerInput.fire = true;
      if (k === 'ads') playerInput.ads = true;
      if (k === 'nade') playerThrowGrenade();
      if (k === 'use') playerUse();
      if (k === 'build') toggleMenu('build');
      if (k === 'heal') playerStartHeal();
      if (k === 'tower') toggleTower();
      if (k === 'hammer') hammerHelp();
      if (k === 'inv') toggleMenu('inv');
      if (k === 'rally') rallyAllies();
    });
    b.addEventListener('touchend', function () { if (b.dataset.t === 'fire') playerInput.fire = false; if (b.dataset.t === 'ads') playerInput.ads = false; });
  });
}
