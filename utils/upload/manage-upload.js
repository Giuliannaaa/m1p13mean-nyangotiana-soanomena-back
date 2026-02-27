const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../../config/cloudinary');

const uploadFromBuffer = (buffer, options) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        }).end(buffer);
    });
};

exports.uploadImage = async (file, folder) => {
    // EN DEV : stockage local
    if (process.env.NODE_ENV !== 'production') {
        const uploadDir = path.join('uploads', folder);
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, file.name);
        await file.mv(filePath);

        return {
            url: filePath,
            publicId: null,
        };
    }

    // EN PROD : Cloudinary
    const result = await uploadFromBuffer(file.data, {
        folder,
        resource_type: 'image',
    });

    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
};

exports.deleteImages = async (images, folder) => {
    // EN DEV : suppression du dossier local
    if (process.env.NODE_ENV !== 'production') {
        const uploadDir = path.join('uploads', folder);
        try {
            await fs.rm(uploadDir, { recursive: true, force: true });
        } catch (err) {
            console.error('Erreur suppression dossier:', err);
        }
        return;
    }

    // EN PROD : suppression sur Cloudinary via les publicId
    for (const image of images) {
        if (image.publicId) {
            try {
                await cloudinary.uploader.destroy(image.publicId);
            } catch (err) {
                console.error('Erreur suppression Cloudinary:', err);
            }
        }
    }
};

exports.deleteImage = async (image) => {
    // EN DEV : suppression du fichier local
    if (process.env.NODE_ENV !== 'production') {
        try {
            await fs.unlink(image.url);
        } catch (err) {
            console.error('Erreur suppression ancienne image:', err);
        }
        return;
    }

    // EN PROD : suppression sur Cloudinary
    if (image.publicId) {
        try {
            await cloudinary.uploader.destroy(image.publicId);
        } catch (err) {
            console.error('Erreur suppression Cloudinary:', err);
        }
    }
};