/**
 * Messaging Module
 * Handles sending and receiving messages
 */

import { state } from "../state.js";
import * as ui from "./ui.js";
import { emit } from "./socket.js";

/**
 * Initialize messaging event listeners
 */
export function initMessagingListeners() {
  const sendBtn = ui.getElement("sendBtn");
  const messageInput = ui.getElement("messageInput");

  // Send message on button click
  sendBtn.addEventListener("click", sendMessage);

  // Send message on Enter key
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Optional: Handle typing indicators
  let typingTimeout;
  messageInput.addEventListener("input", () => {
    if (!state.currentRoom) return;

    // Emit typing event
    emit("typing-room", { roomId: state.currentRoom.id });

    // Clear previous timeout
    clearTimeout(typingTimeout);

    // Set timeout to emit stop-typing
    typingTimeout = setTimeout(() => {
      emit("stop-typing-room", { roomId: state.currentRoom.id });
    }, 1000);
  });
}

/**
 * Send a message
 */
export function sendMessage() {
  const text = ui.getMessageInput();

  if (!text) {
    console.log("Empty message, not sending");
    return;
  }

  // Check if in a room or DM
  if (state.currentRoom) {
    sendRoomMessage(text);
  } else if (state.currentDMUser) {
    sendDirectMessage(text);
  } else {
    console.error("No active room or DM");
    ui.showError("Please select a room or user first");
  }
}

/**
 * Send message to current room
 */
function sendRoomMessage(text) {
  if (!state.currentRoom) {
    console.error("No active room");
    return;
  }

  emit(
    "room-message",
    {
      roomId: state.currentRoom.id,
      text,
    },
    (response) => {
      if (!response.success) {
        console.error("Failed to send message:", response.error);
        ui.showError(response.error);
      }
    }
  );
}

/**
 * Send direct message to current DM user
 */
function sendDirectMessage(text) {
  if (!state.currentDMUser) {
    console.error("No active DM user");
    return;
  }

  emit(
    "direct-message",
    {
      recipientId: state.currentDMUser.id,
      text,
    },
    (response) => {
      if (!response.success) {
        console.error("Failed to send DM:", response.error);
        ui.showError(response.error);
      }
    }
  );
}

/**
 * ========================================
 * SOCKET EVENT HANDLERS
 * ========================================
 */

/**
 * Handle incoming room message
 */
export function handleRoomMessage(message) {
  // Only display if we're in this room
  if (state.currentRoom && state.currentRoom.id === message.roomId) {
    ui.addMessage(message);
  }
}

/**
 * Handle incoming direct message
 */
export function handleDirectMessage(message) {
  // Display if we're in a DM with this user
  if (state.currentDMUser) {
    const isFromCurrentDM =
      message.senderId === state.currentDMUser.id ||
      message.recipientId === state.currentDMUser.id;

    if (isFromCurrentDM) {
      ui.addMessage(message, true);
    }
  }
}

/**
 * Handle user typing in room
 */
export function handleUserTypingRoom(data) {
  if (state.currentRoom && state.currentRoom.id === data.roomId) {
    ui.showTypingIndicator(data.username);
  }
}

/**
 * Handle user stop typing in room
 */
export function handleUserStopTypingRoom(data) {
  if (state.currentRoom && state.currentRoom.id === data.roomId) {
    ui.hideTypingIndicator(data.username);
  }
}

/**
 * Load direct message history
 */
export function loadDirectMessages(userId, callback) {
  emit("get-direct-messages", { otherUserId: userId }, callback);
}
