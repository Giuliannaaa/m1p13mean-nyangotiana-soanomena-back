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


/*exports.createProduit = (req, res) => {
  console.log('BODY', req.body);
  console.log('FILE', req.file);

  res.json({
    body: req.body,
    file: req.file
  });

  const imageUrl = req.file
    ? req.file.filename
    : null;

  // sauvegarde en base
};*/
