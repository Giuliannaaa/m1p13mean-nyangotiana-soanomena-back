const Suivi = require('../models/Suivi');
const Boutique = require('../models/Boutique');

/**
 * Suivre une boutique
 */
exports.suivreBoutique = async (req, res) => {
  try {
    const { boutique_id } = req.body;
    const acheteur_id = req.user.id; // ✅ ID de l'utilisateur connecté

    // Vérifier que la boutique existe
    const boutique = await Boutique.findById(boutique_id);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    // Vérifier que le suivi n'existe pas déjà
    const suiviExistant = await Suivi.findOne({ acheteur_id, boutique_id });
    if (suiviExistant) {
      return res.status(400).json({
        success: false,
        message: 'Vous suivez déjà cette boutique'
      });
    }

    // Créer le suivi
    const suivi = new Suivi({
      acheteur_id,
      boutique_id
    });

    await suivi.save();

    // ✅ Incrémenter le nombre de followers de la boutique
    boutique.followers = (boutique.followers || 0) + 1;
    await boutique.save();

    res.status(201).json({
      success: true,
      message: 'Vous suivez maintenant cette boutique',
      data: suivi
    });
  } catch (error) {
    console.error('Erreur suivreBoutique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Arrêter de suivre une boutique
 */
exports.arreterSuivreBoutique = async (req, res) => {
  try {
    const { boutique_id } = req.params;
    const acheteur_id = req.user.id;

    // Chercher et supprimer le suivi
    const suivi = await Suivi.findOneAndDelete({ acheteur_id, boutique_id });

    if (!suivi) {
      return res.status(404).json({
        success: false,
        message: 'Vous ne suivez pas cette boutique'
      });
    }

    // ✅ Décrémenter le nombre de followers de la boutique
    await Boutique.findByIdAndUpdate(
      boutique_id,
      { $inc: { followers: -1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Vous ne suivez plus cette boutique'
    });
  } catch (error) {
    console.error('Erreur arreterSuivreBoutique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les boutiques suivies par l'acheteur connecté
 */
exports.getMesSuivis = async (req, res) => {
  try {
    const acheteur_id = req.user.id;

    const suivis = await Suivi.find({ acheteur_id })
      .populate('boutique_id', 'name description rating followers');

    res.json({
      success: true,
      count: suivis.length,
      data: suivis
    });
  } catch (error) {
    console.error('Erreur getMesSuivis:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Vérifier si un acheteur suit une boutique
 */
exports.isBoutiqueSuivie = async (req, res) => {
  try {
    const { boutique_id } = req.params;
    const acheteur_id = req.user.id;

    const suivi = await Suivi.findOne({ acheteur_id, boutique_id });

    res.json({
      success: true,
      isSuivie: !!suivi
    });
  } catch (error) {
    console.error('Erreur isBoutiqueSuivie:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir tous les followers d'une boutique
 */
exports.getFollowersBoutique = async (req, res) => {
  try {
    const { boutique_id } = req.params;

    const count = await Suivi.countDocuments({ boutique_id });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Erreur getFollowersBoutique:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};