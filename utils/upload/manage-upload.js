const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../../config/cloudinary');

const isCloudinaryUrl = (url) => url && url.startsWith('https://res.cloudinary.com');

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

exports.deleteImage = async (image) => {
    if (isCloudinaryUrl(image.url)) {
        // Cloudinary
        const publicId = image.publicId || image.public_id;
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log(`Suppression cloudinary [${publicId}]`);
            } catch (err) {
                console.error('Erreur suppression Cloudinary:', err);
            }
        }
    } else {
        // fichier local
        try {
            await fs.unlink(image.url);
            console.log(`Suppression fichier local [${image.url}]`);
        } catch (error) {
            console.error('Erreur suppression fichier local:', error);
        }
    }
};

exports.deleteImages = async (images, folder) => {
    const hasXloudinaryImages = images.some(image => isCloudinaryUrl(image.url));

    if (hasXloudinaryImages) {
        // EN PROD : suppression sur Cloudinary via les publicId
        for (const image of images) {
            if (image.publicId || image.public_id) {
                try {
                    await cloudinary.uploader.destroy(image.publicId || image.public_id);
                } catch (err) {
                    console.error('Erreur suppression Cloudinary:', err);
                }
            }
        }
    } else {
        // EN DEV : suppression du dossier local
        const uploadDir = path.join('uploads', folder);
        try {
            await fs.rm(uploadDir, { recursive: true, force: true });
        } catch (err) {
            console.error('Erreur suppression dossier:', err);
        }
    }
};

exports.extractPublicId = (url) => {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    return match ? match[1] : null;
};