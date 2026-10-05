// ===== UI: HUD, tabs, refugios, cooldowns, obras, burbujas, cámara =====
function setThought(s, txt) {
  s._thought = txt; s._thoughtT = 2.2;
}
function updateThoughts(dt) {
  // limpiar viejas
  document.querySelectorAll('.thought').forEach(function (e) { if (!e._keep) e.remove(); });
  var all = survivors.concat(zombies.slice(0, 0));
  survivors.forEach(function (s) {
    if (!s.alive || !s._thought || s._thoughtT <= 0) return;
    s._thoughtT -= dt;
    var v = s.mesh.position.clone(); v.y += 2.4; v.project(camera);
    if (v.z > 1) return;
    var d = document.createElement('div'); d.className = 'thought'; d._keep = true;
    d.textContent = s.name + ': ' + s._thought;
    d.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    d.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 120);
  });
}
function updateUI(dt) {
  // header
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
  // cooldowns aire
  document.querySelectorAll('.air-btn').forEach(function (b) {
    var k = b.dataset.air, cd = airCooldowns[k] || 0;
    b.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) + 's' : '10s';
    b.classList.toggle('cooling', cd > 0);
  });
  // refugios
  var sl = document.getElementById('shelter-list'); sl.innerHTML = '';
  Object.keys(ZONES).forEach(function (k) {
    var z = ZONES[k];
    var d = document.createElement('div'); d.className = 'surv-card';
    var pct = Math.round(100 * z.hp / z.maxHp);
    d.innerHTML = '<b>' + k + '</b> ' + (z.active ? '🟢' : '⚪') + ' <span class="opacity-70">' + pct + '%</span><div class="hpbar"><i style="width:' + pct + '%"></i></div>';
    sl.appendChild(d);
  });
  // equipo (throttle: cada frame ok, pocos nodos)
  var tl = document.getElementById('team-list');
  if (!updateUI._t || performance.now() - updateUI._t > 400) {
    updateUI._t = performance.now();
    tl.innerHTML = '';
    survivors.forEach(function (s, idx) {
      var d = document.createElement('div'); d.className = 'surv-card' + (s.alive ? '' : ' dead');
      var pct = Math.round(100 * s.hp / s.maxHp);
      d.innerHTML = '<b>' + s.name + '</b> <span class="opacity-60">' + s.role + ' · ' + WEAPONS[s.weaponKey].name + '</span>' +
        (s.isPlayer ? ' 🎮' : '') + (s.towerOp ? ' 🗼' : '') + (s.carriedCrate ? ' 📦' : '') +
        '<br>HP ' + Math.ceil(s.hp) + ' · ⚡' + Math.ceil(s.energy) + ' · 🔫' + s.ammo + ' · 💣' + s.grenades + ' · ☠' + (s.kills || 0) +
        '<div class="hpbar"><i style="width:' + pct + '%"></i></div><div class="text-[10px] opacity-60">' + s.state + '</div>';
      d.onclick = function () { selectedSurvivor = s; renderInspector(); if (cameraMode !== 'follow' || gameMode !== 'participant') { cameraMode = 'follow'; cameraTargets.followIdx = idx; } };
      tl.appendChild(d);
    });
    if (selectedSurvivor) renderInspector();
  }
  updatePlayerBars();
  updateBuildBars();
  updateThoughts(dt);
}
function renderInspector() {
  var el = document.getElementById('inspector'); var s = selectedSurvivor;
  if (!s) { el.textContent = 'Selecciona un superviviente…'; return; }
  el.innerHTML = '<b>' + s.name + '</b> (' + s.role + ')<br>HP ' + Math.ceil(s.hp) + '/' + s.maxHp + ' · Energía ' + Math.ceil(s.energy) +
    '<br>Arma ' + WEAPONS[s.weaponKey].name + ' · Ammo ' + s.ammo + '<br>Granadas ' + s.grenades + ' · Botiquines ' + s.meds +
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
  document.getElementById('ammo-label').textContent = WEAPONS[p.weaponKey].name + ' ' + p.ammo + ' · 💣' + p.grenades + ' · ⛑' + p.meds;
  document.getElementById('crosshair').classList.toggle('hidden', !(gameMode === 'participant' && openMenu === null));
}
function updateBuildBars() {
  var box = document.getElementById('build-progress-box'); box.innerHTML = '';
  (window._buildJobs || []).filter(function (j) { return !j.done; }).slice(0, 3).forEach(function (j) {
    var d = document.createElement('div'); d.className = 'glass px-3 py-1 text-[11px]';
    d.innerHTML = '🚧 ' + j.id + ' <div class="wbar" style="width:180px"><i style="width:' + Math.max(4, 100 - j.work / 4) + '%"></i></div> ' + Math.ceil(j.work) + 's — [X] aportar';
    box.appendChild(d);
  });
  // barras de obra también progresan solas lento si hay NPC cerca (ya en helpConstruction)
  for (var i = (window._buildJobs || []).length - 1; i >= 0; i--) {
    var jb = window._buildJobs[i];
    if (!jb.done) {
      jb._solo = (jb._solo || 0);
      // el trabajo lo aportan NPC/jugador; sin ayuda no avanza (diseño)
      if (jb.work <= 0) finishJob(jb);
    } else window._buildJobs.splice(i, 1);
  }
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function setupUICallbacks() {
  document.querySelectorAll('.air-btn').forEach(function (b) { b.onclick = function () { callAirSupport(b.dataset.air); }; });
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
}
function cycleCamera() {
  var modes = gameMode === 'participant' ? ['follow', 'orbit', 'base'] : ['orbit', 'base', 'follow'];
  cameraMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
  toast('Cámara: ' + cameraMode);
}
function updateCamera(dt) {
  if (gameMode === 'participant' && playerIndex >= 0 && cameraMode === 'follow') return; // la maneja updatePlayer
  controls.enabled = cameraMode === 'orbit';
  if (cameraMode === 'orbit') { controls.update(); return; }
  if (cameraMode === 'base') {
    if (!activeShelterKeys.length) return;
    cameraTargets.baseIdx = (cameraTargets.baseIdx + (dt > 0 && Math.floor(performance.now() / 8000) % 99 === 0 ? 1 : 0)) % activeShelterKeys.length;
    var z = ZONES[activeShelterKeys[cameraTargets.baseIdx % activeShelterKeys.length]];
    var t = performance.now() / 1000 * 0.12;
    camera.position.lerp(new THREE.Vector3(z.pos[0] + Math.cos(t) * 40, 26, z.pos[2] + Math.sin(t) * 40), Math.min(1, dt * 1.5));
    camera.lookAt(z.pos[0], 2, z.pos[2]);
  } else {
    var s = survivors[cameraTargets.followIdx % Math.max(1, survivors.length)];
    if (s && s.alive) {
      camera.position.lerp(new THREE.Vector3(s.mesh.position.x + 8, 7, s.mesh.position.z + 10), Math.min(1, dt * 3));
      camera.lookAt(s.mesh.position.x, 1.5, s.mesh.position.z);
      controls.target.set(s.mesh.position.x, 1.5, s.mesh.position.z);
    }
  }
}
function showGameOver() {
  gameSpeed = 0;
  document.exitPointerLock && document.exitPointerLock();
  document.getElementById('go-stats').innerHTML = 'Oleada ' + currentWave + ' · Bajas ' + STATS.kills + ' · Construidas ' + STATS.built + ' · Cajas ' + STATS.cratesPicked;
  document.getElementById('gameover').classList.remove('hidden');
}
function checkRotate() {
  var w = document.getElementById('rotate-warning');
  var portrait = window.innerHeight > window.innerWidth;
  w.classList.toggle('hidden', !(uiMode === 'mobile' && portrait));
}
