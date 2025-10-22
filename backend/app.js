/**
 * @fileoverview Express application factory for ChatFlow API.
 * @module app
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";

/**
 * Create and configure Express application with middleware and routes.
 * @returns {express.Application} Configured Express app instance
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost origin in development
        if (process.env.NODE_ENV !== 'production') {
          if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
          }
        }

        // Allow configured CLIENT_URL
        const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "chatflow",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);

  app.get("/", (req, res) => {
    res.json({
      message: "ChatFlow API - Real-time Chat Application",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
        websocket: "ws://localhost:3000",
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `Cannot ${req.method} ${req.path}`,
    });
  });

  app.use((err, req, res, next) => {
    console.error("Error:", err.stack);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  return app;
}
