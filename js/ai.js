// ===== AI: oleadas, supervivientes, zombies, torretas refugio =====
var spawnQueue = [], spawnTimer = 0;
function waveCount(w) { return Math.round((45 + w * 13 + Math.pow(w, 1.32) * 3) * zombieMult); }
function shelterCentroid() {
  if (!activeShelterKeys.length) return new THREE.Vector3(0, 0, 0);
  var v = new THREE.Vector3();
  activeShelterKeys.forEach(function (k) { v.x += ZONES[k].pos[0]; v.z += ZONES[k].pos[2]; });
  v.x /= activeShelterKeys.length; v.z /= activeShelterKeys.length; return v;
}
function startWaveTimer() { waveTimer = customSettings.prepTime || 180; isWaveActive = false; }
function triggerWave() {
  if (isWaveActive) return;
  isWaveActive = true; spawnQueue = [];
  var n = waveCount(currentWave);
  var medFrac = Math.min(0.5, 0.04 + currentWave * 0.035);
  var titFrac = Math.min(0.30, Math.max(0, (currentWave - 1) * 0.028));
  var nMed = Math.round(n * medFrac), nTit = Math.round(n * titFrac), nCraw = n - nMed - nTit;
  var c = shelterCentroid();
  function push(k, count) {
    for (var i = 0; i < count; i++) {
      var a = rand(0, Math.PI * 2), r = rand(95, 120);
      spawnQueue.push({ kind: k, x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r });
    }
  }
  push('crawler', nCraw); push('brute', nMed); push('titan', nTit);
  // shuffle
  spawnQueue.sort(function () { return Math.random() - 0.5; });
  spawnTimer = 0;
  log('🌊 OLEADA ' + currentWave + ': ' + n + ' zombies (' + nCraw + 'R/' + nMed + 'C/' + nTit + 'T)');
  if (gameMode === 'participant' && playerIndex >= 0) lockPointer();
}
function spawnZombie(kind, x, z) {
  var T = ZOMBIE_TYPES[kind];
  var mesh = createHumanoid(0xffffff, true, kind);
  mesh.position.set(x, 0, z); scene.add(mesh);
  var baseHp = 40 + currentWave * 6;
  zombies.push({
    kind: kind, mesh: mesh, hp: baseHp * T.hpMul, maxHp: baseHp * T.hpMul,
    speed: (0.085 + Math.random() * 0.035) * T.spdMul * 60 * 0.16,
    dmg: (5 + currentWave * 0.7) * T.dmgMul,
    atkCd: 0, alive: true, growlCd: rand(4, 12)
  });
  if (Math.random() < 0.12) playSound('zombie');
}
function updateSpawns(dt) {
  if (!isWaveActive || !spawnQueue.length) return;
  spawnTimer -= dt;
  if (spawnTimer <= 0) { var s = spawnQueue.shift(); spawnZombie(s.kind, s.x, s.z); spawnTimer = 0.09; }
}
function nearestZombie(pos, maxD) {
  var best = null, bd = maxD || 1e9;
  for (var i = 0; i < zombies.length; i++) {
    var z = zombies[i]; if (!z.alive) continue;
    var d = dist2D(pos, z.mesh.position);
    if (d < bd) { bd = d; best = z; }
  }
  return { z: best, d: bd };
}
function nearestAliveAlly(s, maxD) {
  var best = null, bd = maxD;
  survivors.forEach(function (o) { if (o === s || !o.alive) return; var d = dist2D(s.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } });
  return best;
}
// ---- IA SUPERVIVIENTES ----
function updateSurvivorAI(s, dt) {
  if (!s.alive || s.isPlayer || s.towerOp) return;
  s.cd -= dt * gameSpeed; s.nadeCd -= dt * gameSpeed; s.healCd -= dt * gameSpeed;
  var pos = s.mesh.position;
  // contar amenaza local
  var near = 0, nz = nearestZombie(pos, 30);
  zombies.forEach(function (z) { if (z.alive && dist2D(pos, z.mesh.position) < 12) near++; });
  var garrison = survivors.filter(function (o) { return o.alive && dist2D(pos, o.mesh.position) < 15; }).length;
  // HUIR: >5 zombies y >2.6x guarnición
  if (near > 5 && near > garrison * 2.6) {
    s.state = 'FLEE';
    var c = shelterCentroid();
    moveToward(s, { x: c.x, z: c.z }, dt, 1.25);
    setThought(s, '¡Retirada!');
    if (s.hp < 60) healSelf(s, dt);
    return;
  }
  // CURAR: aliado crítico cerca (Elena prioriza)
  var hurt = nearestAliveAlly(s, 12);
  if (hurt && hurt.hp < 55 && (s.name === 'Elena' || s.healCd <= 0)) {
    moveToward(s, hurt.mesh.position, dt, 1.0, 2.2);
    if (dist2D(pos, hurt.mesh.position) < 3) {
      hurt.hp = Math.min(hurt.maxHp, hurt.hp + s.healRate * dt * gameSpeed);
      setThought(s, '+' + hurt.name);
      if (Math.random() < dt * 2) spawnHealFX(hurt.mesh.position);
    }
    return;
  }
  if (s.hp < 45 && baseResources.med > 0) { healSelf(s, dt); return; }
  // COMBATIR con kiteo
  var w = WEAPONS[s.weaponKey];
  var adsBonus = 1;
  if (nz.z) {
    s.state = isWaveActive ? 'DEFEND_BASE' : 'SCAVENGE';
    var d = nz.d;
    if (d > w.range) { moveToward(s, nz.z.mesh.position, dt, 1.0); }
    else if (d < w.range * 0.35) { // kiteo: alejarse
      var dx = pos.x - nz.z.mesh.position.x, dz = pos.z - nz.z.mesh.position.z;
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      moveToward(s, { x: pos.x + dx / l * 5, z: pos.z + dz / l * 5 }, dt, 1.0);
    } else { strafe(s, nz.z.mesh.position, dt); }
    faceToward(s, nz.z.mesh.position);
    // granada a grupos
    if (s.grenades > 0 && s.nadeCd <= 0 && near >= 3 && d < 20) { throwGrenade(s, nz.z.mesh.position); s.nadeCd = 6; }
    // bazuka Marcus
    if (s.bazooka && baseResources.heavy > 0 && nz.z.kind === 'titan' && s.cd <= 0) {
      baseResources.heavy--; s.cd = 3;
      fireMissileAt(pos, nz.z, 120, s);
    } else if (s.cd <= 0 && d <= w.range * 1.0) {
      npcShoot(s, nz.z, w);
    }
    return;
  }
  // TRANSPORTAR / RECOGER cajas (fase búsqueda)
  if (!isWaveActive) {
    if (s.carriedCrate) {
      var c0 = shelterCentroid();
      if (dist2D(pos, c0) < 8) { deliverCrate(s); }
      else moveToward(s, { x: c0.x, z: c0.z }, dt, 1.0);
      return;
    }
    var crate = nearestCrate(pos, 80);
    if (crate) { moveToward(s, crate.pos, dt, 1.0, 1.6); faceToward(s, crate.pos); if (dist2D(pos, crate.pos) < 1.8) pickupCrate(s, crate); return; }
    // construir / reparar
    if (helpConstruction(s, dt)) return;
    if (repairNearby(s, dt)) return;
    maybeExpandShelters(s);
    // patrullar / cazar rezagados
    var rz = nearestZombie(pos, 200);
    if (rz.z) moveToward(s, rz.z.mesh.position, dt, 0.9);
    else { var c2 = shelterCentroid(); var a = performance.now() / 9000 + survivors.indexOf(s); moveToward(s, { x: c2.x + Math.cos(a) * 14, z: c2.z + Math.sin(a) * 14 }, dt, 0.6); }
  } else {
    // en oleada sin objetivo: defender centroide o cazar
    var rz2 = nearestZombie(pos, 300);
    if (rz2.z) { moveToward(s, rz2.z.mesh.position, dt, 1.0); faceToward(s, rz2.z.mesh.position); if (s.cd <= 0 && rz2.d < w.range) npcShoot(s, rz2.z, w); }
  }
}
function strafe(s, target, dt) {
  var edt = dt * Math.max(1, gameSpeed);
  var t = performance.now() / 1000 + survivors.indexOf(s) * 2;
  var dx = s.mesh.position.x - target.x, dz = s.mesh.position.z - target.z;
  var l = Math.sqrt(dx * dx + dz * dz) || 1; dx /= l; dz /= l;
  var px = -dz * Math.sin(t), pz = dx * Math.sin(t);
  s.mesh.position.x += px * edt * 3; s.mesh.position.z += pz * edt * 3;
  animateEntityLimbs(s.mesh, edt, 1);
}
function moveToward(s, target, dt, mul, stopD) {
  var edt = dt * Math.max(1, gameSpeed);
  var dx = target.x - s.mesh.position.x, dz = target.z - s.mesh.position.z;
  var d = Math.sqrt(dx * dx + dz * dz);
  if (stopD && d < stopD) return;
  if (d < 0.05) return;
  var sp = (s.isPlayer ? 7 : 4.2) * (mul || 1) * edt;
  s.mesh.position.x += dx / d * sp; s.mesh.position.z += dz / d * sp;
  s.mesh.rotation.y = Math.atan2(dx, dz);
  animateEntityLimbs(s.mesh, dt, 1);
  if (!s.isPlayer) { s.energy = Math.max(0, s.energy - dt * 2); }
}
function faceToward(s, target) { s.mesh.rotation.y = Math.atan2(target.x - s.mesh.position.x, target.z - s.mesh.position.z); }
function npcShoot(s, z, w) {
  s.cd = w.cd;
  if (s.ammo <= 0) { if (baseResources.ammo > 0) { baseResources.ammo -= 10; s.ammo += 10; } else return; }
  s.ammo--;
  playSound('gun', { weapon: s.weaponKey });
  createMuzzleFlash(s.mesh.position, s.mesh.rotation.y);
  var pellets = w.pellets || 1;
  for (var i = 0; i < pellets; i++) {
    var dmg = rand(w.dmg[0], w.dmg[1]);
    damageZombie(z, dmg, s);
    if (!z.alive) break;
  }
}
function healSelf(s, dt) {
  if (baseResources.med <= 0) return;
  s.hp = Math.min(s.maxHp, s.hp + 25 * dt * gameSpeed);
  setThought(s, ' curándose');
  if (s.hp >= s.maxHp - 1) { baseResources.med--; s.healCd = 5; }
  spawnHealFX(s.mesh.position);
}
function nearestCrate(pos, maxD) {
  var best = null, bd = maxD;
  crates.forEach(function (c) { if (c.taken) return; var d = dist2D(pos, c.pos); if (d < bd) { bd = d; best = c; } });
  return best;
}
function pickupCrate(s, crate) {
  crate.taken = true; scene.remove(crate.mesh);
  crates.splice(crates.indexOf(crate), 1);
  s.carriedCrate = crate.kind;
  // mochila visible
  if (!s.pack) { var p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), mat(0xf59e0b)); p.position.set(0, 1.3, -0.28); s.mesh.add(p); s.pack = p; }
  setThought(s, '📦 ' + crate.kind);
  playSound('pickup');
  STATS.cratesPicked++;
}
function deliverCrate(s) {
  var k = s.carriedCrate; s.carriedCrate = null;
  if (s.pack) { s.mesh.remove(s.pack); s.pack = null; }
  applyCrateReward(k);
  setThought(s, 'entregado ✓');
}
function applyCrateReward(k) {
  if (k === 'materiales') baseResources.scrap = Math.min(1000, baseResources.scrap + rand(15, 30));
  else if (k === 'curas') baseResources.med += 2;
  else if (k === 'comida') baseResources.food += 3;
  else if (k === 'granadas') survivors.forEach(function (s) { if (s.alive) s.grenades = Math.min(5, s.grenades + 1); });
  else if (k === 'pesadas') baseResources.heavy += 2;
  else if (k === 'blindaje') baseResources.armor += 2;
  else if (k === 'armas' || k === 'rifle') baseResources.ammo += 30;
  else if (k === 'escopeta') baseResources.ammo += 16;
  else if (k === 'sniper') baseResources.ammo += 10;
  else baseResources.ammo += 20;
}
function helpConstruction(s, dt) {
  // buscar obra activa (torre andamio o outpost work)
  var job = (window._buildJobs || []).find(function (j) { return !j.done; });
  if (!job) return false;
  moveToward(s, job.pos, dt, 1.0, 2.5);
  if (dist2D(s.mesh.position, job.pos) < 3) { job.work -= dt * gameSpeed; setThought(s, '🔨 ' + Math.ceil(job.work) + 's'); }
  return true;
}
function repairNearby(s, dt) {
  for (var i = 0; i < walls.length; i++) {
    var wl = walls[i]; if (wl.hp < wl.maxHp && dist2D(s.mesh.position, wl.mesh.position) < 6) {
      if (dist2D(s.mesh.position, wl.mesh.position) > 2.5) moveToward(s, wl.mesh.position, dt, 1.0, 2.2);
      else { wl.hp = Math.min(wl.maxHp, wl.hp + 20 * dt * gameSpeed); setThought(s, '🔧 reparando'); }
      return true;
    }
  }
  // reparar depósito
  for (var k = 0; k < activeShelterKeys.length; k++) {
    var z = ZONES[activeShelterKeys[k]];
    if (z.depot && z.depot.hp < z.depot.maxHp && dist2D(s.mesh.position, z.depot.mesh.position) < 10) {
      z.depot.hp = Math.min(z.depot.maxHp, z.depot.hp + 30 * dt * gameSpeed); z.hp = z.depot.hp;
      setThought(s, '🔧 depósito'); return true;
    }
  }
  return false;
}
var expandCd = 30;
function maybeExpandShelters(s) {
  if (s.name !== 'Alex' && s.name !== 'Carlos') return;
  expandCd -= 1 / 60 * gameSpeed; if (expandCd > 0) return;
  expandCd = 30;
  var free = Object.keys(ZONES).filter(function (k) { return !ZONES[k].active; });
  if (!free.length || baseResources.scrap < 30) return;
  baseResources.scrap -= 30;
  activateShelter(free[0]);
  log('🧭 ' + s.name + ' fundó refugio ' + free[0]);
}
// ---- ZOMBIES ----
function updateZombies(dt) {
  for (var i = zombies.length - 1; i >= 0; i--) {
    var z = zombies[i]; if (!z.alive) continue;
    z.atkCd -= dt * gameSpeed; z.growlCd -= dt * gameSpeed;
    if (z.growlCd <= 0) { z.growlCd = rand(8, 20); if (dist2D(z.mesh.position, shelterCentroid()) < 60) playSound('zombie'); }
    var tgt = zombieTarget(z);
    if (!tgt) continue;
    var d = dist2D(z.mesh.position, tgt.pos);
    if (d > 1.6) {
      var dx = tgt.pos.x - z.mesh.position.x, dz = tgt.pos.z - z.mesh.position.z;
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      z.mesh.position.x += dx / l * z.speed * dt * gameSpeed;
      z.mesh.position.z += dz / l * z.speed * dt * gameSpeed;
      z.mesh.rotation.y = Math.atan2(dx, dz);
      animateEntityLimbs(z.mesh, dt, z.speed);
    } else if (z.atkCd <= 0) {
      z.atkCd = 1.1; z.mesh.rotation.y = Math.atan2(tgt.pos.x - z.mesh.position.x, tgt.pos.z - z.mesh.position.z);
      zombieAttack(z, tgt);
    }
  }
}
function zombieTarget(z) {
  // prioridad: dummies > muros/barricadas cercanos > supervivientes > depósito
  var zp = z.mesh.position, best = null, bd = 1e9;
  var j;
  for (j = 0; j < dummies.length; j++) { var dm = dummies[j]; if (dm.hp <= 0) continue; var d = dist2D(zp, dm.mesh.position); if (d < bd) { bd = d; best = { type: 'dummy', ref: dm, pos: dm.mesh.position }; } }
  if (best && bd < 25) return best;
  best = null; bd = 1e9;
  var k;
  for (k = 0; k < walls.length; k++) { var wl = walls[k]; if (wl.hp <= 0) continue; var d2 = dist2D(zp, wl.mesh.position); if (d2 < bd) { bd = d2; best = { type: 'wall', ref: wl, pos: wl.mesh.position }; } }
  for (k = 0; k < barricades.length; k++) { var b = barricades[k]; if (b.hp <= 0) continue; var d3 = dist2D(zp, b.mesh.position); if (d3 < bd) { bd = d3; best = { type: 'barricade', ref: b, pos: b.mesh.position }; } }
  if (best && bd < 6) return best;
  // superviviente más cercano (incluye tripulación tanque?)
  var bs = null, bsd = 1e9;
  survivors.forEach(function (s) { if (!s.alive) return; var d = dist2D(zp, s.mesh.position); if (d < bsd) { bsd = d; bs = s; } });
  if (tank.assembled && tank.hp > 0) { var dt2 = dist2D(zp, tank.mesh.position); if (dt2 < bsd) return { type: 'tank', ref: tank, pos: tank.mesh.position }; }
  if (bs && (bsd < 60 || !activeShelterKeys.length)) return { type: 'surv', ref: bs, pos: bs.mesh.position };
  // depósito más cercano
  var bz = null, bzd = 1e9;
  activeShelterKeys.forEach(function (key) { var zz = ZONES[key]; if (!zz.depot || zz.depot.hp <= 0) return; var d = dist2D(zp, zz.depot.mesh.position); if (d < bzd) { bzd = d; bz = zz; } });
  if (bz) return { type: 'depot', ref: bz, pos: bz.depot.mesh.position };
  if (bs) return { type: 'surv', ref: bs, pos: bs.mesh.position };
  return null;
}
function zombieAttack(z, tgt) {
  playZombieAttack(z.mesh);
  var dmg = z.dmg * rand(0.85, 1.15);
  if (tgt.type === 'surv') damageSurvivor(tgt.ref, dmg);
  else if (tgt.type === 'depot') { damageShelter(tgt.ref, dmg); spawnImpactFX(tgt.pos, 0xf59e0b); }
  else if (tgt.type === 'wall' || tgt.type === 'barricade') { tgt.ref.hp -= dmg; spawnImpactFX(tgt.pos, 0x9ca3af); if (tgt.ref.hp <= 0) removeStruct(tgt.ref, tgt.type); }
  else if (tgt.type === 'dummy') { tgt.ref.hp -= dmg; if (tgt.ref.hp <= 0) detonateDummy(tgt.ref); }
  else if (tgt.type === 'tank') { var rem = dmg; if (tank.armor > 0) { var ab = Math.min(tank.armor, rem); tank.armor -= ab; rem -= ab; } tank.hp -= rem; spawnImpactFX(tgt.pos, 0xfacc15); if (tank.hp <= 0) destroyTank(); }
}
function damageSurvivor(s, dmg) {
  if (!s.alive) return;
  if (s.armor > 0) { var ab = Math.min(s.armor * 10, dmg); dmg -= ab; }
  s.hp -= dmg;
  flashHit(s);
  spawnBlood(s.mesh.position, false);
  if (s.isPlayer) { damageFlash(dmg / 40); playSound('hurt'); addShake(0.35); }
  else if (dist2D(s.mesh.position, camera.position) < 25) playSound('hurt');
  if (s.hp <= 0) { s.hp = 0; s.alive = false; s.mesh.rotation.x = -Math.PI / 2; s.mesh.position.y = 0.3; spawnBlood(s.mesh.position, true); log('☠ ' + s.name + ' cayó'); killfeed('☠ ' + s.name + ' cayó'); checkGameOver(); }
}
function damageShelter(zone, dmg) {
  if (!zone.depot) return;
  zone.depot.hp -= dmg; zone.hp = Math.max(0, zone.depot.hp);
  if (zone.depot.hp <= 0) collapseShelter(zone);
}
function collapseShelter(zone) {
  zone.active = false;
  activeShelterKeys = activeShelterKeys.filter(function (k) { return k !== zone.name; });
  explodeAt(zone.depot.mesh.position, 10, 0);
  scene.remove(zone.depot.mesh);
  log('🔥 ¡Refugio ' + zone.name + ' DESTRUIDO!');
  toast('🔥 Refugio ' + zone.name + ' caído');
  checkGameOver();
}
function removeStruct(ref, type) {
  scene.remove(ref.mesh);
  var arr = type === 'wall' ? walls : barricades;
  arr.splice(arr.indexOf(ref), 1);
}
function damageZombie(z, dmg, killer) {
  if (!z.alive) return;
  z.hp -= dmg;
  showHitmarker();
  playHitFlinch(z.mesh);
  spawnBlood(z.mesh.position, false);
  if (z.hp <= 0) {
    z.alive = false;
    spawnBlood(z.mesh.position, true);
    // muerte: caída + hundido
    try { z.mesh.rotation.x = -Math.PI / 2; } catch (e) {}
    var _m = z.mesh;
    setTimeout(function () { try { scene.remove(_m); } catch (e) {} }, 900);
    zombies.splice(zombies.indexOf(z), 1);
    STATS.kills++;
    if (killer) { killer.kills = (killer.kills || 0) + 1; if (killer.isPlayer) addShake(0.12); }
    if (window.killfeed && Math.random() < 0.6) killfeed('☠ ' + (killer ? killer.name : 'Torreta') + ' → ' + ZOMBIE_TYPES[z.kind].name);
    if (Math.random() < 0.22) spawnLoot(z.mesh.position);
    if (isWaveActive && !zombies.length && !spawnQueue.length) endWave();
  }
}
// ---- torretas de refugio ----
function updateShelterTurrets(dt) {
  if (!isWaveActive) return;
  activeShelterKeys.forEach(function (k) {
    var t = ZONES[k].turret; if (!t) return;
    t.cd -= dt * gameSpeed; if (t.cd > 0) return;
    var nz = nearestZombie(t.mesh.position, t.range);
    if (nz.z) { t.cd = t.rate; playSound('turret'); damageZombie(nz.z, t.dmg * rand(0.9, 1.1), null); t.barrel.scale.z = 1.4; setTimeout(function () { t.barrel.scale.z = 1; }, 80); }
  });
}
// ---- rescate / game over ----
function checkGameOver() {
  var anyShelter = activeShelterKeys.length > 0;
  var anyAlive = survivors.some(function (s) { return s.alive; });
  if (!anyAlive && !anyShelter) showGameOver();
  else if (!anyAlive) showGameOver();
}
function rescueDrop() {
  var c = shelterCentroid();
  var names = ['Nina', 'Roco', 'Iris', 'Teo', 'Luz'];
  var weapons = ['rifle', 'shotgun', 'smg', 'sniper', 'pistol'];
  survivors = survivors.filter(function (s) { return s.isPlayer; });
  for (var i = 0; i < 5; i++) {
    var mesh = createHumanoid(0x22d3ee, false);
    mesh.position.set(c.x + rand(-4, 4), 0, c.z + rand(-4, 4)); scene.add(mesh);
    var gun = createWeaponMesh(weapons[i]); gun.position.set(0.36, 1.35, 0.4); mesh.add(gun);
    survivors.push({ name: names[i], role: 'Rescate', weaponKey: weapons[i], color: 0x22d3ee, mesh: mesh, gunMesh: gun, hp: 100, maxHp: 100, energy: 100, ammo: 60, grenades: 2, meds: 1, armor: 0, alive: true, isPlayer: false, state: 'SCAVENGE', cd: 0, nadeCd: 0, healCd: 0, targetCrate: null, carriedCrate: null, buildHelp: 0, towerOp: null, kills: 0, healRate: 25 });
  }
  if (playerIndex >= 0 && survivors[playerIndex] && !survivors[playerIndex].alive) { survivors[playerIndex].alive = true; survivors[playerIndex].hp = 100; }
  document.getElementById('gameover').classList.add('hidden');
  gameSpeed = 1; log('🚁 Rescate: 5 nuevos supervivientes');
}
