const Produit = require('../models/Produits');

exports.createProduit = async (req, res) => {
  try {
    const data = req.body;

    if (data.livraison) {
      data.livraison = JSON.parse(data.livraison);
    }

    if (req.file) {
      data.image_Url = req.file.filename;
    }

    const produit = new Produit(data);
    await produit.save();

    res.status(201).json(produit);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

exports.listProduct = async (req, res) => {
  try {
    const produits = await Produit.find();
    res.json(produits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });
    res.json(produit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const produit = await Produit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(produit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Produit.findByIdAndDelete(req.params.id);
    res.json({ message: "Produit supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};