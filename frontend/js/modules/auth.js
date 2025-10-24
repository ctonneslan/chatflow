/**
 * Authentication Module
 * Handles user authentication (login, register, logout)
 */

import { config } from "../config.js";
import { state } from "../state.js";
import * as ui from "./ui.js";
import { connectSocket, disconnectSocket } from "./socket.js";

/**
 * Initialize auth event listeners
 */
export function initAuthListeners() {
  const elements = {
    loginForm: ui.getElement("loginForm"),
    registerForm: ui.getElement("registerForm"),
    loginBtn: ui.getElement("loginBtn"),
    registerBtn: ui.getElement("registerBtn"),
    logoutBtn: ui.getElement("logoutBtn"),
  };

  // Tab switching
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      ui.switchAuthTab(tab.dataset.tab);
    });
  });

  // Forms
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.logoutBtn.addEventListener("click", logout);
}

/**
 * Handle login
 */
async function handleLogin(e) {
  e.preventDefault();

  const usernameOrEmail = ui.getElement("loginUsername").value.trim();
  const password = ui.getElement("loginPassword").value;

  if (!usernameOrEmail || !password) {
    ui.showError("Please enter username and password");
    return;
  }

  const loginBtn = ui.getElement("loginBtn");
  ui.setButtonLoading(loginBtn, true, "Logging in...");

  try {
    const response = await fetch(`${config.apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    console.log("✅ Login successful");

    // Update state
    state.token = data.data.token;
    state.currentUser = data.data.user;

    // Switch to chat screen
    ui.showChatScreen();

    // Connect to socket
    connectSocket();
  } catch (error) {
    console.error("Login error:", error);
    ui.showError(error.message);
  } finally {
    ui.setButtonLoading(loginBtn, false);
  }
}

/**
 * Handle register
 */
async function handleRegister(e) {
  e.preventDefault();

  const username = ui.getElement("registerUsername").value.trim();
  const email = ui.getElement("registerEmail").value.trim();
  const password = ui.getElement("registerPassword").value;
  const displayName = ui.getElement("registerDisplayName").value.trim();

  if (!username || !email || !password) {
    ui.showError("Please fill in all required fields");
    return;
  }

  const registerBtn = ui.getElement("registerBtn");
  ui.setButtonLoading(registerBtn, true, "Registering...");

  try {
    const response = await fetch(`${config.apiUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        displayName: displayName || username,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    console.log("✅ Registration successful");

    // Update state
    state.token = data.data.token;
    state.currentUser = data.data.user;

    // Switch to chat screen
    ui.showChatScreen();

    // Connect to socket
    connectSocket();
  } catch (error) {
    console.error("Registration error:", error);
    ui.showError(error.message);
  } finally {
    ui.setButtonLoading(registerBtn, false);
  }
}

/**
 * Logout user
 */
export function logout() {
  console.log("👋 Logging out...");

  // Disconnect socket
  disconnectSocket();

  // Reset state
  state.reset();

  // Reset UI
  ui.showAuthScreen();
  ui.clearMessages();
  ui.renderEmptyState(ui.getElement("myRoomsList"), "No rooms yet");
  ui.renderEmptyState(ui.getElement("publicRoomsList"), "No public rooms");

  console.log("✅ Logged out");
}
