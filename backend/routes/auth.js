/**
 * @fileoverview Authentication routes for user registration, login, and token verification.
 * @module routes/auth
 */

import express from "express";
import {
  registerUser,
  loginUser,
  verifyToken,
} from "../services/authService.js";

const router = express.Router();

/**
 * Register a new user.
 * @route POST /api/auth/register
 * @param {Object} req.body - User registration data
 * @param {string} req.body.username - Unique username (3-50 characters)
 * @param {string} req.body.email - Valid email address
 * @param {string} req.body.password - Password (minimum 8 characters)
 * @param {string} [req.body.displayName] - Display name (defaults to username)
 * @returns {Object} 201 - User data and JWT token
 * @returns {Object} 400 - Validation error
 * @returns {Object} 409 - Username or email already exists
 * @returns {Object} 500 - Server error
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    const result = await registerUser({
      username,
      email,
      password,
      displayName,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    console.error("Register route error:", error);
    let statusCode = 500;

    if (error.message.includes("required")) {
      statusCode = 400;
    } else if (error.message.includes("already exists")) {
      statusCode = 409;
    } else if (
      error.message.includes("Invalid") ||
      error.message.includes("must be")
    ) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Authenticate a user and return JWT token.
 * @route POST /api/auth/login
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.usernameOrEmail - Username or email address
 * @param {string} req.body.password - User password
 * @returns {Object} 200 - User data and JWT token
 * @returns {Object} 400 - Missing required fields
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 500 - Server error
 */
router.post("/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const result = await loginUser(usernameOrEmail, password);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.error("Login route error:", error);
    let statusCode = 500;

    if (error.message.includes("required")) {
      statusCode = 400;
    } else if (error.message.includes("Invalid credentials")) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Verify a JWT token and return user information.
 * @route GET /api/auth/verify
 * @param {string} req.headers.authorization - Bearer token
 * @returns {Object} 200 - Decoded user information
 * @returns {Object} 401 - Missing, invalid, or expired token
 */
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Invalid token format",
      });
    }

    const decoded = await verifyToken(token);
    res.status(200).json({
      success: true,
      data: {
        userId: decoded.userId,
        username: decoded.username,
      },
    });
  } catch (error) {
    console.error("Verify route error:", error);

    res.status(401).json({
      success: false,
      error: error.message || "Invalid token",
    });
  }
});

export default router;
