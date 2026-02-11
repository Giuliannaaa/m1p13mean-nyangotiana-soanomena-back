const Avis = require('../models/Avis');
const Boutique = require('../models/Boutique');

/**
 * Noter une boutique
 */
exports.noterBoutique = async (req, res) => {
  try {
    const { boutique_id, rating, comment } = req.body;
    const acheteur_id = req.user.id;

    // Validation
    if (!boutique_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Boutique ID et rating requis'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5'
      });
    }

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutique_id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Vérifier si un avis existe déjà
    let avis = await Avis.findOne({ acheteur_id, boutique_id });

    if (avis) {
      // Mettre à jour l'avis existant
      avis.rating = rating;
      avis.comment = comment;
      await avis.save();
    } else {
      // Créer un nouvel avis
      avis = new Avis({
        acheteur_id,
        boutique_id,
        rating,
        comment
      });
      await avis.save();
    }

    // Recalculer la note moyenne de la boutique
    await updateBoutiqueRating(boutique_id);

    res.status(201).json({
      success: true,
      message: 'Avis enregistré avec succès',
      data: avis
    });
  } catch (error) {
    console.error('Erreur noterBoutique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir l'avis d'un acheteur pour une boutique
 */
exports.getMonAvis = async (req, res) => {
  try {
    const { boutique_id } = req.params;
    const acheteur_id = req.user.id;

    const avis = await Avis.findOne({ acheteur_id, boutique_id });

    res.json({
      success: true,
      data: avis
    });
  } catch (error) {
    console.error('Erreur getMonAvis:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir tous les avis d'une boutique
 */
exports.getAvisBoutique = async (req, res) => {
  try {
    const { boutique_id } = req.params;

    const avis = await Avis.find({ boutique_id })
      .populate('acheteur_id', 'firstname lastname email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: avis.length,
      data: avis
    });
  } catch (error) {
    console.error('Erreur getAvisBoutique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Supprimer un avis
 */
exports.supprimerAvis = async (req, res) => {
  try {
    const { boutique_id } = req.params;
    const acheteur_id = req.user.id;

    const avis = await Avis.findOneAndDelete({ acheteur_id, boutique_id });

    if (!avis) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }

    // Recalculer la note moyenne
    await updateBoutiqueRating(boutique_id);

    res.json({
      success: true,
      message: 'Avis supprimé'
    });
  } catch (error) {
    console.error('Erreur supprimerAvis:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fonction utilitaire : Recalculer la note moyenne d'une boutique
 */
async function updateBoutiqueRating(boutiqueId) {
  try {
    const avis = await Avis.find({ boutique_id: boutiqueId });

    if (avis.length === 0) {
      // Aucun avis, note = 0
      await Boutique.findByIdAndUpdate(boutiqueId, { rating: 0 });
    } else {
      // Calculer la moyenne
      const totalRating = avis.reduce((sum, a) => sum + a.rating, 0);
      const averageRating = totalRating / avis.length;
      
      await Boutique.findByIdAndUpdate(boutiqueId, { 
        rating: Math.round(averageRating * 10) / 10 // Arrondir à 1 décimale
      });
    }
  } catch (error) {
    console.error('Erreur updateBoutiqueRating:', error);
  }
}