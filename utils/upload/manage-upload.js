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
            publicId: this.extractPublicId,
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
        const publicId = image.publicId || image.public_id || exports.extractPublicId(image.url);
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
            const publicId = image.publicId || image.public_id || exports.extractPublicId(image.url);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
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
    if (!url) return null;
    const segments = url.split('/');
    const uploadIndex = segments.findIndex(s => s === 'upload');
    if (uploadIndex === -1) return null;

    let idSegments = segments.slice(uploadIndex + 1);
    // Ignore version segment (e.g. v1772272729)
    if (idSegments[0] && idSegments[0].startsWith('v') && !isNaN(idSegments[0].substring(1))) {
        idSegments.shift();
    }

    // Join remaining segments and remove file extension
    const idWithExt = idSegments.join('/');
    const publicId = idWithExt.split('.')[0];

    return publicId || null;
};