// ===== ENTIDADES ULTRA: humanoides articulados + estados animación =====
function mat(c, r) { return new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.75 : r }); }
function createWeaponMesh(key) {
  var w = WEAPONS[key] || WEAPONS.rifle;
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, w.len), mat(w.color, 0.4));
  body.castShadow = true; g.add(body);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.09), mat(0x1f2937)); grip.position.set(0, -0.13, 0.12); g.add(grip);
  var mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.1), mat(0x374151)); mag.position.set(0, -0.12, -0.08); mag.rotation.x = 0.3; g.add(mag);
  if (key === 'sniper') { var scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16), mat(0x111827)); scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.09, 0); g.add(scope); }
  if (key === 'shotgun') { var pump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), mat(0x78350f)); pump.position.set(0, -0.04, 0.28); g.add(pump); }
  // punto de fogonazo
  g.userData.tip = new THREE.Object3D(); g.userData.tip.position.set(0, 0.02, -w.len / 2 - 0.1); g.add(g.userData.tip);
  return g;
}
function createHumanoid(color, isZombie, ztype) {
  var g = new THREE.Group();
  var sc = isZombie ? (ZOMBIE_TYPES[ztype] ? ZOMBIE_TYPES[ztype].scale : 1) : 1;
  var skin = isZombie ? (ZOMBIE_TYPES[ztype] ? ZOMBIE_TYPES[ztype].color : 0x65a30d) : 0xfcd7b0;
  var shirt = isZombie ? skin : color;
  // pelvis + torso 2 piezas para inclinación realista
  var pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5 * sc, 0.28 * sc, 0.3 * sc), mat(0x1f2937)); pelvis.position.y = 0.98 * sc; g.add(pelvis);
  var torso = new THREE.Mesh(new THREE.BoxGeometry(0.56 * sc, 0.55 * sc, 0.33 * sc), mat(shirt)); torso.position.y = 1.38 * sc; torso.castShadow = true; g.add(torso);
  // chaleco táctico supervivientes
  if (!isZombie) { var vest = new THREE.Mesh(new THREE.BoxGeometry(0.6 * sc, 0.34 * sc, 0.38 * sc), mat(0x27272a, 0.9)); vest.position.y = 1.36 * sc; g.add(vest); }
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.22 * sc, 12, 12), mat(skin, 0.6)); head.position.y = 1.86 * sc; head.castShadow = true; g.add(head);
  if (!isZombie) { var helm = new THREE.Mesh(new THREE.SphereGeometry(0.24 * sc, 12, 8, 0, Math.PI * 2, 0, 1.4), mat(0x334155, 0.5)); helm.position.y = 1.9 * sc; g.add(helm); }
  else {
    var e1 = new THREE.Mesh(new THREE.SphereGeometry(0.055), new THREE.MeshBasicMaterial({ color: 0xff2222 })); e1.position.set(-0.08, 1.9 * sc, 0.18 * sc); g.add(e1);
    var e2 = e1.clone(); e2.position.x = 0.08; g.add(e2);
    // mandíbula
    var jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16 * sc, 0.07 * sc, 0.05), mat(0x3f6212)); jaw.position.set(0, 1.72 * sc, 0.19 * sc); g.add(jaw); g.userData.jaw = jaw;
  }
  function seg(w, h, c) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(c)); m.castShadow = true; return m; }
  // brazos: hombro + antebrazo (2 segmentos)
  function arm(side) {
    var sh = new THREE.Group(); sh.position.set(0.36 * sc * side, 1.58 * sc, 0);
    var up = seg(0.15 * sc, 0.34 * sc, shirt); up.geometry.translate(0, -0.17, 0); sh.add(up);
    var el = new THREE.Group(); el.position.set(0, -0.34 * sc, 0);
    var fo = seg(0.13 * sc, 0.32 * sc, skin); fo.geometry.translate(0, -0.16, 0); el.add(fo);
    sh.add(el); g.add(sh); return { sh: sh, el: el };
  }
  // piernas: muslo + espinilla
  function leg(side) {
    var hip = new THREE.Group(); hip.position.set(0.16 * sc * side, 0.92 * sc, 0);
    var th = seg(0.18 * sc, 0.42 * sc, 0x26313f); th.geometry.translate(0, -0.21, 0); hip.add(th);
    var kn = new THREE.Group(); kn.position.set(0, -0.42 * sc, 0);
    var sh2 = seg(0.15 * sc, 0.42 * sc, 0x111827); sh2.geometry.translate(0, -0.21, 0); kn.add(sh2);
    hip.add(kn); g.add(hip); return { hip: hip, kn: kn };
  }
  var aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);
  // linterna hombro supervivientes
  if (!isZombie) { var fl = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xfef9c3 })); fl.position.set(-0.36 * sc, 1.62 * sc, 0.12); g.add(fl); }
  g.userData = Object.assign(g.userData, { aL: aL, aR: aR, lL: lL, lR: lR, torso: torso, head: head, walk: Math.random() * 6, hitT: 0, deadT: 0, atkT: 0 });
  return g;
}
function animateEntityLimbs(mesh, dt, speedMul) {
  var u = mesh.userData; if (!u.aL) return;
  var edt = dt * (speedMul || 1);
  if (u.hitT > 0) { // flinch: inclinación atrás
    u.hitT -= dt; u.torso.rotation.x = -0.35 * u.hitT * 6; return;
  }
  u.walk += dt * 9 * (speedMul || 1);
  var s = Math.sin(u.walk), c = Math.sin(u.walk + Math.PI);
  // piernas con rodilla
  u.lL.hip.rotation.x = s * 0.6; u.lR.hip.rotation.x = c * 0.6;
  u.lL.kn.rotation.x = Math.max(0, -c * 0.9); u.lR.kn.rotation.x = Math.max(0, -s * 0.9);
  // brazos: superviviente apunta (derecho fijo), zombie ataca
  if (u.jaw) { // zombie: brazos al frente + mandíbula
    u.aL.sh.rotation.x = -1.25 + s * 0.25; u.aR.sh.rotation.x = -1.25 + c * 0.25;
    u.aL.el.rotation.x = -0.4; u.aR.el.rotation.x = -0.4;
    u.jaw.position.y = 1.72 + Math.abs(Math.sin(u.walk * 0.7)) * 0.03;
    u.torso.rotation.x = 0.12 + Math.sin(u.walk * 0.5) * 0.05;
    if (u.atkT > 0) { u.atkT -= dt; u.aL.sh.rotation.x = -1.9; u.aR.sh.rotation.x = -1.9; }
  } else {
    u.aL.sh.rotation.x = s * 0.5; u.aL.el.rotation.x = -0.3;
    u.aR.sh.rotation.x = -1.35; u.aR.el.rotation.x = -0.15; // arma al frente
    u.torso.rotation.y = Math.sin(u.walk * 0.5) * 0.06;
  }
}
function playHitFlinch(mesh) { if (mesh.userData) mesh.userData.hitT = 0.18; }
function playZombieAttack(mesh) { if (mesh.userData) mesh.userData.atkT = 0.4; }
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
    var gun = createWeaponMesh(d.weapon); gun.position.set(0.36, 1.35, 0.45); gun.rotation.y = 0; mesh.add(gun);
    survivors.push({ name: d.name, role: d.role, weaponKey: d.weapon, color: d.color, mesh: mesh, gunMesh: gun, hp: 100, maxHp: 100, energy: 100, ammo: 60, grenades: 2, meds: 1, armor: 0, alive: true, isPlayer: false, state: 'SCAVENGE', cd: 0, nadeCd: 0, healCd: 0, targetCrate: null, carriedCrate: null, buildHelp: 0, towerOp: null, kills: 0, healRate: d.healRate, bazooka: !!d.bazooka, stepT: 0 });
  });
  if (withPlayer) spawnPlayerSurvivor();
}
function spawnPlayerSurvivor() {
  var mesh = createHumanoid(0x10b981, false);
  mesh.position.set(3, 0, 6); scene.add(mesh);
  var gun = createWeaponMesh('rifle'); gun.position.set(0.36, 1.35, 0.45); mesh.add(gun);
  playerIndex = survivors.length;
  survivors.push({ name: 'Tú', role: 'Participante', weaponKey: 'rifle', color: 0x10b981, mesh: mesh, gunMesh: gun, hp: 100, maxHp: 100, energy: 100, ammo: 90, grenades: 3, meds: 2, armor: 0, alive: true, isPlayer: true, state: 'PLAYER', cd: 0, nadeCd: 0, healCd: 0, targetCrate: null, carriedCrate: null, buildHelp: 0, towerOp: null, kills: 0, healRate: 25, yaw: 0, pitch: 0, ads: 0, stepT: 0, reloadT: 0 });
}
function createDepot(zoneKey) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), mat(0x475569, 0.85)); base.position.y = 1.5; base.castShadow = base.receiveShadow = true; g.add(base);
  // sacos + cajas decorativas + lona
  for (var i = 0; i < 5; i++) { var sk = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), mat(0x78716c, 1)); sk.scale.y = 0.7; sk.position.set(-2.4 + i * 0.7, 0.3, 2.4); g.add(sk); }
  var roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.6, 4), mat(z.color, 0.6)); roof.position.y = 3.8; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  for (var j = 0; j < 4; j++) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0xf59e0b)); s.position.set(-1.2 + j * 0.8, 0.45, 2.3); s.castShadow = true; g.add(s); }
  var lampM = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0x4ade80 })); lampM.position.set(0, 3.1, 2.05); g.add(lampM);
  g.position.set(z.pos[0] + 6, 0, z.pos[2] + 6); scene.add(g);
  z.depot = { mesh: g, hp: 6000, maxHp: 6000, lamp: lampM };
}
function createShelterTurret(zoneKey, improvised) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var sand = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.8, 10), mat(0x57534e, 1)); sand.position.y = 0.4; g.add(sand);
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.6), mat(0x334155, 0.5)); pole.position.y = 2.4; pole.castShadow = true; g.add(pole);
  var headM = new THREE.Group(); headM.position.y = 4.3;
  var boxM = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.6, 1.25), mat(improvised ? 0x78716c : 0x0ea5e9, 0.4)); boxM.castShadow = true; headM.add(boxM);
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.7), mat(0x111827, 0.4)); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, 0.95); headM.add(barrel);
  var laser = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1), new THREE.MeshBasicMaterial({ color: 0xff0000 })); laser.position.set(0.3, 0.1, 0.8); headM.add(laser);
  g.add(headM);
  g.position.set(z.pos[0] - 6, 0, z.pos[2] - 6); scene.add(g);
  z.turret = { mesh: g, head: headM, barrel: barrel, cd: 0, improvised: !!improvised, dmg: improvised ? 16 : 42, range: improvised ? 17 : 24, rate: improvised ? 0.8 : 0.5 };
}
function createShelterHouse(zoneKey) {
  var z = ZONES[zoneKey];
  var g = new THREE.Group();
  var h = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 6), new THREE.MeshStandardMaterial({ map: TEX ? TEX.facade : null, color: 0x9ca3af, roughness: 0.9 })); h.position.y = 2; h.castShadow = h.receiveShadow = true; g.add(h);
  var r = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2, 4), mat(z.color, 0.7)); r.position.y = 5; r.rotation.y = Math.PI / 4; r.castShadow = true; g.add(r);
  g.position.set(z.pos[0], 0, z.pos[2]); scene.add(g);
  z.house = g;
  destructibles.push({ mesh: h, hp: 900, maxHp: 900, name: 'Refugio ' + zoneKey, onDestroy: function () { collapseShelter(z); } });
  var ring = new THREE.Mesh(new THREE.RingGeometry(13.4, 14, 48), new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(z.pos[0], 0.06, z.pos[2]); scene.add(ring);
}
function activateShelter(key) {
  if (ZONES[key].active) return;
  ZONES[key].active = true; activeShelterKeys.push(key);
  createShelterHouse(key); createDepot(key); createShelterTurret(key, key !== 'MALL');
  log('🏠 Refugio activado: ' + key); playSound('alarm');
}
function cartsDone() { return true; }
