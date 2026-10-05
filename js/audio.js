// ===== AUDIO: Tone.js 14.8.49 sintetizado =====
var audioReady = false;
function initAudioEngine() {
  try {
    if (audioReady) return;
    if (typeof Tone !== 'undefined' && Tone.start) Tone.start();
    audioReady = true;
  } catch (e) { console.warn('audio', e); }
}
function playSound(kind, opt) {
  if (!audioReady || typeof Tone === 'undefined') return;
  try {
    opt = opt || {};
    if (kind === 'gun') {
      var s = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 } }).toDestination();
      var f = opt.weapon === 'shotgun' ? 140 : opt.weapon === 'sniper' ? 220 : opt.weapon === 'smg' ? 520 : 380;
      s.triggerAttackRelease(f * rand(0.9, 1.1), 0.12);
    } else if (kind === 'turret') {
      var s2 = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 } }).toDestination();
      s2.triggerAttackRelease(700, 0.07);
    } else if (kind === 'explosion') {
      var n = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.01, decay: 0.7, sustain: 0 } }).toDestination();
      n.triggerAttackRelease(0.7);
    } else if (kind === 'pickup') {
      var s3 = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
      s3.triggerAttackRelease('E5', 0.15);
    } else if (kind === 'zombie') {
      var s4 = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05, decay: 0.4, sustain: 0, release: 0.2 } }).toDestination();
      s4.triggerAttackRelease('G2', 0.4);
    } else if (kind === 'heal') {
      var s5 = new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination();
      s5.triggerAttackRelease('A5', 0.25);
    }
  } catch (e) {}
}
