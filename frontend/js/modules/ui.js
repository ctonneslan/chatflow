/**
 * UI Module
 * Handles all UI-related operations
 */

import { state } from "../state.js";
import * as dom from "../utils/dom.js";

// Cache DOM elements
const elements = {};

/**
 * Initialize UI elements cache
 */
export function initElements() {
  // Screens
  elements.authScreen = dom.getElement("auth-screen");
  elements.chatScreen = dom.getElement("chat-screen");

  // Auth
  elements.authError = dom.getElement("auth-error");
  elements.loginForm = dom.getElement("login-form");
  elements.registerForm = dom.getElement("register-form");
  elements.loginBtn = dom.getElement("login-btn");
  elements.registerBtn = dom.getElement("register-btn");
  elements.loginUsername = dom.getElement("login-username");
  elements.loginPassword = dom.getElement("login-password");
  elements.registerUsername = dom.getElement("register-username");
  elements.registerEmail = dom.getElement("register-email");
  elements.registerPassword = dom.getElement("register-password");
  elements.registerDisplayName = dom.getElement("register-display-name");

  // Chat UI
  elements.currentUserInfo = dom.getElement("current-user-info");
  elements.connectionStatus = dom.getElement("connection-status");
  elements.chatTitle = dom.getElement("chat-title");
  elements.chatSubtitle = dom.getElement("chat-subtitle");
  elements.messagesContainer = dom.getElement("messages-container");
  elements.messageInput = dom.getElement("message-input");
  elements.sendBtn = dom.getElement("send-btn");
  elements.logoutBtn = dom.getElement("logout-btn");

  // Rooms & Users
  elements.myRoomsList = dom.getElement("my-rooms-list");
  elements.publicRoomsList = dom.getElement("public-rooms-list");
  elements.onlineUsersList = dom.getElement("online-users-list");
  elements.createRoomBtn = dom.getElement("create-room-btn");
  elements.refreshRoomsBtn = dom.getElement("refresh-rooms-btn");

  // Modals
  elements.createRoomModal = dom.getElement("create-room-modal");
  elements.closeCreateRoomBtn = dom.getElement("close-create-room");
  elements.createRoomForm = dom.getElement("create-room-form");
  elements.roomName = dom.getElement("room-name");
  elements.roomDisplayName = dom.getElement("room-display-name");
  elements.roomDescription = dom.getElement("room-description");

  return elements;
}

/**
 * Get cached element
 */
export function getElement(name) {
  return elements[name];
}

/**
 * Show auth screen
 */
export function showAuthScreen() {
  elements.authScreen.style.display = "flex";
  dom.removeClass(elements.chatScreen, "active");
}

/**
 * Show chat screen
 */
export function showChatScreen() {
  elements.authScreen.style.display = "none";
  dom.addClass(elements.chatScreen, "active");

  if (state.currentUser) {
    elements.currentUserInfo.innerHTML = `
      <strong>${dom.escapeHtml(
        state.currentUser.displayName || state.currentUser.username
      )}</strong><br>
      ${dom.escapeHtml(state.currentUser.email)}
    `;
  }
}

/**
 * Show error message
 */
export function showError(message) {
  dom.setText(elements.authError, message);
  dom.addClass(elements.authError, "show");

  setTimeout(() => {
    dom.removeClass(elements.authError, "show");
  }, 5000);
}

/**
 * Update connection status
 */
export function updateConnectionStatus(status, message) {
  dom.setText(elements.connectionStatus, message || status);
  elements.connectionStatus.className = `status-indicator ${status}`;
}

/**
 * Update chat header
 */
export function updateChatHeader(title, subtitle = "") {
  dom.setText(elements.chatTitle, title);
  dom.setText(elements.chatSubtitle, subtitle);
}

/**
 * Clear messages container
 */
export function clearMessages() {
  dom.clear(elements.messagesContainer);
}

/**
 * Add message to UI
 */
export function addMessage(message, isDM = false) {
  const isOwn =
    message.userId === state.currentUser.id ||
    message.senderId === state.currentUser.id;

  const messageEl = dom.createElement("div", {
    className: `message ${isOwn ? "own" : ""}`,
  });

  const initial = (message.username || message.senderUsername || "?")
    .charAt(0)
    .toUpperCase();
  const displayName = message.username || message.senderUsername || "Unknown";
  const time = new Date(message.timestamp).toLocaleTimeString();

  messageEl.innerHTML = `
    <div class="message-avatar">${initial}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${dom.escapeHtml(displayName)}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${dom.escapeHtml(
        message.text || message.content
      )}</div>
    </div>
  `;

  elements.messagesContainer.appendChild(messageEl);
  dom.scrollToBottom(elements.messagesContainer);
}

/**
 * Add system message to UI
 */
export function addSystemMessage(text) {
  const messageEl = dom.createElement("div", {
    className: "message system",
  });

  messageEl.innerHTML = `
    <div class="message-content">${dom.escapeHtml(text)}</div>
  `;

  elements.messagesContainer.appendChild(messageEl);
  dom.scrollToBottom(elements.messagesContainer);
}

/**
 * Enable message input
 */
export function enableMessageInput(placeholder = "Type a message...") {
  dom.enable(elements.messageInput);
  dom.enable(elements.sendBtn);
  elements.messageInput.placeholder = placeholder;
  dom.focus(elements.messageInput);
}

/**
 * Disable message input
 */
export function disableMessageInput() {
  dom.disable(elements.messageInput);
  dom.disable(elements.sendBtn);
}

/**
 * Get message input value and clear
 */
export function getMessageInput() {
  const text = elements.messageInput.value.trim();
  elements.messageInput.value = "";
  return text;
}

/**
 * Show modal
 */
export function showModal(modalElement) {
  dom.addClass(modalElement, "show");
}

/**
 * Hide modal
 */
export function hideModal(modalElement) {
  dom.removeClass(modalElement, "show");
}

/**
 * Set button loading state
 */
export function setButtonLoading(
  button,
  isLoading,
  loadingText = "Loading..."
) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    dom.disable(button);
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    dom.enable(button);
  }
}

/**
 * Render empty state
 */
export function renderEmptyState(container, message) {
  container.innerHTML = `
    <li class="empty-state-subtext" style="padding: 10px;">
      ${dom.escapeHtml(message)}
    </li>
  `;
}

/**
 * Switch auth tab
 */
export function switchAuthTab(tab) {
  dom.getElements(".auth-tab").forEach((t) => dom.removeClass(t, "active"));
  dom.getElements(".auth-form").forEach((f) => dom.removeClass(f, "active"));

  dom.addClass(document.querySelector(`[data-tab="${tab}"]`), "active");
  dom.addClass(dom.getElement(`${tab}-form`), "active");
}

/**
 * Highlight active room
 */
export function highlightActiveRoom(roomId) {
  dom.getElements(".room-item").forEach((item) => {
    dom.removeClass(item, "active");
    if (parseInt(item.dataset.roomId) === roomId) {
      dom.addClass(item, "active");
    }
  });
}

/**
 * ========================================
 * TYPING INDICATORS
 * ========================================
 */

/**
 * Show typing indicator
 */
export function showTypingIndicator(username) {
  // TODO: Implement typing indicator UI
  console.log(`${username} is typing...`);
}

/**
 * Hide typing indicator
 */
export function hideTypingIndicator(username) {
  // TODO: Implement typing indicator UI
  console.log(`${username} stopped typing`);
}
