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
  // ronda especial CoD cada 5 oleadas: sabuesos rápidos
  if (currentWave >= 5 && currentWave % 5 === 0) {
    var nH = 6 + currentWave * 2;
    push('hound', nH);
    log('🐺 ¡RONDA DE SABUESOS! ' + nH);
    toast('🐺 Ronda de sabuesos');
  }
  // shuffle
  spawnQueue.sort(function () { return Math.random() - 0.5; });
  spawnTimer = 0;
  log('🌊 OLEADA ' + currentWave + ': ' + n + ' zombies (' + nCraw + 'R/' + nMed + 'C/' + nTit + 'T)');
  if (gameMode === 'participant' && playerIndex >= 0) lockPointer();
}
ZOMBIE_TYPES.hound = ZOMBIE_TYPES.hound || { name: 'Sabueso', hpMul: 0.7, spdMul: 2.1, dmgMul: 0.9, scale: 0.7, color: 0xdc2626 };
var powerTimers = { insta: 0, doublePts: 0 };
var powerups = [];
function spawnZombie(kind, x, z) {
  var T = ZOMBIE_TYPES[kind];
  var mesh = createHumanoid(0xffffff, true, kind === 'hound' ? 'crawler' : kind);
  // salir del suelo estilo CoD: nace hundido + tierra
  mesh.position.set(x, kind === 'hound' ? 0 : -1.7, z); scene.add(mesh);
  if (kind !== 'hound' && typeof spawnImpactFX === 'function') spawnImpactFX({ x: x, z: z }, 0x57534e);
  var baseHp = 40 + currentWave * 6;
  // velocidad CoD: andan oleadas 1-4, corren 5+, sprint 8+; sabuesos siempre sprint
  var roundBoost = 1 + Math.min(0.9, currentWave * 0.06);
  var houndBoost = kind === 'hound' ? 1.35 : 1;
  zombies.push({
    kind: kind, mesh: mesh, hp: baseHp * T.hpMul, maxHp: baseHp * T.hpMul,
    speed: (0.085 + Math.random() * 0.035) * T.spdMul * 60 * 0.16 * roundBoost * houndBoost,
    dmg: (5 + currentWave * 0.7) * T.dmgMul,
    atkCd: 0, alive: true, growlCd: rand(4, 12), rise: kind === 'hound' ? 0 : 1.1, lungeCd: 0
  });
  if (Math.random() < 0.2) playSound('zombie');
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
  survivors.forEach(function (o) { if (o === s || !o.alive || o.downed) return; var d = dist2D(s.mesh.position, o.mesh.position); if (d < bd) { bd = d; best = o; } });
  return best;
}
// ---- IA SUPERVIVIENTES TÁCTICA Warzone: ráfagas, focus, cobertura, reanimar ----
function updateSurvivorAI(s, dt) {
  if (!s.alive || s.isPlayer || s.towerOp) return;
  if (typeof updateInsideMemory === 'function') updateInsideMemory(s);
  if (s.downed) { // desangrándose 30s
    s.reviveT -= dt * gameSpeed;
    if (Math.floor(s.reviveT) % 5 === 0 && Math.random() < dt) setThought(s, '¡Ayuda! ' + Math.ceil(s.reviveT) + 's');
    if (s.reviveT <= 0) { s.downed = false; s.alive = false; s.hp = 0; try { s.mesh.rotation.x = -Math.PI / 2; } catch (e) {} log('☠ ' + s.name + ' desangrado'); checkGameOver(); }
    return;
  }
  if (s.mag === undefined) { s.mag = WEAPONS[s.weaponKey].mag; s.burst = 0; s.burstPause = 0; s.crouchT = 0; }
  s.cd -= dt * gameSpeed; s.nadeCd -= dt * gameSpeed; s.healCd -= dt * gameSpeed; s.burstPause -= dt * gameSpeed;
  if (s.meleeCd) s.meleeCd -= dt * gameSpeed;
  var pos = s.mesh.position;
  // 0) REANIMAR: máxima prioridad (como Warzone ping + humo)
  var down = null, bd0 = 30;
  survivors.forEach(function (o) { if (o === s || !o.alive || !o.downed) return; var d = dist2D(pos, o.mesh.position); if (d < bd0) { bd0 = d; down = o; } });
  if (down) {
    s.state = 'REVIVE';
    moveToward(s, down.mesh.position, dt, 1.15, 2.2);
    if (dist2D(pos, down.mesh.position) < 2.6) {
      down.hp = Math.min(60, down.hp + 22 * dt * gameSpeed);
      setThought(s, '🚑 ' + down.name);
      if (Math.random() < dt * 2) spawnHealFX(down.mesh.position);
      if (down.hp >= 60) reviveSurvivor(down);
    }
    return;
  }
  // contar amenaza local + focus titán (focus fire)
  var near = 0, nz = priorityTarget(pos);
  zombies.forEach(function (z) { if (z.alive && dist2D(pos, z.mesh.position) < 12) near++; });
  var garrison = survivors.filter(function (o) { return o.alive && !o.downed && dist2D(pos, o.mesh.position) < 15; }).length;
  // HUIR: >5 zombies y >2.6x guarnición
  if (near > 5 && near > garrison * 2.6) {
    s.state = 'FLEE';
    var c = shelterCentroid();
    moveToward(s, { x: c.x, z: c.z }, dt, 1.25);
    setThought(s, '¡Retirada!');
    if (s.hp < 60) healSelf(s, dt);
    return;
  }
  // CURAR: aliado crítico cerca (Elena prioriza) + auto-placa si tiene
  if ((s.armorHP || 0) <= 0 && baseResources.armor > 0 && near === 0 && (s.plates || 0) < 1) { baseResources.armor--; s.plates = (s.plates || 0) + 1; s.armorHP = 50; setThought(s, '🛡 placa'); }
  var hurt = nearestAliveAlly(s, 12);
  if (hurt && !hurt.downed && hurt.hp < 55 && (s.name === 'Elena' || s.healCd <= 0)) {
    moveToward(s, hurt.mesh.position, dt, 1.0, 2.2);
    if (dist2D(pos, hurt.mesh.position) < 3) {
      hurt.hp = Math.min(hurt.maxHp, hurt.hp + s.healRate * dt * gameSpeed);
      setThought(s, '+' + hurt.name);
      if (Math.random() < dt * 2) spawnHealFX(hurt.mesh.position);
    }
    return;
  }
  if (s.hp < 45 && baseResources.med > 0) { healSelf(s, dt); return; }
  // COMBATIR táctico: distancia ideal por arma + strafe + agacharse + ráfagas
  var w = WEAPONS[s.weaponKey];
  if (nz.z) {
    s.state = isWaveActive ? 'DEFEND_BASE' : 'SCAVENGE';
    var d = nz.d;
    var ideal = w.range * (s.weaponKey === 'sniper' ? 0.8 : s.weaponKey === 'shotgun' ? 0.4 : 0.6);
    if (d > w.range) { moveToward(s, nz.z.mesh.position, dt, 1.0); s.crouchT = 0; }
    else if (d < ideal * 0.5) { // kiteo: alejarse
      var dx = pos.x - nz.z.mesh.position.x, dz = pos.z - nz.z.mesh.position.z;
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      moveToward(s, { x: pos.x + dx / l * 5, z: pos.z + dz / l * 5 }, dt, 1.0);
    } else {
      strafe(s, nz.z.mesh.position, dt);
      // agacharse para precisión si lejos y a salvo (como Warzone mount)
      s.crouchT = (d > 10 && near < 2) ? 1 : 0;
      try { s.mesh.scale.y += ((s.crouchT ? 0.75 : 1) - s.mesh.scale.y) * Math.min(1, dt * 6); } catch (e) {}
    }
    faceToward(s, nz.z.mesh.position);
    // melee si encima (cuchillo)
    if (d < 2.2 && (s.meleeCd || 0) <= 0) { s.meleeCd = 0.8; damageZombie(nz.z, 45, s); playSound('hit'); }
    // granada a grupos
    if (s.grenades > 0 && s.nadeCd <= 0 && near >= 3 && d < 20) { throwGrenade(s, nz.z.mesh.position); s.nadeCd = 6; setThought(s, '💣 fuera!'); }
    // bazuka Marcus a titán
    if (s.bazooka && baseResources.heavy > 0 && nz.z.kind === 'titan' && s.cd <= 0) {
      baseResources.heavy--; s.cd = 3;
      fireMissileAt(pos, nz.z, 120, s);
    } else if (s.cd <= 0 && s.burstPause <= 0 && d <= w.range) {
      npcShootBurst(s, nz.z, w, d);
    }
    return;
  }
  // TRANSPORTAR / RECOGER cajas (fase búsqueda): llena hasta 3/3 pasando por puertas
  if (!isWaveActive) {
    var n = crateCount(s);
    if (n >= 3 || (s.carriedCrates.length && !nearestCrate(pos, 40))) {
      var c0 = shelterCentroid();
      if (dist2D(pos, c0) < 8) { deliverCrate(s); }
      else navigateWithDoors(s, { x: c0.x, z: c0.z }, dt, 1.0);
      return;
    }
    var crate = nearestCrate(pos, 80);
    if (crate) {
      var rr = navigateWithDoors(s, crate.pos, dt, 1.6);
      faceToward(s, crate.pos);
      if (dist2D(pos, crate.pos) < 1.9) { pickupCrate(s, crate); }
      if (rr === 'stuck') { s.targetCrate = null; }
      return;
    }
    // construir / reparar / comprar CoD (exploración con propósito)
    if (typeof npcCodShopping === 'function' && npcCodShopping(s, dt)) return;
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
  if (typeof tryMoveGround === 'function') tryMoveGround(s.mesh.position, px * edt * 3, pz * edt * 3, 0.5);
  else { s.mesh.position.x += px * edt * 3; s.mesh.position.z += pz * edt * 3; }
  animateEntityLimbs(s.mesh, edt, 1);
}
// moveToward CoD con colisión + rodeo + anti-atasco + abandono de objetivo inalcanzable
function moveToward(s, target, dt, mul, stopD) {
  var edt = dt * Math.max(1, gameSpeed);
  var dx = target.x - s.mesh.position.x, dz = target.z - s.mesh.position.z;
  var d = Math.sqrt(dx * dx + dz * dz);
  if (stopD && d < stopD) { s._stuckT = 0; return true; }
  if (d < 0.05) { s._stuckT = 0; return true; }
  var sp = (s.isPlayer ? 7 : 4.2) * (mul || 1) * edt;
  var nx = dx / d, nzz = dz / d;
  // rodeo inteligente si hay muro delante
  if (typeof steerDir === 'function' && !s.isPlayer) {
    var st = steerDir(s.mesh.position, target.x, target.z, 0.5);
    nx = st.x; nzz = st.z;
    if (st.blocked) {
      // golpeando muro: atacar lo que estorba (puerta/muro) en vez de atascarse
      s._stuckT = (s._stuckT || 0) + dt;
      if (s._stuckT > 0.8) { bashBlocking(s); s._stuckT = 0; }
    }
  }
  var moved = 0;
  if (typeof tryMoveGround === 'function') moved = tryMoveGround(s.mesh.position, nx * sp, nzz * sp, 0.5);
  else { s.mesh.position.x += nx * sp; s.mesh.position.z += nzz * sp; moved = sp; }
  s.mesh.rotation.y = Math.atan2(nx, nzz);
  animateEntityLimbs(s.mesh, dt, 1);
  if (!s.isPlayer) s.energy = Math.max(0, s.energy - dt * 2);
  // anti-atasco: si no avanza hacia el objetivo, rodeo lateral y luego nuevo objetivo
  s._lastD = s._lastD === undefined ? d : s._lastD;
  if (moved < sp * 0.25) {
    s._stuckT = (s._stuckT || 0) + dt;
    // desvío lateral inmediato
    var side = (s._side || 1);
    if (typeof tryMoveGround === 'function') tryMoveGround(s.mesh.position, -nzz * side * sp, nx * side * sp, 0.5);
    if (s._stuckT > 1.4) { s._side = -side; s._stuckT = 0.6; }
    if (s._stuckT > 3 && !s.isPlayer) {
      // objetivo inalcanzable → buscar nuevo objetivo (otra caja/patrulla) y micro-teleport anti-softlock
      s._stuckT = 0; s.targetCrate = null;
      if (typeof tryMoveGround === 'function') tryMoveGround(s.mesh.position, rand(-2, 2), rand(-2, 2), 0.5);
      setThought(s, '↩ rodeo');
      return 'stuck';
    }
  } else {
    s._stuckT = Math.max(0, (s._stuckT || 0) - dt * 2);
    if (d < s._lastD - 0.02) s._side = s._side || 1;
  }
  s._lastD = d;
  return moved;
}
// golpear lo que bloquea el paso (puerta cerrada/muro) en vez de quedarse quieto
function bashBlocking(s) {
  var bp = s.mesh.position;
  var best = null, bd = 2.6;
  for (var i = 0; i < doors.length; i++) {
    var dr = doors[i];
    if (dr.open) continue;
    var dd = dist2D(bp, dr.mesh.position);
    if (dd < bd) { bd = dd; best = dr; }
  }
  if (best) { toggleDoor(best); setThought(s, '🚪'); return; }
  for (var j = 0; j < destructibles.length; j++) {
    var d = destructibles[j];
    if (d.dead || d.name === 'MALL') continue;
    if (dist2D(bp, d.mesh.position) < 2.4) { damageDestructible(d, 25); setThought(s, '💥 aparta!'); break; }
  }
}
function faceToward(s, target) { s.mesh.rotation.y = Math.atan2(target.x - s.mesh.position.x, target.z - s.mesh.position.z); }
// focus fire: titán > bruto > rastrero cercano (todos focusean al mismo gordo)
function priorityTarget(pos) {
  var best = null, bd = 1e9, bk = -1;
  var prio = { titan: 3, brute: 2, crawler: 1 };
  for (var i = 0; i < zombies.length; i++) {
    var z = zombies[i]; if (!z.alive) continue;
    var d = dist2D(pos, z.mesh.position);
    if (d > 34) continue;
    var score = (prio[z.kind] || 0) * 100 - d;
    if (!best || (prio[z.kind] > bk) || (prio[z.kind] === bk && d < bd)) { best = z; bd = d; bk = prio[z.kind]; }
  }
  return { z: best, d: bd };
}
function npcShoot(s, z, w) { npcShootBurst(s, z, w, dist2D(s.mesh.position, z.mesh.position)); }
function npcShootBurst(s, z, w, dist) {
  // ráfagas Warzone: 4 tiros SMG/rifle, 1 sniper/escopeta, pausa control retroceso
  if ((s.mag || 0) <= 0) {
    if (baseResources.ammo > 0) { var take = Math.min(w.mag, baseResources.ammo); baseResources.ammo -= take; s.mag = take; s.ammo = take; s.burstPause = w.reload * 0.5; setThought(s, '🔄 recargando'); playSound('reload'); }
    else return;
  }
  var burstLen = s.weaponKey === 'sniper' ? 1 : s.weaponKey === 'shotgun' ? 1 : s.weaponKey === 'smg' ? 5 : 4;
  s.burst = (s.burst || 0) + 1;
  s.cd = w.cd;
  s.mag--; s.ammo = s.mag;
  playSound('gun', { weapon: s.weaponKey });
  createMuzzleFlash(s.mesh.position, s.mesh.rotation.y);
  // precisión NPC por distancia + agachado + arma (simula ADS)
  var acc = s.weaponKey === 'sniper' ? 0.95 : s.weaponKey === 'shotgun' ? (dist < 8 ? 0.9 : 0.5) : clamp(1 - dist / (w.range * 1.6), 0.35, 0.92);
  if (s.crouchT) acc = Math.min(0.95, acc + 0.12);
  if (Math.random() > acc) { if (s.burst >= burstLen) { s.burst = 0; s.burstPause = s.weaponKey === 'sniper' ? 1.1 : 0.45; } return; }
  var pellets = w.pellets || 1;
  for (var i = 0; i < pellets; i++) {
    damageZombie(z, warzoneDamage(w, dist), s);
    if (!z.alive) break;
  }
  if (s.burst >= burstLen) { s.burst = 0; s.burstPause = s.weaponKey === 'smg' ? 0.35 : s.weaponKey === 'sniper' ? 1.2 : 0.5; }
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
function crateCount(s) { s.carriedCrates = s.carriedCrates || (s.carriedCrate ? [s.carriedCrate] : []); return s.carriedCrates.length; }
function pickupCrate(s, crate) {
  s.carriedCrates = s.carriedCrates || (s.carriedCrate ? [s.carriedCrate] : []);
  if (s.carriedCrates.length >= 3) { if (s.isPlayer) toast('🎒 Lleno 3/3 — entrega en depósito'); return false; }
  crate.taken = true; scene.remove(crate.mesh);
  crates.splice(crates.indexOf(crate), 1);
  s.carriedCrates.push(crate.kind);
  s.carriedCrate = s.carriedCrates[0];
  // mochila visible (crece con la carga)
  if (!s.pack) { var p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), mat(0xf59e0b)); p.position.set(0, 1.3, -0.28); s.mesh.add(p); s.pack = p; }
  if (s.pack) s.pack.scale.set(1, 1 + s.carriedCrates.length * 0.35, 1);
  setThought(s, '📦 ' + crate.kind + ' (' + s.carriedCrates.length + '/3)');
  playSound('pickup');
  STATS.cratesPicked++;
  return true;
}
function deliverCrate(s) {
  s.carriedCrates = s.carriedCrates || (s.carriedCrate ? [s.carriedCrate] : []);
  if (!s.carriedCrates.length) return;
  var list = s.carriedCrates.slice();
  s.carriedCrates = []; s.carriedCrate = null;
  if (s.pack) { s.mesh.remove(s.pack); s.pack = null; }
  list.forEach(function (k) { applyCrateReward(k, s); });
  setThought(s, 'entregado ' + list.length + '/3 ✓');
  if (s.isPlayer) toast('📦 Entregadas ' + list.length + '/3');
}
function applyCrateReward(k) {
  // TODO con propósito temático (nada es decorativo):
  if (k === 'materiales') { baseResources.scrap = Math.min(1000, baseResources.scrap + rand(15, 30)); toast('🧱 Escombro → construir/reparar'); }
  else if (k === 'curas') { baseResources.med += 2; toast('⛑ Botiquines → curar [F] / reanimar'); }
  else if (k === 'comida') { baseResources.food += 3; survivors.forEach(function (s) { if (s.alive && s.isPlayer) s.hunger = Math.min(100, (s.hunger || 80) + 12); }); toast('🍖 Comida → hambre/energía/vida [5]'); }
  else if (k === 'granadas') { survivors.forEach(function (s) { if (s.alive) s.grenades = Math.min(5, s.grenades + 1); }); toast('💣 Letal → [Q] / LB mando'); }
  else if (k === 'pesadas') { baseResources.heavy += 2; toast('🚀 Pesadas → bazooka Marcus + misiles'); }
  else if (k === 'blindaje') { baseResources.armor += 2; toast('🛡 Placas → [4] 50 blindaje c/u'); }
  else if (k === 'melee') { baseResources.meleeLvl = (baseResources.meleeLvl || 0) + 1; baseResources.ammo += 8; toast('🔪 Cuchillo +15% → [H]'); }
  else if (k === 'armas' || k === 'rifle') { baseResources.ammo += 30; unlockForAll('rifle'); }
  else if (k === 'escopeta') { baseResources.ammo += 16; unlockForAll('shotgun'); }
  else if (k === 'sniper') { baseResources.ammo += 10; unlockForAll('sniper'); }
  else baseResources.ammo += 20;
}
function unlockForAll(wk) {
  survivors.forEach(function (s) {
    if (!s.alive) return;
    s.slots = s.slots || [s.weaponKey, 'pistol'];
    if (s.slots.indexOf(wk) < 0 && s.slots.length < 3) { s.slots.push(wk); if (s.isPlayer) toast('🔓 Desbloqueada: ' + WEAPONS[wk].name + ' [1/2]'); }
  });
}
function helpConstruction(s, dt) {
  // buscar obra activa (torre andamio o outpost work)
  var job = (window._buildJobs || []).find(function (j) { return !j.done; });
  if (!job) return false;
  navigateWithDoors(s, job.pos, dt, 2.5);
  if (dist2D(s.mesh.position, job.pos) < 3) { job.work -= dt * gameSpeed; setThought(s, '🔨 ' + Math.ceil(job.work) + 's'); }
  return true;
}
function repairNearby(s, dt) {
  for (var i = 0; i < walls.length; i++) {
    var wl = walls[i]; if (wl.hp < wl.maxHp && dist2D(s.mesh.position, wl.mesh.position) < 6) {
      if (dist2D(s.mesh.position, wl.mesh.position) > 2.5) navigateWithDoors(s, wl.mesh.position, dt, 2.2);
      else {
        wl.hp = Math.min(wl.maxHp, wl.hp + 20 * dt * gameSpeed); setThought(s, '🔧 reparando');
        s._repT = (s._repT || 0) + dt; if (s._repT > 2 && typeof givePoints === 'function') { s._repT = 0; givePoints(s, 10, 'reparar'); }
      }
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
// NPC exploran economía CoD: si tienen puntos van a caja/pared (exploración garantizada)
function npcCodShopping(s, dt) {
  s.points = s.points || 0;
  if (s.points < 750 || isWaveActive) return false;
  // arma actual floja → buscar mejora
  var weak = (s.weaponKey === 'pistol');
  if (!weak && s.points < 950) return false;
  var target = null, buy = null;
  if (typeof mysteryBoxes !== 'undefined' && s.points >= 950) {
    var bb = null, bd = 1e9;
    mysteryBoxes.forEach(function (b) { var d = dist2D(s.mesh.position, { x: b.x, z: b.z }); if (d < bd) { bd = d; bb = b; } });
    if (bb && bd < 60) { target = { x: bb.x, z: bb.z }; buy = 'box'; }
  }
  if (!target && typeof wallbuys !== 'undefined') {
    var wb = null, wd = 1e9;
    wallbuys.forEach(function (w) { var d = dist2D(s.mesh.position, { x: w.x, z: w.z }); if (d < wd) { wd = d; wb = w; } });
    if (wb && wd < 50 && s.points >= wb.def.cost) { target = { x: wb.x, z: wb.z }; buy = wb; }
  }
  if (!target) return false;
  s.state = 'SHOPPING';
  navigateWithDoors(s, target, dt, 2.2);
  if (dist2D(s.mesh.position, target) < 2.6) {
    if (buy === 'box' && s.points >= 950) {
      s.points -= 950;
      var pool = ['rifle', 'smg', 'shotgun', 'sniper'];
      var wk = pool[Math.floor(Math.random() * pool.length)];
      s.slots = s.slots || [s.weaponKey]; if (s.slots.indexOf(wk) < 0) s.slots.push(wk);
      s.weaponKey = wk; s.mag = WEAPONS[wk].mag;
      if (s.gunMesh) { try { s.mesh.remove(s.gunMesh); } catch (e) {} }
      s.gunMesh = createWeaponMesh(wk); s.gunMesh.position.set(0.36, 1.35, 0.45); s.mesh.add(s.gunMesh);
      setThought(s, '📦 ¡' + WEAPONS[wk].name + '!');
    } else if (buy && buy.def && s.points >= buy.def.cost) {
      s.points -= buy.def.cost;
      s.weaponKey = buy.def.weapon; s.mag = WEAPONS[buy.def.weapon].mag;
      setThought(s, '🔫 ' + WEAPONS[buy.def.weapon].name);
    }
  }
  return true;
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
// ---- ZOMBIES CoD: salen del suelo, embisten, sabuesos saltan ----
function updateZombies(dt) {
  if (typeof updatePowerups === 'function') updatePowerups(dt);
  for (var i = zombies.length - 1; i >= 0; i--) {
    var z = zombies[i]; if (!z.alive) continue;
    z.atkCd -= dt * gameSpeed; z.growlCd -= dt * gameSpeed; z.lungeCd = Math.max(0, (z.lungeCd || 0) - dt * gameSpeed);
    // nacer del suelo: 1.1s vulnerable pero inmóvil
    if (z.rise > 0) {
      z.rise -= dt * gameSpeed;
      z.mesh.position.y = -1.7 * Math.max(0, z.rise / 1.1);
      if (z.rise <= 0) { z.mesh.position.y = 0; playSound('zombie'); }
      animateEntityLimbs(z.mesh, dt, 0.3);
      continue;
    }
    if (z.growlCd <= 0) { z.growlCd = rand(8, 20); if (dist2D(z.mesh.position, shelterCentroid()) < 60) playSound('zombie'); }
    var tgt = zombieTarget(z);
    if (!tgt) continue;
    var d = dist2D(z.mesh.position, tgt.pos);
    if (d > 1.6) {
      var dx = tgt.pos.x - z.mesh.position.x, dz = tgt.pos.z - z.mesh.position.z;
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      var step = z.speed * dt * gameSpeed;
      var moved = 0;
      // rodeo + colisión: la horda fluye por puertas/huecos, no atraviesa
      if (typeof steerDir === 'function') {
        var sd = steerDir(z.mesh.position, tgt.pos.x, tgt.pos.z, 0.5);
        if (typeof tryMoveGround === 'function') moved = tryMoveGround(z.mesh.position, sd.x / (Math.sqrt(sd.x * sd.x + sd.z * sd.z) || 1) * step, sd.z / (Math.sqrt(sd.x * sd.x + sd.z * sd.z) || 1) * step, 0.5);
        else { z.mesh.position.x += dx / l * step; z.mesh.position.z += dz / l * step; moved = step; }
        z.mesh.rotation.y = Math.atan2(sd.x, sd.z);
        // si el muro lo frena, morderlo
        if (moved < step * 0.3) {
          z._bashT = (z._bashT || 0) + dt;
          if (z._bashT > 0.7 && z.atkCd <= 0) { z._bashT = 0; z.atkCd = 1.1; zombieAttack(z, tgt); }
        } else z._bashT = 0;
      } else {
        z.mesh.position.x += dx / l * step;
        z.mesh.position.z += dz / l * step;
        z.mesh.rotation.y = Math.atan2(dx, dz);
      }
      animateEntityLimbs(z.mesh, dt, z.speed);
      // sabuesos: salto final 2.5m (embestida CoD)
      if (z.kind === 'hound' && d < 4 && d > 1.6 && z.lungeCd <= 0) {
        z.lungeCd = 2.5;
        var lx = (tgt.pos.x - z.mesh.position.x) / (d || 1), lz = (tgt.pos.z - z.mesh.position.z) / (d || 1);
        if (typeof tryMoveGround === 'function') tryMoveGround(z.mesh.position, lx * 2.2, lz * 2.2, 0.5);
        playSound('zombie');
      }
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
  if (s.downed) { s.hp -= dmg * 0.4; if (s.hp <= -30) { s.downed = false; s.alive = false; s.hp = 0; try { s.mesh.rotation.x = -Math.PI / 2; } catch (e) {} log('☠ ' + s.name + ' rematado'); killfeed('☠ ' + s.name + ' rematado'); checkGameOver(); } return; }
  // placas estilo Warzone absorben primero (50 por placa)
  if ((s.armorHP || 0) > 0) { var ab2 = Math.min(s.armorHP, dmg); s.armorHP -= ab2; dmg -= ab2; spawnImpactFX(s.mesh.position, 0x93c5fd); if (s.armorHP <= 0 && (s.plates || 0) > 0) { s.plates--; if (s.armorHP < 0) { s.hp += s.armorHP; s.armorHP = 0; } toast('🛡 Placa rota ' + s.name); } if (dmg <= 0) { flashHit(s); return; } }
  else if (s.armor > 0) { var ab = Math.min(s.armor * 10, dmg); dmg -= ab; }
  s.hp -= dmg;
  flashHit(s);
  spawnBlood(s.mesh.position, false);
  if (s.isPlayer) { damageFlash(dmg / 40); playSound('hurt'); addShake(0.35); }
  else if (dist2D(s.mesh.position, camera.position) < 25) playSound('hurt');
  // Warzone: derribo antes de muerte → reanimable con F (aliado o jugador)
  if (s.hp <= 0 && !s.downed) {
    s.downed = true; s.hp = 25; s.reviveT = 30;
    try { s.mesh.rotation.x = -Math.PI / 2.4; s.mesh.position.y = 0.35; } catch (e) {}
    setThought(s, '¡DERIBADO! ¡Reanímame [F]!');
    log('🩸 ' + s.name + ' DERIBADO — reanima con F'); killfeed('🩸 ' + s.name + ' derribado');
    bossBanner('🩸 ' + s.name.toUpperCase() + ' DERIBADO', 0.5);
    playSound('alarm');
    checkGameOver();
  }
}
function reviveSurvivor(s) {
  s.downed = false; s.hp = 60; s.reviveT = 0;
  try { s.mesh.rotation.x = 0; s.mesh.position.y = 0; } catch (e) {}
  spawnHealFX(s.mesh.position); playSound('heal');
  log('🚑 ' + s.name + ' reanimado'); killfeed('🚑 ' + s.name + ' reanimado');
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
  if (typeof removeDynamicSolid === 'function') removeDynamicSolid(ref);
  var arr = type === 'wall' ? walls : barricades;
  arr.splice(arr.indexOf(ref), 1);
}
function damageZombie(z, dmg, killer) {
  if (!z.alive) return;
  // headshot CoD (ADS preciso): 18% x2 + puntos extra
  var headshot = false;
  if (killer && killer.isPlayer && typeof playerInput !== 'undefined' && playerInput.ads && Math.random() < 0.18) { dmg *= 2; headshot = true; }
  if (typeof powerTimers !== 'undefined' && powerTimers.insta > 0) dmg = 9999;
  z.hp -= dmg;
  showHitmarker();
  if (headshot && killer && killer.isPlayer) toast('💀 HEADSHOT x2');
  if (killer && typeof givePoints === 'function') givePoints(killer, headshot ? 15 : 10);
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
    // puntos CoD por tipo
    if (killer && typeof givePoints === 'function') {
      var pts = z.kind === 'titan' ? 150 : z.kind === 'brute' ? 100 : z.kind === 'hound' ? 80 : 60;
      givePoints(killer, pts, (headshot ? 'HS ' : '') + ZOMBIE_TYPES[z.kind].name);
    }
    if (window.killfeed && Math.random() < 0.6) killfeed('☠ ' + (killer ? killer.name : 'Torreta') + ' → ' + ZOMBIE_TYPES[z.kind].name + (headshot ? ' 💀' : ''));
    // drops CoD: 7% potenciador, si no 22% loot
    if (Math.random() < 0.07 && typeof spawnPowerup === 'function') spawnPowerup(z.mesh.position);
    else if (Math.random() < 0.22) spawnLoot(z.mesh.position);
    if (isWaveActive && !zombies.length && !spawnQueue.length) endWave();
  }
}
// ===== POTENCIADORES CoD: munición máxima / muerte instantánea / doble puntos =====
function spawnPowerup(pos) {
  var kinds = ['maxammo', 'insta', 'double'];
  var k = kinds[Math.floor(Math.random() * kinds.length)];
  var col = k === 'maxammo' ? 0x4ade80 : k === 'insta' ? 0xef4444 : 0xfacc15;
  var m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: col }));
  m.position.set(pos.x, 0.8, pos.z); scene.add(m);
  powerups.push({ mesh: m, kind: k, life: 30 });
  if (window.killfeed) killfeed('✨ Cayó ' + k);
  playSound('heal');
}
function updatePowerups(dt) {
  var edt = dt * Math.max(1, gameSpeed);
  powerTimers.insta = Math.max(0, powerTimers.insta - edt);
  powerTimers.doublePts = Math.max(0, powerTimers.doublePts - edt);
  for (var i = powerups.length - 1; i >= 0; i--) {
    var p = powerups[i]; p.life -= edt; p.mesh.rotation.y += edt * 3; p.mesh.position.y = 0.8 + Math.sin(performance.now() / 300) * 0.15;
    var taken = false;
    survivors.forEach(function (s) {
      if (taken || !s.alive || s.downed) return;
      if (dist2D(s.mesh.position, p.mesh.position) < 1.8) {
        taken = true;
        if (p.kind === 'maxammo') {
          survivors.forEach(function (o) { if (o.alive) { var w = WEAPONS[o.weaponKey]; o.mag = w.mag; o.ammo = w.mag; } });
          baseResources.ammo += 60; toast('💚 ¡MUNICIÓN MÁXIMA!'); bossBanner('💚 MUNICIÓN MÁXIMA');
        } else if (p.kind === 'insta') { powerTimers.insta = 30; toast('💀 ¡MUERTE INSTANTÁNEA 30s!'); bossBanner('💀 INSTAKILL 30s'); }
        else { powerTimers.doublePts = 30; toast('⭐ ¡DOBLE PUNTOS 30s!'); bossBanner('⭐ DOBLE PUNTOS 30s'); }
        playSound('heal');
      }
    });
    if (taken || p.life <= 0) { scene.remove(p.mesh); powerups.splice(i, 1); }
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
