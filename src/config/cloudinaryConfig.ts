import multer from 'multer';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'user-profiles', // Carpeta específica para fotos de perfil
        format: async (req: Request, file: Express.Multer.File) => 'png',
        public_id: (req: Request, file: Express.Multer.File) => {
            // Usar ID único con timestamp para evitar sobrescritura automática
            const userId = req.body.user_id || req.params.id || 'unknown';
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            return `profile_${userId}_${timestamp}_${randomSuffix}`;
        },
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Redimensionar a 300x300 centrando en la cara
            { quality: 'auto' } // Optimización automática de calidad
        ]
    },
});

export default multer({ storage });

