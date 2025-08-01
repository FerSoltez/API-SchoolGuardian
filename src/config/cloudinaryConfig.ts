import multer from 'multer';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
    cloud_name: 'dtiasxtfq',
    api_key: '771549555117313',
    api_secret: 'g5KEQWMXZfAPmhkux24w_EzG7r8'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'user-profiles', // Carpeta específica para fotos de perfil
        format: async (req: Request, file: Express.Multer.File) => 'png',
        public_id: (req: Request, file: Express.Multer.File) => {
            // Usar el ID del usuario o email para identificar la imagen
            const userId = req.body.user_id || req.params.id || Date.now();
            return `profile_${userId}`;
        },
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }, // Redimensionar a 300x300 centrando en la cara
            { quality: 'auto' } // Optimización automática de calidad
        ]
    },
});

export default multer({ storage });

