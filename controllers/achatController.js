const Achat = require('../models/Achat');
const Promotion = require('../models/Promotions');
const Produit = require('../models/Produits');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Récupérer la promotion active pour un produit
 */
const getPromotionActive = async (prod_id) => {
  const now = new Date();

  const promotion = await Promotion.findOne({
    prod_id: prod_id,
    est_Active: true,
    debut: { $lte: now },
    fin: { $gte: now }
  });

  return promotion;
};

/**
 * Calculer la réduction selon le type de promotion
 */
const calculerReduction = (prix_unitaire, quantite, promotion) => {
  if (!promotion) return 0;

  const montantPromo = parseFloat(promotion.montant.toString());
  const totalAvantReduc = prix_unitaire * quantite;

  if (promotion.type_prom === 'POURCENTAGE') {
    return totalAvantReduc * (montantPromo / 100);
  } else {
    return montantPromo * quantite;
  }
};

/**
 * Créer un achat avec calcul automatique de la promotion
 */
exports.createAchat = async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token non fourni'
      });
    }

    const decodedToken = jwt.verify(token, config.jwtSecret);

    // ✅ Récupérer prod_id depuis les paramètres URL, pas le body
    const { prod_id } = req.params;
    const { quantity, frais_livraison, avec_livraison } = req.body;

    console.log('Paramètres reçus:', { prod_id, quantity, frais_livraison, avec_livraison });

    // Récupérer le produit pour avoir le prix
    const produit = await Produit.findById(prod_id).populate('store_id', 'name');
    if (!produit) {
      console.log('Produit non trouvé avec l\'ID:', prod_id);
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    console.log('Produit trouvé:', produit.nom_prod);

    const prixUnitaire = parseFloat(produit.prix_unitaire.toString());

    // Vérifier s'il y a une promotion active
    const promotion = await getPromotionActive(prod_id);

    // Calculer le total et la réduction
    const total_achat = prixUnitaire * quantity;
    const reduction = calculerReduction(prixUnitaire, quantity, promotion);
    const frais = frais_livraison || 0;
    const total_reel = total_achat - reduction + frais;

    // Créer l'achat
    const achat = new Achat({
      client_id: decodedToken.id,
      store_id: produit.store_id,
      total_achat,
      reduction,
      frais_livraison: frais,
      avec_livraison: avec_livraison || false,
      total_reel,
      items: [{
        prod_id: prod_id,
        nom_prod: produit.nom_prod,
        image_url: produit.image_Url || "",
        quantity: quantity,
        prix_unitaire: prixUnitaire
      }],
      promotion_id: promotion ? promotion._id : null
    });

    await achat.save();

    console.log('Achat créé avec succès:', achat._id);

    // ✅ Populer les données avant de renvoyer
    await achat.populate('store_id', 'name description');

    res.status(201).json({
      success: true,
      achat,
      promotion_appliquee: promotion ? {
        type: promotion.type_prom,
        valeur: parseFloat(promotion.montant.toString())
      } : null
    });

  } catch (error) {
    console.error('Erreur création achat:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer tous les achats (filtrés par rôle)
 */
exports.getAchats = async (req, res) => {
  try {
    let query = {};

    // Filtrage selon le rôle
    if (req.user.role === 'Acheteur') {
      query.client_id = req.user.id;
    } else if (req.user.role === 'Boutique') {
      // Supposons que le middleware a attaché req.boutique ou qu'on doit le trouver
      // Mais pour l'instant, l'acheteur est la priorité.
      // Si Boutique veut voir ses ventes, elle utilise getAchatsByBoutique ou on filtre ici si on avait l'ID.
      // Pour l'instant, laissons vide ou ajoutons logique si besoin.
    }

    // Populer aussi le store_id avec le nom de la boutique
    const achats = await Achat.find(query)
      .populate('items.prod_id', 'nom_prod prix_unitaire image_Url store_id')
      .populate('client_id', 'name email')
      .populate('store_id', 'name description') // ✅ Ajouter ceci
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: achats.length,
      data: achats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Récupérer les achats par boutique
 */
exports.getAchatsByBoutique = async (req, res) => {
  try {
    const { store_id } = req.params;

    console.log('Récupération des achats pour la boutique:', store_id);

    // Filtrer les achats par store_id
    const achats = await Achat.find({ store_id: store_id })
      .populate('items.prod_id', 'nom_prod prix_unitaire image_Url store_id')
      .populate('client_id', 'name email')
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    console.log('Achats trouvés:', achats.length);

    res.json({
      success: true,
      count: achats.length,
      data: achats
    });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Récupérer un achat par ID
 */
exports.getAchatById = async (req, res) => {
  try {
    // ✅ Populer aussi le store_id avec le nom de la boutique
    const achat = await Achat.findById(req.params.id)
      .populate('items.prod_id', 'nom_prod prix_unitaire image_Url store_id')
      .populate('client_id', 'name email')
      .populate('store_id', 'name description'); // ✅ Ajouter ceci

    if (!achat) return res.status(404).json({ message: 'Commande non trouvée' });

    res.json({
      success: true,
      data: achat
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Mettre à jour un achat
 */
exports.updateAchat = async (req, res) => {
  try {
    // ✅ Populer aussi le store_id avec le nom de la boutique
    const achat = await Achat.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('store_id', 'name description');

    res.json({
      success: true,
      data: achat
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Supprimer un achat
 */
exports.deleteAchat = async (req, res) => {
  try {
    await Achat.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Commande supprimée'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};