/**
 * Socket Module
 * Manages Socket.io connection and event handlers
 */

import { config } from "../config.js";
import { state } from "../state.js";
import * as ui from "./ui.js";
import {
  handleUserRooms,
  handleRoomCreated,
  handleUserJoinedRoom,
  handleUserLeftRoom,
  loadPublicRooms,
} from "./rooms.js";
import {
  handleRoomMessage,
  handleDirectMessage,
  handleUserTypingRoom,
  handleUserStopTypingRoom,
} from "./messaging.js";
import { logout } from "./auth.js";

/**
 * Connect to Socket.io server
 */
export function connectSocket() {
  console.log("🔌 Connecting to Socket.io...");

  state.socket = io(config.socketUrl, {
    auth: { token: state.token },
    ...config.socket,
  });

  setupSocketHandlers();
}

/**
 * Disconnect from Socket.io server
 */
export function disconnectSocket() {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
}

/**
 * Setup all socket event handlers
 */
function setupSocketHandlers() {
  const socket = state.socket;

  // Connection events
  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);
  socket.on("reconnect_attempt", handleReconnectAttempt);
  socket.on("reconnect", handleReconnect);

  // Room events
  socket.on("user-rooms", handleUserRooms);
  socket.on("room-created", handleRoomCreated);
  socket.on("user-joined-room", handleUserJoinedRoom);
  socket.on("user-left-room", handleUserLeftRoom);

  // Message events
  socket.on("room-message", handleRoomMessage);
  socket.on("direct-message", handleDirectMessage);

  // Typing events
  socket.on("user-typing-room", handleUserTypingRoom);
  socket.on("user-stop-typing-room", handleUserStopTypingRoom);

  // User events
  socket.on("user-joined", handleUserJoined);
  socket.on("user-left", handleUserLeft);
  socket.on("welcome", handleWelcome);
}

/**
 * ========================================
 * CONNECTION EVENT HANDLERS
 * ========================================
 */

/**
 * Handle socket connect
 */
function handleConnect() {
  console.log("✅ Connected to server");
  console.log("Socket ID:", state.socket.id);

  ui.updateConnectionStatus("connected", "Connected");

  // Load initial data
  loadPublicRooms();

  // Enable message input if in a room or DM
  if (state.currentRoom || state.currentDMUser) {
    ui.enableMessageInput();
  }
}

/**
 * Handle socket disconnect
 */
function handleDisconnect(reason) {
  console.log("❌ Disconnected:", reason);

  ui.updateConnectionStatus("disconnected", "Disconnected");
  ui.disableMessageInput();

  if (state.isInRoom() || state.isInDM()) {
    ui.addSystemMessage("Disconnected. Attempting to reconnect...");
  }
}

/**
 * Handle connection error
 */
function handleConnectError(error) {
  console.error("❌ Connection error:", error.message);

  ui.updateConnectionStatus(
    "disconnected",
    `Connection failed: ${error.message}`
  );

  if (error.message.includes("Authentication")) {
    ui.showError("Authentication failed. Please login again.");
    logout();
  }
}

/**
 * Handle reconnection attempt
 */
function handleReconnectAttempt(attemptNumber) {
  console.log("🔄 Reconnecting... Attempt", attemptNumber);
  ui.updateConnectionStatus("connecting", `Reconnecting... (${attemptNumber})`);
}

/**
 * Handle successful reconnection
 */
function handleReconnect(attemptNumber) {
  console.log("✅ Reconnected after", attemptNumber, "attempts");

  if (state.isInRoom() || state.isInDM()) {
    ui.addSystemMessage("Reconnected successfully!");
  }
}

/**
 * ========================================
 * USER EVENT HANDLERS
 * ========================================
 */

/**
 * Handle user joined (global)
 */
function handleUserJoined(data) {
  console.log("👤 User joined globally:", data.username);
  // Could update online users list
}

/**
 * Handle user left (global)
 */
function handleUserLeft(data) {
  console.log("👤 User left globally:", data.username);
  // Could update online users list
}

/**
 * Handle welcome message
 */
function handleWelcome(data) {
  console.log("👋 Welcome:", data);

  // Show welcome message if already in a room
  if (state.isInRoom() || state.isInDM()) {
    ui.addSystemMessage(data.message);
  }
}

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Emit event with callback
 */
export function emit(event, data, callback) {
  if (state.socket && state.socket.connected) {
    if (callback) {
      state.socket.emit(event, data, callback);
    } else {
      state.socket.emit(event, data);
    }
  } else {
    console.error("Socket not connected");
    if (callback) {
      callback({
        success: false,
        error: "Not connected to server",
      });
    }
  }
}

/**
 * Check if socket is connected
 */
export function isConnected() {
  return state.socket && state.socket.connected;
}
