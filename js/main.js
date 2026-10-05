// ===== MAIN: init 3D, bucle 60fps fijos, stepGame =====
function init3DWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.006);
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 55, 80);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  document.getElementById('game-container').appendChild(renderer.domElement);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.1;
  // luces
  scene.add(new THREE.AmbientLight(0x384152, 0.8));
  var sun = new THREE.DirectionalLight(0xffecd1, 1.1);
  sun.position.set(40, 80, 50); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  scene.add(sun);
  var red = new THREE.PointLight(0xff0000, 1.2, 120); red.position.set(0, 25, 0); scene.add(red);
  clock = new THREE.Clock();
  buildCityMap();
  scatterCityRuins();
  spawnInitialCrates(14);
  initSurvivors(false);
  activateShelter('MALL');
  startWaveTimer();
  setupPlayerControls();
  setupUICallbacks();
  setupMainMenu();
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.onerror = function (msg, src, line) { try { log('⚠ ' + msg); } catch (e) {} };
  requestAnimationFrame(animate);
}
function safeStep(name, fn, dt) {
  try { fn(dt); } catch (e) { if (!safeStep._rep) safeStep._rep = {}; if (!safeStep._rep[name]) { safeStep._rep[name] = true; console.error('[stepGame:' + name + ']', e); try { log('⚠ fallo ' + name); } catch (x) {} } }
}
function stepGame(dt) {
  safeStep('wave', updateWave, dt);
  safeStep('npc', function (d) { survivors.forEach(function (s) { updateSurvivorAI(s, d); if (s.nadeCd > 0) return; }); updateSurvivorCooldowns(d); }, dt);
  safeStep('player', updatePlayer, dt);
  safeStep('zombies', updateZombies, dt);
  safeStep('shelterTurret', updateShelterTurrets, dt);
  safeStep('projectiles', updateProjectiles, dt);
  safeStep('air', function (d) { updateAirUnits(d); updateMissiles(d); updateGrenades(d); updateLoots(d); updateHealFX(d); updateTowerTurrets(d); updateTank(d); }, dt);
  safeStep('outpost', updateOutpostSystems, dt);
  safeStep('camera', updateCamera, dt);
  safeStep('ui', updateUI, dt);
}
function updateSurvivorCooldowns(dt) {
  survivors.forEach(function (s) {
    if (s.cd === undefined) return;
    // los cd ya se descuentan en updateSurvivorAI con gameSpeed; jugador aparte
    if (s.isPlayer) { s.nadeCd -= dt * gameSpeed; }
  });
  // drenaje lento de nadeCd jugador si negativo se queda
}
var acc = 0, lastT = 0;
function animate() {
  requestAnimationFrame(animate);
  var now = performance.now() / 1000;
  if (!lastT) lastT = now;
  var frame = Math.min(0.25, now - lastT); lastT = now;
  acc += frame;
  var steps = 0;
  while (acc >= FIXED_STEP && steps < 4) {
    if (gameStarted && gameSpeed > 0) {
      stepGame(FIXED_STEP); // paso único; cada sistema escala con dt*gameSpeed internamente
    } else if (!gameStarted) {
      // menú: orbit suave de fondo
      controls.update();
    } else {
      // pausa (gameSpeed 0): cámara + UI siguen vivas
      try { updateCamera(FIXED_STEP); updateUI(FIXED_STEP); } catch (e) {}
    }
    acc -= FIXED_STEP; steps++;
  }
  if (steps === 4) acc = 0; // anti-espiral
  renderer.render(scene, camera);
}
window.addEventListener('load', init3DWorld);
