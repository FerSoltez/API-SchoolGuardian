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
    params: (req: Request, file: Express.Multer.File) => {
        // Determinar carpeta basada en el tipo de imagen
        let folder = 'uploads/general';
        if (file.fieldname === 'class_image') {
            folder = 'uploads/classes';
        } else if (file.fieldname === 'profile_image') {
            folder = 'uploads/users';
        }

        // Usar ID único con timestamp para evitar sobrescritura automática
        const entityId = req.body.user_id || req.params.id || 'unknown';
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        let publicId = `upload_${entityId}_${timestamp}_${randomSuffix}`;
        if (file.fieldname === 'class_image') {
            publicId = `class_${entityId}_${timestamp}_${randomSuffix}`;
        } else if (file.fieldname === 'profile_image') {
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

export default multer({ storage });

