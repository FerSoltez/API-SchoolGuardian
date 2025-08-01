"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usersController_1 = __importDefault(require("../controllers/usersController"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const cloudinaryConfig_1 = __importDefault(require("../config/cloudinaryConfig")); // Importar configuración de Cloudinary
const router = (0, express_1.Router)();
// User registration and authentication routes
router.post("/users", cloudinaryConfig_1.default.single('profile_image'), usersController_1.default.createUser);
router.post("/users/test", usersController_1.default.createStudentForTesting); // Nueva ruta para crear estudiantes de prueba
router.post("/users/login", usersController_1.default.loginUser);
router.post("/users/verify-email", usersController_1.default.verifyEmail);
router.get("/users/verify-email", usersController_1.default.verifyAccountGet);
// User management routes
router.post("/users/get", usersController_1.default.getAllUsers);
router.post("/users/detalle", authMiddleware_1.default, usersController_1.default.getUser);
router.patch("/users/:id", authMiddleware_1.default, cloudinaryConfig_1.default.single('profile_image'), usersController_1.default.partialUpdateUser);
router.delete("/users/:id", authMiddleware_1.default, usersController_1.default.deleteUser);
// Password management routes
router.post("/users/changePass", usersController_1.default.changePassword);
router.post("/users/emailChangePass", usersController_1.default.sendPasswordResetEmail);
// Profile image routes
router.get("/users/:id/profile-image", usersController_1.default.getProfileImage);
router.delete("/users/:id/profile-image", authMiddleware_1.default, usersController_1.default.deleteProfileImage);
// Database utilities
router.get("/clear", usersController_1.default.clearDatabase);
router.get("/debug", usersController_1.default.debugUsers);
router.post("/verify-token", usersController_1.default.verifyToken);
exports.default = router;
