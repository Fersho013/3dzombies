// ===== COMBATE ULTRA: trazadoras, sangre, shake, casquillos, impactos =====
var camShake = 0, bloodPools = [], shells = [], sparks = [];
function addShake(v) { camShake = Math.min(1.2, camShake + v); }
function applyShake(dt) {
  if (camShake <= 0) return;
  camShake = Math.max(0, camShake - dt * 2.2);
  camera.position.x += rand(-1, 1) * camShake * 0.12;
  camera.position.y += rand(-1, 1) * camShake * 0.1;
  camera.rotation.z += rand(-1, 1) * camShake * 0.01;
}
function fireBullet(from, targetPos, range, dmg, owner) {
  projectiles.push({ from: from.clone(), to: targetPos.clone(), t: 0, speed: 70, range: range, dmg: dmg, owner: owner, mesh: makeTracer(from, targetPos) });
}
function makeTracer(a, b) {
  var g = new THREE.BufferGeometry().setFromPoints([a, b]);
  var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 }));
  scene.add(l); return l;
}
function ejectShell(pos, rotY) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.09), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  m.position.set(pos.x, 1.3, pos.z); scene.add(m);
  shells.push({ mesh: m, vx: Math.cos(rotY) * 2 + rand(-1, 1), vz: Math.sin(rotY) * 2 + rand(-1, 1), vy: 2.5, life: 0.9 });
}
function updateShells(dt) {
  for (var i = shells.length - 1; i >= 0; i--) {
    var s = shells[i]; s.life -= dt;
    s.vy -= 9 * dt; s.mesh.position.x += s.vx * dt; s.mesh.position.z += s.vz * dt; s.mesh.position.y = Math.max(0.03, s.mesh.position.y + s.vy * dt);
    s.mesh.rotation.x += dt * 12;
    if (s.life <= 0) { scene.remove(s.mesh); shells.splice(i, 1); }
  }
}
function updateProjectiles(dt) {
  var edt = dt * Math.max(1, gameSpeed);
  for (var i = projectiles.length - 1; i >= 0; i--) {
    var p = projectiles[i];
    p.t += edt * p.speed / 30;
    if (p.t >= 1) { scene.remove(p.mesh); projectiles.splice(i, 1); continue; }
    var mid = p.from.clone().lerp(p.to, Math.min(1, p.t));
    p.mesh.geometry.setFromPoints([p.from.clone().lerp(p.to, Math.max(0, p.t - 0.12)), mid]);
    p.mesh.material.opacity = 0.9 * (1 - p.t * 0.5);
  }
  updateShells(edt);
  // escombros de sangre se desvanecen
  for (var b = bloodPools.length - 1; b >= 0; b--) {
    bloodPools[b].life -= dt;
    if (bloodPools[b].life <= 0) { bloodPools[b].mesh.material.opacity -= dt; if (bloodPools[b].mesh.material.opacity <= 0.05) { scene.remove(bloodPools[b].mesh); bloodPools.splice(b, 1); } }
  }
}
function spawnBlood(pos, big) {
  var n = big ? 10 : 5;
  for (var i = 0; i < n; i++) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.05, 0.14)), new THREE.MeshBasicMaterial({ color: 0x991b1b, transparent: true, opacity: 1 }));
    m.position.set(pos.x + rand(-0.4, 0.4), rand(0.6, 1.6), pos.z + rand(-0.4, 0.4));
    scene.add(m);
    sparks.push({ mesh: m, vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-3, 3), life: rand(0.3, 0.7), grav: 9 });
  }
  // charco
  if (Math.random() < (big ? 0.9 : 0.35)) {
    var pool = new THREE.Mesh(new THREE.CircleGeometry(rand(0.4, big ? 1.3 : 0.8), 10), new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.75 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(pos.x + rand(-0.5, 0.5), 0.055, pos.z + rand(-0.5, 0.5));
    scene.add(pool); bloodPools.push({ mesh: pool, life: 25 });
  }
}
function spawnImpactFX(pos, color) {
  for (var i = 0; i < 6; i++) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: color || 0xfde68a }));
    m.position.set(pos.x, 1.2, pos.z); scene.add(m);
    sparks.push({ mesh: m, vx: rand(-4, 4), vy: rand(1, 4), vz: rand(-4, 4), life: 0.35, grav: 9 });
  }
}
function updateSparks(dt) {
  var edt = dt * Math.max(1, gameSpeed);
  for (var i = sparks.length - 1; i >= 0; i--) {
    var s = sparks[i]; s.life -= edt;
    s.vy -= s.grav * edt;
    s.mesh.position.x += s.vx * edt; s.mesh.position.y += s.vy * edt; s.mesh.position.z += s.vz * edt;
    if (s.mesh.position.y < 0.03) { s.mesh.position.y = 0.03; s.vy *= -0.3; }
    if (s.life <= 0) { scene.remove(s.mesh); sparks.splice(i, 1); }
  }
}
function createMuzzleFlash(pos, rotY, big) {
  var g = new THREE.Group();
  var f = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.42 : 0.26), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 1 }));
  g.add(f);
  var cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, big ? 1.4 : 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.9 }));
  cone.rotation.x = Math.PI / 2; cone.position.z = -0.4; g.add(cone);
  // luz real
  var li = new THREE.PointLight(0xfbbf24, 2.2, big ? 14 : 9); g.add(li);
  g.position.set(pos.x + Math.sin(rotY) * 0.9, 1.45, pos.z + Math.cos(rotY) * 0.9);
  g.rotation.y = rotY + Math.PI;
  scene.add(g);
  var t0 = performance.now();
  (function fade() {
    var k = (performance.now() - t0) / 110;
    if (k >= 1) { scene.remove(g); return; }
    g.scale.multiplyScalar(1.18); f.material.opacity = 1 - k; li.intensity = 2.2 * (1 - k);
    requestAnimationFrame(fade);
  })();
}
function explodeAt(pos, radius, dmg) {
  playSound('explosion'); addShake(0.7);
  var flash = new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 1 }));
  flash.position.set(pos.x, 1.2, pos.z); scene.add(flash);
  var fire = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.9 }));
  fire.position.set(pos.x, 1.4, pos.z); scene.add(fire);
  var li = new THREE.PointLight(0xfb923c, 4, radius * 4); li.position.set(pos.x, 3, pos.z); scene.add(li);
  var t0 = performance.now();
  (function anim() {
    var k = (performance.now() - t0) / 850;
    if (k >= 1) { scene.remove(flash); scene.remove(fire); scene.remove(li); return; }
    var s = 1 + k * radius * 0.55;
    flash.scale.set(s, s, s); fire.scale.set(s * 0.9, s * 0.9, s * 0.9);
    flash.material.opacity = 1 - k; fire.material.opacity = 0.9 * (1 - k); li.intensity = 4 * (1 - k);
    requestAnimationFrame(anim);
  })();
  // onda + humo + escombros
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 24), new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.15, pos.z); scene.add(ring);
  var t1 = performance.now();
  (function ringA() { var k = (performance.now() - t1) / 500; if (k >= 1) { scene.remove(ring); return; } ring.scale.multiplyScalar(1.25); ring.material.opacity = 0.9 * (1 - k); requestAnimationFrame(ringA); })();
  for (var i = 0; i < 14; i++) {
    var d = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: 0x44403c }));
    d.position.set(pos.x, 1, pos.z); scene.add(d);
    sparks.push({ mesh: d, vx: rand(-9, 9), vy: rand(3, 11), vz: rand(-9, 9), life: rand(0.6, 1.2), grav: 10 });
  }
  var smoke = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.45, 10, 10), new THREE.MeshBasicMaterial({ color: 0x1f2937, transparent: true, opacity: 0.55 }));
  smoke.position.set(pos.x, 2.5, pos.z); scene.add(smoke);
  setTimeout(function () { scene.remove(smoke); }, 1100);
  if (dmg > 0) {
    zombies.slice().forEach(function (z) { if (dist2D(pos, z.mesh.position) < radius) { spawnBlood(z.mesh.position, true); damageZombie(z, dmg * rand(0.8, 1.2), null); } });
    // daño a destruibles (entorno destruible real)
    destructibles.slice().forEach(function (dd) { if (dist2D(pos, dd.mesh.position) < radius + 1) damageDestructible(dd, dmg); });
  }
}
function spawnHealFX(pos) {
  var g = new THREE.Group();
  var c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.1), new THREE.MeshBasicMaterial({ color: 0x22c55e })); g.add(c);
  var c2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: 0x22c55e })); g.add(c2);
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 18), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -1.4; g.add(ring);
  g.position.set(pos.x, 2.3, pos.z); scene.add(g); healFXs.push({ mesh: g, life: 1.1 });
}
function updateHealFX(dt) {
  var edt = dt * Math.max(1, gameSpeed);
  for (var i = healFXs.length - 1; i >= 0; i--) {
    var h = healFXs[i]; h.life -= edt; h.mesh.position.y += edt * 1.4; h.mesh.rotation.y += edt * 3;
    if (h.life <= 0) { scene.remove(h.mesh); healFXs.splice(i, 1); }
  }
}
function spawnLoot(pos) {
  var kinds = ['ammo', 'med', 'scrap'];
  var k = kinds[Math.floor(Math.random() * kinds.length)];
  var col = k === 'med' ? 0xef4444 : k === 'ammo' ? 0xfacc15 : 0xf59e0b;
  var m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 }));
  m.position.set(pos.x + rand(-1, 1), 0.35, pos.z + rand(-1, 1)); m.castShadow = true; scene.add(m);
  loots.push({ mesh: m, kind: k, life: 45 });
}
function updateLoots(dt) {
  var edt = dt * Math.max(1, gameSpeed);
  for (var i = loots.length - 1; i >= 0; i--) {
    var l = loots[i]; l.life -= edt; l.mesh.rotation.y += edt * 2.2; l.mesh.position.y = 0.35 + Math.abs(Math.sin(performance.now() / 400 + i)) * 0.15;
    if (l.life <= 0 || l.life < 5 && Math.floor(l.life * 4) % 2 === 0) l.mesh.visible = l.life > 5 ? true : !l.mesh.visible;
    if (l.life <= 0) { scene.remove(l.mesh); loots.splice(i, 1); }
  }
  // cajas sin recoger también flotan
  crates.forEach(function (c) { c.bob += dt * 2; c.mesh.position.y = Math.sin(c.bob) * 0.06; c.mesh.rotation.y += dt * 0.4; });
}
function updateWave(dt) {
  if (!gameStarted) return;
  var edt = dt * Math.max(1, gameSpeed);
  if (!isWaveActive) {
    waveTimer -= edt;
    if (waveTimer <= 3 && waveTimer + edt >= 3 && !updateWave._w) { updateWave._w = true; playSound('alarm'); bossBanner('⚠ LA HORDA SE ACERCA'); }
    if (waveTimer > 4) updateWave._w = false;
    if (waveTimer <= 0) triggerWave();
  } else updateSpawns(dt);
}
function endWave() {
  isWaveActive = false; currentWave++;
  log('✅ Oleada superada. Recompensas + reparación 18%');
  toast('✅ Oleada superada · +recursos');
  bossBanner('✅ OLEADA SUPERADA');
  playSound('heal');
  baseResources.ammo += 40; baseResources.med += 2;
  baseResources.scrap = Math.min(1000, baseResources.scrap + 60);
  baseResources.heavy += 1;
  activeShelterKeys.forEach(function (k) {
    var z = ZONES[k]; if (z.depot) { z.depot.hp = Math.min(z.depot.maxHp, z.depot.hp + z.depot.maxHp * 0.18); z.hp = z.depot.hp; }
  });
  spawnInitialCrates(8);
  startWaveTimer();
}
function flashHit(s) { playHitFlinch(s.mesh); playSound('hit'); }
function showHitmarker() {
  var h = document.getElementById('hitmarker'); if (!h) return;
  h.classList.remove('hidden');
  clearTimeout(h._t); h._t = setTimeout(function () { h.classList.add('hidden'); }, 90);
}
