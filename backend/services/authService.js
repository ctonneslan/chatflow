/**
 * @fileoverview Authentication service for user management and JWT operations.
 * @module services/authService
 */

import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 10;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

/**
 * Register a new user with hashed password and return JWT token.
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Unique username (3-50 characters)
 * @param {string} userData.email - Valid email address
 * @param {string} userData.password - Password (minimum 8 characters)
 * @param {string} [userData.displayName] - Display name (defaults to username)
 * @returns {Promise<{user: Object, token: string}>} User object and JWT token
 * @throws {Error} If validation fails or user already exists
 */
export async function registerUser(userData) {
  const { username, email, password, displayName } = userData;

  if (!username || !email || !password) {
    throw new Error("Username, email, and password are required");
  }

  if (username.length < 3 || username.length > 50) {
    throw new Error("Username must be between 3 and 50 characters");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  try {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Username or email already exists");
    }

    console.log("🔐 Hashing password...");
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("✅ Password hashed");

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, display_name, created_at`,
      [username, email, passwordHash, displayName || username]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "chatflow",
      }
    );

    console.log("✅ User registered:", username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
      },
      token,
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

/**
 * Authenticate user credentials and return JWT token.
 * @param {string} usernameOrEmail - Username or email address
 * @param {string} password - User password
 * @returns {Promise<{user: Object, token: string}>} User object and JWT token
 * @throws {Error} If credentials are invalid or user not found
 */
export async function loginUser(usernameOrEmail, password) {
  if (!usernameOrEmail || !password) {
    throw new Error("Username/email and password are required");
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, display_name, avatar_url 
       FROM users 
       WHERE username = $1 OR email = $1`,
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result.rows[0];

    console.log("🔐 Verifying password");
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log("✅ Password verified:", isPasswordValid);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "chatflow",
      }
    );

    console.log("✅ User logged in:", user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
      token,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Verify JWT token and validate user exists in database.
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload with userId and username
 * @throws {Error} If token is invalid, expired, or user not found
 */
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      `SELECT id, username FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
}
