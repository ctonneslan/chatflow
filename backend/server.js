import dotenv from "dotenv";
dotenv.config();
import { createApp } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

const app = createApp();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`🔌 New client connected:`, socket.id);

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected:`, socket.id, "Reason:", reason);
  });

  socket.on("message", (data) => {
    console.log(`💬 Received message:`, data);
    socket.emit("message", {
      text: `Server received: ${data.text}`,
      timestamp: new Date(),
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 ChatFlow server running on http:localhost:${PORT}`);
  console.log("📡 WebSocket server ready");
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
