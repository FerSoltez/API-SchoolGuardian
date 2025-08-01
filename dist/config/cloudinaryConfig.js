"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
cloudinary_1.v2.config({
    cloud_name: 'dtiasxtfq',
    api_key: '771549555117313',
    api_secret: 'g5KEQWMXZfAPmhkux24w_EzG7r8'
});
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'user-profiles', // Carpeta específica para fotos de perfil
        format: (req, file) => __awaiter(void 0, void 0, void 0, function* () { return 'png'; }),
        public_id: (req, file) => {
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
exports.default = (0, multer_1.default)({ storage });
