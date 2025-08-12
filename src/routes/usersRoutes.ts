import { Router } from "express";
import usersController from "../controllers/usersController";
import authMiddleware from "../middleware/authMiddleware";
import upload from "../config/cloudinaryConfig"; // Importar configuración de Cloudinary

const router = Router();

// User registration and authentication routes
router.post("/users", upload.single('profile_image'), usersController.createUser as any);
router.post("/users/test", usersController.createStudentForTesting as any); // Nueva ruta para crear estudiantes de prueba
router.post("/users/login", usersController.loginUser as any);
router.post("/users/verify-email", usersController.verifyEmail as any);
router.get("/users/verify-email", usersController.verifyAccountGet as any);

// User management routes
router.post("/users/get", usersController.getAllUsers);
router.post("/users/detalle", authMiddleware, usersController.getUser as any);
router.patch("/users/:id", authMiddleware, upload.single('profile_image'), usersController.partialUpdateUser as any);
router.delete("/users/:id", authMiddleware, usersController.deleteUser as any);

// Password management routes
router.post("/users/changePass", usersController.changePassword as any);
router.post("/users/emailChangePass", usersController.sendPasswordResetEmail as any);

// UUID management routes
router.post("/users/requestUuidReset", usersController.sendUuidResetEmail as any);
router.post("/users/resetUuid", usersController.resetUserUuid as any);

// Profile image routes
router.get("/users/:id/profile-image", usersController.getProfileImage as any);
router.delete("/users/:id/profile-image", authMiddleware, usersController.deleteProfileImage as any);

// Database utilities
router.get("/clear", usersController.clearDatabase as any);
router.get("/debug", usersController.debugUsers as any);
router.post("/verify-token", usersController.verifyToken as any);

export default router;
