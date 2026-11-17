// Promotions en cours, servies par /api/promos (gérées dans l'espace admin).
// Aucune promo, ou serveur injoignable : le site s'affiche comme d'habitude.
window.Promos = (function () {
  function euros(n) {
    return (Math.round(n * 100) % 100 ? n.toFixed(2).replace('.', ',') : String(Math.round(n))) + ' €';
  }
  function prixPromo(prix, promo) {
    return promo.type === 'pourcent' ? Math.round(prix * (100 - promo.valeur)) / 100 : Number(promo.valeur);
  }
  function dateFin(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  }

  function charger() {
    if (!window.fetch || location.protocol === 'file:') return Promise.resolve([]);
    return fetch('/api/promos', { headers: { Accept: 'application/json' }, credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : { promos: [] }; })
      .then(function (d) { return Array.isArray(d.promos) ? d.promos : []; })
      .catch(function () { return []; });
  }

  // Meilleur prix promo par produit : { id produit : { promo, prix, produit, rayon } }
  function parProduit(promos, catalogue) {
    var maintenant = Date.now(), index = {};
    promos.forEach(function (pr) {
      if (Date.parse(pr.debut) > maintenant || Date.parse(pr.fin) <= maintenant) return;
      catalogue.forEach(function (c) {
        c.produits.forEach(function (p) {
          var vise = pr.cible_type === 'rayon' ? c.id === pr.cible_id : p.id === pr.cible_id;
          if (!vise) return;
          var np = prixPromo(p.prix, pr);
          if (!(np >= 0 && np < p.prix)) return;
          if (!index[p.id] || np < index[p.id].prix) index[p.id] = { promo: pr, prix: np, produit: p, rayon: c };
        });
      });
    });
    return index;
  }

  function el(tag, classe, texte) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texte != null) n.textContent = texte;   // jamais innerHTML pour un texte saisi dans l'admin
    return n;
  }

  // Une affiche par promo (un rayon entier = une seule affiche).
  function affiches(promos, index) {
    var vues = {}, cartes = [];
    Object.keys(index).forEach(function (id) {
      var e = index[id], pr = e.promo;
      if (vues[pr.id]) return;
      vues[pr.id] = true;
      var rayon = pr.cible_type === 'rayon';
      var produit = rayon ? e.rayon.produits[0] : e.produit;
      var pct = pr.type === 'pourcent' ? pr.valeur : Math.round((1 - e.prix / e.produit.prix) * 100);

      var a = el('a', 'affiche');
      a.href = '#plan-' + e.rayon.id;
      var cadre = el('div', 'affiche-image');
      var img = el('img');
      img.src = 'assets/produits/' + produit.img;
      img.alt = '';
      img.loading = 'lazy';
      cadre.appendChild(img);
      cadre.appendChild(el('span', 'affiche-badge', '−' + pct + ' %'));
      a.appendChild(cadre);
      var corps = el('div', 'affiche-corps');
      if (pr.titre) corps.appendChild(el('p', 'affiche-titre', pr.titre));
      corps.appendChild(el('h3', null, rayon ? 'Tout le rayon ' + e.rayon.court.toLowerCase() : produit.nom));
      var prix = el('p', 'affiche-prix');
      if (rayon) prix.textContent = '−' + pr.valeur + ' % sur ' + e.rayon.produits.length + ' modèles';
      else {
        prix.appendChild(el('s', null, euros(e.produit.prix)));
        prix.appendChild(document.createTextNode(' ' + euros(e.prix)));
      }
      corps.appendChild(prix);
      corps.appendChild(el('p', 'affiche-fin', 'Jusqu’au ' + dateFin(pr.fin)));
      a.appendChild(corps);
      cartes.push(a);
    });
    return cartes;
  }

  // Prix barré + prix promo dans un élément « .prix » ou « .montant » (structure : texte + <small>unité</small>).
  function barrer(conteneur, e) {
    if (!conteneur) return;
    var unite = conteneur.querySelector('small');
    conteneur.textContent = '';
    conteneur.appendChild(el('s', 'prix-barre', euros(e.produit.prix)));
    conteneur.appendChild(document.createTextNode(' ' + euros(e.prix)));
    if (unite) conteneur.appendChild(unite);
    conteneur.classList.add('en-promo');
  }

  return { charger: charger, parProduit: parProduit, affiches: affiches, barrer: barrer, euros: euros, dateFin: dateFin, el: el };
})();
