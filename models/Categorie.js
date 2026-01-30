const mongoose = require('mongoose');

const CategorieSchema = new mongoose.Schema(
  {
    nom_cat: {
      type: String, required: true, trim: true
    },

    descriptions: {
      type: String, trim: true
    },

  },
  {
    timestamps: true
  });

module.exports = mongoose.model('Categories', CategorieSchema);
