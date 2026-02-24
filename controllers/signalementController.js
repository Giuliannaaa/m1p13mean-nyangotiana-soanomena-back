const Signalement = require('../models/Signalement');
const Produit = require('../models/Produits');
const Boutique = require('../models/Boutique');

/**
 * Créer un signalement
 */
exports.creerSignalement = async (req, res) => {
  try {
    const { produit_id, raison, description } = req.body;
    const acheteur_id = req.user.id;

    if (!produit_id || !raison || !description) {
      return res.status(400).json({
        success: false,
        message: 'Produit ID, raison et description requis'
      });
    }

    const produit = await Produit.findById(produit_id);
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const signalementExistant = await Signalement.findOne({ acheteur_id, produit_id });
    if (signalementExistant) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà signalé ce produit' });
    }

    const signalement = new Signalement({
      acheteur_id,
      produit_id,
      boutique_id: produit.store_id,
      raison,
      description
    });

    await signalement.save();

    res.status(201).json({ success: true, message: 'Signalement enregistré avec succès', data: signalement });
  } catch (error) {
    console.error('Erreur creerSignalement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Obtenir tous les signalements (Admin)
 */
exports.getTousSignalements = async (req, res) => {
  try {
    const signalements = await Signalement.find()
      .populate('acheteur_id', 'firstname lastname email')
      .populate('produit_id', 'nom_prod prix_unitaire')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: signalements.length, data: signalements });
  } catch (error) {
    console.error('Erreur getTousSignalements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN : Obtenir les signalements d'une boutique (par ID)
 */
exports.getSignalementsBoutiqueAdmin = async (req, res) => {
  try {
    const { boutique_id } = req.params;

    const boutique = await Boutique.findById(boutique_id);
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }

    const signalements = await Signalement.find({ boutique_id })
      .populate('acheteur_id', 'firstname lastname email')
      .populate('produit_id', 'nom_prod prix_unitaire')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: signalements.length, data: signalements });
  } catch (error) {
    console.error('Erreur getSignalementsBoutiqueAdmin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * BOUTIQUE : Obtenir les signalements reçus pour ses produits
 */
exports.getSignalementsBoutique = async (req, res) => {
  try {
    const boutiqueOwnerId = req.user.id;

    const boutique = await Boutique.findOne({ ownerId: boutiqueOwnerId }).select('_id');
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée pour cet utilisateur' });
    }

    const signalements = await Signalement.find({ boutique_id: boutique._id })
      .populate('produit_id', 'nom_prod prix_unitaire')
      .populate('acheteur_id', 'firstname lastname email')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: signalements.length, data: signalements });
  } catch (error) {
    console.error('Erreur getSignalementsBoutique:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Obtenir mes signalements (Acheteur)
 */
exports.getMesSignalements = async (req, res) => {
  try {
    const acheteur_id = req.user.id;

    const signalements = await Signalement.find({ acheteur_id })
      .populate('acheteur_id', 'firstname lastname email')
      .populate('produit_id', 'nom_prod prix_unitaire')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: signalements.length, data: signalements });
  } catch (error) {
    console.error('Erreur getMesSignalements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Obtenir mon signalement pour un produit
 */
exports.getMonSignalement = async (req, res) => {
  try {
    const { produit_id } = req.params;
    const acheteur_id = req.user.id;

    const signalement = await Signalement.findOne({ acheteur_id, produit_id });

    res.json({ success: true, data: signalement });
  } catch (error) {
    console.error('Erreur getMonSignalement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mettre à jour le statut d'un signalement (Admin)
 */
exports.updateStatusSignalement = async (req, res) => {
  try {
    const { signalement_id } = req.params;
    const { statut, reponse_admin } = req.body;

    if (!statut) {
      return res.status(400).json({ success: false, message: 'Statut requis' });
    }

    const signalement = await Signalement.findByIdAndUpdate(
      signalement_id,
      { statut, reponse_admin: reponse_admin || null },
      { new: true }
    );

    if (!signalement) {
      return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
    }

    res.json({ success: true, message: 'Statut mis à jour', data: signalement });
  } catch (error) {
    console.error('Erreur updateStatusSignalement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Supprimer un signalement (Admin)
 */
exports.supprimerSignalement = async (req, res) => {
  try {
    const { signalement_id } = req.params;

    const signalement = await Signalement.findByIdAndDelete(signalement_id);

    if (!signalement) {
      return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
    }

    res.json({ success: true, message: 'Signalement supprimé' });
  } catch (error) {
    console.error('Erreur supprimerSignalement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Obtenir les statistiques des signalements
 */
exports.getStatistiquesSignalements = async (req, res) => {
  try {
    const stats = await Signalement.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 } } }
    ]);

    const raisonStats = await Signalement.aggregate([
      { $group: { _id: '$raison', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: { parStatut: stats, parRaison: raisonStats }
    });
  } catch (error) {
    console.error('Erreur getStatistiquesSignalements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Récupérer le nombre de signalements non traités
 * Pour BOUTIQUE : signalements reçus non traités
 * Pour ACHETEUR : signalements en attente de réponse
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const Boutique = require('../models/Boutique');

    let count = 0;
    let filter = {};

    if (userRole === 'Boutique') {
      const boutique = await Boutique.findOne({ ownerId: userId });
      if (!boutique) return res.json({ success: true, unreadCount: 0 });

      filter = { boutique_id: boutique._id, statut: { $in: ['signale','en_cours','resolu','rejete'] } }

    } else if (userRole === 'Acheteur') {
      filter = { acheteur_id: userId, statut: { $in: ['en_cours','resolu','rejete'] } };

    } else if (userRole === 'Admin') {
      // Admin : tous les signalements non encore traités
      filter = { statut: { $in: ['signale', 'en_cours'] } };

    } else {
      return res.json({ success: true, unreadCount: 0 });
    }

    count = await Signalement.countDocuments(filter);
    res.json({ success: true, unreadCount: count, count });

  } catch (error) {
    res.status(500).json({ success: false, unreadCount: 0 });
  }
};