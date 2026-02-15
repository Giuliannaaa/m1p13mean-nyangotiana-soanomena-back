const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        // Qui envoie le message
        sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
        sender_role: { type: String, enum: ['Admin', 'Boutique'], required: true },

        // Qui reçoit le message
        receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
        receiver_role: { type: String, enum: ['Admin', 'Boutique'], required: true },

        // La boutique concernée (pour les messages concernant une boutique spécifique)
        boutique_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },

        // Le contenu du message
        message: { type: String, required: true, maxlength: 5000 },

        // Statut de lecture
        is_read: { type: Boolean, default: false },

        read_at: { type: Date, default: null },

        // Sujet du message
        subject: { type: String, maxlength: 200 },

        // Type de message (pour catégoriser)
        message_type: {
            type: String,
            enum: ['validation', 'avertissement', 'info', 'question', 'other'],
            default: 'other'
        }
    },
    {
        timestamps: true
    }
);

// Index pour les conversations
messageSchema.index({ sender_id: 1, receiver_id: 1, boutique_id: 1 });
messageSchema.index({ receiver_id: 1, is_read: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);