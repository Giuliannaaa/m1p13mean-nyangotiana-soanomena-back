const Achat = require('../models/Achat');
const Promotion = require('../models/Promotions');
const Produit = require('../models/Produits'); // ← Ajouter

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
    const { prod_id, quantity, frais_livraison, avec_livraison } = req.body;
    
    // Récupérer le produit pour avoir le prix
    const produit = await Produit.findById(prod_id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
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
      prod_id,
      quantity,
      prix_unitaire: prixUnitaire,
      total_achat,
      reduction,
      frais_livraison: frais,
      avec_livraison: avec_livraison || false,
      total_reel,
      promotion_id: promotion ? promotion._id : null
    });
    
    await achat.save();
    
    res.status(201).json({
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
 * Récupérer tous les achats
 */
exports.getAchats = async (req, res) => {
  try {
    const achats = await Achat.find()
      .populate('client_id', 'name email')
      .populate('store_id', 'name')
      .populate('items.prod_id', 'nom_prod prix_unitaire')
      .sort({ createdAt: -1 });
    res.json(achats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Récupérer un achat par ID
 */
exports.getAchatById = async (req, res) => {
  try {
    const achat = await Achat.findById(req.params.id)
      .populate('client_id', 'name email')
      .populate('store_id', 'name')
      .populate('items.prod_id', 'nom_prod prix_unitaire');
    if (!achat) return res.status(404).json({ message: 'Commande non trouvée' });
    res.json(achat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Mettre à jour un achat
 */
exports.updateAchat = async (req, res) => {
  try {
    const achat = await Achat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(achat);
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
    res.json({ message: 'Commande supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};