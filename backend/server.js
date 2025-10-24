/**
 * @fileoverview WebSocket server entry point for ChatFlow real-time chat application.
 * @module server
 */

import dotenv from "dotenv";
dotenv.config();
import { createApp } from "./app.js";
import { createServer } from "http";
import { initializeSocketServer } from "./socket/socketServer.js";

const PORT = process.env.PORT || 3000;

const app = createApp();

const httpServer = createServer(app);

const io = initializeSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 ChatFlow server running on http://localhost:${PORT}`);
  console.log("📡 WebSocket server ready with authentication");
  console.log("🌍 Environment:", process.env.NODE_ENV);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");

  io.close(() => {
    console.log("Socket.io connections closed");
    httpServer.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully");
  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
});
