// Catalogue GOST 31 : source unique des trois maquettes.
// Textes et prix repris du site actuel (dépôt association-gost/GOST-31).
window.CATALOGUE = [
  {
    id: 'tshirts', titre: 'T-shirts', court: 'T-shirts',
    produits: [
      { id: 'tshirt-breacher', nom: 'T-shirt Breacher', desc: 'Sable, logo Breacher sur la poitrine et grand marquage vertical dans le dos.', prix: 15, unite: 'pièce', img: 'tshirt-breacher.jpg', w: 900, h: 600 },
      { id: 'tshirt-omega', nom: 'T-shirt Omega', desc: 'Sable, logo Omega sur la poitrine et grand marquage vertical dans le dos.', prix: 15, unite: 'pièce', img: 'tshirt-omega.jpg', w: 900, h: 600 },
      { id: 'tshirt-noir', nom: 'T-shirt noir camouflage', desc: 'Logo RAID camouflage gris sur la poitrine, grand sceau Police Nationale dans le dos.', prix: 15, unite: 'pièce', img: 'tshirt-noir.jpg', w: 900, h: 600 },
      { id: 'tshirt-sable', nom: 'T-shirt sable', desc: 'Écusson sur la poitrine, drapeau sur la manche, grand RAID noir dans le dos.', prix: 15, unite: 'pièce', img: 'tshirt-sable.jpg', w: 900, h: 600 }
    ]
  },
  {
    id: 'casquettes', titre: 'Casquettes', court: 'Casquettes',
    produits: [
      { id: 'casquette-jaune', nom: 'Casquette jaune 31', desc: 'Visière et face jaunes, filet noir à l’arrière, panthère et 31 brodés en noir.', prix: 20, unite: 'pièce', img: 'casquette-jaune.jpg', w: 800, h: 800 },
      { id: 'casquette-grise', nom: 'Casquette grise 31', desc: 'Face gris chiné, filet noir à l’arrière, panthère et 31 brodés en noir.', prix: 20, unite: 'pièce', img: 'casquette-grise.jpg', w: 796, h: 800 },
      { id: 'casquette-kaki', nom: 'Casquette kaki RAID', desc: 'Kaki avec filet à l’arrière, RAID brodé en relief et petit drapeau sur la visière.', prix: 20, unite: 'pièce', img: 'casquette-kaki.jpg', w: 800, h: 800 },
      { id: 'casquette-marine', nom: 'Casquette marine', desc: 'Face bleu marine, visière grise, filet blanc, panthère brodée en gris clair.', prix: 20, unite: 'pièce', img: 'casquette-marine.jpg', w: 800, h: 800 }
    ]
  },
  {
    id: 'pulls', titre: 'Pulls à capuche', court: 'Pulls',
    produits: [
      { id: 'pull-noir', nom: 'Pull à capuche noir', desc: 'Noir, grand écusson « Since 1985 » brodé ton sur ton sur la poitrine, poche kangourou.', prix: 50, unite: 'pièce', img: 'pull-noir.jpg', w: 900, h: 985 },
      { id: 'pull-kaki', nom: 'Pull à capuche kaki', desc: 'Kaki, grand écusson « Since 1985 » brodé en noir sur la poitrine, poche kangourou.', prix: 50, unite: 'pièce', img: 'pull-kaki.jpg', w: 900, h: 985 }
    ]
  },
  {
    id: 'doudoune', titre: 'Doudoune sans manches', court: 'Doudoune',
    produits: [
      { id: 'doudoune', nom: 'Doudoune sans manches', desc: 'Noire, col montant, zip central et poches zippées. Panthère brodée sur la poitrine.', prix: 50, unite: 'pièce', img: 'doudoune.jpg', w: 822, h: 900 }
    ]
  },
  {
    id: 'serviette', titre: 'Serviette de bain', court: 'Serviette',
    produits: [
      { id: 'serviette', nom: 'Serviette de bain', desc: 'Éponge anthracite avec grand logo en relief. Dimensions : 190 × 90 cm.', prix: 30, unite: 'pièce', img: 'serviette.jpg', w: 870, h: 900 }
    ]
  },
  {
    id: 'petanque', titre: 'Pétanque', court: 'Pétanque',
    produits: [
      { id: 'petanque', nom: 'Boules de pétanque OBUT', desc: 'Modèle lisse, 100 % inox, Ø 73 mm, 620 g minimum. Gravées RAID, livrées avec pochette.', prix: 75, unite: 'les 3 boules', img: 'petanque.jpg', w: 900, h: 600 }
    ]
  },
  {
    id: 'montres', titre: 'Montres', court: 'Montres',
    produits: [
      { id: 'montre-acier', nom: 'Montre acier RAID', desc: 'Boîtier et bracelet en acier, cadran blanc au logo RAID, index tricolores et date. Étanche 10 ATM.', prix: 60, unite: 'pièce', img: 'montre-acier.jpg', w: 900, h: 900 },
      { id: 'montre-chrono-noire', nom: 'Chronographe noir RAID', desc: 'Boîtier noir à lunette graduée, cadran noir et blanc à trois compteurs, logo RAID, bracelet silicone perforé.', prix: 60, unite: 'pièce', img: 'montre-chrono-noire.jpg', w: 900, h: 900 }
    ]
  }
];

window.COMMANDE = {
  mail: 'gost31.antenne@gmail.com',
  sujet: 'Commande de goodies',
  modele: 'Bonjour,\nJe souhaite commander :\n- 1 t-shirt Breacher\n- 1 casquette grise 31\nNom : …\nMerci !'
};

window.MENTION_ALCOOL = 'L’abus d’alcool est dangereux pour la santé. À consommer avec modération. Vente interdite aux mineurs.';

// Petits utilitaires partagés : prix, lien mailto, bouton Copier.
window.Outils = {
  prix: function (n) { return n + ' €'; },
  mailto: function (corps) {
    var c = window.COMMANDE;
    return 'mailto:' + c.mail + '?subject=' + encodeURIComponent(c.sujet) + '&body=' + encodeURIComponent(corps || c.modele);
  },
  brancherCopie: function (racine) {
    (racine || document).querySelectorAll('[data-copier]').forEach(function (btn) {
      var libelle = btn.textContent;
      btn.addEventListener('click', function () {
        var texte = btn.getAttribute('data-copier');
        var fini = function () {
          btn.textContent = 'Adresse copiée';
          btn.classList.add('est-copie');
          setTimeout(function () { btn.textContent = libelle; btn.classList.remove('est-copie'); }, 2000);
        };
        var secours = function () {
          var cible = document.getElementById(btn.getAttribute('aria-controls'));
          if (!cible) return;
          var r = document.createRange(); r.selectNodeContents(cible);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
          btn.textContent = 'Sélectionnée : Ctrl+C';
        };
        try { navigator.clipboard.writeText(texte).then(fini, secours); } catch (e) { secours(); }
      });
    });
  }
};
