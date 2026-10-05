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
  // MALL REFUGIO VIVO estilo CoD: planta abierta con 2 puertas E, pilares, tiendas-loot, enfermería y techo
  var W = 34, D = 20, H = 6, cx = 0, cz = -14, zF = cz + D / 2; // frente z=-4
  var facade = new THREE.MeshStandardMaterial({ map: TEX.facade, roughness: 0.85 });
  var trimM = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  // losa + techo a 6m (se ve interior) + carteles
  wallSeg(W + 2, 0.25, D + 2, new THREE.MeshStandardMaterial({ map: TEX.concrete }), cx, 0.12, cz);
  wallSeg(W + 2, 0.6, D + 2, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 }), cx, H + 0.3, cz);
  var sign = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 0.6), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  sign.position.set(cx, H - 0.6, zF + 0.4); scene.add(sign);
  var sign2 = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.4), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  sign2.position.set(cx, 4.4, zF + 0.3); scene.add(sign2);
  // muros con 2 puertas (huecos de 2m en x=-8 y x=+8)
  function frontSeg(x0, x1) { var w = x1 - x0; wallSeg(w, H, 0.5, facade, (x0 + x1) / 2, H / 2, zF); addSolid((x0 + x1) / 2, zF, w, 0.6, { label: 'MALL' }); }
  frontSeg(cx - W / 2, cx - 9); frontSeg(cx - 7, cx + 7); frontSeg(cx + 9, cx + W / 2);
  wallSeg(W, H, 0.5, facade, cx, H / 2, cz - D / 2); addSolid(cx, cz - D / 2, W, 0.6, { label: 'MALL' });
  wallSeg(0.5, H, D, facade, cx - W / 2, H / 2, cz); addSolid(cx - W / 2, cz, 0.6, D, { label: 'MALL' });
  wallSeg(0.5, H, D, facade, cx + W / 2, H / 2, cz); addSolid(cx + W / 2, cz, 0.6, D, { label: 'MALL' });
  // 2 puertas batientes E (CoD: abrir para entrar, cerrar para bloquear horda)
  [-8, 8].forEach(function (dx, i) {
    var dm = new THREE.Mesh(new THREE.BoxGeometry(2, 2.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.4, metalness: 0.3 }));
    dm.position.set(cx + dx, 1.4, zF); dm.castShadow = true; scene.add(dm);
    var d = { mesh: dm, closedX: cx + dx, open: false, label: i === 0 ? 'MALL oeste' : 'MALL este' };
    d.leafSolid = addSolid(cx + dx, zF, 2, 0.4, { door: d, label: d.label });
    doors.push(d);
  });
  // pilares interiores (cover real, con colisión)
  [-10, 0, 10].forEach(function (dx) {
    var pil = wallSeg(1, H, 1, new THREE.MeshStandardMaterial({ map: TEX.concrete }), cx + dx, H / 2, cz);
    var pilD = { mesh: pil, hp: 500, maxHp: 500, name: 'Pilar MALL' };
    pilD._solids = [addSolid(cx + dx, cz, 1.2, 1.2, { label: 'Pilar' })];
    pilD.onDestroy = function (pp) { collapseRubble(pp, 0x64748b, 3); scene.remove(pil); };
    destructibles.push(pilD);
  });
  // interior vivo: enfermería (curas), armería (ammo), cocina (comida), taller (scrap) + camas y luces
  makeInterior([cx, 0, cz], W - 2, D - 2, 'MALL');
  wallSeg(6, 0.9, 1, new THREE.MeshStandardMaterial({ color: 0xf8fafc }), cx - 9, 0.65, cz - 6); // mostrador enfermería
  wallSeg(6, 0.9, 1, new THREE.MeshStandardMaterial({ color: 0x78350f }), cx + 2, 0.65, cz - 6); // armería
  wallSeg(4, 0.9, 1, new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }), cx + 9, 0.65, cz + 3); // cocina
  [[-11, 0], [-9, 0]].forEach(function (o) { var bed = wallSeg(2, 0.5, 1.4, new THREE.MeshStandardMaterial({ color: 0xbe123c }), cx + o[0], 0.45, cz + o[1] + 5); });
  [[-13, -3], [0, -3], [8, 5]].forEach(function (lp) { var li = new THREE.PointLight(0xfde68a, 0.8, 18); li.position.set(cx + lp[0], 4.5, cz + lp[1]); scene.add(li); });
  var gen = wallSeg(1.4, 1, 0.9, new THREE.MeshStandardMaterial({ color: 0xf59e0b }), cx + 12, 0.7, cz - 7);
  destructibles.push({ mesh: gen, hp: 200, maxHp: 200, name: 'Generador', onDestroy: function (pp) { explodeAt(pp, 5, 60); scene.remove(gen); } });
  addDynamicSolid(gen, cx + 12, cz - 7, 1.4, 0.9);
  spawnCrate([cx - 9, 0, cz - 4], 'curas'); spawnCrate([cx - 7, 0, cz - 4], 'curas');
  spawnCrate([cx + 2, 0, cz - 4], 'rifle'); spawnCrate([cx + 4, 0, cz - 4], 'armas');
  spawnCrate([cx + 9, 0, cz + 1], 'comida'); spawnCrate([cx - 2, 0, cz + 4], 'materiales');
  spawnCrate([cx - 12, 0, cz + 2], 'blindaje');
  var mallShell = { mesh: sign, hp: 1200, maxHp: 1200, name: 'MALL' };
  destructibles.push(mallShell);
}
function nearestDoor(pos, maxD) {
  var best = null, bd = maxD || 3;
  for (var i = 0; i < doors.length; i++) { var d = doors[i]; var dd = dist2D(pos, d.mesh.position); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function toggleDoor(d) {
  d.open = !d.open;
  try {
    d.mesh.rotation.y = d.open ? Math.PI / 1.6 : 0;
    d.mesh.position.x = d.closedX + (d.open ? 0.55 : 0);
  } catch (e) {}
  // la hoja cerrada bloquea; abierta deja pasar (estilo CoD)
  if (d.leafSolid) d.leafSolid.dead = d.open;
  playSound('ui'); toast((d.open ? '🚪 Abierta: ' : '🚪 Cerrada: ') + d.label);
  log('🚪 Puerta ' + d.label + (d.open ? ' abierta' : ' cerrada'));
}
function buildZoneHouses() {
  var p = ZONES.HOUSES.pos;
  var styles = [
    { wall: 0xb45309, roof: 0x7f1d1d, floor: 0x92400e, label: 'Chalet Ámbar' },
    { wall: 0x3f6212, roof: 0x1c1917, floor: 0x57534e, label: 'Villa Olivo' },
    { wall: 0x475569, roof: 0x7c2d12, floor: 0x78716c, label: 'Casa Niebla' },
    { wall: 0x0f766e, roof: 0x134e4a, floor: 0x115e59, label: 'Casa Laguna' },
    { wall: 0x6d28d9, roof: 0x1e1b4b, floor: 0x4c1d95, label: 'Mansión Violeta' }
  ];
  for (var i = 0; i < 5; i++) { (function (i) { buildLuxuryHouse(p[0] + (i % 3) * 16 - 16, p[2] + Math.floor(i / 3) * 15 - 7, styles[i], i + 1); })(i); }
}
function wallSeg(w, h, d, m, x, y, z) { var q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = q.receiveShadow = true; scene.add(q); return q; }
function buildLuxuryHouse(hx, hz, st, idx) {
  var W = 9, D = 7, H = 3.4;
  var facade = new THREE.MeshStandardMaterial({ map: TEX.facade, roughness: 0.9, color: st.wall });
  var trimM = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  var woodM = new THREE.MeshStandardMaterial({ color: st.floor, roughness: 0.7 });
  // solera + porche + valla + jardín (exterior con propósito: cover + scrap)
  var slab = wallSeg(W + 3, 0.25, D + 3.4, new THREE.MeshStandardMaterial({ map: TEX.concrete }), hx, 0.12, hz);
  var porch = wallSeg(4.4, 0.3, 2, woodM, hx, 0.28, hz + D / 2 + 1);
  for (var f = 0; f < 4; f++) wallSeg(0.14, 1.1, 0.14, trimM, hx - 6 + f * 1.2, 0.8, hz + D / 2 + 2.6);
  wallSeg(4.4, 0.12, 0.14, trimM, hx, 1.35, hz + D / 2 + 2.6);
  // buzón (scrap) + aire acondicionado + cubos basura (loot)
  var mail = wallSeg(0.4, 0.5, 0.3, new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }), hx + 3.4, 1, hz + D / 2 + 2.2);
  destructibles.push({ mesh: mail, hp: 40, maxHp: 40, name: 'Buzón', onDestroy: function (pp) { spawnCrate([pp.x, 0, pp.z], 'materiales'); scene.remove(mail); } });
  var ac = wallSeg(1, 0.8, 0.6, new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.5, roughness: 0.4 }), hx + W / 2 + 0.7, 0.6, hz - 1);
  destructibles.push({ mesh: ac, hp: 90, maxHp: 90, name: 'Clima', onDestroy: function (pp) { collapseRubble(pp, 0x9ca3af, 2); spawnCrate([pp.x, 0, pp.z], 'materiales'); scene.remove(ac); } });
  // muros con huecos: frontal (puerta+ventanas), resto ciegos con marcos
  var zF = hz + D / 2;
  wallSeg(2.6, H, 0.35, facade, hx - 2.9, H / 2, zF); // izq puerta
  wallSeg(2.6, H, 0.35, facade, hx + 2.9, H / 2, zF); // der puerta
  wallSeg(W, 0.7, 0.35, facade, hx, H - 0.35, zF);    // dintel
  wallSeg(W, H, 0.35, facade, hx, H / 2, hz - D / 2);
  wallSeg(0.35, H, D, facade, hx - W / 2, H / 2, hz);
  wallSeg(0.35, H, D, facade, hx + W / 2, H / 2, hz);
  // SÓLIDOS con hueco de puerta 1.6m (hay que cruzar por la puerta, no atravesar)
  var houseSolids = [
    addSolid(hx - 2.9, zF, 2.9, 0.5, { label: st.label }),
    addSolid(hx + 2.9, zF, 2.9, 0.5, { label: st.label }),
    addSolid(hx, hz - D / 2, W, 0.5, { label: st.label }),
    addSolid(hx - W / 2, hz, 0.5, D, { label: st.label }),
    addSolid(hx + W / 2, hz, 0.5, D, { label: st.label })
  ];
  // ventanas con marco + cristal (se puede disparar a través visualmente, bloquean zombies)
  [[hx - 2.9, zF], [hx + 2.9, zF]].forEach(function (ww) {
    wallSeg(1.7, 1.3, 0.1, trimM, ww[0], 1.9, ww[1]);
    var gl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0xfde68a, emissiveIntensity: 0.25, transparent: true, opacity: 0.55 }));
    gl.position.set(ww[0], 1.9, ww[1] + 0.2); scene.add(gl);
  });
  // puerta batiente interactiva E
  var doorM = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 }));
  doorM.position.set(hx, 1.3, zF); doorM.castShadow = true; scene.add(doorM);
  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xfacc15 })); knob.position.set(0.55, 0, 0.1); doorM.add(knob);
  var door = { mesh: doorM, closedX: hx, open: false, label: st.label };
  door.leafSolid = addSolid(hx, zF, 1.6, 0.35, { door: door, label: st.label });
  doors.push(door);
  // techo + chimenea
  var roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.4, 4), new THREE.MeshStandardMaterial({ color: st.roof, roughness: 0.8 }));
  roof.position.set(hx, H + 1.2, hz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof);
  wallSeg(0.7, 1.6, 0.7, new THREE.MeshStandardMaterial({ color: 0x78716c }), hx + 2, H + 1.4, hz - 1);
  // luz cálida interior + lámpara porche
  var li = new THREE.PointLight(0xfde68a, 0.85, 14); li.position.set(hx, 2.4, hz); scene.add(li);
  var porchL = new THREE.PointLight(0xfde68a, 0.5, 8); porchL.position.set(hx, 2.2, zF + 1); scene.add(porchL);
  // ===== INTERIOR lujo: suelo madera, paredes, muebles con loot temático =====
  makeInterior([hx, 0, hz], W - 1, D - 1, st.label);
  var inWall = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
  wallSeg(W - 0.6, 0.06, D - 0.6, woodM, hx, 0.17, hz); // parquet
  // sofá (cover) + mesa + cama + cocina + nevera (comida) + estantería (ammo/med)
  var sofa = wallSeg(2.4, 0.7, 0.9, new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }), hx - 2, 0.55, hz - 1.6);
  wallSeg(2.4, 0.6, 0.25, new THREE.MeshStandardMaterial({ color: 0x1e3a8a }), hx - 2, 0.9, hz - 2);
  destructibles.push({ mesh: sofa, hp: 120, maxHp: 120, name: 'Sofá', onDestroy: function (pp) { collapseRubble(pp, 0x1d4ed8, 2); scene.remove(sofa); } });
  wallSeg(1.4, 0.5, 0.8, woodM, hx + 0.4, 0.45, hz - 1.2); // mesa
  var bed = wallSeg(2.1, 0.55, 1.6, new THREE.MeshStandardMaterial({ color: 0xbe123c }), hx + 2.2, 0.5, hz + 1.4);
  wallSeg(2.1, 0.7, 0.2, trimM, hx + 2.2, 0.7, hz + 2.2);
  destructibles.push({ mesh: bed, hp: 140, maxHp: 140, name: 'Cama', onDestroy: function (pp) { spawnCrate([pp.x, 0, pp.z], 'curas'); collapseRubble(pp, 0xbe123c, 2); scene.remove(bed); } });
  // cocina + nevera llena de comida (propósito hambre)
  wallSeg(2.6, 0.9, 0.7, new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }), hx - 1.6, 0.65, hz + 2.2);
  var fridge = wallSeg(0.9, 1.9, 0.8, new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.35 }), hx - 3.4, 1.1, hz + 2.2);
  destructibles.push({ mesh: fridge, hp: 110, maxHp: 110, name: 'Nevera', onDestroy: function (pp) { spawnCrate([pp.x + 1, 0, pp.z], 'comida'); spawnCrate([pp.x - 1, 0, pp.z], 'comida'); collapseRubble(pp, 0xf8fafc, 2); scene.remove(fridge); } });
  // estantería con munición y botiquín visibles
  var shelf = wallSeg(1.8, 2, 0.4, woodM, hx + 3.4, 1.2, hz - 1.8);
  var ab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xfacc15 })); ab.position.set(hx + 3.1, 1.6, hz - 1.8); scene.add(ab);
  var mb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xef4444 })); mb.position.set(hx + 3.7, 1.1, hz - 1.8); scene.add(mb);
  // lámpara techo
  var lampM = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshBasicMaterial({ color: 0xfef9c3 })); lampM.position.set(hx, 3, hz); scene.add(lampM);
  // loot temático por casa: comida en cocina + arma/meds + materiales
  spawnCrate([hx - 1.6, 0, hz + 1.2], 'comida');
  spawnCrate([hx + 2.5, 0, hz - 0.5], ['rifle', 'escopeta', 'sniper', 'granadas'][idx % 4]);
  if (idx % 2 === 0) spawnCrate([hx, 0, hz + 0.4], 'blindaje'); else spawnCrate([hx, 0, hz + 0.4], 'curas');
  var H = { mesh: slab, hp: 900, maxHp: 900, name: st.label, onDestroy: function (pp) { collapseRubble(pp, st.wall, 6); } };
  H._solids = houseSolids.concat([door.leafSolid]);
  destructibles.push(H);
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
// ===== MEMORIA entrar/salir + buscar puerta rodeando (CoD) =====
function doorsForInterior(it) {
  var out = [], R = Math.max(it.w, it.d) * 0.5 + 4;
  for (var i = 0; i < doors.length; i++) {
    var d = doors[i];
    if (Math.abs(d.mesh.position.x - it.x) < R && Math.abs(d.mesh.position.z - it.z) < R) out.push(d);
  }
  return out;
}
function nearestDoorOf(it, fromPos) {
  var ds = doorsForInterior(it), best = null, bd = 1e9;
  for (var i = 0; i < ds.length; i++) { var d = dist2D(fromPos, ds[i].mesh.position); if (d < bd) { bd = d; best = ds[i]; } }
  return best;
}
// registra entrar/salir para que el NPC sepa si está dentro y busque la salida
function updateInsideMemory(s) {
  var cur = (typeof insideInterior === 'function') ? insideInterior(s.mesh.position) : null;
  var label = cur ? cur.label : null;
  if ((s._inside || null) !== label) {
    if (label && !s.isPlayer) { setThought(s, '🏠 dentro: ' + label); }
    if (!label && s._inside && !s.isPlayer) { setThought(s, '🚪 fuera'); log('🚪 ' + s.name + ' salió de ' + s._inside); }
    if (label && s._inside !== label && !s.isPlayer) log('🏠 ' + s.name + ' entró en ' + label);
    s._inside = label;
    s._insideRef = cur;
  }
  return cur;
}
// Navega a objetivo pasando por puerta: si objetivo dentro y yo fuera (o al revés),
// rodea hasta la puerta, la abre y cruza. Devuelve 'door' si está en fase puerta, true si llegó.
function navigateWithDoors(s, target, dt, stopD, mul) {
  updateInsideMemory(s);
  var dest = (typeof insideInterior === 'function') ? insideInterior(target) : null;
  var cur = s._insideRef || ((typeof insideInterior === 'function') ? insideInterior(s.mesh.position) : null);
  var curLabel = cur ? cur.label : null, destLabel = dest ? dest.label : null;
  if (curLabel !== destLabel && (cur || dest)) {
    var it = cur || dest; // si estoy dentro salgo por mi puerta; si voy dentro entro por la suya
    var door = (cur ? nearestDoorOf(cur, s.mesh.position) : nearestDoorOf(dest, s.mesh.position)) || nearestDoor(s.mesh.position, 30);
    if (!door) return moveToward(s, target, dt, mul, stopD);
    var dd = dist2D(s.mesh.position, door.mesh.position);
    // punto de aproximación: frente de la puerta por fuera
    if (dd > 2.0) {
      var r = moveToward(s, door.mesh.position, dt, mul, 1.6);
      if (dd < 6 && !s.isPlayer && Math.random() < dt * 0.5) setThought(s, '🚪 a ' + door.label);
      return r === true ? 'door' : r;
    }
    if (!door.open) { toggleDoor(door); if (!s.isPlayer) setThought(s, '🚪 abriendo'); }
    // cruzar: empujar un poco más allá de la puerta hacia el objetivo
    if (dd <= 2.2) {
      var dx = target.x - s.mesh.position.x, dz = target.z - s.mesh.position.z;
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      var px = s.mesh.position.x + door.mesh.position.x * 0 + (door.mesh.position.x - s.mesh.position.x) * 0.4 + dx / l * 1.2;
      var pz = s.mesh.position.z + (door.mesh.position.z - s.mesh.position.z) * 0.4 + dz / l * 1.2;
      return moveToward(s, { x: px, z: pz }, dt, mul);
    }
    return 'door';
  }
  return moveToward(s, target, dt, mul, stopD);
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
      var carD = { mesh: g, hp: 220, maxHp: 220, name: 'Coche', explosive: true, onDestroy: function (pp) { explodeAt(pp, 7, 110); collapseRubble(pp, 0x27272a, 5); scene.remove(g); } };
      carD._solids = [addSolid(g.position.x, g.position.z, 4.2, 2.1, { label: 'Coche' })];
      destructibles.push(carD);
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
      var poleD = { mesh: pole, hp: 80, maxHp: 80, name: 'Farola', onDestroy: function () { scene.remove(lamp); scene.remove(pl); scene.remove(pole); } };
      poleD._solids = [addSolid(x, z, 0.5, 0.5, { label: 'Farola' })];
      // al caer la farola, liberar paso
      var _oldPole = poleD.onDestroy;
      poleD.onDestroy = function () { _oldPole(); if (poleD._solids) poleD._solids.forEach(function (s) { s.dead = true; }); };
      destructibles.push(poleD);
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
      var barD = { mesh: m, hp: 40, maxHp: 40, name: 'Barril', explosive: true, onDestroy: function (pp) { explodeAt(pp, 8, 140); scene.remove(m); } };
      barD._solids = [addSolid(x, z, 1, 1, { label: 'Barril' })];
      destructibles.push(barD);
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
    if (d._solids) d._solids.forEach(function (s) { s.dead = true; });
    if (d._solid) d._solid.dead = true;
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
// ===== FÍSICA COLISIONES estilo CoD: todo sólido, puertas con hueco, deslizamiento =====
var staticSolids = [];   // AABB fijas mapa {x1,z1,x2,z2,dead,door,label}
var dynamicSolids = [];  // muros/torretas/depósitos construidos {x1..,ref,dead}
function addSolid(cx, cz, w, d, opts) {
  var s = { x1: cx - w / 2, z1: cz - d / 2, x2: cx + w / 2, z2: cz + d / 2, dead: false };
  if (opts) for (var k in opts) s[k] = opts[k];
  staticSolids.push(s); return s;
}
function addDynamicSolid(ref, cx, cz, w, d) {
  var s = { x1: cx - w / 2, z1: cz - d / 2, x2: cx + w / 2, z2: cz + d / 2, dead: false, ref: ref };
  dynamicSolids.push(s); ref._solid = s; return s;
}
function removeDynamicSolid(ref) { if (ref && ref._solid) ref._solid.dead = true; }
function allSolids() { return staticSolids.concat(dynamicSolids); }
// círculo vs AABB: empuja fuera por el eje de menor penetración (desliza como CoD)
function resolveCircle(pos, radius) {
  var hit = false;
  var solids = allSolids();
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (s.dead) continue;
    if (s.door && s.door.open) continue; // puerta abierta = paso libre
    var cx = clamp(pos.x, s.x1, s.x2), cz = clamp(pos.z, s.z1, s.z2);
    var dx = pos.x - cx, dz = pos.z - cz;
    var d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 1e-6) {
        var d = Math.sqrt(d2), push = radius - d;
        pos.x += dx / d * push; pos.z += dz / d * push;
      } else {
        // centro dentro: expulsar por el lado más cercano
        var l = pos.x - s.x1, r = s.x2 - pos.x, t = pos.z - s.z1, b = s.z2 - pos.z;
        var m = Math.min(l, r, t, b);
        if (m === l) pos.x = s.x1 - radius; else if (m === r) pos.x = s.x2 + radius;
        else if (m === t) pos.z = s.z1 - radius; else pos.z = s.z2 + radius;
      }
    }
  }
  return hit;
}
// mover con colisión por ejes (permite deslizar por paredes y colarse por puertas)
function tryMoveGround(pos, dx, dz, radius) {
  radius = radius || 0.5;
  var ox = pos.x, oz = pos.z;
  pos.x += dx; resolveCircle(pos, radius);
  pos.z += dz; resolveCircle(pos, radius);
  pos.x = clamp(pos.x, -106, 106); pos.z = clamp(pos.z, -106, 106);
  return Math.sqrt((pos.x - ox) * (pos.x - ox) + (pos.z - oz) * (pos.z - oz));
}
function pointBlocked(x, z, radius) {
  var p = { x: x, z: z };
  var solids = allSolids();
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i]; if (s.dead) continue; if (s.door && s.door.open) continue;
    var cx = clamp(x, s.x1, s.x2), cz = clamp(z, s.z1, s.z2);
    var dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < (radius || 0.5) * (radius || 0.5)) return true;
  }
  return false;
}
// dirección con rodeo: si el camino recto choca, prueba ±40° y ±80° (rápido, sin A*)
function steerDir(pos, tx, tz, radius) {
  var dx = tx - pos.x, dz = tz - pos.z;
  var base = Math.atan2(dx, dz);
  var cands = [0, 0.7, -0.7, 1.4, -1.4, 2.4, -2.4];
  for (var i = 0; i < cands.length; i++) {
    var a = base + cands[i];
    var px = pos.x + Math.sin(a) * 1.6, pz = pos.z + Math.cos(a) * 1.6;
    if (!pointBlocked(px, pz, radius)) return { x: Math.sin(a), z: Math.cos(a), angled: cands[i] !== 0 };
  }
  return { x: dx / (Math.sqrt(dx * dx + dz * dz) || 1), z: dz / (Math.sqrt(dx * dx + dz * dz) || 1), angled: false, blocked: true };
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
  // nunca dentro de un muro: empujar fuera para que sea alcanzable por la puerta
  if (typeof resolveCircle === 'function') resolveCircle(g.position, 0.8);
  crates.push({ mesh: g, pos: g.position, kind: kind, taken: false, bob: Math.random() * 6 });
}
// ===== SISTEMA CoD ZOMBIES: puntos + caja misteriosa 950 + armas de pared =====
var mysteryBoxes = [], wallbuys = [];
var BOX_COST = 950;
var WALLBUYS_DEF = [
  { weapon: 'shotgun', cost: 750, label: '725 pared 750' },
  { weapon: 'sniper', cost: 1250, label: 'HDR pared 1250' },
  { weapon: 'smg', cost: 1000, label: 'MP5 pared 1000' }
];
function givePoints(s, n, why) {
  if (!s) return;
  var mult = (typeof powerTimers !== 'undefined' && powerTimers.doublePts > 0) ? 2 : 1;
  s.points = (s.points || 0) + n * mult;
  if (s.isPlayer && (n >= 60 || why)) toast('⭐ +' + (n * mult) + (why ? ' ' + why : ''));
}
function buildMysteryBox(x, z, label) {
  var g = new THREE.Group();
  var chest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.1), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 }));
  chest.position.y = 0.5; chest.castShadow = true; g.add(chest);
  var lid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.1), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  lid.position.y = 1.05; g.add(lid);
  var q = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  q.position.set(0, 0.55, 0.58); g.add(q);
  var halo = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35 }));
  halo.position.y = 0.06; g.add(halo);
  g.position.set(x, 0, z); scene.add(g);
  if (typeof resolveCircle === 'function') resolveCircle(g.position, 1.2);
  var b = { mesh: g, lid: lid, x: g.position.x, z: g.position.z, label: label, cost: BOX_COST };
  mysteryBoxes.push(b);
  addDynamicSolid(b, g.position.x, g.position.z, 2, 1.3);
  return b;
}
function buildWallbuy(x, z, ry, def) {
  var g = new THREE.Group();
  var board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  board.position.y = 1.5; g.add(board);
  var gun = createWeaponMesh(def.weapon);
  gun.position.set(0, 1.5, 0.15); gun.rotation.z = 0.3; g.add(gun);
  var tag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  tag.position.set(0, 0.75, 0.1); g.add(tag);
  g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
  var w = { mesh: g, x: g.position.x, z: g.position.z, def: def, label: def.label };
  wallbuys.push(w);
  return w;
}
function buildCodEconomy() {
  // caja misteriosa dentro del MALL (hay que entrar por puerta) + una en HOUSES
  buildMysteryBox(-6, -18, 'Caja MALL 950');
  buildMysteryBox(-62, 32, 'Caja HOUSES 950');
  // armas de pared: una por casa/MALL para forzar exploración
  buildWallbuy(5.5, -10, Math.PI / 2, WALLBUYS_DEF[0]);
  buildWallbuy(-58, 24, 0, WALLBUYS_DEF[2]);
  buildWallbuy(-66, 30, 0, WALLBUYS_DEF[1]);
}
function nearestBox(pos, maxD) {
  var best = null, bd = maxD || 3;
  for (var i = 0; i < mysteryBoxes.length; i++) { var d = dist2D(pos, { x: mysteryBoxes[i].x, z: mysteryBoxes[i].z }); if (d < bd) { bd = d; best = mysteryBoxes[i]; } }
  return best;
}
function nearestWallbuy(pos, maxD) {
  var best = null, bd = maxD || 3;
  for (var i = 0; i < wallbuys.length; i++) { var d = dist2D(pos, { x: wallbuys[i].x, z: wallbuys[i].z }); if (d < bd) { bd = d; best = wallbuys[i]; } }
  return best;
}
function giveWeaponTo(s, wk) {
  s.slots = s.slots || [s.weaponKey, 'pistol'];
  if (s.slots.indexOf(wk) < 0) { if (s.slots.length < 3) s.slots.push(wk); else s.slots[1] = wk; }
  s.weaponKey = wk;
  var w = WEAPONS[wk];
  s.mag = w.mag; s.ammo = w.mag; s.magByWeapon = s.magByWeapon || {}; s.magByWeapon[wk] = w.mag;
  if (s.gunMesh) { try { s.mesh.remove(s.gunMesh); } catch (e) {} }
  s.gunMesh = createWeaponMesh(wk); s.gunMesh.position.set(0.36, 1.35, 0.45); s.mesh.add(s.gunMesh);
  if (s.isPlayer && typeof attachViewmodel === 'function') attachViewmodel();
}
function tryMysteryBox(p) {
  var b = nearestBox(p.mesh.position, 3);
  if (!b) return false;
  p.points = p.points || 0;
  if (p.points < b.cost) { toast('📦 Caja ' + b.cost + ' pts — tienes ' + p.points + ' (mata zombies)'); playSound('ui'); return true; }
  p.points -= b.cost;
  var pool = ['rifle', 'smg', 'shotgun', 'sniper', 'raygun', 'rifle', 'smg'];
  var wk = pool[Math.floor(Math.random() * pool.length)];
  // animación tapa
  try { b.lid.position.y = 1.6; setTimeout(function () { b.lid.position.y = 1.05; }, 600); } catch (e) {}
  giveWeaponTo(p, wk);
  playSound('pickup'); toast('📦 ¡' + WEAPONS[wk].name + '! (-950)');
  log('📦 ' + p.name + ' sacó ' + WEAPONS[wk].name);
  return true;
}
function tryWallbuy(p) {
  var w = nearestWallbuy(p.mesh.position, 3);
  if (!w) return false;
  p.points = p.points || 0;
  if (p.points < w.def.cost) { toast('🔫 ' + w.def.label + ' — tienes ' + p.points); return true; }
  p.points -= w.def.cost;
  giveWeaponTo(p, w.def.weapon);
  baseResources.ammo += 20;
  playSound('pickup'); toast('🔫 ¡' + WEAPONS[w.def.weapon].name + '! (-' + w.def.cost + ')');
  return true;
}
