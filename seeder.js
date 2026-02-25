const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Charger les variables d'environnement (.env)
dotenv.config();

// Importer le vrai modèle User
const User = require('./models/User'); // ⚙️ Adapter le chemin si nécessaire

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_database';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connecté à MongoDB');

        // Vérifier si l'admin existe déjà
        const existing = await User.findOne({ email: 'admin@admin.com' });
        if (existing) {
            console.log('⚠️  Un utilisateur admin existe déjà, seed ignoré.');
            process.exit(0);
        }

        // Créer l'admin (le pre('save') du modèle hashera automatiquement le mot de passe)
        const user = await User.create({
            firstname: 'admin',
            lastname: 'admin',
            email: 'admin@admin.com',
            password: 'admin123',
            role: 'Admin'
        });

        if (user && user._id) {
            console.log(`✅ Utilisateur admin créé avec succès !`);
            console.log(`   - ID    : ${user._id}`);
            console.log(`   - Email : ${user.email}`);
            console.log(`   - Rôle  : ${user.role}`);
        } else {
            console.log('❌ Echec : l\'utilisateur n\'a pas été créé.');
        }

    } catch (error) {
        console.error('❌ Erreur lors du seed :', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
        process.exit(0);
    }
}

seed();