/**
 * Application Configuration
 * Centralized configuration for the ChatFlow client
 */
export const config = {
  // API endpoints
  apiUrl: "http://localhost:3000",
  socketUrl: "http://localhost:3000",

  // Socket.io options
  socket: {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  },

  // UI settings
  ui: {
    errorDisplayDuration: 5000,
    messageHistoryLimit: 50,
    typingIndicatorDelay: 1000,
  },

  // Feature flags
  features: {
    directMessages: true,
    typingIndicators: true,
    fileUploads: false,
    voiceMessages: false,
  },
};
