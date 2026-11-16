// Intro de Générique : une panthère dessinée dans le style du logo (images rendues : silhouette claire,
// traits de séparation) marche depuis la gauche ; à l'arrêt elle tourne la tête vers nous,
// elle se couche, puis fondu vers la panthère du logo et le logo complet. Pas de son, pas de rugissement.
// La « caméra » est le viewBox du SVG.
window.Panthere = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 700, H = 693;
  var CADRES = {
    final: '-60 -50 820 793',
    marche: '0 -170 720 640',
    tete: '350 -12 190 186'
  };
  // Contours des morceaux (repère du logo). Les morceaux mobiles débordent un peu dans le corps
  // du côté de leur articulation : au repos les pixels se superposent, en mouvement il n'y a pas de jour.
  var BRAS = 'M466 185L459 195L454 204L470 211L500 220L550 229L562 236L566 242L572 252L578 262L700 262L700 140L505 140L500 176Z';
  var BRAS_LARGE = 'M458 180L459 195L454 204L470 211L500 220L550 229L562 236L566 242L572 252L578 262L700 262L700 140L505 140L497 169Z';
  var PATTE = 'M498 258H612V332H498Z';
  var PATTE_LARGE = 'M498 251H578L590 262L612 290V332H498Z';
  var PIED = 'M228 214L250 222L283 212L297 214L311 227L318 244L318 268L212 268L216 241Z';
  var PIED_LARGE = 'M224 209L250 217L283 207L300 209L315 224L322 244L322 268L198 268L203 241Z';
  // Tête : suit les oreilles et les joues, coupe le cou en arrondi sous le menton.
  var TETE_HAUT = 'M378 12L392 0L500 0L515 10L521 40L507 70L499 95L481 112L446 126L421 130L399 122L387 100L381 70L375 40Z';
  var MASQUES = {
    tete: { d: TETE_HAUT },
    bras: { d: BRAS_LARGE },
    patte: { d: PATTE_LARGE },
    pied: { d: PIED_LARGE },
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
  function morceau(src, idMasque, parent, classe, parMasque) {
    var g = el('g', { 'class': classe }, parent);
    var a = { href: src, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' };
    a[parMasque ? 'mask' : 'clip-path'] = 'url(#' + idMasque + ')';
    el('image', a, g);
    return g;
  }

  // Options : src (logo des morceaux), final (logo du fondu), srcLettres, rim (liseré de lumière),
  // ondes (couleur des ondes), yeux (couleur des yeux allumés), prefixe (ids uniques).
  function creer(conteneur, o) {
    o = o || {};
    var p = o.prefixe || 'pt';
    var svg = el('svg', { 'class': 'panthere-svg', viewBox: CADRES.marche, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Logo GOST 31 : panthère couchée sur le mot RAID' }, conteneur);
    var defs = el('defs', {}, svg);
    Object.keys(MASQUES).forEach(function (k) {
      var cp = el('clipPath', { id: p + '-' + k, clipPathUnits: 'userSpaceOnUse' }, defs);
      el('path', { d: MASQUES[k].d }, cp);
    });
    // Le corps : toute la panthère, moins les morceaux qui bougent.
    var mc = el('mask', { id: p + '-corps', maskUnits: 'userSpaceOnUse', x: -50, y: -50, width: 800, height: 400 }, defs);
    el('path', { d: 'M0 0H700V268H0Z', fill: '#fff' }, mc);
    [TETE_HAUT, BRAS, PATTE, PIED].forEach(function (d) { el('path', { d: d, fill: '#000' }, mc); });

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

    // La panthère dessinée (images rendues), sous la tête du logo.
    var dessin = el('g', { 'class': 'pt-dessin' }, svg);
    var dessinImg = el('image', { preserveAspectRatio: 'none' }, dessin);
    var panthere = el('g', { 'class': 'pt-panthere', filter: 'url(#' + p + '-flou)' }, svg);
    var pose = el('g', { 'class': 'pt-pose', filter: o.rim ? 'url(#' + p + '-rim)' : null }, panthere);
    var pied = morceau(o.src, p + '-pied', pose, 'pt-pied');
    var patte = morceau(o.src, p + '-patte', pose, 'pt-patte');
    var corps = morceau(o.src, p + '-corps', pose, 'pt-corps', true);
    var bras = morceau(o.src, p + '-bras', pose, 'pt-bras');
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

    return { svg: svg, defs: defs, derriere: derriere, dessin: dessin, dessinImg: dessinImg, devant: devant, panthere: panthere, pose: pose, corps: corps,
      tete: tete, bras: bras, patte: patte, pied: pied, yeux: yeux, gueule: gueule, lettres: lettres, barres: barres,
      ondes: ondes, logoFinal: logoFinal, flou: flou, cadres: CADRES, prefixe: p };
  }

  function arrondi(n) { return Math.round(n * 10) / 10; }
  function nomImage(base, nom, k) {
    var v = window.PANTHERE_DESSIN && window.PANTHERE_DESSIN.version;
    return base + nom + String(k).padStart(3, '0') + '.webp' + (v ? '?v=' + v : '');
  }

  // Précharge et décode toutes les images de la panthère dessinée.
  function precharger(base) {
    var D = window.PANTHERE_DESSIN; base = base || 'assets/panthere-dessin/';
    if (!D) return Promise.resolve();
    var liste = [];
    ['m', 't', 'c'].forEach(function (nom) { D[nom].forEach(function (e, k) { liste.push(nomImage(base, nom, k)); }); });
    window.__imagesPanthere = liste.map(function (u) { var i = new Image(); i.src = u; return i; });
    return Promise.all(window.__imagesPanthere.map(function (i) { return i.decode ? i.decode().catch(function () {}) : Promise.resolve(); }));
  }

  // La séquence. Crochets : surRugit(tl, t), surLettres(tl, t), surLogo(tl, t).
  function intro(r, o) {
    o = o || {};
    var D = window.PANTHERE_DESSIN, base = o.dessin || 'assets/panthere-dessin/';
    var cadreFinal = o.cadreFinal || CADRES.final;
    var L = r.lettres, tl = gsap.timeline({ paused: true });
    var hautes = [L.R, L.A, L.i, L.D];

    // Échelle et position des images : sur la dernière image (couchée), le cou tombe sur celui du logo
    // et le sol sur le rebord ; toutes les images partagent ce repère.
    var COU = [445, 112], dern = D.c[D.c.length - 1];
    var s = (262 - COU[1]) / (D.sol - dern[2]);
    var A = [COU[0] - dern[1] * s, COU[1] - dern[2] * s];
    var Wd = D.recadrage.largeur * s, Hd = D.recadrage.hauteur * s, img = r.dessinImg;
    img.setAttribute('x', arrondi(A[0])); img.setAttribute('y', arrondi(A[1]));
    img.setAttribute('width', arrondi(Wd)); img.setAttribute('height', arrondi(Hd));
    var haut = A[1];
    var cadreMarche = arrondi(A[0] - 80) + ' ' + arrondi(haut - 70) + ' ' + arrondi(Wd + 160) + ' ' + arrondi(262 - haut + 130);

    gsap.set(r.svg, { attr: { viewBox: cadreMarche }, x: 0, y: 0 });
    r.flou.setAttribute('stdDeviation', '0 0');
    gsap.set(r.panthere, { x: 0, opacity: 1 });
    gsap.set([r.pose, r.bras, r.pied], { x: 0, y: 0, rotation: 0 });
    gsap.set(r.patte, { rotation: 0 });
    gsap.set([r.corps, r.bras, r.pied, r.patte], { opacity: 0 });
    gsap.set(r.tete, { x: 0, y: 0, rotation: 0, scaleX: 1, opacity: 0 });
    gsap.set(r.dessin, { opacity: 1, x: 0 });
    gsap.set(hautes, { y: 300, opacity: 0 });
    gsap.set(L.croix, { rotation: -200, scale: 0.3, opacity: 0, svgOrigin: '57 420' });
    gsap.set(r.barres.bleu, { scaleX: 0, svgOrigin: '250 651' });
    gsap.set(r.barres.rouge, { scaleX: 0, svgOrigin: '455 651' });
    gsap.set(r.gueule, { scaleY: 0, svgOrigin: '421 102' });
    gsap.set([r.yeux, r.logoFinal, r.ondes], { opacity: 0 });

    // 1. La marche, depuis la gauche.
    var vue = { m: 0, c: 0, decal: -320 };
    function marche() {
      var k = Math.min(D.m.length - 1, Math.round(vue.m)), e = D.m[k];
      img.setAttribute('href', nomImage(base, 'm', k));
      gsap.set(r.dessin, { x: -e[0] * D.pxParUnite * s + vue.decal });
    }
    marche();
    var dureeMarche = (D.m.length - 1) / D.fps;
    tl.addLabel('arrivee', 0);
    tl.to(vue, { m: D.m.length - 1, duration: dureeMarche, ease: 'none', onUpdate: marche }, 0);
    tl.to(vue, { decal: 0, duration: 1.7, ease: 'power2.out', onUpdate: marche }, 0);

    // 2. Elle s'arrête et tourne la tête vers nous (sa propre tête, dessinée comme le corps).
    var Ta = dureeMarche;
    tl.addLabel('tete', Ta);
    function tourne() {
      var k = Math.min(D.t.length - 1, Math.round(vue.t)), e = D.t[k];
      img.setAttribute('href', nomImage(base, 't', k));
      gsap.set(r.dessin, { x: -e[0] * D.pxParUnite * s });
    }
    vue.t = 0;
    tl.to(vue, { t: D.t.length - 1, duration: (D.t.length - 1) / D.fps, ease: 'none', onUpdate: tourne }, Ta);
    Ta += (D.t.length - 1) / D.fps;

    // 3. Elle se couche ; la caméra s'élargit doucement sur le cadre du logo.
    var R = Ta + 0.6;
    tl.addLabel('couche', R);
    tl.to(r.svg, { attr: { viewBox: cadreFinal }, duration: 2.0, ease: 'power2.inOut' }, R);
    function couche() {
      var k = Math.min(D.c.length - 1, Math.round(vue.c));
      img.setAttribute('href', nomImage(base, 'c', k));
      gsap.set(r.dessin, { x: 0 });
    }
    tl.to(vue, { c: D.c.length - 1, duration: (D.c.length - 1) / D.fps, ease: 'none', onUpdate: couche }, R + 0.2);

    // 5. Le fondu : la panthère dessinée laisse place à la panthère du logo.
    var F0 = R + 0.2 + (D.c.length - 1) / D.fps + 0.25;
    tl.addLabel('fondu', F0);
    // La panthère du logo apparaît d'abord par-dessus, puis la panthère dessinée s'efface : pas d'étape grise.
    tl.to([r.corps, r.bras, r.pied, r.patte, r.tete], { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, F0);
    tl.to(r.dessin, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, F0 + 0.6);

    // 6. RAID surgit sous elle, la croix tourne, les filets se tracent.
    var Ls = F0 + 0.7;
    tl.addLabel('lettres', Ls);
    tl.to(hautes, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.11 }, Ls);
    tl.to(L.croix, { rotation: 0, scale: 1, opacity: 1, duration: 1.0, ease: 'expo.out' }, Ls + 0.3);
    tl.to([r.barres.bleu, r.barres.rouge], { scaleX: 1, duration: 0.8, ease: 'expo.inOut' }, Ls + 0.55);
    if (o.surLettres) o.surLettres(tl, Ls);

    // 7. Fondu vers le logo officiel.
    var F = Ls + 1.45;
    tl.addLabel('logo', F);
    tl.to(r.logoFinal, { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, F);
    tl.to([r.panthere, r.lettres.croix, hautes, r.barres.bleu, r.barres.rouge], { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, F + 0.05);
    if (o.surLogo) o.surLogo(tl, F);
    tl.addLabel('fin', F + 1.0);
    return tl;
  }

  // Lancement : l'intro démarre seule une fois les images prêtes ; « Passer l'intro » et Échap la sautent.
  function porte(o) {
    var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fini = false, tl = null;
    function obtenir() { if (!tl) tl = o.construire ? o.construire() : o.tl; return tl; }
    function terminer() {
      if (fini) return; fini = true;
      if (o.passer) o.passer.hidden = true;
      document.removeEventListener('keydown', echap);
      o.apres && o.apres();
    }
    function echap(e) { if (e.key === 'Escape') passer(); }
    function passer() { obtenir().progress(1); terminer(); }
    function lancer() {
      var t = obtenir();
      if (o.passer) { o.passer.hidden = false; o.passer.addEventListener('click', passer); }
      document.addEventListener('keydown', echap);
      t.eventCallback('onComplete', terminer);
      t.play(0);
    }
    if (reduit) { obtenir().progress(1); terminer(); return; }
    obtenir();
    var pret = new Promise(function (ok) { if (document.readyState === 'complete') ok(); else window.addEventListener('load', ok); });
    Promise.race([Promise.all([pret, o.attendre || Promise.resolve()]), new Promise(function (ok) { setTimeout(ok, 7000); })])
      .then(function () { setTimeout(lancer, 200); });
  }

  return { creer: creer, intro: intro, porte: porte, precharger: precharger, CADRES: CADRES };
})();
