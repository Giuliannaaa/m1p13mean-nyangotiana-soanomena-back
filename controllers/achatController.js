const Achat = require('../models/Achat');
const Promotion = require('../models/Promotions');
const Produit = require('../models/Produits');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const produitController = require('./produitController');

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
    const user = req.user;
    const boutique = req.boutique;

    // Récupérer prod_id depuis les paramètres URL, pas le body
    const { prod_id } = req.params;
    const { quantity, frais_livraison, avec_livraison } = req.body;

    // Récupérer le produit pour avoir le prix
    const produit = await Produit.findById(prod_id).populate('store_id', 'name');
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (produit.type_produit === 'PRODUIT') {
      if (!produit.stock || produit.stock < quantity) {
        return res.status(400).json({ message: 'Stock insuffisant' });
      }
      // Note: On ne soustrait plus le stock ici, on attend que ce soit DELIVREE
    }

    const prixUnitaire = parseFloat(produit.prix_unitaire.toString());

    // Vérifier s'il y a une promotion active
    const promotion = await getPromotionActive(prod_id);

    // Calculer le total et la réduction
    const total_achat = prixUnitaire * quantity;
    const reduction = calculerReduction(prixUnitaire, quantity, promotion);

    let frais = 0;
    if (produit.type_produit === 'PRODUIT' && avec_livraison && produit.length == 1) {
      frais = produit.livraison.frais || 0;
    } else if (produit.type_produit === 'PRODUIT' && avec_livraison && produit.length > 1) {
      frais = frais_livraison
    }

    const total_reel = total_achat - reduction + frais;

    // Créer l'achat
    const achat = new Achat({
      client_id: user._id || user.id,
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
        prix_unitaire: prixUnitaire,
        store_id: produit.store_id,
        status: 'EN_ATTENTE'
      }],
      promotion_id: promotion ? promotion._id : null
    });

    await achat.save();

    console.log('Achat créé avec succès:', achat._id);

    // Incrémenter le nombre d'achats du produit
    await produitController.incrementPurchaseCount(prod_id);

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
      query.client_id = req.user._id;
    } else if (req.user.role === 'Boutique' || req.user.role === 'boutique') {
      const boutique = req.boutique;
      if (boutique) {
        // Search for orders where at least one item belongs to this store
        query = {
          $or: [
            // { store_id: boutique._id },
            { "items.store_id": boutique._id }
          ]
        };
        console.log(`Filtrage achat pour boutique ID: ${boutique._id}`);
      } else {
        console.log("Utilisateur boutique sans boutique rattachée");
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    // Populer aussi le store_id avec le nom de la boutique
    const achats = await Achat.find(query)
      .populate('items.prod_id', 'nom_prod prix_unitaire image_Url store_id type_produit')
      .populate('items.store_id', 'name')
      .populate('client_id', 'name email')
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    // Si c'est une boutique, filtrer les items pour ne garder que ceux de cette boutique
    if (req.user.role === 'Boutique' || req.user.role === 'boutique') {
      const boutique = req.boutique;
      const achatsFiltered = achats.map(achat => {
        const achatObj = achat.toObject();
        // Ne garder que les items qui appartiennent à cette boutique
        achatObj.items = achatObj.items.filter(item =>
          item.store_id && item.store_id._id.toString() === boutique._id.toString()
        );
        return achatObj;
      });

      return res.json({
        success: true,
        count: achatsFiltered.length,
        data: achatsFiltered
      });
    }

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

    const achats = await Achat.find({
      $or: [
        { store_id: store_id },
        { "items.store_id": store_id }
      ]
    })
      .populate('items.prod_id', 'nom_prod prix_unitaire image_Url store_id type_produit')
      .populate('items.store_id', 'name')
      .populate('client_id', 'name email')
      .populate('store_id', 'name description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: achats.length,
      data: achats
    });
  } catch (err) {
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
    // Populer aussi le store_id avec le nom de la boutique
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

/**
 * Mettre à jour le statut d'une commande
 * Gère le workflow: EN_ATTENTE → CONFIRMEE → EN_LIVRAISON → DELIVREE
 * Restaure le stock si la commande est annulée avant livraison
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { user, boutique } = req;

    const transitions = {
      EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
      CONFIRMEE: ['EN_LIVRAISON', 'ANNULEE', 'DELIVREE'],
      EN_LIVRAISON: ['DELIVREE'],
      DELIVREE: [],
      ANNULEE: []
    };

    // Récupérer la commande actuelle
    const achat = await Achat.findById(id).populate('items.prod_id');
    if (!achat) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const oldStatus = achat.status || 'EN_ATTENTE';

    // 1. Vérification de l'autorisation de base par rôle
    if (user.role === 'Acheteur' || user.role === 'Admin') {
      if (achat.client_id.toString() !== user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      if (oldStatus !== 'EN_ATTENTE') {
        return res.status(403).json({ success: false, message: 'Modification impossible à ce stade' });
      }
      // L'acheteur annule ou confirme TOUTE la commande
      achat.items.forEach(item => item.status = status);
    } else if (user.role === 'Boutique' || user.role === 'boutique') {
      if (!boutique) {
        return res.status(403).json({ success: false, message: 'Boutique non rattachée' });
      }

      // Est-ce que la boutique possède au moins un article dans cette commande ?
      const hasOwnItems = achat.items.some(item =>
        item.store_id && item.store_id.toString() === boutique._id.toString()
      );

      if (!hasOwnItems && achat.store_id.toString() !== boutique._id.toString()) {
        return res.status(403).json({ success: false, message: 'Cette commande ne contient aucun de vos produits' });
      }

      // Mettre à jour SEULEMENT les articles de cette boutique
      let updatedAnything = false;
      for (const item of achat.items) {
        if (item.store_id && item.store_id.toString() === boutique._id.toString()) {
          // Valider transition pour cet item spécifique
          const itemOldStatus = item.status || 'EN_ATTENTE';
          if (transitions[itemOldStatus].includes(status)) {
            item.status = status;
            updatedAnything = true;

            // Gestion du stock si DELIVREE
            if (status === 'DELIVREE' && itemOldStatus !== 'DELIVREE') {
              const produit = await Produit.findById(item.prod_id);
              if (produit && produit.type_produit === 'PRODUIT') {
                if (produit.stock >= item.quantity) {
                  produit.stock -= item.quantity;
                  await produit.save();
                }
              }
            }
          }
        }
      }

      if (!updatedAnything) {
        return res.status(400).json({ success: false, message: 'Aucune transition valide pour vos produits' });
      }
    } else if (user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Rôle non autorisé' });
    } else if (user.role === 'Admin') {
      // L'admin peut tout changer
      achat.items.forEach(item => item.status = status);
    }

    // 2. Mettre à jour le statut global de la commande (Consensus)
    // - Si tous les articles sont ANNULEE -> ANNULEE
    // - Si tous les articles sont DELIVREE -> DELIVREE
    // - Si au moins un est EN_LIVRAISON -> EN_LIVRAISON
    // - Si au moins un est CONFIRMEE et aucun EN_LIVRAISON -> CONFIRMEE
    // - Sinon -> EN_ATTENTE

    const itemStatuses = achat.items.map(i => i.status);

    if (itemStatuses.every(s => s === 'ANNULEE')) {
      achat.status = 'ANNULEE';
    } else if (itemStatuses.every(s => s === 'DELIVREE' || s === 'ANNULEE')) {
      // Si tout est fini (livré ou annulé), on met DELIVREE (ou un statut fini)
      achat.status = 'DELIVREE';
    } else if (itemStatuses.includes('EN_LIVRAISON')) {
      achat.status = 'EN_LIVRAISON';
    } else if (itemStatuses.includes('CONFIRMEE')) {
      achat.status = 'CONFIRMEE';
    } else {
      achat.status = 'EN_ATTENTE';
    }

    await achat.save();

    await achat.populate('store_id', 'name description');
    await achat.populate('client_id', 'name email');

    res.json({
      success: true,
      message: `Statut mis à jour: ${oldStatus} → ${status}`,
      data: achat
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
