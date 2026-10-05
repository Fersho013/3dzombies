// ===== ENTIDADES: humanoides, armas, refugios, depósitos =====
function mat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); }
function createWeaponMesh(key) {
  var w = WEAPONS[key] || WEAPONS.rifle;
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, w.len), mat(w.color));
  body.castShadow = true; g.add(body);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.08), mat(0x1f2937));
  grip.position.set(0, -0.12, 0.1); g.add(grip);
  return g;
}
function createHumanoid(color, isZombie, ztype) {
  var g = new THREE.Group();
  var sc = isZombie ? (ZOMBIE_TYPES[ztype] ? ZOMBIE_TYPES[ztype].scale : 1) : 1;
  var skin = isZombie ? (ZOMBIE_TYPES[ztype] ? ZOMBIE_TYPES[ztype].color : 0x65a30d) : 0xfcd7b0;
  var torso = new THREE.Mesh(new THREE.BoxGeometry(0.55 * sc, 0.7 * sc, 0.32 * sc), mat(isZombie ? skin : color));
  torso.position.y = 1.25 * sc; torso.castShadow = true; g.add(torso);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * sc, 10, 10), mat(skin));
  head.position.y = 1.85 * sc; head.castShadow = true; g.add(head);
  if (isZombie) {
    var e1 = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    e1.position.set(-0.08, 1.9 * sc, 0.18); g.add(e1);
    var e2 = e1.clone(); e2.position.x = 0.08; g.add(e2);
  }
  function limb(w, h, c) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(c)); m.castShadow = true; return m; }
  var aL = limb(0.14 * sc, 0.62 * sc, isZombie ? skin : color); aL.geometry.translate(0, -0.28, 0); aL.position.set(-0.36 * sc, 1.5 * sc, 0); g.add(aL);
  var aR = limb(0.14 * sc, 0.62 * sc, isZombie ? skin : color); aR.geometry.translate(0, -0.28, 0); aR.position.set(0.36 * sc, 1.5 * sc, 0); g.add(aR);
  var lL = limb(0.17 * sc, 0.75 * sc, 0x1f2937); lL.geometry.translate(0, -0.35, 0); lL.position.set(-0.15 * sc, 0.9 * sc, 0); g.add(lL);
  var lR = limb(0.17 * sc, 0.75 * sc, 0x1f2937); lR.geometry.translate(0, -0.35, 0); lR.position.set(0.15 * sc, 0.9 * sc, 0); g.add(lR);
  g.userData = { aL: aL, aR: aR, lL: lL, lR: lR, walk: Math.random() * 6 };
  return g;
}
function animateEntityLimbs(mesh, dt, speedMul) {
  var u = mesh.userData; if (!u.aL) return;
  u.walk += dt * 8 * (speedMul || 1);
  var s = Math.sin(u.walk) * 0.55;
  u.lL.rotation.x = s; u.lR.rotation.x = -s; u.aL.rotation.x = -s * 0.8; u.aR.rotation.x = s * 0.8;
}
var NPC_DEFS = [
  { name: 'Alex', role: 'Líder', weapon: 'rifle', color: 0x2563eb, healRate: 25 },
  { name: 'Elena', role: 'Médico', weapon: 'shotgun', color: 0xec4899, healRate: 35 },
  { name: 'Marcus', role: 'Pesado', weapon: 'smg', color: 0xf97316, healRate: 25, bazooka: true },
  { name: 'Sarah', role: 'Tiradora', weapon: 'sniper', color: 0x38bdf8, healRate: 25 },
  { name: 'Carlos', role: 'Ingeniero', weapon: 'pistol', color: 0xfacc15, healRate: 25 }
];
function initSurvivors(withPlayer) {
  NPC_DEFS.forEach(function (d, i) {
    var mesh = createHumanoid(d.color, false);
    var a = (i / 5) * Math.PI * 2;
    mesh.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4 - 4);
    scene.add(mesh);
    var gun = createWeaponMesh(d.weapon); gun.position.set(0.36, 1.35, 0.4); mesh.add(gun);
    survivors.push({
      name: d.name, role: d.role, weaponKey: d.weapon, color: d.color, mesh: mesh, gunMesh: gun,
      hp: 100, maxHp: 100, energy: 100, ammo: 60, grenades: 2, meds: 1, armor: 0,
      alive: true, isPlayer: false, state: 'SCAVENGE', cd: 0, nadeCd: 0, healCd: 0,
      targetCrate: null, carriedCrate: null, buildHelp: 0, towerOp: null, kills: 0, healRate: d.healRate, bazooka: !!d.bazooka
    });
  });
  if (withPlayer) spawnPlayerSurvivor();
}
function spawnPlayerSurvivor() {
  var mesh = createHumanoid(0x10b981, false);
  mesh.position.set(3, 0, 6); scene.add(mesh);
  var gun = createWeaponMesh('rifle'); gun.position.set(0.36, 1.35, 0.4); mesh.add(gun);
  playerIndex = survivors.length;
  survivors.push({
    name: 'Tú', role: 'Participante', weaponKey: 'rifle', color: 0x10b981, mesh: mesh, gunMesh: gun,
    hp: 100, maxHp: 100, energy: 100, ammo: 90, grenades: 3, meds: 2, armor: 0,
    alive: true, isPlayer: true, state: 'PLAYER', cd: 0, nadeCd: 0, healCd: 0,
    targetCrate: null, carriedCrate: null, buildHelp: 0, towerOp: null, kills: 0, healRate: 25,
    yaw: 0, pitch: 0, ads: 0
  });
}
function createDepot(zoneKey) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), mat(0x475569)); base.position.y = 1.5; base.castShadow = true; g.add(base);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.6, 4), mat(z.color)); roof.position.y = 3.8; roof.rotation.y = Math.PI / 4; g.add(roof);
  for (var i = 0; i < 4; i++) {
    var s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0xf59e0b));
    s.position.set(-1.2 + i * 0.8, 0.45, 2.3); g.add(s);
  }
  g.position.set(z.pos[0] + 6, 0, z.pos[2] + 6); scene.add(g);
  z.depot = { mesh: g, hp: 6000, maxHp: 6000 };
}
function createShelterTurret(zoneKey, improvised) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4), mat(0x334155)); pole.position.y = 2; g.add(pole);
  var headM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), mat(improvised ? 0x78716c : 0x0ea5e9)); headM.position.y = 4.2; headM.castShadow = true; g.add(headM);
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6), mat(0x111827)); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 4.2, 0.9); g.add(barrel);
  g.position.set(z.pos[0] - 6, 0, z.pos[2] - 6); scene.add(g);
  z.turret = { mesh: g, barrel: barrel, cd: 0, improvised: !!improvised, dmg: improvised ? 16 : 42, range: improvised ? 17 : 24, rate: improvised ? 0.8 : 0.5 };
}
function createShelterHouse(zoneKey) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var h = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 6), mat(0x334155)); h.position.y = 2; h.castShadow = true; g.add(h);
  var r = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2, 4), mat(z.color)); r.position.y = 5; r.rotation.y = Math.PI / 4; g.add(r);
  g.position.set(z.pos[0], 0, z.pos[2]); scene.add(g);
  z.house = g;
  // anillo perímetro visual
  var ring = new THREE.Mesh(new THREE.RingGeometry(13.4, 14, 40), new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(z.pos[0], 0.06, z.pos[2]); scene.add(ring);
}
function activateShelter(key) {
  if (ZONES[key].active) return;
  ZONES[key].active = true; activeShelterKeys.push(key);
  createShelterHouse(key); createDepot(key); createShelterTurret(key, key !== 'MALL');
  log('🏠 Refugio activado: ' + key);
}
function cartsDone() { return true; } // carro deshabilitado: requisito siempre cumplido
