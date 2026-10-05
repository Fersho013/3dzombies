// ===== APOYO AÉREO + torres + tanque + granadas/misiles/dummies =====
function airBanner(txt) {
  var b = document.getElementById('air-banner');
  document.getElementById('air-banner-text').textContent = txt;
  b.classList.remove('hidden');
  clearTimeout(b._t); b._t = setTimeout(function () { b.classList.add('hidden'); }, 2500);
}
function callAirSupport(kind) {
  initAudioEngine();
  if (airCooldowns[kind] > 0 || gameSpeed === 0) return;
  airCooldowns[kind] = 10;
  var c = shelterCentroid();
  if (kind === 'missile') {
    airBanner('🚁 Helicóptero de ataque en camino');
    spawnAirUnit('heli', function (u) { fireMissileAt(u.mesh.position, { mesh: { position: new THREE.Vector3(c.x + rand(-10, 10), 0, c.z + rand(-10, 10)) } }, 130, null, 8); });
  } else if (kind === 'supply') {
    airBanner('✈ Avión de suministro: rifle + granadas');
    spawnAirUnit('plane', function () {
      baseResources.ammo += 40;
      survivors.forEach(function (s) { if (s.alive) s.grenades = Math.min(5, s.grenades + 2); });
      spawnCrate([c.x + 5, 0, c.z + 5], 'rifle'); spawnCrate([c.x - 5, 0, c.z - 5], 'granadas');
    });
  } else if (kind === 'material') {
    airBanner('✈ Avión de materiales: escombro x2');
    spawnAirUnit('plane', function () { baseResources.scrap = Math.min(1000, baseResources.scrap + 80); spawnCrate([c.x, 0, c.z + 8], 'materiales'); spawnCrate([c.x, 0, c.z - 8], 'materiales'); });
  } else if (kind === 'heal') {
    airBanner('💚 Apoyo médico: curación inmediata');
    survivors.forEach(function (s) { if (s.alive) { s.hp = Math.min(s.maxHp, s.hp + 60); spawnHealFX(s.mesh.position); } });
    playSound('heal');
  } else if (kind === 'wall') {
    airBanner('🚁 Helicóptero barricada: muro prefab');
    spawnAirUnit('heli', function () {
      var a = rand(0, 6.28);
      dropWall(c.x + Math.cos(a) * 16, c.z + Math.sin(a) * 16);
    });
  }
  log('📡 Apoyo: ' + kind);
}
function spawnAirUnit(type, onArrive) {
  var g = new THREE.Group();
  var bodyMat = new THREE.MeshStandardMaterial({ color: type === 'plane' ? 0x94a3b8 : 0x166534 });
  var body = new THREE.Mesh(new THREE.BoxGeometry(type === 'plane' ? 6 : 4, 1, 1.6), bodyMat); g.add(body);
  var wing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, type === 'plane' ? 9 : 7), bodyMat); g.add(wing);
  var c = shelterCentroid();
  g.position.set(c.x - 120, 32, c.z); scene.add(g);
  airUnits.push({ mesh: g, t: 0, onArrive: onArrive, target: new THREE.Vector3(c.x, 30, c.z) });
}
function updateAirUnits(dt) {
  for (var i = airUnits.length - 1; i >= 0; i--) {
    var u = airUnits[i];
    var dir = u.target.clone().sub(u.mesh.position);
    var d = dir.length();
    if (d < 3) {
      if (u.onArrive) u.onArrive(u);
      // seguir y salir
      u.target = u.mesh.position.clone().add(new THREE.Vector3(150, 0, 0));
      u.done = true;
    }
    u.mesh.position.add(dir.normalize().multiplyScalar(28 * dt * Math.max(1, gameSpeed)));
    u.mesh.rotation.y = Math.atan2(dir.x, dir.z) - Math.PI / 2 + Math.PI / 2;
    if (u.done && Math.abs(u.mesh.position.x - shelterCentroid().x) > 140) { scene.remove(u.mesh); airUnits.splice(i, 1); }
  }
  for (var k in airCooldowns) if (airCooldowns[k] > 0) airCooldowns[k] -= dt * gameSpeed;
}
// ---- granadas ----
function throwGrenade(s, targetPos) {
  if (s.grenades <= 0) return;
  s.grenades--;
  var m = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
  m.position.set(s.mesh.position.x, 1.2, s.mesh.position.z); scene.add(m);
  grenades.push({ mesh: m, from: m.position.clone(), to: new THREE.Vector3(targetPos.x, 0, targetPos.z), t: 0, owner: s });
  setThought(s, '💣 ¡Granada!');
}
function updateGrenades(dt) {
  for (var i = grenades.length - 1; i >= 0; i--) {
    var g = grenades[i]; g.t += dt * gameSpeed * 1.2;
    g.mesh.position.lerpVectors(g.from, g.to, Math.min(1, g.t));
    g.mesh.position.y = 1.2 + Math.sin(Math.min(1, g.t) * Math.PI) * 3;
    if (g.t >= 1) { scene.remove(g.mesh); explodeAt(g.to, 7, 95); grenades.splice(i, 1); }
  }
}
// ---- misiles ----
function fireMissileAt(fromPos, target, dmg, owner, radius) {
  var m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  m.position.set(fromPos.x, 6, fromPos.z); scene.add(m);
  missiles.push({ mesh: m, target: target, dmg: dmg || 110, radius: radius || 8, t: 0, owner: owner });
  playSound('explosion');
}
function updateMissiles(dt) {
  for (var i = missiles.length - 1; i >= 0; i--) {
    var m = missiles[i];
    var tp = m.target.mesh ? m.target.mesh.position : m.target;
    var dir = new THREE.Vector3(tp.x - m.mesh.position.x, 0 - m.mesh.position.y, tp.z - m.mesh.position.z);
    var d = dir.length();
    m.mesh.position.add(dir.normalize().multiplyScalar(30 * dt * Math.max(1, gameSpeed)));
    m.mesh.rotation.x = 1.2;
    if (d < 2.5) { explodeAt(tp, m.radius, m.dmg); scene.remove(m.mesh); missiles.splice(i, 1); }
  }
}
// ---- muros / barricadas / dummies ----
function dropWall(x, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
  m.position.set(x, 1.25, z); m.castShadow = true; scene.add(m);
  var wl = { mesh: m, hp: 300, maxHp: 300 };
  walls.push(wl);
  if (typeof addDynamicSolid === 'function') addDynamicSolid(wl, x, z, 4, 0.7);
  log('🧱 Muro desplegado');
}
function buildDummyAt(pos) {
  if (dummies.length >= 3) { toast('Máx 3 señuelos'); return; }
  if (baseResources.heavy < 0 && false) return;
  var alive = survivors.find(function (s) { return s.alive && s.grenades > 0; });
  var m = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 1), new THREE.MeshStandardMaterial({ color: 0xf43f5e }));
  m.position.set(pos.x, 0.9, pos.z); m.castShadow = true; scene.add(m);
  dummies.push({ mesh: m, hp: 200 });
  log('🎯 Señuelo colocado');
}
function detonateDummy(d) { explodeAt(d.mesh.position, 8, 150); scene.remove(d.mesh); dummies.splice(dummies.indexOf(d), 1); }
// ---- TORRES (andamio -> plataforma + misiles) ----
window._buildJobs = [];
function buildLookoutTower(pos) {
  var g = new THREE.Group();
  for (var i = 0; i < 4; i++) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 7), new THREE.MeshStandardMaterial({ color: 0x92400e }));
    leg.position.set(i % 2 ? 1.4 : -1.4, 3.5, i < 2 ? 1.4 : -1.4); g.add(leg);
  }
  var plat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x78350f }));
  plat.position.y = 7; plat.castShadow = true; g.add(plat);
  var rail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
  rail.position.set(0, 7.6, -1.9); g.add(rail);
  var flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.7), new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide }));
  flag.position.set(0, 8.4, 0); g.add(flag);
  // torreta misiles en plataforma
  var tur = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }));
  tur.position.y = 7.6; g.add(tur);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  var T = { mesh: g, flag: flag, turret: tur, cd: 0, slots: [null, null], hp: 800 };
  towers.push(T); STATS.built++;
  log('🗼 Torre vigía lista (2 plazas francotirador)');
  return T;
}
// ---- TANQUE ----
function defineTankYard(pos) {
  if (tank.yard) return tank.yard;
  var ring = new THREE.Mesh(new THREE.RingGeometry(11.4, 12, 40), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.07, pos.z); scene.add(ring);
  tank.yard = { mesh: ring, pos: { x: pos.x, z: pos.z } };
  log('🟧 Patio ámbar del tanque fijado (12m)');
  return tank.yard;
}
function addTankPiece() {
  tank.pieces++;
  log('🔩 Pieza tanque ' + tank.pieces + '/5');
  if (tank.yard) {
    var em = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), new THREE.MeshStandardMaterial({ color: 0x365314 }));
    em.position.set(tank.yard.pos.x + rand(-6, 6), 0.7, tank.yard.pos.z + rand(-6, 6)); em.castShadow = true; scene.add(em);
  }
  if (tank.pieces >= 5 && !tank.assembled) assembleTank();
}
function assembleTank() {
  tank.assembled = true; tank.hp = 10000; tank.armor = 2000;
  var g = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x3f6212 })); hull.position.y = 1.2; hull.castShadow = true; g.add(hull);
  var turret = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), new THREE.MeshStandardMaterial({ color: 0x365314 })); turret.position.y = 2.4; g.add(turret);
  var cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.5), new THREE.MeshStandardMaterial({ color: 0x111827 })); cannon.rotation.x = Math.PI / 2; cannon.position.set(0, 2.4, 3); g.add(cannon);
  var c = shelterCentroid();
  g.position.set(c.x + 10, 0, c.z + 10); scene.add(g);
  tank.mesh = g; tank.turret = turret; tank.cannon = cannon; tank.cd = 0;
  // tripulación: hasta 5 que salen a cazar en oleada
  tank.crew = survivors.filter(function (s) { return s.alive && !s.isPlayer; }).slice(0, 5);
  log('🛡 ¡TANQUE ENSAMBLADO! 10.000 HP + blindaje 2.000');
  toast('🛡 TANQUE listo');
  airBanner('🛡 Tanque operativo');
}
function destroyTank() { if (tank.mesh) explodeAt(tank.mesh.position, 12, 0); log('💥 Tanque destruido'); tank.assembled = false; }
function updateTank(dt) {
  if (!tank.assembled || tank.hp <= 0) return;
  tank.cd -= dt * gameSpeed; if (tank.cd > 0) return;
  var tp = tank.mesh.position;
  var nz = nearestZombie(tp, 45);
  if (nz.z) {
    tank.cd = 1.2;
    fireMissileAt(tp, nz.z, 160, null, 7);
    tank.turret.rotation.y = Math.atan2(nz.z.mesh.position.x - tp.x, nz.z.mesh.position.z - tp.z);
  }
}
// torretas de torre vigía (misiles auto 30m 70dmg área 8m 2.5s)
function updateTowerTurrets(dt) {
  towers.forEach(function (t) {
    t.cd -= dt * gameSpeed;
    if (t.flag) t.flag.rotation.y += dt * 2;
    if (!isWaveActive || t.cd > 0) return;
    var nz = nearestZombie(t.mesh.position, 30);
    if (nz.z) { t.cd = 2.5; fireMissileAt(t.mesh.position, nz.z, 70, null, 8); }
  });
}
