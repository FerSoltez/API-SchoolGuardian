import { Router } from "express";
import usersController from "../controllers/usersController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

// User registration and authentication routes
router.post("/users", usersController.createUser as any);
router.post("/users/login", usersController.loginUser as any);
router.post("/users/verify-email", usersController.verifyEmail as any);
router.get("/users/verify-email", usersController.verifyAccountGet as any);

// User management routes
router.post("/users/get", usersController.getAllUsers);
router.post("/users/detalle", authMiddleware, usersController.getUser as any);
router.patch("/users/:id", authMiddleware, usersController.partialUpdateUser as any);
router.delete("/users/:id", authMiddleware, usersController.deleteUser as any);

// Password management routes
router.post("/users/changePass", usersController.changePassword as any);
router.post("/users/emailChangePass", usersController.sendPasswordResetEmail as any);

// Database utilities
router.get("/clear", usersController.clearDatabase as any);
router.get("/debug", usersController.debugUsers as any);
router.post("/verify-token", usersController.verifyToken as any);

export default router;
