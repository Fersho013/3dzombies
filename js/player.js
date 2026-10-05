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
  // ===== WARZONE PC: WASD+Shift(sprint) Espacio(salto) C/Ctrl(agacharse/deslizar) LMB fuego RMB ADS R recarga E interactuar Q letal F curar/reanimar 1/2 armas 4 placa 5 comer H melee Tab inventario =====
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') playerInput.f = true; if (k === 's' || k === 'arrowdown') playerInput.b = true;
    if (k === 'a' || k === 'arrowleft') playerInput.l = true; if (k === 'd' || k === 'arrowright') playerInput.r = true;
    if (k === 'shift') playerInput.sprint = true;
    if (k === ' ') { playerInput.jump = true; e.preventDefault(); }
    if (k === 'c' || k === 'control') playerInput.crouch = true;
    if (gameMode !== 'participant' || playerIndex < 0) return;
    if (k === 'q') playerThrowGrenade();
    if (k === 'f') playerStartHeal();
    if (k === 'e') playerUse();
    if (k === 'r') playerReload();
    if (k === 'h') playerMelee();
    if (k === '4') playerUseArmor();
    if (k === '5') playerEat();
    if (k === '1') playerSwapSlot(0);
    if (k === '2') playerSwapSlot(1);
    if (k === 'tab') { toggleMenu('inv'); e.preventDefault(); }
    if (k === 'g') toggleMenu('weapons');
    if (k === 'i') toggleMenu('inv');
    if (k === 'o') toggleMenu('design');
    if (k === 't') rallyAllies();
    if (k === 'x') hammerHelp();
    if (k === 'z') toggleTower();
    if (k === 'v') { viewMode = viewMode === 'fps' ? 'tps' : 'fps'; toast('Vista: ' + viewMode.toUpperCase()); playSound('ui'); }
    if (k === 'escape') closeMenus();
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') playerInput.f = false; if (k === 's' || k === 'arrowdown') playerInput.b = false;
    if (k === 'a' || k === 'arrowleft') playerInput.l = false; if (k === 'd' || k === 'arrowright') playerInput.r = false;
    if (k === 'shift') playerInput.sprint = false;
    if (k === ' ') playerInput.jump = false;
    if (k === 'c' || k === 'control') playerInput.crouch = false;
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
  if (p.downed) { // derribado: arrastre lento, sin disparar, espera reanimación
    p.reviveT -= dt * gameSpeed;
    p.mesh.position.x += ((playerInput.f ? -Math.sin(p.yaw) : 0) + (playerInput.b ? Math.sin(p.yaw) : 0)) * dt * 1.2;
    p.mesh.position.z += ((playerInput.f ? -Math.cos(p.yaw) : 0) + (playerInput.b ? Math.cos(p.yaw) : 0)) * dt * 1.2;
    camera.position.set(p.mesh.position.x, 1.2, p.mesh.position.z);
    camera.rotation.order = 'YXZ'; camera.rotation.y = p.yaw; camera.rotation.x = p.pitch * 0.5;
    if (Math.floor(p.reviveT * 2) % 2 === 0) damageFlash(0.5);
    if (p.reviveT <= 0) { p.downed = false; p.alive = false; p.hp = 0; log('☠ Tú desangrado'); checkGameOver(); }
    return;
  }
  pollGamepad(p, dt);
  playerFireCd -= dt * gameSpeed;
  if (p.vy === undefined) { p.vy = 0; p.grounded = true; p.crouching = false; p.sliding = 0; p.mag = p.mag !== undefined ? p.mag : WEAPONS[p.weaponKey].mag; p.slots = p.slots || [p.weaponKey, 'pistol']; p.recoilP = 0; }
  // ADS estilo Warzone: tiempo por arma + FOV por arma + sensibilidad reducida
  var w0 = WEAPONS[p.weaponKey];
  var wantAds = (playerInput.ads || GAMEPAD.adsToggle) ? 1 : 0;
  var adsSpeed = dt / Math.max(0.08, w0.adsTime);
  p.ads += clamp(wantAds - p.ads, -adsSpeed, adsSpeed);
  var targetFov = 62 + (w0.adsFov - 62) * p.ads;
  // sprint táctico sube FOV
  if (playerInput.sprint && (playerInput.f) && !playerInput.ads) targetFov += 5;
  if (Math.abs(camera.fov - targetFov) > 0.2) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }
  if (viewmodel) {
    viewmodel.position.x = 0.28 * (1 - p.ads) + 0 * p.ads;
    viewmodel.position.y = -0.24 * (1 - p.ads) + -0.20 * p.ads;
    // retroceso visual + sway respiración
    p.recoilP = Math.max(0, (p.recoilP || 0) - dt * 6);
    viewmodel.position.z = -0.5 + p.recoilP * 0.12;
    viewmodel.rotation.x = p.recoilP * 0.25 + Math.sin(performance.now() / 900) * 0.008 * (1 - p.ads);
  }
  // ===== movimiento Warzone: sprint/stamina/hambre/agacharse/salto/deslizar =====
  var crouching = !!playerInput.crouch;
  p.crouching = crouching;
  // slide: sprint + crouch con cooldown
  if (playerInput.sprint && crouching && (playerInput.f) && (p.slideCd || 0) <= 0 && p.grounded) { p.sliding = 0.55; p.slideCd = 2.2; p.slideDir = p.yaw; playSound('step'); }
  p.slideCd = Math.max(0, (p.slideCd || 0) - dt);
  p.sliding = Math.max(0, (p.sliding || 0) - dt);
  var isSprinting = playerInput.sprint && playerInput.f && !playerInput.ads && !crouching && p.energy > 1 && p.sliding <= 0;
  var sp = (isSprinting ? 8.6 : crouching ? 2.6 : p.sliding > 0 ? 9.5 : 5.2 * (w0.mobility || 1)) * (playerInput.ads ? 0.55 : 1);
  var mx = (playerInput.r ? 1 : 0) - (playerInput.l ? 1 : 0);
  var fx = -Math.sin(p.sliding > 0 ? p.slideDir : p.yaw), fz = -Math.cos(p.sliding > 0 ? p.slideDir : p.yaw);
  var rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  var vx = fx * (playerInput.f ? 1 : 0) + fx * -1 * (playerInput.b ? 1 : 0) + rx * mx;
  var vz = fz * (playerInput.f ? 1 : 0) + fz * -1 * (playerInput.b ? 1 : 0) + rz * mx;
  var l = Math.sqrt(vx * vx + vz * vz);
  p.bobT = (p.bobT || 0);
  // hambre: sin comida no hay sprint ni regen (propósito comida)
  p.hunger = p.hunger === undefined ? 100 : p.hunger;
  if (l > 0) {
    p.mesh.position.x += vx / l * sp * dt * gameSpeed;
    p.mesh.position.z += vz / l * sp * dt * gameSpeed;
    p.mesh.rotation.y = p.yaw + Math.PI;
    // agachado: modelo más bajo
    var targetH = crouching || p.sliding > 0 ? 0.72 : 1;
    p.mesh.scale.y += (targetH - p.mesh.scale.y) * Math.min(1, dt * 10);
    animateEntityLimbs(p.mesh, dt, p.sliding > 0 ? 2.2 : isSprinting ? 1.8 : 1.2);
    p.energy = Math.max(0, p.energy - ((isSprinting ? 9 : 2) * (p.hunger < 25 ? 1.6 : 1)) * dt);
    p.hunger = Math.max(0, p.hunger - dt * (isSprinting ? 0.9 : 0.25));
    // headbob + pasos
    p.bobT += dt * (p.sliding > 0 ? 13 : isSprinting ? 11 : 8);
    p.stepT -= dt * gameSpeed;
    if (p.stepT <= 0) { p.stepT = isSprinting ? 0.3 : 0.45; playSound('step'); }
  } else { p.energy = Math.min(100, p.energy + (p.hunger < 25 ? 4 : 10) * dt); p.mesh.scale.y += (crouching ? 0.72 : 1 - p.mesh.scale.y) * Math.min(1, dt * 10); }
  // salto / gravedad Warzone (Espacio / A mando / botón móvil)
  if (playerInput.jump && p.grounded) { p.vy = 4.6; p.grounded = false; playerInput.jump = false; playSound('step'); }
  if (!p.grounded || p.vy !== 0) {
    p.vy -= 12 * dt; p.mesh.position.y += p.vy * dt * gameSpeed;
    if (p.mesh.position.y <= 0) { p.mesh.position.y = 0; p.vy = 0; p.grounded = true; p.landDip = 0.18; playSound('step'); }
  }
  p.landDip = Math.max(0, (p.landDip || 0) - dt);
  p.mesh.position.x = clamp(p.mesh.position.x, -105, 105);
  p.mesh.position.z = clamp(p.mesh.position.z, -105, 105);
  // interior: avisar casa accesible
  try { var inn = insideInterior(p.mesh.position); if (inn && inn._last !== Math.floor(performance.now() / 5000)) { inn._last = Math.floor(performance.now() / 5000); } } catch (e) {}
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
  var bobY = Math.sin(p.bobT || 0) * (l > 0 ? (playerInput.ads ? 0.008 : 0.025) : 0) - (p.landDip || 0);
  var bobX = Math.cos((p.bobT || 0) * 0.5) * (l > 0 ? 0.012 : 0);
  // recarga por cargador Warzone
  if (p.reloadT > 0) { p.reloadT -= dt * gameSpeed; if (p.reloadT <= 0) { var wR = WEAPONS[p.weaponKey]; var need = wR.mag - p.mag; var take = Math.min(need, baseResources.ammo); p.mag += take; baseResources.ammo -= take; p.ammo = p.mag; toast('🔫 Recargado ' + p.mag + '/' + wR.mag); } }
  var eyeH = (p.crouching ? 1.25 : 1.7) + p.mesh.position.y;
  if (viewMode === 'fps') {
    camera.position.set(p.mesh.position.x + bobX, eyeH + bobY, p.mesh.position.z);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ'; camera.rotation.y = p.yaw; camera.rotation.x = p.pitch;
    p.mesh.visible = false;
  } else {
    var bx = p.mesh.position.x + Math.sin(p.yaw) * 3.2, bz = p.mesh.position.z + Math.cos(p.yaw) * 3.2;
    camera.position.lerp(new THREE.Vector3(bx, 2.6, bz), Math.min(1, dt * 8));
    camera.rotation.order = 'YXZ'; camera.rotation.y = p.yaw + Math.PI; camera.rotation.x = p.pitch * 0.6;
    p.mesh.visible = true;
  }
  // disparo Warzone: cargador, retroceso, dispersión cadera/ADS, caída daño, melee
  if (playerInput.melee) { playerInput.melee = false; playerMelee(); }
  if (playerInput.fire && playerFireCd <= 0 && p.towerOp === null && !(p.reloadT > 0)) {
    var w = WEAPONS[p.weaponKey];
    if (w.melee) { playerMelee(); playerInput.fire = false; return; }
    if (p.mag <= 0) { playerReload(); playerInput.fire = false; return; }
    playerFireCd = w.cd; p.mag--; p.ammo = p.mag;
    playSound('gun', { weapon: p.weaponKey });
    p.recoilP = Math.min(1.4, (p.recoilP || 0) + w.recoil * 22);
    p.pitch += w.recoil * (playerInput.ads ? 0.55 : 1); // patada vertical
    p.yaw += rand(-w.recoil, w.recoil) * 0.35;
    addShake(p.weaponKey === 'shotgun' ? 0.35 : p.weaponKey === 'sniper' ? 0.4 : 0.1);
    ejectShell(p.mesh.position, p.yaw);
    var range = w.range * (playerInput.ads ? 1.25 : 1) * (p.crouching ? 1.1 : 1);
    var dir2 = new THREE.Vector3(); camera.getWorldDirection(dir2);
    var pellets = w.pellets || 1;
    for (var i = 0; i < pellets; i++) {
      var spread = (playerInput.ads ? w.spreadAds : w.spreadHip) * (p.crouching ? 0.65 : 1) * (l > 0 ? 1.5 : 1) * (p.sliding > 0 ? 2 : 1);
      var d2 = dir2.clone(); d2.x += rand(-spread, spread); d2.y += rand(-spread, spread); d2.z += rand(-spread, spread); d2.normalize();
      var hit2 = raycastZombie(camera.position, d2, range);
      fireBullet(camera.position, hit2.point, range, 0, p);
      var dist = camera.position.distanceTo(hit2.point);
      if (hit2.z) damageZombie(hit2.z, warzoneDamage(w, dist), p);
      else hitDestructible(camera.position, d2, range, warzoneDamage(w, dist));
    }
    createMuzzleFlash(p.mesh.position, p.yaw + Math.PI, p.weaponKey === 'shotgun' || p.weaponKey === 'sniper');
  }
  // curación / reanimación con F (canalizada Warzone)
  if (p.meleeCd) p.meleeCd -= dt * gameSpeed;
  if (p.nadeCd) p.nadeCd -= dt * gameSpeed;
  if (playerHealTarget) {
    playerHealT -= dt * gameSpeed;
    if (!playerHealTarget.alive || dist2D(p.mesh.position, playerHealTarget.mesh.position) > 3.5) { playerHealTarget = null; }
    else if (playerHealT <= 0) {
      if (playerHealTarget.downed) { reviveSurvivor(playerHealTarget); toast('🚑 Reanimado'); }
      else {
        playerHealTarget.hp = Math.min(playerHealTarget.maxHp, playerHealTarget.hp + 40);
        spawnHealFX(playerHealTarget.mesh.position);
        toast('Aliado curado +40');
      }
      playSound('heal');
      if (p.meds > 0) p.meds--; else if (baseResources.med > 0) baseResources.med--;
      playerHealTarget = null;
    }
  }
  // hambre pasiva jugador + regen si saciado (propósito comida)
  p.hunger = p.hunger === undefined ? 100 : p.hunger;
  p.hunger = Math.max(0, p.hunger - dt * 0.35);
  if (p.hunger > 40 && p.hp < p.maxHp && p.hp > 0 && !p.downed) p.hp = Math.min(p.maxHp, p.hp + dt * 1.2);
  if (p.magByWeapon) p.magByWeapon[p.weaponKey] = p.mag;
  // recoger loot pisándolo (todo con propósito)
  for (var i = loots.length - 1; i >= 0; i--) {
    var lt = loots[i];
    if (dist2D(p.mesh.position, lt.mesh.position) < 1.5) {
      if (lt.kind === 'ammo') { p.mag = Math.min(WEAPONS[p.weaponKey].mag, p.mag + 12); p.ammo = p.mag; baseResources.ammo += 6; }
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
function hitDestructible(origin, dir, range, dmg) {
  var best = null, bd = range;
  destructibles.forEach(function (d) {
    if (d.dead) return;
    var zp = d.mesh.position.clone(); zp.y = 1;
    var to = zp.clone().sub(origin);
    var t = to.dot(dir);
    if (t < 0 || t > range) return;
    var perp = origin.clone().add(dir.clone().multiplyScalar(t)).distanceTo(zp);
    if (perp < 1.6 && t < bd) { bd = t; best = d; }
  });
  if (best) { damageDestructible(best, dmg); spawnImpactFX(best.mesh.position, 0xfde68a); }
}
function playerReload() {
  var p = player(); if (!p || p.reloadT > 0) return;
  var w = WEAPONS[p.weaponKey]; if (w.melee) return;
  if (p.mag >= w.mag || baseResources.ammo <= 0) { if (baseResources.ammo <= 0) toast('Sin reserva'); return; }
  p.reloadT = w.reload; playSound('reload'); toast('🔄 Recargando ' + w.name + '…');
}
function playerMelee() {
  var p = player(); if (!p || (p.meleeCd || 0) > 0) return;
  p.meleeCd = 0.55; playSound('hit'); addShake(0.15);
  var bonus = (baseResources.meleeLvl || 0) * 8;
  var hit = false;
  zombies.forEach(function (z) { if (!z.alive) return; if (dist2D(p.mesh.position, z.mesh.position) < 2.6) { damageZombie(z, 55 + bonus, p); hit = true; } });
  destructibles.forEach(function (d) { if (!d.dead && dist2D(p.mesh.position, d.mesh.position) < 2.8) { damageDestructible(d, 60); hit = true; } });
  if (viewmodel) { viewmodel.rotation.x = -0.9; setTimeout(function () { if (viewmodel) viewmodel.rotation.x = 0; }, 160); }
  if (!hit) toast('🔪 Aire');
}
function playerUseArmor() {
  var p = player(); if (!p) return;
  if (baseResources.armor <= 0) { toast('Sin placas (busca blindaje)'); return; }
  if ((p.plates || 0) >= 3) { toast('Placas al máximo 3'); return; }
  baseResources.armor--; p.plates = (p.plates || 0) + 1; p.armorHP = (p.armorHP || 0) + 50;
  playSound('pickup'); toast('🛡 Placa ' + p.plates + '/3 (+50)');
}
function playerEat() {
  var p = player(); if (!p) return;
  if (baseResources.food <= 0) { toast('Sin comida (saquea casas/neveras)'); return; }
  if (p.hunger > 95 && p.hp > 95) { toast('Saciado'); return; }
  baseResources.food--; p.hunger = Math.min(100, p.hunger + 38); p.hp = Math.min(p.maxHp, p.hp + 18); p.energy = Math.min(100, p.energy + 30);
  playSound('heal'); toast('🍖 +' + Math.round(p.hunger) + ' saciedad · +18 HP');
}
function playerSwapSlot(i) {
  var p = player(); if (!p || !p.slots) return;
  var key = p.slots[i]; if (!key || key === p.weaponKey) return;
  p.weaponKey = key; p.mag = p.ammo = p.magByWeapon && p.magByWeapon[key] !== undefined ? p.magByWeapon[key] : WEAPONS[key].mag;
  if (p.gunMesh) p.mesh.remove(p.gunMesh);
  p.gunMesh = createWeaponMesh(key); p.gunMesh.position.set(0.36, 1.35, 0.45); p.mesh.add(p.gunMesh);
  attachViewmodel(); playSound('reload'); toast('🔫 ' + WEAPONS[key].name + ' [1/2]');
}
// ===== MANDO estilo Warzone (Gamepad API): LT ADS / RT fuego / A salto / B agacharse-slide / X recarga-interactuar / Y armas / LB letal / RB melee-curar / cruceta placas-comida =====
var _padPrev = {};
function pollGamepad(p, dt) {
  try {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var g = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { g = pads[i]; break; }
    if (!g) { GAMEPAD.active = false; return; }
    GAMEPAD.active = true;
    function dz(v) { return Math.abs(v) < 0.18 ? 0 : v; }
    var lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
    var sens = 0.055 * (playerInput.ads ? 0.55 : 1);
    p.yaw -= rx * sens * dt * 60 * 0.055; p.pitch -= ry * sens * dt * 60 * 0.055;
    p.pitch = clamp(p.pitch, -1.2, 1.2);
    // stick izq = WASD
    playerInput.f = ly < -0.25; playerInput.b = ly > 0.25; playerInput.l = lx < -0.25; playerInput.r = lx > 0.25;
    playerInput.sprint = g.buttons[10] && g.buttons[10].pressed; // L3 sprint táctico
    var b = function (n) { return g.buttons[n] && g.buttons[n].pressed; };
    var bv = function (n) { return g.buttons[n] ? g.buttons[n].value : 0; };
    playerInput.fire = bv(7) > 0.25;
    playerInput.ads = bv(6) > 0.25;
    function edge(n, fn) { var pr = _padPrev[n] || false, now = b(n); if (now && !pr) fn(); _padPrev[n] = now; }
    edge(0, function () { playerInput.jump = true; });           // A salto
    edge(1, function () { playerInput.crouch = !playerInput.crouch; }); // B agacharse/slide toggle
    edge(2, function () { if (p.mag <= 0) playerReload(); else playerUse(); }); // X recarga/interactuar
    edge(3, function () { playerSwapSlot(p.weaponKey === (p.slots||[])[0] ? 1 : 0); }); // Y armas
    edge(4, function () { playerThrowGrenade(); });              // LB letal
    edge(5, function () { var a = nearestDowned(p, 4) || nearestHurt(p); if (a) playerStartHeal(); else playerMelee(); }); // RB curar/melee
    edge(8, function () { toggleMenu('inv'); });
    edge(9, function () { closeMenus(); });
    // cruceta: izq placa, der comida, arriba granada ya, abajo martillo
    edge(14, function () { playerUseArmor(); });
    edge(15, function () { playerEat(); });
    edge(12, function () { toggleTower(); });
  } catch (e) {}
}
function nearestDowned(p, maxD) { var best = null, bd = maxD; survivors.forEach(function (o) { if (o === p || o.downed !== true) return; var d = dist2D(p.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } }); return best; }
function nearestHurt(p) { var best = null, bd = 3; survivors.forEach(function (o) { if (o === p || !o.alive || o.downed || o.hp > 90) return; var d = dist2D(p.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } }); return best; }
function playerThrowGrenade() { var p = player(); if (!p || p.grenades <= 0) { toast('Sin granadas'); return; } if (p.nadeCd > 0) return; p.nadeCd = 2; var dir = new THREE.Vector3(); camera.getWorldDirection(dir); var tp = p.mesh.position.clone().add(dir.multiplyScalar(12)); throwGrenade(p, tp); }
function playerStartHeal() {
  var p = player(); if (!p) return;
  // prioridad: reanimar derribado (Warzone revive)
  var down = nearestDowned(p, 3.5);
  if (down) { playerHealTarget = down; playerHealT = 3; toast('🚑 Reanimando a ' + down.name + '… ¡cúbrete!'); return; }
  var best = null, bd = 3;
  survivors.forEach(function (o) { if (o === p || !o.alive || o.downed || o.hp > 90) return; var d = dist2D(p.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } });
  if (!best) { toast('Sin aliados heridos ≤3m (F)'); return; }
  if (p.meds <= 0 && baseResources.med <= 0) { toast('Sin botiquines (busca curas)'); return; }
  playerHealTarget = best; playerHealT = 1.5;
  toast('Curando a ' + best.name + '…');
}
function playerUse() {
  var p = player(); if (!p) return;
  // 0) reanimar tiene prioridad si hay derribado encima
  var down = nearestDowned(p, 2.5);
  if (down) { playerStartHeal(); return; }
  // 1) puerta cercana (casas lujo E)
  var door = nearestDoor(p.mesh.position, 2.8);
  if (door) { toggleDoor(door); return; }
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
  // ===== COD MOBILE: joystick izq (empuja lejos = sprint) + swipe der mirar + doble fuego =====
  var js = document.getElementById('joystick'), st = document.getElementById('stick');
  if (!js) return;
  window._joy = window._joy || { id: null, dx: 0, dy: 0 };
  var joy = window._joy;
  js.addEventListener('touchstart', function (e) { joy.id = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
  var lookId = null, lx = 0, ly = 0;
  var lookArea = document.getElementById('look-area');
  function onLookStart(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX > window.innerWidth * 0.35 && lookId === null && t.identifier !== joy.id) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }
  function onLookMove(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === lookId) {
        var p2 = player();
        if (p2) { p2.yaw -= (t.clientX - lx) * 0.0042; p2.pitch -= (t.clientY - ly) * 0.0032; p2.pitch = clamp(p2.pitch, -1.2, 1.2); }
        lx = t.clientX; ly = t.clientY;
      }
      if (t.identifier === joy.id) {
        var r = js.getBoundingClientRect();
        var dx = t.clientX - (r.left + 65), dy = t.clientY - (r.top + 65);
        var l = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(1, l / 55);
        joy.dx = dx / l * m; joy.dy = dy / l * m;
        st.style.left = (40 + joy.dx * 40) + 'px'; st.style.top = (40 + joy.dy * 40) + 'px';
        var p = player();
        if (p) {
          playerInput.f = joy.dy < -0.3; playerInput.b = joy.dy > 0.3; playerInput.l = joy.dx < -0.3; playerInput.r = joy.dx > 0.3;
          playerInput.sprint = m > 0.92; // empuja al borde = sprint táctico CODM
        }
      }
    }
    if (e.cancelable) e.preventDefault();
  }
  function onLookEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookId) lookId = null;
      if (e.changedTouches[i].identifier === joy.id) { joy.id = null; joy.dx = joy.dy = 0; st.style.left = '40px'; st.style.top = '40px'; playerInput.f = playerInput.b = playerInput.l = playerInput.r = playerInput.sprint = false; }
    }
  }
  document.addEventListener('touchstart', onLookStart, { passive: true });
  document.addEventListener('touchmove', onLookMove, { passive: false });
  document.addEventListener('touchend', onLookEnd);
  document.addEventListener('touchcancel', onLookEnd);
  document.querySelectorAll('#touch-btns-codm button').forEach(function (b) {
    b.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation();
      var k = b.dataset.t;
      if (k === 'hipfire') { playerInput.fire = true; playerInput.ads = false; }
      if (k === 'adsfire') { playerInput.fire = true; playerInput.ads = true; }
      if (k === 'ads') { GAMEPAD.adsToggle = !GAMEPAD.adsToggle; playerInput.ads = GAMEPAD.adsToggle; b.style.borderColor = GAMEPAD.adsToggle ? '#ef4444' : '#10b981'; }
      if (k === 'jump') playerInput.jump = true;
      if (k === 'crouch') { var p = player(); if (p && playerInput.sprint && playerInput.f) { p.sliding = 0.55; p.slideCd = 2.2; p.slideDir = p.yaw; } else playerInput.crouch = !playerInput.crouch; }
      if (k === 'reload') playerReload();
      if (k === 'nade') playerThrowGrenade();
      if (k === 'heal') playerStartHeal();
      if (k === 'knife') playerMelee();
      if (k === 'use') playerUse();
      if (k === 'swap') { var pp = player(); if (pp) playerSwapSlot(pp.weaponKey === (pp.slots || [])[0] ? 1 : 0); }
      if (k === 'armor') playerUseArmor();
      if (k === 'eat') playerEat();
      if (k === 'build') toggleMenu('build');
      if (k === 'tower') toggleTower();
    }, { passive: false });
    b.addEventListener('touchend', function (e) {
      var k = b.dataset.t;
      if (k === 'hipfire' || k === 'adsfire') { playerInput.fire = false; if (k === 'adsfire') playerInput.ads = GAMEPAD.adsToggle; }
    });
  });
}
