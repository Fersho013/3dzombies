// ===== COMBATE: proyectiles, oleada timer/fin, partículas =====
function fireBullet(from, targetPos, range, dmg, owner) {
  projectiles.push({ from: from.clone(), to: targetPos.clone(), t: 0, speed: 60, range: range, dmg: dmg, owner: owner, mesh: makeTracer(from, targetPos) });
}
function makeTracer(a, b) {
  var g = new THREE.BufferGeometry().setFromPoints([a, b]);
  var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 }));
  scene.add(l); return l;
}
function updateProjectiles(dt) {
  for (var i = projectiles.length - 1; i >= 0; i--) {
    var p = projectiles[i];
    p.t += dt * gameSpeed * p.speed / 30;
    if (p.t >= 1) { scene.remove(p.mesh); projectiles.splice(i, 1); continue; }
    // punto intermedio para efecto
    var mid = p.from.clone().lerp(p.to, Math.min(1, p.t));
    p.mesh.geometry.setFromPoints([p.from.clone().lerp(p.to, Math.max(0, p.t - 0.15)), mid]);
  }
}
function createMuzzleFlash(pos, rotY) {
  var g = new THREE.Group();
  var f = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 1 }));
  g.add(f);
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.5, 12), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  g.add(ring);
  g.position.set(pos.x + Math.sin(rotY) * 0.8, 1.4, pos.z + Math.cos(rotY) * 0.8);
  scene.add(g);
  var life = 0.12, t0 = performance.now();
  (function fade() {
    var k = (performance.now() - t0) / (life * 1000);
    if (k >= 1) { scene.remove(g); return; }
    g.scale.multiplyScalar(1.15); f.material.opacity = 1 - k;
    requestAnimationFrame(fade);
  })();
}
function explodeAt(pos, radius, dmg) {
  playSound('explosion');
  var flash = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.95 }));
  flash.position.set(pos.x, 1, pos.z); scene.add(flash);
  var t0 = performance.now();
  (function anim() {
    var k = (performance.now() - t0) / 900;
    if (k >= 1) { scene.remove(flash); return; }
    flash.scale.multiplyScalar(1.12); flash.material.opacity = 0.95 * (1 - k);
    requestAnimationFrame(anim);
  })();
  var smoke = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.4, 10, 10), new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 }));
  smoke.position.set(pos.x, 2, pos.z); scene.add(smoke);
  setTimeout(function () { scene.remove(smoke); }, 900);
  if (dmg > 0) {
    zombies.slice().forEach(function (z) { if (dist2D(pos, z.mesh.position) < radius) damageZombie(z, dmg * rand(0.8, 1.2), null); });
  }
}
function spawnHealFX(pos) {
  var c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  var c2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.32), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  var g = new THREE.Group(); g.add(c); g.add(c2);
  g.position.set(pos.x, 2.2, pos.z); scene.add(g); healFXs.push({ mesh: g, life: 1 });
}
function updateHealFX(dt) {
  for (var i = healFXs.length - 1; i >= 0; i--) {
    var h = healFXs[i]; h.life -= dt * gameSpeed; h.mesh.position.y += dt * 1.5; h.mesh.rotation.y += dt * 3;
    if (h.life <= 0) { scene.remove(h.mesh); healFXs.splice(i, 1); }
  }
}
function spawnLoot(pos) {
  var kinds = ['ammo', 'med', 'scrap'];
  var k = kinds[Math.floor(Math.random() * kinds.length)];
  var m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: k === 'med' ? 0xef4444 : k === 'ammo' ? 0xfacc15 : 0xf59e0b }));
  m.position.set(pos.x + rand(-1, 1), 0.3, pos.z + rand(-1, 1)); scene.add(m);
  loots.push({ mesh: m, kind: k, life: 45 });
}
function updateLoots(dt) {
  for (var i = loots.length - 1; i >= 0; i--) {
    var l = loots[i]; l.life -= dt * gameSpeed; l.mesh.rotation.y += dt * 2;
    if (l.life <= 0) { scene.remove(l.mesh); loots.splice(i, 1); }
  }
}
function updateWave(dt) {
  if (!gameStarted) return;
  if (!isWaveActive) {
    waveTimer -= dt * gameSpeed;
    if (waveTimer <= 0) triggerWave();
  } else updateSpawns(dt);
}
function endWave() {
  isWaveActive = false; currentWave++;
  log('✅ Oleada superada. Recompensas + reparación 18%');
  toast('✅ Oleada superada · +recursos');
  baseResources.ammo += 40; baseResources.med += 2;
  baseResources.scrap = Math.min(1000, baseResources.scrap + 60);
  baseResources.heavy += 1;
  activeShelterKeys.forEach(function (k) {
    var z = ZONES[k]; if (z.depot) { z.depot.hp = Math.min(z.depot.maxHp, z.depot.hp + z.depot.maxHp * 0.18); z.hp = z.depot.hp; }
  });
  spawnInitialCrates(8);
  startWaveTimer();
}
function flashHit(s) {
  if (!s.mesh) return;
  s.mesh.traverse(function (o) { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x7f1d1d); } });
  setTimeout(function () { if (s.mesh) s.mesh.traverse(function (o) { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0x000000); }); }, 120);
}
function showHitmarker() {
  var h = document.getElementById('hitmarker'); if (!h) return;
  h.classList.remove('hidden');
  clearTimeout(h._t); h._t = setTimeout(function () { h.classList.add('hidden'); }, 90);
}
