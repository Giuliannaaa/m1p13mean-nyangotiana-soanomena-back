const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: [true, 'Please add a firstname']
    },
    lastname: {
        type: String,
        required: [true, 'Please add a lastname']
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please add an email'],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: String,
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },

    role: {
        type: String,
        enum: ['Admin', 'Boutique', 'Acheteur'],
        default: 'Acheteur',
        required: true
    },

    document: {
        type: {
            type: String,
            enum: ['CIN', 'PASSEPORT']
        },
        number: String,
        file: String
    },

    /*store_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Boutique',
        required: function() { 
        return this.role === 'Boutique'; // Obligatoire seulement pour les boutiques
        }
    */

    isActive: { type: Boolean, default: true },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: { type: Date, default: Date.now }
});


// Virtuel pour récupérer la boutique de l'utilisateur
UserSchema.virtual('boutique', {
    ref: 'Boutique',
    localField: '_id',
    foreignField: 'ownerId',
    justOne: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Prendre le nombre des acheteurs actifs
UserSchema.statics.countActiveBuyers = async function () {
    const result = await this.aggregate([
        {
            $match: { role: 'Acheteur', isActive: true }
        },
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

// Prendre le nombre d'utilisateurs ayant un role boutique qui ne sont pas validés(actifs)
UserSchema.statics.countInactiveBoutiqueUsers = async function () {
    const result = await this.aggregate([
        {
            $match: { role: 'Boutique', isActive: false }
        },
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

// Prendre le nombre total des acheteurs
UserSchema.statics.countTotalBuyers = async function () {
    const result = await this.aggregate([
        {
            $match: { role: 'Acheteur' }
        },
        {
            $count: 'total'
        }
    ]);

    return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('Users', UserSchema);
