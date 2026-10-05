// ===== UI MAESTRA: minimapa, barras 3D, killfeed, boss, viñeta daño =====
function setThought(s, txt) { s._thought = txt; s._thoughtT = 2.2; }
function killfeed(msg) {
  var k = document.getElementById('killfeed'); if (!k) return;
  var d = document.createElement('div'); d.textContent = msg; k.prepend(d);
  while (k.children.length > 6) k.removeChild(k.lastChild);
  setTimeout(function () { d.style.opacity = '0'; setTimeout(function(){ d.remove(); }, 400); }, 4200);
}
function bossBanner(txt, frac) {
  var b = document.getElementById('boss-banner'); if (!b) return;
  document.getElementById('boss-text').textContent = txt;
  b.classList.remove('hidden');
  var bar = document.querySelector('#boss-bar i');
  if (bar) bar.style.width = (frac === undefined ? 100 : frac * 100) + '%';
  clearTimeout(b._t); b._t = setTimeout(function () { b.classList.add('hidden'); }, 3200);
}
function damageFlash(v) {
  var d = document.getElementById('damage-vignette'); if (!d) return;
  d.style.opacity = Math.min(1, 0.3 + v);
  clearTimeout(d._t); d._t = setTimeout(function () { d.style.opacity = 0; }, 220);
}
function updateThoughts(dt) {
  document.querySelectorAll('.thought').forEach(function (e) { e.remove(); });
  survivors.forEach(function (s) {
    if (!s.alive || !s._thought || s._thoughtT <= 0) return;
    s._thoughtT -= dt;
    var v = s.mesh.position.clone(); v.y += 2.5; v.project(camera);
    if (v.z > 1) return;
    var d = document.createElement('div'); d.className = 'thought';
    d.textContent = s.name + ': ' + s._thought;
    d.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    d.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 130);
  });
}
// barras 3D sobre zombies / construcciones / depósitos
var barPool = [];
function projBar(worldPos, yOff, frac, cls) {
  var v = worldPos.clone(); v.y += yOff; v.project(camera);
  if (v.z > 1) return;
  var x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  if (x < -50 || x > window.innerWidth + 50 || y < -20 || y > window.innerHeight + 20) return;
  var d = document.createElement('div'); d.className = cls;
  d.style.left = x + 'px'; d.style.top = y + 'px';
  d.innerHTML = '<i style="width:' + Math.max(0, Math.min(100, frac * 100)) + '%"></i>';
  document.body.appendChild(d);
  setTimeout(function () { d.remove(); }, 120);
}
function updateWorldBars() {
  // solo los cercanos a cámara para rendimiento (máx 40)
  var cx = camera.position.x, cz = camera.position.z;
  var shown = 0;
  for (var i = 0; i < zombies.length && shown < 30; i++) {
    var z = zombies[i];
    var dx = z.mesh.position.x - cx, dz = z.mesh.position.z - cz;
    if (dx * dx + dz * dz > 55 * 55) continue;
    projBar(z.mesh.position, z.kind === 'titan' ? 3.4 : 2.6, z.hp / z.maxHp, 'zbar' + (z.kind === 'titan' ? ' titan' : ''));
    shown++;
  }
  walls.concat(barricades).forEach(function (w) {
    var dx2 = w.mesh.position.x - cx, dz2 = w.mesh.position.z - cz;
    if (dx2 * dx2 + dz2 * dz2 > 45 * 45) return;
    projBar(w.mesh.position, 2.8, w.hp / w.maxHp, 'bbar');
  });
  turretPosts.forEach(function (p) {
    var dx3 = p.mesh.position.x - cx, dz3 = p.mesh.position.z - cz;
    if (dx3 * dx3 + dz3 * dz3 > 50 * 50) return;
    projBar(p.mesh.position, p.isNest ? 6.4 : 2.4, 1, 'bbar');
  });
  activeShelterKeys.forEach(function (k) {
    var dep = ZONES[k].depot; if (!dep) return;
    projBar(dep.mesh.position, 4.6, dep.hp / dep.maxHp, 'bbar');
  });
  if (tank.assembled && tank.mesh) projBar(tank.mesh.position, 4.2, tank.hp / tank.maxHp, 'bbar');
  destructibles.forEach(function (d) {
    if (d.maxHp > 500) return;
    var dx4 = d.mesh.position.x - cx, dz4 = d.mesh.position.z - cz;
    if (dx4 * dx4 + dz4 * dz4 > 40 * 40 || d.hp >= d.maxHp) return;
    projBar(d.mesh.position, 2.2, d.hp / d.maxHp, 'zbar');
  });
}
function drawMinimap() {
  var cv = document.getElementById('minimap'); if (!cv || !gameStarted) return;
  var g = cv.getContext('2d');
  g.clearRect(0, 0, 150, 150);
  g.fillStyle = 'rgba(10,20,15,.9)'; g.fillRect(0, 0, 150, 150);
  function dot(x, z, c, s) { var mx = 75 + x / 220 * 150, mz = 75 + z / 220 * 150; g.fillStyle = c; g.fillRect(mx - s / 2, mz - s / 2, s, s); }
  // refugios
  activeShelterKeys.forEach(function (k) { dot(ZONES[k].pos[0], ZONES[k].pos[2], '#38bdf8', 7); });
  outposts.forEach(function (o) { g.strokeStyle = '#10b981'; g.beginPath(); g.arc(75 + o.pos.x / 220 * 150, 75 + o.pos.z / 220 * 150, o.radius / 220 * 150, 0, 7); g.stroke(); });
  if (tank.yard) { g.strokeStyle = '#f59e0b'; g.strokeRect(75 + tank.yard.pos.x / 220 * 150 - 8, 75 + tank.yard.pos.z / 220 * 150 - 8, 16, 16); }
  crates.forEach(function (c) { dot(c.pos.x, c.pos.z, '#f59e0b', 2); });
  walls.forEach(function (w) { dot(w.mesh.position.x, w.mesh.position.z, '#64748b', 2); });
  turretPosts.forEach(function (p) { dot(p.mesh.position.x, p.mesh.position.z, '#22d3ee', 3); });
  // zombies rojos
  zombies.forEach(function (z) { if (z.kind === 'titan') dot(z.mesh.position.x, z.mesh.position.z, '#ef4444', 4); else dot(z.mesh.position.x, z.mesh.position.z, '#f97316', 2); });
  // aliados
  survivors.forEach(function (s) {
    if (!s.alive) return;
    dot(s.mesh.position.x, s.mesh.position.z, s.isPlayer ? '#ffffff' : '#10b981', s.isPlayer ? 5 : 3);
  });
  // norte + borde oleada
  g.fillStyle = '#fff'; g.font = '9px sans-serif'; g.fillText('N', 71, 10);
  if (isWaveActive) { g.strokeStyle = '#ef4444'; g.lineWidth = 2; g.strokeRect(1, 1, 148, 148); }
  drawCompass();
}
function drawCompass() {
  var el = document.getElementById('compass-strip'); if (!el || !gameStarted) return;
  var p = (playerIndex >= 0 && survivors[playerIndex]) ? survivors[playerIndex] : (survivors[cameraTargets.followIdx] || null);
  var yaw = 0;
  if (gameMode === 'participant' && p) yaw = p.yaw;
  else yaw = performance.now() / 8000;
  // heading 0=N(-Z), markers cada 15°
  var pts = ['N 0', 'NE 45', 'E 90', 'SE 135', 'S 180', 'SO 225', 'O 270', 'NO 315'];
  var html = '';
  for (var d = -120; d <= 120; d += 5) {
    var ang = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    var mark = Math.round((ang + d) / 15) * 15 % 360;
    var label = mark % 45 === 0 ? (['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(mark / 45) % 8] + mark) : '·';
    var hot = Math.abs(d) < 3 ? 'color:#10b981' : '';
    html += '<span style="display:inline-block;width:24px;text-align:center;' + hot + '">' + label + '</span>';
  }
  el.innerHTML = html;
  el.style.transform = 'translateX(0)';
}
function updateUI(dt) {
  document.getElementById('hud-wave').textContent = 'OLEADA ' + currentWave;
  document.getElementById('hud-wave-m').textContent = 'OLEADA ' + currentWave;
  var ph = isWaveActive ? ('COMBATE · ' + zombies.length + ' left') : ('BÚSQUEDA ' + fmtTime(waveTimer));
  document.getElementById('hud-phase').textContent = ph;
  document.getElementById('hud-phase-m').textContent = ph;
  document.getElementById('z-count').textContent = zombies.length + (spawnQueue.length ? '+' + spawnQueue.length : '');
  document.getElementById('res-scrap').textContent = Math.floor(baseResources.scrap);
  document.getElementById('res-ammo').textContent = baseResources.ammo;
  document.getElementById('res-med').textContent = baseResources.med;
  document.getElementById('d-scrap').textContent = Math.floor(baseResources.scrap);
  document.getElementById('d-ammo').textContent = baseResources.ammo;
  document.getElementById('d-med').textContent = baseResources.med;
  document.getElementById('d-food').textContent = baseResources.food;
  document.getElementById('d-heavy').textContent = baseResources.heavy;
  document.getElementById('d-armor').textContent = baseResources.armor;
  document.getElementById('kills').textContent = 'Bajas: ' + STATS.kills;
  // progreso oleada
  var wf = document.getElementById('wave-fill');
  if (wf) wf.style.width = isWaveActive ? (zombies.length ? 100 - Math.min(99, zombies.length / Math.max(1, waveCount(currentWave)) * 100) : 100) + '%' : (100 - waveTimer / (customSettings.prepTime || 180) * 100) + '%';
  document.querySelectorAll('.air-btn').forEach(function (b) {
    var k = b.dataset.air, cd = airCooldowns[k] || 0;
    b.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) + 's' : 'LISTO';
    b.classList.toggle('cooling', cd > 0);
  });
  var sl = document.getElementById('shelter-list'); sl.innerHTML = '';
  Object.keys(ZONES).forEach(function (k) {
    var z = ZONES[k];
    var pct = Math.round(100 * z.hp / z.maxHp);
    var d = document.createElement('div'); d.className = 'surv-card';
    d.innerHTML = '<b>' + k + '</b> ' + (z.active ? '🟢' : '⚪') + ' <span class="opacity-70">' + pct + '% · ' + Math.ceil(z.hp) + 'HP</span><div class="hpbar"><i style="width:' + pct + '%"></i></div>';
    sl.appendChild(d);
  });
  var tl = document.getElementById('team-list');
  if (!updateUI._t || performance.now() - updateUI._t > 400) {
    updateUI._t = performance.now();
    tl.innerHTML = '';
    survivors.forEach(function (s, idx) {
      var d = document.createElement('div'); d.className = 'surv-card' + (s.alive ? '' : ' dead');
      var pct = Math.round(100 * s.hp / s.maxHp);
      d.innerHTML = '<b>' + s.name + '</b> <span class="opacity-60">' + s.role + ' · ' + WEAPONS[s.weaponKey].name + '</span>' +
        (s.isPlayer ? ' 🎮' : '') + (s.towerOp ? ' 🗼' : '') + (s.carriedCrate ? ' 📦' + s.carriedCrate : '') +
        (insideInterior && insideInterior(s.mesh.position) ? ' 🏠' + insideInterior(s.mesh.position).label : '') +
        '<br>HP ' + Math.ceil(s.hp) + ' · ⚡' + Math.ceil(s.energy) + ' · 🔫' + s.ammo + ' · 💣' + s.grenades + ' · ☠' + (s.kills || 0) +
        '<div class="hpbar"><i style="width:' + pct + '%"></i></div><div class="text-[10px] opacity-60">' + s.state + '</div>';
      d.onclick = function () { playSound('ui'); selectedSurvivor = s; renderInspector(); if (gameMode !== 'participant') { cameraMode = 'follow'; cameraTargets.followIdx = idx; toast('👁 Siguiendo a ' + s.name + ' — arrastra para orbitar, rueda para zoom'); } else if (idx === playerIndex) { cameraMode = 'follow'; cameraTargets.followIdx = idx; } };
      tl.appendChild(d);
    });
    if (selectedSurvivor) renderInspector();
  }
  updatePlayerBars();
  updateBuildBars();
  updateThoughts(dt);
  updateWorldBars();
  drawMinimap();
  // titán cercano = banner jefe
  if (isWaveActive && !updateUI._bossT || performance.now() - updateUI._bossT > 6000) {
    var tit = zombies.find(function (z) { return z.kind === 'titan'; });
    if (tit) { updateUI._bossT = performance.now(); var alive = zombies.filter(function (z) { return z.kind === 'titan'; }).length; bossBanner('👹 TITÁN x' + alive + ' — ¡FUEGO PESADO!', tit.hp / tit.maxHp); playSound('zombie'); }
  }
}
function renderInspector() {
  var el = document.getElementById('inspector'); var s = selectedSurvivor;
  if (!s) { el.textContent = 'Selecciona un superviviente…'; return; }
  var interior = (typeof insideInterior === 'function' && insideInterior(s.mesh.position)) || null;
  el.innerHTML = '<b>' + s.name + '</b> (' + s.role + ')' + (interior ? '<br>🏠 Dentro: ' + interior.label : '<br>🌆 Exterior') +
    '<br>❤ ' + Math.ceil(s.hp) + '/' + s.maxHp + ' · ⚡ ' + Math.ceil(s.energy) +
    '<br>🔫 ' + WEAPONS[s.weaponKey].name + ' · ' + WEAPONS[s.weaponKey].dmg[0] + '-' + WEAPONS[s.weaponKey].dmg[1] + ' · ' + WEAPONS[s.weaponKey].range + 'm' +
    '<br>Ammo ' + s.ammo + ' · 💣' + s.grenades + ' · ⛑' + s.meds +
    '<br>Estado ' + s.state + ' · Bajas ' + (s.kills || 0) + (s.carriedCrate ? '<br>📦 Lleva ' + s.carriedCrate : '');
}
function updatePlayerBars() {
  var p = survivors[playerIndex];
  var box = document.getElementById('player-bars');
  if (!p || gameMode !== 'participant') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  document.getElementById('bar-hp').style.width = (100 * p.hp / p.maxHp) + '%';
  document.getElementById('bar-en').style.width = p.energy + '%';
  document.getElementById('bar-am').style.width = Math.min(100, p.ammo * 2) + '%';
  document.getElementById('ammo-label').textContent = WEAPONS[p.weaponKey].name + ' ' + p.ammo + (p.reloadT > 0 ? ' RECARGANDO…' : '') + ' · 💣' + p.grenades + ' · ⛑' + p.meds;
  document.getElementById('crosshair').classList.toggle('hidden', !(gameMode === 'participant' && openMenu === null));
  // prompt interactivo E
  var pr = document.getElementById('interact-prompt');
  if (pr) {
    var txt = nearbyInteractText(p);
    if (txt && openMenu === null) { pr.textContent = txt; pr.classList.remove('hidden'); }
    else pr.classList.add('hidden');
  }
}
function nearbyInteractText(p) {
  var c = (typeof nearestCrate === 'function' && nearestCrate(p.mesh.position, 2.6));
  if (c) return '[E] ' + c.kind;
  for (var i = 0; i < activeShelterKeys.length; i++) { var z = ZONES[activeShelterKeys[i]]; if (z.depot && dist2D(p.mesh.position, z.depot.mesh.position) < 5) return '[E] depósito'; }
  var tw = (typeof nearestFreeTower === 'function' && nearestFreeTower(p.mesh.position));
  if (tw && !p.towerOp) return '[Z] MG';
  if (p.towerOp) return '[Z] bajar';
  if (loots.some(function (l) { return dist2D(p.mesh.position, l.mesh.position) < 2.2; })) return '[E] loot';
  return null;
}
function updateBuildBars() {
  var box = document.getElementById('build-progress-box'); box.innerHTML = '';
  (window._buildJobs || []).filter(function (j) { return !j.done; }).slice(0, 3).forEach(function (j) {
    var d = document.createElement('div'); d.className = 'glass px-3 py-1 text-[11px]';
    d.innerHTML = '🚧 ' + j.id + ' <div class="wbar" style="width:180px"><i style="width:' + Math.max(4, 100 - j.work / 4) + '%"></i></div> ' + Math.ceil(j.work) + 's — [X] aportar';
    box.appendChild(d);
  });
  for (var i = (window._buildJobs || []).length - 1; i >= 0; i--) {
    var jb = window._buildJobs[i];
    if (jb.work <= 0) finishJob(jb);
    if (jb.done) window._buildJobs.splice(i, 1);
  }
  // tanque progreso
  if (tank.pieces > 0 && !tank.assembled) {
    var d2 = document.createElement('div'); d2.className = 'glass px-3 py-1 text-[11px]';
    d2.innerHTML = '🛡 TANQUE ' + tank.pieces + '/5 piezas — patio ámbar (B→pieza 500esc)';
    box.appendChild(d2);
  }
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function setupUICallbacks() {
  document.querySelectorAll('.air-btn').forEach(function (b) { b.onclick = function () { playSound('ui'); callAirSupport(b.dataset.air); }; });
  document.getElementById('btn-speed').onclick = cycleSpeed;
  document.getElementById('btn-cam').onclick = cycleCamera;
  document.getElementById('btn-wave-start').onclick = function () { if (!isWaveActive) { waveTimer = 0.5; toast('⏩ Oleada adelantada'); } };
  document.getElementById('btn-retry').onclick = function () { location.reload(); };
  document.getElementById('btn-rescue').onclick = rescueDrop;
  document.getElementById('btn-left-toggle').onclick = function () { document.getElementById('panel-left').classList.toggle('open'); };
  document.getElementById('btn-right-toggle').onclick = function () { document.getElementById('panel-right').classList.toggle('open'); };
  window.addEventListener('resize', checkRotate);
  checkRotate();
}
function cycleSpeed() {
  var seq = [0, 1, 2, 5]; var i = seq.indexOf(gameSpeed);
  gameSpeed = seq[(i + 1) % seq.length];
  if (!gameStarted) gameSpeed = Math.max(1, gameSpeed);
  document.getElementById('speed-label').textContent = gameSpeed === 0 ? '❚❚' : gameSpeed + 'x';
  playSound('ui');
}
function cycleCamera() {
  var modes = gameMode === 'participant' ? ['follow', 'orbit', 'base'] : ['orbit', 'base', 'follow'];
  cameraMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
  // al volver a follow en participante, volver al jugador (no quedarse en un NPC)
  if (gameMode === 'participant' && cameraMode === 'follow') cameraTargets.followIdx = playerIndex;
  toast('Cámara: ' + cameraMode + (cameraMode === 'follow' && cameraTargets.followIdx !== playerIndex ? ' (orbitable con ratón/rueda)' : '')); playSound('ui');
}
function updateCamera(dt) {
  // El jugador en follow lo maneja updatePlayer (FPS/TPS). Cualquier otro follow = orbitar NPC con cámara libre.
  var followingPlayer = (gameMode === 'participant' && cameraMode === 'follow' && cameraTargets.followIdx === playerIndex && playerIndex >= 0);
  if (followingPlayer) return;
  if (cameraMode === 'orbit') { controls.enabled = true; controls.update(); return; }
  if (cameraMode === 'base') {
    if (!activeShelterKeys.length) return;
    controls.enabled = false;
    var z = ZONES[activeShelterKeys[cameraTargets.baseIdx % activeShelterKeys.length]];
    var t = performance.now() / 1000 * 0.12;
    camera.position.lerp(new THREE.Vector3(z.pos[0] + Math.cos(t) * 40, 26, z.pos[2] + Math.sin(t) * 40), Math.min(1, dt * 1.5));
    camera.lookAt(z.pos[0], 2, z.pos[2]);
  } else {
    // FOLLOW espectador / NPC: orbit libre alrededor del superviviente (como cámara libre CoD observer)
    var s = survivors[cameraTargets.followIdx % Math.max(1, survivors.length)];
    if (!s) return;
    controls.enabled = true;
    // seguir al objetivo en movimiento sin teletransportar la cámara: desplazar target y cámara juntos
    var dx = s.mesh.position.x - controls.target.x, dz = s.mesh.position.z - controls.target.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      var step = Math.min(1, dt * 4);
      controls.target.x += dx * step; controls.target.z += dz * step;
      camera.position.x += dx * step; camera.position.z += dz * step;
    }
    controls.target.y = 1.5;
    controls.update();
  }
}
function showGameOver() {
  gameSpeed = 0;
  document.exitPointerLock && document.exitPointerLock();
  document.getElementById('go-stats').innerHTML = 'Oleada ' + currentWave + ' · Bajas ' + STATS.kills + ' · Construidas ' + STATS.built + ' · Cajas ' + STATS.cratesPicked;
  document.getElementById('gameover').classList.remove('hidden');
  playSound('alarm');
}
function checkRotate() {
  var w = document.getElementById('rotate-warning');
  if (!w) return;
  var portrait = window.innerHeight > window.innerWidth;
  w.classList.toggle('hidden', !(uiMode === 'mobile' && portrait));
}
