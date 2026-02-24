const User = require('../models/User');
const Boutique = require('../models/Boutique');

exports.getUsersByRole = async (req, res) => {
    try {
        const boutiqueUsers = await User.find({ role: 'Boutique' });
        res.json(boutiqueUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.toggleUserValidation = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

        user.isActive = !user.isActive;

        // Si le rôle est Boutique, on désactive aussi les boutiques qu'il détient
        if (user.role === 'Boutique') {
            await Boutique.updateMany({ ownerId: user._id }, { isValidated: user.isActive });
        }

        await user.save();

        res.json({
            message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
            isActive: user.isActive
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAdminUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'Admin' });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBuyerUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'Acheteur' });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Récupérer un utilisateur par ID
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mettre à jour le profil de l'utilisateur
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, phone } = req.body;

    // Vérifier que l'utilisateur modifie son propre profil
    if (req.user.id !== id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce profil'
      });
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (phone) updateData.phone = phone;

    // Parser le document (envoyé en JSON.stringify depuis Angular)
    if (req.body.document) {
      const doc = JSON.parse(req.body.document);
      updateData.document = {
        type: doc.type || '',
        number: doc.number || '',
        file: ''
      };

      // Gérer le fichier uploadé via express-fileupload
      if (req.files && req.files.documentFile) {
        const file = req.files.documentFile;
        const fileName = `doc_${Date.now()}_${file.name}`;
        const uploadPath = `./uploads/documents/${firstname}/${fileName}`;

        // Créer le dossier s'il n'existe pas
        const fs = require('fs');
        if (!fs.existsSync('./uploads/documents')) {
          fs.mkdirSync('./uploads/documents', { recursive: true });
        }

        await file.mv(uploadPath);
        updateData.document.file = uploadPath;
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: user
    });

  } catch (error) {
    console.error('Erreur updateUserProfile:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getBoutiqueUsersWithDocuments = async (req, res) => {
  try {
    const users = await User.find({ 
      role: 'Boutique'
    }).select('firstname lastname email phone document isActive createdAt');

    // Filtrer côté JS ceux qui ont un document
    const usersWithDocs = users.filter(u => u.document && u.document.file);

    res.json({
      success: true,
      count: usersWithDocs.length,
      data: usersWithDocs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.requestDeleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    user.deleteRequestedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Demande enregistrée. Compte supprimé dans 30 jours.',
      deleteRequestedAt: user.deleteRequestedAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelDeleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    user.deleteRequestedAt = null;
    await user.save();

    res.json({ success: true, message: 'Demande de suppression annulée.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    // Vérifier l'ancien mot de passe
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save(); // Le pre-save hook bcrypt va hasher automatiquement

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};