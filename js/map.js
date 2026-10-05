// ===== MAPA ULTRA: texturas canvas, casas accesibles, entorno destruible =====
var destructibles = [], interiors = [], lampsFlicker = [];
function canvasTex(size, fn) {
  var c = document.createElement('canvas'); c.width = c.height = size;
  fn(c.getContext('2d'), size);
  var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
var TEX = {};
function makeTextures() {
  TEX.asphalt = canvasTex(256, function (g, s) {
    g.fillStyle = '#1c2430'; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 2500; i++) { g.fillStyle = 'rgba(' + (140 + Math.random() * 60 | 0) + ',' + (140 + Math.random() * 60 | 0) + ',' + (150 + Math.random() * 60 | 0) + ',' + (Math.random() * 0.08) + ')'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,.35)'; for (var k = 0; k < 12; k++) { g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 22, 0, 7); g.fill(); }
  });
  TEX.asphalt.repeat.set(24, 24);
  TEX.grass = canvasTex(256, function (g, s) {
    g.fillStyle = '#14291c'; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 3000; i++) { g.fillStyle = 'rgba(' + (20 + Math.random() * 40 | 0) + ',' + (90 + Math.random() * 70 | 0) + ',' + (40 + Math.random() * 40 | 0) + ',.5)'; g.fillRect(Math.random() * s, Math.random() * s, 1, 3); }
  });
  TEX.grass.repeat.set(24, 24);
  TEX.facade = canvasTex(256, function (g, s) {
    g.fillStyle = '#2a3547'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#111827'; for (var y = 12; y < s; y += 42) for (var x = 12; x < s; x += 36) { g.fillRect(x, y, 22, 26); g.fillStyle = Math.random() < 0.25 ? '#fde68a' : '#0b1220'; g.fillRect(x + 2, y + 2, 18, 22); g.fillStyle = '#111827'; }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, s - 14, s, 14);
  });
  TEX.concrete = canvasTex(128, function (g, s) {
    g.fillStyle = '#3a3f47'; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 900; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.15 + ')'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  });
  TEX.concrete.repeat.set(6, 6);
}
function buildCityMap() {
  makeTextures();
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var roadMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt, roughness: 0.95 });
  [[0, 0, 220, 12], [0, 0, 12, 220]].forEach(function (r) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(r[2], r[3]), roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(r[0], 0.02, r[1]); m.receiveShadow = true; scene.add(m);
  });
  for (var i = -100; i <= 100; i += 20) {
    var dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    dash.rotation.x = -Math.PI / 2; dash.position.set(i, 0.045, 0); scene.add(dash);
  }
  buildZoneMall(); buildZoneHouses(); buildZonePark(); buildZoneParking();
  buildStreetProps();
  spawnExplosiveBarrels();
}
function box(w, h, d, color, x, y, z, ry) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 }));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function buildZoneMall() {
  var facade = new THREE.MeshStandardMaterial({ map: TEX.facade, roughness: 0.85 });
  var main = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 20), facade);
  main.position.set(0, 5, -14); main.castShadow = main.receiveShadow = true; scene.add(main);
  destructibles.push({ mesh: main, hp: 1200, maxHp: 1200, name: 'MALL', onDestroy: function (p) { collapseRubble(p, 0x2a3547, 8); } });
  box(36, 1, 22, 0x0ea5e9, 0, 10.4, -14);
  var sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 0.5), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  sign.position.set(0, 8, -3.8); scene.add(sign);
  // puerta accesible del mall: interior con loot
  makeInterior([0, 0, -3], 12, 8, 'MALL');
}
function buildZoneHouses() {
  var p = ZONES.HOUSES.pos;
  var cols = [0x78350f, 0x365314, 0x44403c, 0x134e4a, 0x4c1d95];
  for (var i = 0; i < 5; i++) {
    (function (i) {
      var hx = p[0] + (i % 3) * 15 - 15, hz = p[2] + Math.floor(i / 3) * 13 - 6;
      var facade = new THREE.MeshStandardMaterial({ map: TEX.facade, roughness: 0.9, color: cols[i] });
      var h = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7), facade);
      h.position.set(hx, 2.5, hz); h.castShadow = h.receiveShadow = true; scene.add(h);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(6, 2, 4), new THREE.MeshStandardMaterial({ color: 0x7f1d1d }));
      roof.position.set(hx, 6, hz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof);
      // puerta: hueco + luz interior cálida
      var door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
      door.position.set(hx, 1.2, hz + 3.53); scene.add(door);
      var li = new THREE.PointLight(0xfde68a, 0.7, 12); li.position.set(hx, 2, hz + 2); scene.add(li);
      var H = { mesh: h, roof: roof, hp: 600, maxHp: 600, name: 'Casa ' + (i + 1), onDestroy: function (pp) { collapseRubble(pp, cols[i], 5); scene.remove(roof); } };
      destructibles.push(H);
      makeInterior([hx, 0, hz], 6.5, 5.5, 'Casa ' + (i + 1));
    })(i);
  }
}
function makeInterior(center, w, d, label) {
  // zona accesible: suelo distinto + loot + trigger E
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: TEX.concrete, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(center[0], 0.05, center[2]); floor.receiveShadow = true; scene.add(floor);
  var it = { x: center[0], z: center[2], w: w, d: d, label: label, looted: 0 };
  interiors.push(it);
  // 2 cajas interiores por casa
  spawnCrate([center[0] + rand(-2, 2), 0, center[2] + rand(-2, 2)], CRATE_KINDS[Math.floor(Math.random() * CRATE_KINDS.length)]);
  if (Math.random() < 0.7) spawnCrate([center[0] + rand(-2, 2), 0, center[2] + rand(-2, 2)], 'materiales');
  return it;
}
function insideInterior(pos) {
  for (var i = 0; i < interiors.length; i++) { var it = interiors[i]; if (Math.abs(pos.x - it.x) < it.w / 2 && Math.abs(pos.z - it.z) < it.d / 2) return it; }
  return null;
}
function buildZonePark() {
  var p = ZONES.PARK.pos;
  var grass = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1, color: 0x9ca3af }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(p[0], 0.035, p[2]); grass.receiveShadow = true; scene.add(grass);
  for (var i = 0; i < 9; i++) {
    (function () {
      var tx = p[0] + rand(-20, 20), tz = p[2] + rand(-20, 20);
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
      trunk.position.set(tx, 1.5, tz); trunk.castShadow = true; scene.add(trunk);
      var top = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.2, 7), new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 1 }));
      top.position.set(tx, 4.6, tz); top.castShadow = true; scene.add(top);
      destructibles.push({ mesh: trunk, extra: [top], hp: 120, maxHp: 120, name: 'Árbol', onDestroy: function () { scene.remove(top); collapseRubble(trunk.position, 0x166534, 2); scene.remove(trunk); } });
    })();
  }
  // quiosco destruible con loot
  var k = box(4, 3, 4, 0x065f46, p[0] + 8, 1.5, p[2] - 8);
  destructibles.push({ mesh: k, hp: 300, maxHp: 300, name: 'Quiosco', loot: true, onDestroy: function (pp) { collapseRubble(pp, 0x065f46, 4); spawnCrate([pp.x, 0, pp.z], 'comida'); } });
}
function buildZoneParking() {
  var p = ZONES.PARKING.pos;
  var slab = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), new THREE.MeshStandardMaterial({ map: TEX.concrete }));
  slab.rotation.x = -Math.PI / 2; slab.position.set(p[0], 0.035, p[2]); slab.receiveShadow = true; scene.add(slab);
  var carCols = [0xdc2626, 0x2563eb, 0xfacc15, 0x9ca3af, 0x16a34a, 0x7c3aed];
  for (var i = 0; i < 6; i++) {
    (function (i) {
      var g = new THREE.Group();
      var bodyM = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 1.9), new THREE.MeshStandardMaterial({ color: carCols[i], roughness: 0.35, metalness: 0.6 }));
      bodyM.position.y = 0.85; bodyM.castShadow = true; g.add(bodyM);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 1.7), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 }));
      cab.position.set(-0.2, 1.7, 0); g.add(cab);
      // ruedas
      [[-1.3, 0.95], [1.3, 0.95], [-1.3, -0.95], [1.3, -0.95]].forEach(function (wpos) {
        var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x09090b }));
        wh.rotation.x = Math.PI / 2; wh.position.set(wpos[0], 0.42, wpos[1]); g.add(wh);
      });
      // faros
      var hl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 1.6), new THREE.MeshBasicMaterial({ color: 0xfef9c3 }));
      hl.position.set(2.02, 0.9, 0); g.add(hl);
      g.position.set(p[0] - 13 + i * 5.2, 0, p[2] - 6 + (i % 2) * 10);
      scene.add(g);
      destructibles.push({ mesh: g, hp: 220, maxHp: 220, name: 'Coche', explosive: true, onDestroy: function (pp) { explodeAt(pp, 7, 110); collapseRubble(pp, 0x27272a, 5); scene.remove(g); } });
    })(i);
  }
}
function buildStreetProps() {
  for (var l = 0; l < 12; l++) {
    (function () {
      var x = rand(-100, 100), z = rand(-100, 100);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 7), new THREE.MeshStandardMaterial({ color: 0x374151 }));
      pole.position.set(x, 3.5, z); pole.castShadow = true; scene.add(pole);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
      lamp.position.set(x, 7.1, z); scene.add(lamp);
      var pl = new THREE.PointLight(0xfde68a, 0.55, 26); pl.position.copy(lamp.position); scene.add(pl);
      lampsFlicker.push({ light: pl, seed: Math.random() * 10 });
      destructibles.push({ mesh: pole, hp: 80, maxHp: 80, name: 'Farola', onDestroy: function () { scene.remove(lamp); scene.remove(pl); scene.remove(pole); } });
    })();
  }
}
function spawnExplosiveBarrels() {
  for (var i = 0; i < 10; i++) {
    (function () {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
      var x = rand(-85, 85), z = rand(-85, 85);
      m.position.set(x, 0.6, z); m.castShadow = true; scene.add(m);
      var band = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      band.position.y = 0.2; m.add(band);
      destructibles.push({ mesh: m, hp: 40, maxHp: 40, name: 'Barril', explosive: true, onDestroy: function (pp) { explodeAt(pp, 8, 140); scene.remove(m); } });
    })();
  }
}
function collapseRubble(pos, color, n) {
  for (var i = 0; i < (n || 4); i++) {
    var r = new THREE.Mesh(new THREE.BoxGeometry(rand(0.4, 1.2), rand(0.3, 0.9), rand(0.4, 1.2)), new THREE.MeshStandardMaterial({ color: color, roughness: 1 }));
    r.position.set(pos.x + rand(-2.5, 2.5), 0.3, pos.z + rand(-2.5, 2.5));
    r.rotation.set(rand(0, 1), rand(0, 3), rand(0, 1)); r.castShadow = true; scene.add(r);
  }
  playSound('explosion');
}
function damageDestructible(d, dmg) {
  d.hp -= dmg;
  // chispas + humo leve
  if (Math.random() < 0.4) spawnImpactFX(d.mesh.position, 0x9ca3af);
  if (d.hp <= 0 && !d.dead) {
    d.dead = true;
    var pp = d.mesh.position.clone ? d.mesh.position.clone() : new THREE.Vector3(d.mesh.position.x, 0, d.mesh.position.z);
    if (d.onDestroy) d.onDestroy(pp);
    var idx = destructibles.indexOf(d); if (idx >= 0) destructibles.splice(idx, 1);
    if (window.killfeed) killfeed('💥 ' + d.name + ' destruido');
  }
}
function updateStreetLife(dt) {
  var t = performance.now() / 1000;
  lampsFlicker.forEach(function (L) {
    L.light.intensity = 0.55 + Math.sin(t * 7 + L.seed) * 0.04 + (Math.random() < 0.015 ? -0.3 : 0);
  });
}
function scatterCityRuins() {
  for (var i = 0; i < 22; i++) {
    var r = box(rand(1, 3), rand(0.6, 2.2), rand(1, 3), 0x334155, rand(-100, 100), 0.5, rand(-100, 100), rand(0, 3));
    r.rotation.z = rand(-0.15, 0.15);
    destructibles.push({ mesh: r, hp: 150, maxHp: 150, name: 'Ruina', onDestroy: function (pp) { collapseRubble(pp, 0x334155, 3); scene.remove(r); } });
  }
}
var CRATE_KINDS = ['rifle', 'escopeta', 'sniper', 'granadas', 'curas', 'comida', 'blindaje', 'materiales', 'materiales', 'pesadas', 'melee', 'armas'];
function spawnInitialCrates(n) {
  for (var i = 0; i < (n || 14); i++) spawnCrate([rand(-80, 80), 0, rand(-80, 80)], CRATE_KINDS[Math.floor(Math.random() * CRATE_KINDS.length)]);
}
function spawnCrate(pos, kind) {
  var g = new THREE.Group();
  var col = kind === 'materiales' ? 0xf59e0b : kind === 'curas' ? 0xef4444 : kind === 'pesadas' ? 0x7c3aed : 0x10b981;
  var m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }));
  m.position.y = 0.5; m.castShadow = true; g.add(m);
  // tapa + símbolo
  var lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.14, 1.04), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  lid.position.y = 1.0; g.add(lid);
  var glow = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 1.06), new THREE.MeshBasicMaterial({ color: col }));
  glow.position.y = 0.12; g.add(glow);
  g.position.set(pos[0], 0, pos[2]); scene.add(g);
  crates.push({ mesh: g, pos: g.position, kind: kind, taken: false, bob: Math.random() * 6 });
}
