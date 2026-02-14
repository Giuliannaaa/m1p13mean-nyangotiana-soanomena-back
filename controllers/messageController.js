const Message = require('../models/Message');
const Boutique = require('../models/Boutique');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Obtenir toutes les conversations avec statut ET NOM BOUTIQUE
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // D'abord, récupérer les conversations groupées
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            boutique_id: '$boutique_id',
            otherUserId: {
              $cond: [
                { $eq: ['$sender_id', userId] },
                '$receiver_id',
                '$sender_id'
              ]
            }
          },
          lastMessage: { $last: '$message' },
          lastMessageDate: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver_id', userId] },
                    { $eq: ['$is_read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageDate: -1 } }
    ]);

    // Ensuite, récupérer les infos de chaque boutique
    const conversationsWithBoutiqueNames = await Promise.all(
      conversations.map(async (conv) => {
        const boutique = await Boutique.findById(conv._id.boutique_id).select('name');
        return {
          ...conv,
          boutiqueName: boutique?.name || 'Boutique inconnue'
        };
      })
    );

    res.json({
      success: true,
      count: conversationsWithBoutiqueNames.length,
      data: conversationsWithBoutiqueNames
    });
  } catch (error) {
    console.error('Erreur getConversations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Envoyer un message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { receiver_id, boutique_id, message, subject, message_type } = req.body;
    const sender_id = req.user.id;
    const sender_role = req.user.role;

    // Validation
    if (!receiver_id || !message || !boutique_id) {
      return res.status(400).json({
        success: false,
        message: 'receiver_id, message et boutique_id sont requis'
      });
    }

    // Déterminer le rôle du destinataire
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Destinataire non trouvé'
      });
    }

    // Créer le message
    const newMessage = new Message({
      sender_id,
      sender_role,
      receiver_id,
      receiver_role: receiver.role,
      boutique_id,
      message,
      subject,
      message_type: message_type || 'other'
    });

    await newMessage.save();

    // Peupler les infos
    await newMessage.populate('sender_id', 'firstname lastname email role');
    await newMessage.populate('receiver_id', 'firstname lastname email role');
    await newMessage.populate('boutique_id', 'name');

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: newMessage
    });
  } catch (error) {
    console.error('Erreur sendMessage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les infos pour démarrer une conversation avec une boutique
 */
exports.getBoutiqueContact = async (req, res) => {
  try {
    const { boutique_id } = req.params;
    
    // Trouver la boutique et son propriétaire
    const boutique = await Boutique.findById(boutique_id)
      .populate('ownerId', 'firstname lastname email role');
    
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: 'Boutique non trouvée'
      });
    }

    res.json({
      success: true,
      data: {
        boutique_id: boutique._id,
        boutique_name: boutique.name,
        owner: {
          id: boutique.ownerId._id,
          firstname: boutique.ownerId.firstname,
          lastname: boutique.ownerId.lastname,
          email: boutique.ownerId.email
        }
      }
    });
  } catch (error) {
    console.error('Erreur getBoutiqueContact:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir la liste des admins
 */
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'Admin' }).select('_id firstname lastname email');
    
    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Erreur getAdmins:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les messages reçus par l'utilisateur connecté
 */
exports.getReceivedMessages = async (req, res) => {
  try {
    const receiver_id = req.user.id;
    const { boutique_id } = req.query;

    let query = { receiver_id };

    // Optionnellement filtrer par boutique
    if (boutique_id) {
      query.boutique_id = boutique_id;
    }

    const messages = await Message.find(query)
      .populate('sender_id', 'firstname lastname email role')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Erreur getReceivedMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les messages envoyés par l'utilisateur connecté
 */
exports.getSentMessages = async (req, res) => {
  try {
    const sender_id = req.user.id;
    const { boutique_id } = req.query;

    let query = { sender_id };

    if (boutique_id) {
      query.boutique_id = boutique_id;
    }

    const messages = await Message.find(query)
      .populate('receiver_id', 'firstname lastname email role')
      .populate('boutique_id', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Erreur getSentMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir une conversation (messages entre 2 utilisateurs pour une boutique)
 */
exports.getConversation = async (req, res) => {
  try {
    const { otherUserId, boutique_id } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({
      boutique_id,
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId }
      ]
    })
      .populate('sender_id', 'firstname lastname email role')
      .populate('receiver_id', 'firstname lastname email role')
      .populate('boutique_id', 'name')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Erreur getConversation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir toutes les boutiques
 */
exports.getAllBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find()
      .populate('ownerId', 'firstname lastname email')
      .select('name ownerId');
    
    res.json({
      success: true,
      data: boutiques
    });
  } catch (error) {
    console.error('Erreur getAllBoutiques:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Marquer un message comme lu
 */
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        is_read: true,
        read_at: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Message marqué comme lu',
      data: message
    });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir le nombre de messages non lus
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const receiver_id = req.user.id;

    const count = await Message.countDocuments({
      receiver_id,
      is_read: false
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Erreur getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Supprimer un message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Message supprimé'
    });
  } catch (error) {
    console.error('Erreur deleteMessage:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * SUPPRIMER UNE CONVERSATION ENTIÈRE
 */
exports.deleteConversation = async (req, res) => {
  try {
    const { otherUserId, boutiqueId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Suppression conversation:');
    console.log('- userId:', userId);
    console.log('- otherUserId:', otherUserId);
    console.log('- boutiqueId:', boutiqueId);

    // Vérifier que l'utilisateur est bien impliqué dans la conversation
    const messageCount = await Message.countDocuments({
      boutique_id: boutiqueId,
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId }
      ]
    });

    if (messageCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Supprimer tous les messages de la conversation
    const result = await Message.deleteMany({
      boutique_id: boutiqueId,
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId }
      ]
    });

    console.log('Conversation supprimée:', result.deletedCount, 'messages');

    res.json({
      success: true,
      message: 'Conversation supprimée',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Erreur deleteConversation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};