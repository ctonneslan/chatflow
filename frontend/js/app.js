/**
 * ChatFlow Application
 * Main entry point for the client application
 */

import { config } from "./config.js";
import { state } from "./state.js";
import * as ui from "./modules/ui.js";
import * as auth from "./modules/auth.js";
import * as rooms from "./modules/rooms.js";
import * as messaging from "./modules/messaging.js";

/**
 * Initialize application
 */
function init() {
  console.log("🚀 ChatFlow client initializing...");
  console.log("📡 API URL:", config.apiUrl);
  console.log("🔌 Socket URL:", config.socketUrl);
  console.log("⚙️  Environment:", config.features);

  try {
    // Initialize UI elements cache
    console.log("📋 Initializing UI elements...");
    ui.initElements();

    // Initialize event listeners for each module
    console.log("🎧 Setting up event listeners...");
    auth.initAuthListeners();
    rooms.initRoomListeners();
    messaging.initMessagingListeners();

    console.log("✅ ChatFlow client ready");
    console.log('💡 Type "ChatFlow" in console to inspect application state');
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    alert(
      "Failed to initialize ChatFlow. Please check the console for details."
    );
  }
}

/**
 * Start application when DOM is ready
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/**
 * Export for debugging (development only)
 * Access via window.ChatFlow in browser console
 */
if (typeof window !== "undefined") {
  window.ChatFlow = {
    // Application state
    state,

    // Configuration
    config,

    // Modules
    modules: {
      auth,
      rooms,
      messaging,
      ui,
    },

    // Debug helpers
    debug: {
      // State inspection
      getState: () => {
        console.log("Current State:", {
          isAuthenticated: state.isAuthenticated(),
          currentUser: state.currentUser,
          currentRoom: state.currentRoom,
          currentDMUser: state.currentDMUser,
          myRooms: state.myRooms,
          publicRooms: state.publicRooms,
          socketConnected: state.socket ? state.socket.connected : false,
        });
        return state;
      },

      // User info
      getCurrentUser: () => {
        console.log("Current User:", state.currentUser);
        return state.currentUser;
      },

      // Room info
      getCurrentRoom: () => {
        console.log("Current Room:", state.currentRoom);
        return state.currentRoom;
      },

      getMyRooms: () => {
        console.log("My Rooms:", state.myRooms);
        return state.myRooms;
      },

      getPublicRooms: () => {
        console.log("Public Rooms:", state.publicRooms);
        return state.publicRooms;
      },

      // Connection info
      isConnected: () => {
        const connected = state.socket && state.socket.connected;
        console.log("Socket Connected:", connected);
        if (state.socket) {
          console.log("Socket ID:", state.socket.id);
        }
        return connected;
      },

      // Socket info
      getSocket: () => {
        if (state.socket) {
          console.log("Socket Info:", {
            id: state.socket.id,
            connected: state.socket.connected,
            disconnected: state.socket.disconnected,
          });
        } else {
          console.log("No socket connection");
        }
        return state.socket;
      },

      // Current context
      getContext: () => {
        const context = state.getCurrentContext();
        console.log("Current Context:", context);
        return context;
      },

      // Force actions (for testing)
      forceLogout: () => {
        console.log("🔧 Force logout...");
        auth.logout();
      },

      forceReconnect: () => {
        console.log("🔧 Force reconnect...");
        if (state.socket) {
          state.socket.disconnect();
          state.socket.connect();
        } else {
          console.error("No socket to reconnect");
        }
      },

      // Test message
      sendTestMessage: (text = "Test message") => {
        if (!state.currentRoom) {
          console.error("No active room. Join a room first.");
          return;
        }
        console.log("🔧 Sending test message:", text);
        messaging.sendMessage();
      },

      // List all available commands
      help: () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║                  ChatFlow Debug Commands                   ║
╠════════════════════════════════════════════════════════════╣
║ ChatFlow.debug.getState()       - Show entire state       ║
║ ChatFlow.debug.getCurrentUser()  - Show current user      ║
║ ChatFlow.debug.getCurrentRoom()  - Show current room      ║
║ ChatFlow.debug.getMyRooms()      - Show user's rooms      ║
║ ChatFlow.debug.getPublicRooms()  - Show public rooms      ║
║ ChatFlow.debug.isConnected()     - Check connection       ║
║ ChatFlow.debug.getSocket()       - Show socket info       ║
║ ChatFlow.debug.getContext()      - Show current context   ║
║ ChatFlow.debug.forceLogout()     - Force logout           ║
║ ChatFlow.debug.forceReconnect()  - Force reconnect        ║
║ ChatFlow.debug.sendTestMessage() - Send test message      ║
║ ChatFlow.debug.help()            - Show this help         ║
╠════════════════════════════════════════════════════════════╣
║ Access modules directly:                                  ║
║ ChatFlow.modules.auth           - Auth module             ║
║ ChatFlow.modules.rooms          - Rooms module            ║
║ ChatFlow.modules.messaging      - Messaging module        ║
║ ChatFlow.modules.ui             - UI module               ║
╠════════════════════════════════════════════════════════════╣
║ Access state directly:                                    ║
║ ChatFlow.state                  - Application state       ║
║ ChatFlow.config                 - Configuration           ║
╚════════════════════════════════════════════════════════════╝
        `);
      },
    },

    // Version info
    version: "1.0.0",

    // Quick status check
    status: () => {
      const isAuth = state.isAuthenticated();
      const isConn = state.socket && state.socket.connected;
      const inRoom = state.currentRoom !== null;

      console.log(`
╔════════════════════════════════════════════╗
║         ChatFlow Status                    ║
╠════════════════════════════════════════════╣
║ Authenticated:  ${isAuth ? "✅ Yes" : "❌ No"}                   ║
║ Connected:      ${isConn ? "✅ Yes" : "❌ No"}                   ║
║ In Room:        ${inRoom ? "✅ Yes" : "❌ No"}                   ║
║ User:           ${
        state.currentUser ? state.currentUser.username : "None"
      }                    ║
║ Room:           ${
        state.currentRoom ? state.currentRoom.display_name : "None"
      }                    ║
║ My Rooms:       ${state.myRooms.length}                        ║
║ Public Rooms:   ${state.publicRooms.length}                        ║
╚════════════════════════════════════════════╝
      `);

      return {
        authenticated: isAuth,
        connected: isConn,
        inRoom: inRoom,
        user: state.currentUser,
        room: state.currentRoom,
        myRoomsCount: state.myRooms.length,
        publicRoomsCount: state.publicRooms.length,
      };
    },
  };

  // Show welcome message in console
  console.log(
    "%c🐛 Debug Mode Enabled",
    "color: #667eea; font-size: 16px; font-weight: bold;"
  );
  console.log(
    "%cAccess debug tools via: window.ChatFlow",
    "color: #666; font-size: 12px;"
  );
  console.log(
    "%cType: ChatFlow.debug.help() for available commands",
    "color: #666; font-size: 12px;"
  );
  console.log(
    "%cType: ChatFlow.status() for quick status check",
    "color: #666; font-size: 12px;"
  );
}

/**
 * Handle application errors
 */
window.addEventListener("error", (event) => {
  console.error("💥 Global Error:", event.error);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener("unhandledrejection", (event) => {
  console.error("💥 Unhandled Promise Rejection:", event.reason);
});

/**
 * Log when page is about to unload (user closing tab)
 */
window.addEventListener("beforeunload", () => {
  console.log("👋 ChatFlow shutting down...");
});
