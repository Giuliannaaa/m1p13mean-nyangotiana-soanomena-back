const Boutique = require('../models/Boutique');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const path = require('path');
const fs = require('fs').promises;

// --- Créer une boutique ---
exports.createBoutique = async (req, res) => {
    try {
        const boutique = new Boutique({
            ...req.body,
            // ✅ Initialiser les champs de filtrage
            isNew: true,
            isPopular: false,
            isFeatured: false,
            productCount: 0,
            rating: 0,
            followers: 0,
            images: []
        });

        await boutique.save();

        // Gérer les images si présentes
        if (req.files && req.files.images) {
            const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const uploadDir = path.join('uploads/stores', boutique._id.toString());
            await fs.mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                const filePath = path.join(uploadDir, file.name);
                await file.mv(filePath);
                boutique.images.push({
                    url: filePath,
                    altText: file.name,
                    isCover: boutique.images.length === 0 // La première image est la couverture par défaut
                });
            }
            await boutique.save();
        }

        res.status(201).json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- Récupérer toutes les boutiques ---
exports.getBoutiques = async (req, res) => {
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
        const role = decodedToken.role;

        let boutiques = [];

        if (role === 'Admin') {
            // Admin voit toutes les boutiques
            boutiques = await Boutique.find();
        } else if (role === 'Boutique') {
            // Boutique voit sa propre boutique
            const boutique = await Boutique.findOne({ ownerId: decodedToken.id });
            // ✅ Mettre l'objet unique dans un tableau
            boutiques = boutique ? [boutique] : [];
        } else if (role === 'Acheteur') {
            // Acheteur voit les boutiques validées
            boutiques = await Boutique.find({ isValidated: true });
        }

        // ✅ Toujours retourner un tableau
        res.json({
            success: true,
            count: boutiques.length,
            data: boutiques
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// --- Récupérer une boutique par ID ---
exports.getBoutiqueById = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });
        res.json(boutique);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Mettre à jour une boutique ---
exports.updateBoutique = async (req, res) => {
    try {
        let boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ success: false, message: "Boutique non trouvée" });

        // Gérer les nouvelles images si présentes
        if (req.files && req.files.images) {
            const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const uploadDir = path.join('uploads/boutique', boutique._id.toString());
            await fs.mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                const filePath = path.join(uploadDir, file.name);
                await file.mv(filePath);
                boutique.images.push({
                    url: filePath,
                    altText: file.name
                });
            }
        }

        // Mettre à jour les autres champs
        Object.keys(req.body).forEach(key => {
            if (key !== 'images') {
                boutique[key] = req.body[key];
            }
        });

        await boutique.save();

        res.json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// --- Supprimer une boutique ---
exports.deleteBoutique = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ success: false, message: "Boutique non trouvée" });

        // Supprimer le dossier des images
        const uploadDir = path.join('uploads/boutique', req.params.id);
        try {
            await fs.rm(uploadDir, { recursive: true, force: true });
        } catch (err) {
            console.error('Erreur suppression dossier boutique:', err);
        }

        await Boutique.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Boutique supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Activer ou désactiver une boutique ---
exports.toggleBoutiqueStatus = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) return res.status(404).json({ message: "Boutique non trouvée" });

        boutique.isValidated = !boutique.isValidated;
        await boutique.save();

        res.json({
            success: true,
            message: `Boutique ${boutique.isValidated ? 'activée' : 'désactivée'} avec succès`,
            isValidated: boutique.isValidated
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Récupérer la boutique par propriétaire (ownerId)
 */
exports.getBoutiqueByOwner = async (req, res) => {
    try {
        const boutique = await Boutique.findOne({ ownerId: req.params.ownerId });

        if (!boutique) {
            return res.status(404).json({
                success: false,
                message: 'Aucune boutique trouvée pour cet utilisateur'
            });
        }

        res.json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// NOUVELLES MÉTHODES POUR LES FILTRES

/**
 * Obtenir les NOUVELLES boutiques (créées il y a moins de 30 jours)
 */
exports.getNewBoutiques = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const boutiques = await Boutique.find({
            isValidated: true,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: boutiques.length,
            data: boutiques
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Obtenir les boutiques POPULAIRES (avec beaucoup de followers ou produits)
 */
exports.getPopularBoutiques = async (req, res) => {
    try {
        const boutiques = await Boutique.find({
            isValidated: true,
            $or: [
                { followers: { $gt: 10 } },
                { productCount: { $gt: 20 } },
                { rating: { $gte: 4 } }
            ]
        }).sort({ followers: -1, productCount: -1, rating: -1 });

        res.json({
            success: true,
            count: boutiques.length,
            data: boutiques
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Obtenir les boutiques EN AVANT (featured)
 */
exports.getFeaturedBoutiques = async (req, res) => {
    try {
        const boutiques = await Boutique.find({
            isValidated: true,
            isFeatured: true
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: boutiques.length,
            data: boutiques
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Obtenir les boutiques par NOTE (les mieux notées)
 */
exports.getTopRatedBoutiques = async (req, res) => {
    try {
        const boutiques = await Boutique.find({
            isValidated: true,
            rating: { $gte: 4 }
        }).sort({ rating: -1 }).limit(10);

        res.json({
            success: true,
            count: boutiques.length,
            data: boutiques
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Incrémenter le nombre de produits d'une boutique
 */
exports.incrementProductCount = async (boutiqueId) => {
    try {
        const boutique = await Boutique.findById(boutiqueId);
        if (boutique) {
            boutique.productCount = (boutique.productCount || 0) + 1;

            // Si plus de 50 produits, marquer comme populaire
            if (boutique.productCount > 50) {
                boutique.isPopular = true;
            }

            await boutique.save();
        }
    } catch (error) {
        console.error('Erreur incrementProductCount:', error);
    }
};

/**
 * Ajouter un follower à une boutique
 */
exports.addFollower = async (req, res) => {
    try {
        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) {
            return res.status(404).json({ message: "Boutique non trouvée" });
        }

        boutique.followers = (boutique.followers || 0) + 1;
        await boutique.save();

        res.json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Noter une boutique
 */
exports.rateBoutique = async (req, res) => {
    try {
        const { rating } = req.body;

        if (!rating || rating < 0 || rating > 5) {
            return res.status(400).json({
                message: "La note doit être entre 0 et 5"
            });
        }

        const boutique = await Boutique.findById(req.params.id);
        if (!boutique) {
            return res.status(404).json({ message: "Boutique non trouvée" });
        }

        // Calcul simple de la moyenne
        boutique.rating = ((boutique.rating + rating) / 2).toFixed(1);
        await boutique.save();

        res.json({
            success: true,
            data: boutique
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Supprimer une image spécifique d'une boutique
 */
exports.deleteBoutiqueImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const boutique = await Boutique.findById(id);

        if (!boutique) return res.status(404).json({ success: false, message: "Boutique non trouvée" });

        const imageIndex = boutique.images.findIndex(img => img._id.toString() === imageId);
        if (imageIndex === -1) return res.status(404).json({ success: false, message: "Image non trouvée" });

        const image = boutique.images[imageIndex];

        // Supprimer le fichier physiquement si possible
        try {
            await fs.unlink(image.url);
        } catch (err) {
            console.error('Erreur suppression fichier image:', err);
        }

        // Retirer de la base de données
        boutique.images.splice(imageIndex, 1);
        await boutique.save();

        res.json({
            success: true,
            message: "Image supprimée avec succès",
            data: boutique
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};