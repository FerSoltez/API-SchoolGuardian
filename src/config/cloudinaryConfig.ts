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
        folder: 'uploads', // Carpeta general que contendrá subcarpetas
        format: async (req: Request, file: Express.Multer.File) => 'png',
        public_id: (req: Request, file: Express.Multer.File) => {
            // Usar ID único con timestamp para evitar sobrescritura automática
            const entityId = req.body.user_id || req.params.id || 'unknown';
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            
            if (file.fieldname === 'class_image') {
                return `classes/class_${entityId}_${timestamp}_${randomSuffix}`;
            } else if (file.fieldname === 'profile_image') {
                return `users/profile_${entityId}_${timestamp}_${randomSuffix}`;
            } else {
                return `general/upload_${entityId}_${timestamp}_${randomSuffix}`;
            }
        },
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'center' }, // Redimensionar a 300x300 centrando la imagen
            { quality: 'auto' } // Optimización automática de calidad
        ]
    },
});

export default multer({ storage });

