// ===== MAPA: ciudad 220x220, carreteras, edificios, ruinas =====
function buildCityMap() {
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  [[0, 0, 220, 10], [0, 0, 10, 220]].forEach(function (r) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(r[2], r[3]), roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(r[0], 0.02, r[1]); m.receiveShadow = true; scene.add(m);
  });
  for (var i = -100; i <= 100; i += 20) {
    var dash = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    dash.rotation.x = -Math.PI / 2; dash.position.set(i, 0.04, 0); scene.add(dash);
  }
  buildZoneMall(); buildZoneHouses(); buildZonePark(); buildZoneParking();
  // farolas
  for (var l = 0; l < 12; l++) {
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7), new THREE.MeshStandardMaterial({ color: 0x374151 }));
    pole.position.set(rand(-100, 100), 3.5, rand(-100, 100)); pole.castShadow = true; scene.add(pole);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
    lamp.position.set(pole.position.x, 7.1, pole.position.z); scene.add(lamp);
    var pl = new THREE.PointLight(0xfde68a, 0.5, 25); pl.position.copy(lamp.position); scene.add(pl);
  }
}
function box(w, h, d, color, x, y, z, ry) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 }));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function buildZoneMall() {
  box(34, 10, 20, 0x1e3a5f, 0, 5, -14); box(36, 1, 22, 0x0ea5e9, 0, 10.4, -14);
  var sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 0.5), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  sign.position.set(0, 8, -3.8); scene.add(sign);
}
function buildZoneHouses() {
  var p = ZONES.HOUSES.pos;
  for (var i = 0; i < 5; i++) {
    var hx = p[0] + (i % 3) * 14 - 14, hz = p[2] + Math.floor(i / 3) * 12 - 6;
    box(8, 5, 7, [0x78350f, 0x365314, 0x44403c, 0x134e4a, 0x4c1d95][i], hx, 2.5, hz);
    box(8.6, 0.6, 7.6, 0x7f1d1d, hx, 5.3, hz);
  }
}
function buildZonePark() {
  var p = ZONES.PARK.pos;
  var grass = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(p[0], 0.03, p[2]); grass.receiveShadow = true; scene.add(grass);
  for (var i = 0; i < 8; i++) {
    var tx = p[0] + rand(-20, 20), tz = p[2] + rand(-20, 20);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    trunk.position.set(tx, 1.5, tz); trunk.castShadow = true; scene.add(trunk);
    var top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 7), new THREE.MeshStandardMaterial({ color: 0x166534 }));
    top.position.set(tx, 4.5, tz); top.castShadow = true; scene.add(top);
  }
}
function buildZoneParking() {
  var p = ZONES.PARKING.pos;
  var slab = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), new THREE.MeshStandardMaterial({ color: 0x27272a }));
  slab.rotation.x = -Math.PI / 2; slab.position.set(p[0], 0.03, p[2]); slab.receiveShadow = true; scene.add(slab);
  for (var i = 0; i < 6; i++) {
    var car = box(4, 1.4, 1.9, [0xdc2626, 0x2563eb, 0xfacc15, 0x9ca3af, 0x16a34a, 0x7c3aed][i], p[0] - 12 + i * 5, 0.9, p[2] - 6);
    box(2.2, 0.8, 1.7, 0x0f172a, car.position.x, 1.9, car.position.z);
  }
}
function scatterCityRuins() {
  for (var i = 0; i < 26; i++) {
    var r = box(rand(1, 3), rand(0.6, 2.2), rand(1, 3), 0x334155, rand(-100, 100), 0.5, rand(-100, 100), rand(0, 3));
    r.rotation.z = rand(-0.15, 0.15);
  }
}
var CRATE_KINDS = ['rifle', 'escopeta', 'sniper', 'granadas', 'curas', 'comida', 'blindaje', 'materiales', 'materiales', 'pesadas', 'melee', 'armas'];
function spawnInitialCrates(n) {
  for (var i = 0; i < (n || 14); i++) spawnCrate([rand(-80, 80), 0, rand(-80, 80)], CRATE_KINDS[Math.floor(Math.random() * CRATE_KINDS.length)]);
}
function spawnCrate(pos, kind) {
  var g = new THREE.Group();
  var m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: kind === 'materiales' ? 0xf59e0b : 0x10b981, roughness: 0.6 }));
  m.position.y = 0.5; m.castShadow = true; g.add(m);
  var glow = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.15, 1.06), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  glow.position.y = 1.02; g.add(glow);
  g.position.set(pos[0], 0, pos[2]); scene.add(g);
  crates.push({ mesh: g, pos: g.position, kind: kind, taken: false });
}
