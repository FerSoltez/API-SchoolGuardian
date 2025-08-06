"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: (req, file) => {
        // Determinar carpeta basada en el tipo de imagen
        let folder = 'uploads/general';
        if (file.fieldname === 'class_image') {
            folder = 'uploads/classes';
        }
        else if (file.fieldname === 'profile_image') {
            folder = 'uploads/users';
        }
        // Usar ID único con timestamp para evitar sobrescritura automática
        const entityId = req.body.user_id || req.params.id || 'unknown';
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        let publicId = `upload_${entityId}_${timestamp}_${randomSuffix}`;
        if (file.fieldname === 'class_image') {
            publicId = `class_${entityId}_${timestamp}_${randomSuffix}`;
        }
        else if (file.fieldname === 'profile_image') {
            publicId = `profile_${entityId}_${timestamp}_${randomSuffix}`;
        }
        return {
            folder: folder,
            format: 'png',
            public_id: publicId,
            transformation: [
                { width: 300, height: 300, crop: 'fill', gravity: 'center' }, // Redimensionar a 300x300 centrando la imagen
                { quality: 'auto' } // Optimización automática de calidad
            ]
        };
    },
});
exports.default = (0, multer_1.default)({ storage });
