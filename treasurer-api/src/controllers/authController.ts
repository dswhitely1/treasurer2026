import type { RequestHandler } from "express";
import {
  registerUser,
  loginUser,
  getCurrentUserWithOrgs,
} from "../services/authService.js";
import { sendSuccess } from "../utils/response.js";
import type { RegisterDto, LoginDto } from "../schemas/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const register: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as RegisterDto;
    const result = await registerUser(data);
    sendSuccess(res, result, "Registration successful", 201);
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as LoginDto;
    const result = await loginUser(data);
    sendSuccess(res, result, "Login successful");
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    const result = await getCurrentUserWithOrgs(req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};
