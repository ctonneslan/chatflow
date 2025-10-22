/**
 * @fileoverview Authentication middleware for protecting routes.
 * @module middleware/auth
 */

import { verify } from "jsonwebtoken";
import { verifyToken } from "../services/authService.js";

/**
 * Middleware to authenticate JWT token from Authorization header.
 * Attaches user data to req.user if token is valid.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Object} Calls next() or returns 401 error response
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Invalid token format. Use: Authorization: Bearer <token>",
      });
    }
    const decoded = await verifyToken(token);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      error: error.message || "Invalid or expired token",
    });
  }
}

/**
 * Middleware for optional authentication.
 * Attaches user data to req.user if valid token provided, otherwise continues without authentication.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Always calls next()
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return next();
    }
    const decoded = await verifyToken(token);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };
    next();
  } catch (error) {
    console.log("Optional auth failed (continuing anyway):", error.message);
    next();
  }
}
