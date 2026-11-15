// La panthère animée, découpée dans le logo officiel.
// Le logo (700 × 693) est réutilisé tel quel ; des masques en séparent le corps,
// la tête, les lettres R-A-I-D, la croix occitane et les deux filets.
// La « caméra » est le viewBox du SVG : on le déplace pour les gros plans.
window.Panthere = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 700, H = 693;
  var CADRES = {
    final: '-60 -50 820 793',
    marche: '30 -150 660 600',
    tete: '350 -12 190 186'
  };
  var MASQUES = {
    corps: { d: 'M0 0H700V272H596V314H520V272H0Z M355 0H540V115H355Z', regle: 'evenodd' },
    tete: { d: 'M355 0H540V138H355Z' },
    croix: { d: 'M0 272H114V572H0Z' },
    R: { d: 'M114 272H262V602H114Z' },
    A: { d: 'M262 272H446V693H262Z' },
    i: { d: 'M446 272H520V630H446Z' },
    D: { d: 'M522 314H596V272H700V630H522Z' },
    bleu: { d: 'M0 634H250V668H0Z' },
    rouge: { d: 'M455 634H700V668H455Z' }
  };

  function el(nom, attrs, parent) {
    var e = document.createElementNS(NS, nom);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function morceau(src, idMasque, parent, classe) {
    var g = el('g', { 'class': classe }, parent);
    el('image', { href: src, x: 0, y: 0, width: W, height: H, 'clip-path': 'url(#' + idMasque + ')', preserveAspectRatio: 'none' }, g);
    return g;
  }

  // Construit le SVG dans `conteneur`. Options : src (logo des morceaux), final (logo du fondu),
  // srcLettres (logo pour R-A-I-D, par défaut src), rim (liseré de lumière), ondes (couleur des ondes).
  function creer(conteneur, o) {
    o = o || {};
    var p = o.prefixe || 'pt';
    var svg = el('svg', { 'class': 'panthere-svg', viewBox: CADRES.marche, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Logo GOST 31 : panthère couchée sur le mot RAID' }, conteneur);
    var defs = el('defs', {}, svg);
    Object.keys(MASQUES).forEach(function (k) {
      var cp = el('clipPath', { id: p + '-' + k, clipPathUnits: 'userSpaceOnUse' }, defs);
      el('path', { d: MASQUES[k].d, 'clip-rule': MASQUES[k].regle || 'nonzero' }, cp);
    });
    var fFlou = el('filter', { id: p + '-flou', x: '-60%', y: '-20%', width: '220%', height: '140%' }, defs);
    var flou = el('feGaussianBlur', { stdDeviation: '0 0' }, fFlou);
    var fLueur = el('filter', { id: p + '-lueur', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
    el('feGaussianBlur', { stdDeviation: '2.2' }, fLueur);
    if (o.rim) {
      var fr = el('filter', { id: p + '-rim', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
      el('feOffset', { 'in': 'SourceAlpha', dx: 5, dy: 4, result: 'dec' }, fr);
      el('feComposite', { 'in': 'SourceAlpha', in2: 'dec', operator: 'out', result: 'bord' }, fr);
      el('feGaussianBlur', { 'in': 'bord', stdDeviation: 1.1, result: 'bordf' }, fr);
      el('feFlood', { 'flood-color': o.rim, 'flood-opacity': 1 }, fr);
      el('feComposite', { in2: 'bordf', operator: 'in', result: 'lum' }, fr);
      var m = el('feMerge', {}, fr);
      el('feMergeNode', { 'in': 'SourceGraphic' }, m);
      el('feMergeNode', { 'in': 'lum' }, m);
    }

    var derriere = el('g', { 'class': 'pt-derriere' }, svg);
    var srcL = o.srcLettres || o.src;
    var gLettres = el('g', { 'class': 'pt-lettres' }, svg);
    var lettres = {};
    ['croix', 'R', 'A', 'i', 'D'].forEach(function (k) { lettres[k] = morceau(srcL, p + '-' + k, gLettres, 'pt-' + k); });
    var barres = { bleu: morceau(srcL, p + '-bleu', gLettres, 'pt-bleu'), rouge: morceau(srcL, p + '-rouge', gLettres, 'pt-rouge') };

    var panthere = el('g', { 'class': 'pt-panthere', filter: 'url(#' + p + '-flou)' }, svg);
    var pose = el('g', { 'class': 'pt-pose', filter: o.rim ? 'url(#' + p + '-rim)' : null }, panthere);
    var corps = morceau(o.src, p + '-corps', pose, 'pt-corps');
    var tete = el('g', { 'class': 'pt-tete' }, pose);
    // Les yeux du logo sont transparents : une lueur posée derrière la tête les allume.
    var yeux = el('g', { 'class': 'pt-yeux', opacity: 0, filter: 'url(#' + p + '-lueur)' }, tete);
    el('ellipse', { cx: 409, cy: 45, rx: 11, ry: 8, fill: o.yeux || '#ffd66b' }, yeux);
    el('ellipse', { cx: 447, cy: 45, rx: 13, ry: 7, fill: o.yeux || '#ffd66b' }, yeux);
    morceau(o.src, p + '-tete', tete, 'pt-tete-img');
    var gueule = el('g', { 'class': 'pt-gueule' }, tete);
    var croc = '#f3efe4';
    [
      ['M396 104C408 99 434 99 446 104C448 118 438 138 421 139C404 138 394 118 396 104Z', '#5c0712'],
      ['M405 112C410 108 432 108 437 112C437 124 430 133 421 133C412 133 405 124 405 112Z', '#160104'],
      ['M408 132C414 126 428 126 434 132C428 137 414 137 408 132Z', '#a3182b'],
      ['M402.5 104Q405 113 408.5 122Q410.5 112 412.5 104.5Z', croc],
      ['M429.5 104.5Q431.5 112 433.5 122Q437 113 439.5 104Z', croc],
      ['M414 104.5L416 109L418 104.5Z', croc], ['M419.5 104.5L421 108.5L422.5 104.5Z', croc], ['M424 104.5L426 109L428 104.5Z', croc],
      ['M406 135Q408 128 410.5 121.5Q412 129 413.5 136Z', croc],
      ['M428.5 136Q430 129 431.5 121.5Q434 128 436 135Z', croc]
    ].forEach(function (d) { el('path', { d: d[0], fill: d[1] }, gueule); });

    var gOndes = el('g', { 'class': 'pt-ondes', fill: 'none', stroke: o.ondes || '#fff', 'pointer-events': 'none' }, svg);
    var ondes = [0, 1, 2, 3].map(function () { return el('circle', { cx: 421, cy: 112, r: 1, 'stroke-width': 2, opacity: 0 }, gOndes); });
    var logoFinal = el('image', { 'class': 'pt-final', href: o.final || o.src, x: 0, y: 0, width: W, height: H, opacity: 0 }, svg);
    var devant = el('g', { 'class': 'pt-devant' }, svg);

    return { svg: svg, defs: defs, derriere: derriere, devant: devant, panthere: panthere, pose: pose, corps: corps,
      tete: tete, yeux: yeux, gueule: gueule, lettres: lettres, barres: barres, ondes: ondes, logoFinal: logoFinal,
      flou: flou, cadres: CADRES, prefixe: p };
  }

  // La séquence complète. Crochets : surRugit(tl, t), surLettres(tl, t), surLogo(tl, t).
  function intro(r, o) {
    o = o || {};
    var cadreFinal = o.cadreFinal || CADRES.final;
    var L = r.lettres, tl = gsap.timeline({ paused: true });
    var hautes = [L.R, L.A, L.i, L.D];

    gsap.set(r.svg, { attr: { viewBox: CADRES.marche } });
    gsap.set(r.panthere, { x: 1500 });
    gsap.set(hautes, { y: 300, opacity: 0 });
    gsap.set(L.croix, { rotation: -200, scale: 0.3, opacity: 0, svgOrigin: '57 420' });
    gsap.set(r.barres.bleu, { scaleX: 0, svgOrigin: '250 651' });
    gsap.set(r.barres.rouge, { scaleX: 0, svgOrigin: '455 651' });
    gsap.set(r.gueule, { scaleY: 0, svgOrigin: '421 102' });
    gsap.set(r.yeux, { opacity: 0 });
    gsap.set(r.logoFinal, { opacity: 0 });
    gsap.set(r.ondes, { opacity: 0 });

    // 1. L'arrivée : elle rampe de la droite, flou de vitesse qui se dissipe.
    tl.addLabel('arrivee', 0);
    tl.call(Son.ambiance, null, 0);
    tl.fromTo(r.flou, { attr: { stdDeviation: '34 0' } }, { attr: { stdDeviation: '0 0' }, duration: 2.5, ease: 'power2.in' }, 0.15);
    tl.to(r.panthere, { x: 0, duration: 2.75, ease: 'power3.out' }, 0.15);
    tl.to(r.pose, { y: -9, duration: 0.31, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.15);
    tl.to(r.tete, { y: 2, rotation: 1.5, svgOrigin: '440 136', duration: 0.31, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 0.3);
    [0.35, 0.97, 1.59, 2.21].forEach(function (t, k) { tl.call(Son.pas, [1 - k * 0.12], t); });
    tl.to(r.pose, { y: 7, duration: 0.22, ease: 'power2.out' }, 2.75).to(r.pose, { y: 0, duration: 0.5, ease: 'power2.inOut' });

    // 2. Les yeux s'allument, gros plan sur la tête.
    tl.addLabel('yeux', 3.0);
    tl.call(Son.eclat, null, 3.0);
    tl.to(r.yeux, { keyframes: [{ opacity: 1, duration: 0.06 }, { opacity: 0.25, duration: 0.07 }, { opacity: 1, duration: 0.12 }] }, 3.0);
    tl.to(r.svg, { attr: { viewBox: CADRES.tete }, duration: 0.85, ease: 'expo.inOut' }, 3.3);

    // 3. Le rugissement : la gueule s'ouvre, la tête se redresse, l'écran tremble, ondes de choc.
    var T = 4.2;
    tl.addLabel('rugit', T);
    tl.call(Son.rugissement, null, T - 0.05);
    tl.to(r.gueule, { scaleY: 1, duration: 0.16, ease: 'back.out(2.2)' }, T);
    tl.to(r.tete, { y: 0, rotation: -3, svgOrigin: '440 136', duration: 0.2, ease: 'power3.out' }, T);
    tl.to(r.svg, { attr: { viewBox: '330 -34 230 225' }, duration: 1.6, ease: 'power1.out' }, T);
    tl.to(r.svg, { x: 'random(-18,18)', y: 'random(-12,12)', duration: 0.05, repeat: 25, repeatRefresh: true, ease: 'none' }, T + 0.05);
    tl.to(r.svg, { x: 0, y: 0, duration: 0.12 }, T + 1.36);
    r.ondes.forEach(function (c, k) {
      tl.fromTo(c, { attr: { r: 30, 'stroke-width': 2.2 }, opacity: 0.55 },
        { attr: { r: 360, 'stroke-width': 0.3 }, opacity: 0, duration: 1.3, ease: 'expo.out', immediateRender: false }, T + 0.08 + k * 0.16);
    });
    if (o.surRugit) o.surRugit(tl, T);

    // 4. Elle referme la gueule, la caméra recule : elle prend la pose du logo.
    var R = T + 1.75;
    tl.addLabel('recul', R);
    tl.to(r.gueule, { scaleY: 0, duration: 0.35, ease: 'power2.in' }, R);
    tl.to(r.tete, { rotation: 0, duration: 0.6, ease: 'power2.inOut' }, R);
    tl.to(r.yeux, { opacity: 0, duration: 0.8 }, R + 0.6);
    tl.to(r.svg, { attr: { viewBox: cadreFinal }, duration: 1.25, ease: 'expo.inOut' }, R + 0.1);
    tl.call(Son.finAmbiance, [2.5], R);

    // 5. RAID surgit sous elle, la croix occitane tourne en place, les filets se tracent.
    var Ls = R + 1.05;
    tl.addLabel('lettres', Ls);
    tl.to(hautes, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.11 }, Ls);
    [0, 0.11, 0.22, 0.33].forEach(function (d, k) { tl.call(Son.impact, [0.55 + k * 0.12], Ls + d); });
    tl.to(L.croix, { rotation: 0, scale: 1, opacity: 1, duration: 1.0, ease: 'expo.out' }, Ls + 0.3);
    tl.to([r.barres.bleu, r.barres.rouge], { scaleX: 1, duration: 0.8, ease: 'expo.inOut' }, Ls + 0.55);
    tl.call(Son.braam, null, Ls + 0.5);
    if (o.surLettres) o.surLettres(tl, Ls);

    // 6. Fondu vers le logo officiel.
    var F = Ls + 1.45;
    tl.addLabel('logo', F);
    tl.to(r.logoFinal, { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, F);
    tl.to([r.panthere, r.lettres.croix, hautes, r.barres.bleu, r.barres.rouge], { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, F + 0.05);
    if (o.surLogo) o.surLogo(tl, F);
    tl.addLabel('fin', F + 1.0);
    return tl;
  }

  // L'écran d'entrée : « Entrer » (avec son), « Entrer sans le son », puis « Passer l'intro ».
  function porte(o) {
    var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fini = false;
    function terminer() {
      if (fini) return; fini = true;
      if (o.passer) o.passer.hidden = true;
      document.removeEventListener('keydown', echap);
      o.apres && o.apres();
    }
    function echap(e) { if (e.key === 'Escape') passer(); }
    function passer() {
      Son.couper();
      o.tl.progress(1);
      terminer();
    }
    function lancer(avecSon) {
      if (avecSon) Son.init();
      o.porte.classList.add('porte-ouverte');
      setTimeout(function () { o.porte.hidden = true; }, 700);
      if (o.passer) { o.passer.hidden = false; o.passer.addEventListener('click', passer); }
      document.addEventListener('keydown', echap);
      o.avant && o.avant();
      o.tl.eventCallback('onComplete', terminer);
      o.tl.play(0);
    }
    if (reduit) {
      o.porte.hidden = true;
      o.avant && o.avant();
      o.tl.progress(1);
      terminer();
      return;
    }
    o.entrer.addEventListener('click', function () { lancer(true); });
    if (o.muet) o.muet.addEventListener('click', function () { lancer(false); });
    
  }

  return { creer: creer, intro: intro, porte: porte, CADRES: CADRES };
})();
