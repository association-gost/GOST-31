// Bande-son de l'intro, entièrement synthétisée (Web Audio) : nappe grave, pas,
// rugissement, impacts, souffle de jets, « braam » final.
// À remplacer par un vrai enregistrement de rugissement pour la version finale.
window.Son = (function () {
  var ctx = null, maitre = null, envoiReverb = null, nappe = null;

  function init() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; return false; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    maitre = ctx.createGain(); maitre.gain.value = 0.85;
    maitre.connect(comp); comp.connect(ctx.destination);
    // Réverbération de salle de cinéma : réponse impulsionnelle de bruit décroissant.
    var conv = ctx.createConvolver();
    var duree = 3.2, n = Math.floor(ctx.sampleRate * duree);
    var ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = ir.getChannelData(c);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    conv.buffer = ir;
    envoiReverb = ctx.createGain(); envoiReverb.gain.value = 0.32;
    envoiReverb.connect(conv); conv.connect(maitre);
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function sortie(noeud, reverb) {
    noeud.connect(maitre);
    if (reverb) { var g = ctx.createGain(); g.gain.value = reverb; noeud.connect(g); g.connect(envoiReverb); }
  }

  function bruit(sec) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = b; return s;
  }

  function distorsion(k) {
    var n = 2048, courbe = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; courbe[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    var ws = ctx.createWaveShaper(); ws.curve = courbe; ws.oversample = '4x'; return ws;
  }

  function enveloppe(param, t, points) {
    param.setValueAtTime(points[0][1], t + points[0][0]);
    for (var i = 1; i < points.length; i++) param.exponentialRampToValueAtTime(Math.max(points[i][1], 0.0001), t + points[i][0]);
  }

  // Nappe grave et vent : tient pendant toute l'arrivée.
  function ambiance() {
    if (!ctx) return;
    var t = ctx.currentTime, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 1.8);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.frequency.value = 41.2; o2.frequency.value = 41.9; o2.type = 'triangle';
    var vent = bruit(14), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.6;
    var gv = ctx.createGain(); gv.gain.value = 0.16;
    vent.connect(lp); lp.connect(gv); gv.connect(g);
    o1.connect(g); o2.connect(g); sortie(g, 0.4);
    o1.start(t); o2.start(t); vent.start(t);
    nappe = { g: g, sources: [o1, o2, vent] };
  }

  function finAmbiance(sec) {
    if (!ctx || !nappe) return;
    var t = ctx.currentTime, n = nappe; nappe = null;
    n.g.gain.cancelScheduledValues(t);
    n.g.gain.setValueAtTime(n.g.gain.value, t);
    n.g.gain.exponentialRampToValueAtTime(0.0001, t + (sec || 1.5));
    n.sources.forEach(function (s) { s.stop(t + (sec || 1.5) + 0.1); });
  }

  // Pas lourd et feutré.
  function pas(force) {
    if (!ctx) return;
    var t = ctx.currentTime, f = force || 1;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.2);
    enveloppe(g.gain, t, [[0, 0.0001], [0.012, 0.55 * f], [0.26, 0.0001]]);
    o.connect(g); sortie(g, 0.15); o.start(t); o.stop(t + 0.3);
  }

  // Le rugissement : deux dents de scie désaccordées, grain de gorge (FM + trémolo),
  // souffle filtré, saturation, filtre qui s'ouvre puis se referme.
  function rugissement() {
    if (!ctx) return;
    var t = ctx.currentTime, D = 2.3;
    var somme = ctx.createGain();
    var hauteurs = [[0, 72], [0.32, 128], [1.1, 112], [1.8, 86], [D, 55]];
    [0, 6.5].forEach(function (desaccord) {
      var o = ctx.createOscillator(); o.type = 'sawtooth';
      hauteurs.forEach(function (p, i) {
        if (i === 0) o.frequency.setValueAtTime(p[1] + desaccord, t);
        else o.frequency.linearRampToValueAtTime(p[1] + desaccord, t + p[0]);
      });
      var lfo = ctx.createOscillator(), prof = ctx.createGain();
      lfo.frequency.value = 22 + desaccord; prof.gain.value = 14;
      lfo.connect(prof); prof.connect(o.frequency);
      o.connect(somme); o.start(t); o.stop(t + D + 0.1); lfo.start(t); lfo.stop(t + D + 0.1);
    });
    var souffle = bruit(D + 0.2), bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.7;
    var gs = ctx.createGain(); gs.gain.value = 0.7;
    souffle.connect(bp); bp.connect(gs); gs.connect(somme); souffle.start(t);
    // Trémolo rapide : le grain rauque.
    var trem = ctx.createGain(), lfoA = ctx.createOscillator(), profA = ctx.createGain();
    trem.gain.value = 0.7; lfoA.frequency.value = 29; profA.gain.value = 0.3;
    lfoA.connect(profA); profA.connect(trem.gain); lfoA.start(t); lfoA.stop(t + D + 0.1);
    somme.connect(trem);
    var sat = distorsion(38), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.4;
    lp.frequency.setValueAtTime(320, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.28);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 1.2);
    lp.frequency.exponentialRampToValueAtTime(260, t + D);
    var env = ctx.createGain();
    enveloppe(env.gain, t, [[0, 0.0001], [0.11, 0.62], [0.5, 0.55], [1.4, 0.42], [D, 0.0001]]);
    trem.connect(sat); sat.connect(lp); lp.connect(env); sortie(env, 0.55);
    // Grondement de poitrine.
    var sub = ctx.createOscillator(), gsub = ctx.createGain();
    sub.frequency.setValueAtTime(52, t); sub.frequency.linearRampToValueAtTime(40, t + D);
    enveloppe(gsub.gain, t, [[0, 0.0001], [0.15, 0.7], [1.5, 0.5], [D, 0.0001]]);
    sub.connect(gsub); sortie(gsub, 0.2); sub.start(t); sub.stop(t + D + 0.1);
  }

  // Impact sourd (lettres qui tombent, logo qui se pose).
  function impact(force) {
    if (!ctx) return;
    var t = ctx.currentTime, f = force || 1;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(68, t); o.frequency.exponentialRampToValueAtTime(26, t + 0.9);
    enveloppe(g.gain, t, [[0, 0.0001], [0.008, 0.9 * f], [1.1, 0.0001]]);
    o.connect(g); sortie(g, 0.5); o.start(t); o.stop(t + 1.2);
    var clic = bruit(0.08), hp = ctx.createBiquadFilter(), gc = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    enveloppe(gc.gain, t, [[0, 0.3 * f], [0.07, 0.0001]]);
    clic.connect(hp); hp.connect(gc); sortie(gc, 0.6); clic.start(t);
  }

  // Passage de jets, de droite à gauche.
  function jets(duree) {
    if (!ctx) return;
    var t = ctx.currentTime, D = duree || 2.6;
    var src = bruit(D + 0.2), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(3400, t); bp.frequency.exponentialRampToValueAtTime(420, t + D);
    enveloppe(g.gain, t, [[0, 0.0001], [D * 0.42, 0.9], [D, 0.0001]]);
    var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(bp); bp.connect(g);
    if (pan) { pan.pan.setValueAtTime(0.9, t); pan.pan.linearRampToValueAtTime(-0.9, t + D); g.connect(pan); sortie(pan, 0.35); }
    else sortie(g, 0.35);
    src.start(t);
  }

  // Accord de cuivres synthétiques, façon bande-annonce.
  function braam() {
    if (!ctx) return;
    var t = ctx.currentTime, D = 3.2, somme = ctx.createGain();
    [55, 82.4, 110, 164.8].forEach(function (f, i) {
      [-4, 4].forEach(function (cents) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
        var g = ctx.createGain(); g.gain.value = i === 0 ? 0.5 : 0.28;
        o.connect(g); g.connect(somme); o.start(t); o.stop(t + D);
      });
    });
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(180, t);
    lp.frequency.exponentialRampToValueAtTime(1300, t + 0.35);
    lp.frequency.exponentialRampToValueAtTime(240, t + D);
    var env = ctx.createGain();
    enveloppe(env.gain, t, [[0, 0.0001], [0.06, 0.36], [1.2, 0.22], [D, 0.0001]]);
    somme.connect(lp); lp.connect(env); sortie(env, 0.6);
  }

  // Petit éclat aigu quand les yeux s'allument.
  function eclat() {
    if (!ctx) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(3600, t + 0.4);
    enveloppe(g.gain, t, [[0, 0.0001], [0.01, 0.07], [0.6, 0.0001]]);
    o.connect(g); sortie(g, 0.8); o.start(t); o.stop(t + 0.7);
  }

  function couper() {
    if (!ctx) return;
    var t = ctx.currentTime;
    maitre.gain.cancelScheduledValues(t);
    maitre.gain.setValueAtTime(maitre.gain.value, t);
    maitre.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    setTimeout(function () { try { ctx.close(); } catch (e) {} ctx = null; nappe = null; }, 600);
  }

  return { init: init, ambiance: ambiance, finAmbiance: finAmbiance, pas: pas, rugissement: rugissement,
    impact: impact, jets: jets, braam: braam, eclat: eclat, couper: couper };
})();
