// ===== OUTPOSTS + puestos MG/torretas/trampas =====
function foundOutpostAt(pos, radius) {
  radius = radius || 14;
  var g = new THREE.Group();
  var ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.6, radius, 48), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  var flag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.15), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
  flag.position.y = 2.5; g.add(flag);
  var cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide }));
  cloth.position.set(0.85, 4.4, 0); g.add(cloth);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  // vincular zona libre si hay
  var free = Object.keys(ZONES).find(function (k) { return !ZONES[k].active; });
  var op = { mesh: g, pos: { x: pos.x, z: pos.z }, radius: radius, name: free || ('OUTPOST-' + (outposts.length + 1)), cloth: cloth };
  outposts.push(op);
  if (free) activateShelter(free);
  log('🏕 Outpost fundado (radio ' + radius + 'm)');
  return op;
}
function outpostAt(pos) {
  for (var i = 0; i < outposts.length; i++) { var o = outposts[i]; if (dist2D(pos, o.pos) < o.radius) return o; }
  return null;
}
function buildTurretPost(kind, pos) {
  var cfg = { fast: { dmg: [25, 40], range: 30, rate: 0.35, color: 0x22d3ee }, mg: { dmg: [18, 30], range: 36, rate: 0.09, color: 0xf59e0b }, mis: { dmg: [90, 130], range: 30, rate: 2.2, color: 0xef4444 } }[kind];
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  base.position.y = 0.6; base.castShadow = true; g.add(base);
  var head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: cfg.color }));
  head.position.y = 1.4; g.add(head);
  var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  bar.rotation.x = Math.PI / 2; bar.position.set(0, 1.4, 0.7); g.add(bar);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  turretPosts.push({ mesh: g, head: head, kind: kind, cfg: cfg, cd: 0 });
  STATS.built++;
  log('🔫 Torreta ' + kind + ' instalada');
}
function buildMGnest(pos) {
  // Torre ametralladora operable: andamio bajo + MG doble cañón
  var g = new THREE.Group();
  for (var i = 0; i < 4; i++) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.5), new THREE.MeshStandardMaterial({ color: 0x57534e }));
    leg.position.set(i % 2 ? 1.2 : -1.2, 2.25, i < 2 ? 1.2 : -1.2); g.add(leg);
  }
  var plat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 3.4), new THREE.MeshStandardMaterial({ color: 0x44403c }));
  plat.position.y = 4.5; plat.castShadow = true; g.add(plat);
  var mg = new THREE.Group();
  var b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8), new THREE.MeshStandardMaterial({ color: 0x111827 })); b1.rotation.x = Math.PI / 2; mg.add(b1);
  var b2 = b1.clone(); b2.position.x = 0.18; mg.add(b2);
  var abox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xf59e0b })); abox.position.set(-0.4, -0.3, 0); mg.add(abox);
  mg.position.y = 5.3; g.add(mg);
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  var nest = { mesh: g, mg: mg, cd: 0, operator: null, platY: 4.7 };
  turretPosts.push({ mesh: g, head: mg, kind: 'mgnest', cfg: { dmg: [18, 32], range: 38, rate: 0.09, color: 0xf59e0b }, cd: 0, nest: nest, isNest: true });
  STATS.built++;
  log('🎯 Torre MG operable lista (Z para subir)');
  return nest;
}
function buildSpikeTrap(pos) {
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 2.4), new THREE.MeshStandardMaterial({ color: 0x292524 })); base.position.y = 0.12; g.add(base);
  for (var i = 0; i < 9; i++) {
    var spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x9ca3af }));
    spike.position.set((i % 3 - 1) * 0.7, 0.6, (Math.floor(i / 3) - 1) * 0.7); g.add(spike);
  }
  g.position.set(pos.x, 0, pos.z); scene.add(g);
  traps.push({ mesh: g, cd: 0 });
  log('🦔 Trampa de pinchos (25 DMG/s)');
}
function buildWallAt(pos) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x78716c }));
  m.position.set(pos.x, 1.1, pos.z); m.castShadow = true; scene.add(m);
  walls.push({ mesh: m, hp: 300, maxHp: 300 });
}
function updateOutpostSystems(dt) {
  // puestos auto + nidos MG + trampas
  for (var i = 0; i < turretPosts.length; i++) {
    var p = turretPosts[i];
    p.cd -= dt * gameSpeed;
    if (p.isNest) { updateMGnest(p, dt); continue; }
    if (!isWaveActive || p.cd > 0) continue;
    var nz = nearestZombie(p.mesh.position, p.cfg.range);
    if (nz.z) {
      p.cd = p.cfg.rate;
      playSound('turret');
      p.head.rotation.y = Math.atan2(nz.z.mesh.position.x - p.mesh.position.x, nz.z.mesh.position.z - p.mesh.position.z);
      if (p.kind === 'mis') fireMissileAt(p.mesh.position, nz.z, rand(90, 130), null, 6);
      else { damageZombie(nz.z, rand(p.cfg.dmg[0], p.cfg.dmg[1]), null); createMuzzleFlash(p.mesh.position, p.head.rotation.y); }
    }
  }
  // trampas: 25 DMG cada 1s en 3m
  for (var t = 0; t < traps.length; t++) {
    var tr = traps[t]; tr.cd -= dt * gameSpeed;
    if (tr.cd > 0) continue;
    var hit = false;
    zombies.slice().forEach(function (z) { if (dist2D(tr.mesh.position, z.mesh.position) < 3) { damageZombie(z, 25, null); hit = true; } });
    if (hit) { tr.cd = 1; tr.mesh.position.y = -0.05; setTimeout(function () { tr.mesh.position.y = 0; }, 150); }
  }
}
function updateMGnest(p, dt) {
  var nest = p.nest;
  if (nest.operator) {
    var op = nest.operator;
    if (!op.alive) { dismountTower(op); return; }
    // NPC ráfagas automáticas; jugador dispara con click (player.js)
    if (!op.isPlayer) {
      p.cd -= dt * gameSpeed;
      if (p.cd <= 0) {
        var nz = nearestZombie(nest.mesh.position, 38);
        if (nz.z) { p.cd = 0.09; playSound('gun', { weapon: 'smg' }); damageZombie(nz.z, rand(18, 32), op); }
        else p.cd = 0.5;
      }
    }
  } else {
    // vigilancia lenta
    p.cd -= dt * gameSpeed;
    if (isWaveActive && p.cd <= 0) {
      var nz2 = nearestZombie(nest.mesh.position, 38);
      if (nz2.z) { p.cd = 0.6; damageZombie(nz2.z, rand(18, 32), null); }
      else p.cd = 0.5;
    }
  }
}
function nearestFreeTower(pos) {
  var best = null, bd = 12;
  turretPosts.forEach(function (p) {
    if (!p.isNest || p.nest.operator) return;
    var d = dist2D(pos, p.mesh.position);
    if (d < bd) { bd = d; best = p; }
  });
  // también torres vigía completas libres
  return best;
}
function mountTower(s, post) {
  if (s.towerOp) return;
  s.towerOp = post; post.nest.operator = s;
  s.mesh.position.set(post.mesh.position.x, post.nest.platY, post.mesh.position.z);
  setThought(s, '🗼 operando MG');
  log('🗼 ' + s.name + ' subió a la MG');
}
function dismountTower(s) {
  if (!s.towerOp) return;
  var post = s.towerOp;
  post.nest.operator = null; s.towerOp = null;
  s.mesh.position.y = 0;
  s.mesh.position.x += 2.5; s.mesh.position.z += 2.5;
}
