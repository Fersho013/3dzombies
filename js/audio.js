// ===== AUDIO ULTRA: motor procedural realista Tone.js =====
var audioReady = false, masterGain = null, ambientNodes = [];
function initAudioEngine() {
  try {
    if (audioReady) return;
    if (typeof Tone !== 'undefined' && Tone.start) Tone.start();
    masterGain = new Tone.Gain(0.8).toDestination();
    // limitador suave para no saturar en oleadas grandes
    var comp = new Tone.Compressor(-18, 3).connect(masterGain);
    Tone.Destination.chain(comp);
    startAmbient();
    audioReady = true;
  } catch (e) { console.warn('audio', e); }
}
function startAmbient() {
  try {
    // viento lúgubre: brown noise filtrado LFO
    var n = new Tone.Noise('brown');
    var f = new Tone.AutoFilter({ frequency: 0.08, baseFrequency: 200, octaves: 2 }).toDestination();
    f.Q.value = 0.6;
    n.connect(f); n.volume.value = -26; n.start(); f.start();
    ambientNodes.push(n);
    // drone grave ciudad muerta
    var o = new Tone.Oscillator(41, 'sine'); var g = new Tone.Gain(0.05);
    o.connect(g); g.toDestination(); o.start();
  } catch (e) {}
}
function env(node, t) { try { setTimeout(function(){ try{node.dispose();}catch(e){} }, (t||400)+120); } catch(e){} }
function playSound(kind, opt) {
  if (!audioReady || typeof Tone === 'undefined') return;
  try {
    opt = opt || {};
    var now = Tone.now();
    if (kind === 'gun') {
      var w = opt.weapon || 'rifle';
      // crack: noise burst + body triangle
      var dur = w==='shotgun'?0.32 : w==='sniper'?0.42 : w==='smg'?0.1 : 0.18;
      var nz = new Tone.NoiseSynth({ noise:{type:'white'}, envelope:{attack:0.001,decay:dur*0.6,sustain:0} });
      nz.volume.value = w==='shotgun'?-4 : -9;
      nz.connect(masterGain); nz.triggerAttackRelease(dur, now); env(nz, dur*1000);
      var base = w==='shotgun'?90 : w==='sniper'?150 : w==='smg'?420 : 300;
      var th = new Tone.MembraneSynth({ pitchDecay:0.06, octaves:5, envelope:{attack:0.001,decay:0.14,sustain:0} });
      th.volume.value = -8; th.connect(masterGain);
      th.triggerAttackRelease(base*rand(0.92,1.08), 0.12, now); env(th, 300);
      // cola mecánica
      var cl = new Tone.MetalSynth({ envelope:{attack:0.001,decay:0.05,release:0.02}, harmonicity:8, resonance:400 }).toDestination();
      cl.volume.value = -24; cl.triggerAttackRelease('G6', 0.05, now+0.02); env(cl, 200);
    } else if (kind === 'reload') {
      var m1 = new Tone.MetalSynth({envelope:{attack:0.001,decay:0.06}}).toDestination(); m1.volume.value=-16;
      m1.triggerAttackRelease('A5',0.06,now); env(m1,200);
      var m2 = new Tone.MetalSynth({envelope:{attack:0.001,decay:0.08}}).toDestination(); m2.volume.value=-14;
      m2.triggerAttackRelease('E6',0.08,now+0.18); env(m2,250);
    } else if (kind === 'turret') {
      var s2 = new Tone.Synth({ oscillator:{type:'square'}, envelope:{attack:0.001,decay:0.07,sustain:0,release:0.03} }).toDestination();
      s2.volume.value = -14; s2.triggerAttackRelease(640+rand(-60,120), 0.07, now); env(s2,200);
    } else if (kind === 'explosion') {
      var big = new Tone.NoiseSynth({ noise:{type:'brown'}, envelope:{attack:0.008,decay:0.9,sustain:0} });
      big.volume.value = -2; big.connect(masterGain); big.triggerAttackRelease(1.0, now); env(big,1200);
      var sub = new Tone.MembraneSynth({ pitchDecay:0.4, octaves:6, envelope:{attack:0.002,decay:0.8,sustain:0} });
      sub.volume.value = 2; sub.connect(masterGain); sub.triggerAttackRelease(48, 0.7, now); env(sub,1000);
      var crack = new Tone.NoiseSynth({ noise:{type:'pink'}, envelope:{attack:0.001,decay:0.18,sustain:0} });
      crack.volume.value = -6; crack.connect(masterGain); crack.triggerAttackRelease(0.2, now); env(crack,400);
    } else if (kind === 'pickup') {
      var s3 = new Tone.Synth({ oscillator:{type:'sine'}, envelope:{attack:0.005,decay:0.12,sustain:0} }).toDestination();
      s3.volume.value=-10; s3.triggerAttackRelease('E5',0.12,now); env(s3,250);
      var s3b = new Tone.Synth({ oscillator:{type:'sine'} }).toDestination(); s3b.volume.value=-12;
      s3b.triggerAttackRelease('B5',0.14,now+0.07); env(s3b,300);
    } else if (kind === 'zombie') {
      var v = rand(0.7,1.15);
      var g = new Tone.Synth({ oscillator:{type:'sawtooth'}, envelope:{attack:0.09,decay:0.5,sustain:0.1,release:0.3} });
      var flt = new Tone.Filter(420*v, 'lowpass'); g.connect(flt); flt.connect(masterGain);
      g.volume.value = -15; g.triggerAttackRelease('G1', 0.6, now); env(g,900);
      // gruñido doble capa
      var g2 = new Tone.Synth({ oscillator:{type:'sawtooth'}, envelope:{attack:0.12,decay:0.4,sustain:0} }).toDestination();
      g2.volume.value=-20; g2.triggerAttackRelease('C2', 0.45, now+0.08); env(g2,700);
    } else if (kind === 'hit') {
      var h = new Tone.NoiseSynth({ noise:{type:'pink'}, envelope:{attack:0.001,decay:0.09,sustain:0} }).toDestination();
      h.volume.value=-12; h.triggerAttackRelease(0.09, now); env(h,200);
    } else if (kind === 'hurt') {
      var hr = new Tone.Synth({ oscillator:{type:'sawtooth'}, envelope:{attack:0.01,decay:0.2,sustain:0} }).toDestination();
      hr.volume.value=-12; hr.triggerAttackRelease('E2',0.2,now); env(hr,350);
    } else if (kind === 'heal') {
      [523,659,784].forEach(function(fr,i){
        var s = new Tone.Synth({ oscillator:{type:'sine'} }).toDestination(); s.volume.value=-13;
        s.triggerAttackRelease(fr, 0.22, now+i*0.09); env(s,400);
      });
    } else if (kind === 'build') {
      var b = new Tone.MetalSynth({envelope:{attack:0.001,decay:0.09}}).toDestination(); b.volume.value=-15;
      b.triggerAttackRelease('D5',0.09,now); env(b,200);
    } else if (kind === 'step') {
      var st = new Tone.NoiseSynth({ noise:{type:'brown'}, envelope:{attack:0.001,decay:0.06,sustain:0} }).toDestination();
      st.volume.value=-24; st.triggerAttackRelease(0.06, now); env(st,150);
    } else if (kind === 'flyby') {
      var p = new Tone.Oscillator(90,'sawtooth'); var pf = new Tone.Filter(900,'lowpass');
      var pg = new Tone.Gain(0.12); p.connect(pf); pf.connect(pg); pg.toDestination();
      p.start(now); p.frequency.rampTo(55, 2.2, now); pg.gain.rampTo(0.0001, 2.4, now);
      setTimeout(function(){try{p.stop();p.dispose();}catch(e){}},2600);
    } else if (kind === 'ui') {
      var u = new Tone.Synth({ oscillator:{type:'triangle'} }).toDestination(); u.volume.value=-16;
      u.triggerAttackRelease(880, 0.05, now); env(u,150);
    } else if (kind === 'alarm') {
      [0,0.3].forEach(function(d){
        var a = new Tone.Synth({ oscillator:{type:'square'} }).toDestination(); a.volume.value=-16;
        a.triggerAttackRelease('A3',0.22,now+d); env(a,350);
      });
    } else if (kind === 'tank') {
      var t = new Tone.MembraneSynth({ pitchDecay:0.5, octaves:4 }).toDestination(); t.volume.value=0;
      t.triggerAttackRelease(40, 0.9, now); env(t,1200);
    }
  } catch (e) {}
}
