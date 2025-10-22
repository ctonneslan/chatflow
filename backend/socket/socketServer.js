import dotenv from "dotenv";
dotenv.config();
import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socketAuth.js";
import * as userTracking from "../services/userTrackingService.js";

/**
 * Initializes and configures the Socket.io server with authentication and event handlers.
 * Sets up CORS policies, authentication middleware, and registers all socket event listeners
 * for connection, messaging, typing indicators, and disconnection events.
 *
 * @param {import('http').Server} httpServer - The HTTP server instance to attach Socket.io to
 * @returns {Server} The configured Socket.io server instance
 *
 * @example
 * const httpServer = createServer(app);
 * const io = initializeSocketServer(httpServer);
 */
export function initializeSocketServer(httpServer) {
  // Initialize Socket.io server with CORS configuration
  const io = new Server(httpServer, {
    cors: {
      /**
       * CORS origin validation function
       * @param {string|undefined} origin - The origin of the incoming request
       * @param {Function} callback - Callback function (error, allow)
       */
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // In development, allow any localhost origin for easier testing
        if (process.env.NODE_ENV !== 'production') {
          if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
          }
        }

        // Allow configured CLIENT_URL from environment variables
        const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Reject all other origins
        callback(new Error('Not allowed by CORS'));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Apply authentication middleware to all incoming socket connections
  io.use(socketAuthMiddleware);

  /**
   * Handle new socket connections
   * Fires when a client successfully connects and passes authentication.
   * Sets up all event listeners for the connected socket.
   *
   * @event connection
   * @param {import('socket.io').Socket} socket - The connected socket instance with authenticated user data
   * @property {Object} socket.user - Authenticated user information (added by socketAuthMiddleware)
   * @property {string} socket.user.userId - The authenticated user's ID
   * @property {string} socket.user.username - The authenticated user's username
   */
  io.on("connection", (socket) => {
    const { userId, username } = socket.user;
    console.log(
      `🔌 User connected: ${username} (ID: ${userId}, Socket: ${socket.id})`
    );

    // Register user in tracking service
    userTracking.addUser(userId, socket.id);

    /**
     * Notify all other connected clients that a new user joined
     * @event user-joined
     * @type {Object}
     * @property {string} userId - ID of the user who joined
     * @property {string} username - Username of the user who joined
     * @property {Date} timestamp - When the user joined
     */
    socket.broadcast.emit("user-joined", {
      userId,
      username,
      timestamp: new Date(),
    });

    /**
     * Send personalized welcome message to the newly connected user
     * @event welcome
     * @type {Object}
     * @property {string} message - Welcome message
     * @property {string} userId - The user's ID
     * @property {string} username - The user's username
     * @property {number} onlineUsers - Current count of online users
     */
    socket.emit("welcome", {
      message: `Welcome to ChatFlow, ${username}!`,
      userId,
      username,
      onlineUsers: userTracking.getOnlineUserCount(),
    });

    /**
     * Broadcast updated online users list to ALL clients (including the new user)
     * @event online-users
     * @type {Object}
     * @property {Array<Object>} users - Array of online user objects
     * @property {number} count - Total count of online users
     */
    io.emit("online-users", {
      users: userTracking.getOnlineUsers(),
      count: userTracking.getOnlineUserCount(),
    });

    /**
     * Handle incoming chat messages from the client
     * Receives message data, enriches it with user info and metadata, then broadcasts to all clients
     *
     * @event message
     * @param {Object} data - Message data from client
     * @param {string} data.text - The message text content
     */
    socket.on("message", (data) => {
      console.log(`💬 Message from ${username}: ${data.text}`);

      // Create enriched message object with full metadata
      const message = {
        id: generateMessageId(),
        userId,
        username,
        text: data.text,
        timestamp: new Date(),
      };

      // Broadcast message to all connected clients
      io.emit("message", message);
    });

    /**
     * Handle typing indicator start event
     * Notifies all other clients that this user is typing
     *
     * @event typing
     * @listens typing
     */
    socket.on("typing", () => {
      /**
       * Broadcast typing indicator to all other clients
       * @event user-typing
       * @type {Object}
       * @property {string} userId - ID of the user who is typing
       * @property {string} username - Username of the user who is typing
       */
      socket.broadcast.emit("user-typing", {
        userId,
        username,
      });
    });

    /**
     * Handle typing indicator stop event
     * Notifies all other clients that this user stopped typing
     *
     * @event stop-typing
     * @listens stop-typing
     */
    socket.on("stop-typing", () => {
      /**
       * Broadcast stop typing indicator to all other clients
       * @event user-stop-typing
       * @type {Object}
       * @property {string} userId - ID of the user who stopped typing
       * @property {string} username - Username of the user who stopped typing
       */
      socket.broadcast.emit("user-stop-typing", {
        userId,
        username,
      });
    });

    /**
     * Handle socket disconnection
     * Removes user from tracking and notifies other clients if user is fully disconnected
     * (not connected from any other socket/tab)
     *
     * @event disconnect
     * @param {string} reason - The reason for disconnection (e.g., 'transport close', 'client namespace disconnect')
     * @listens disconnect
     */
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${username} (Reason: ${reason})`);

      // Remove this socket from user tracking
      const disconnectedUserId = userTracking.removeUser(socket.id);

      // Only notify if user is completely offline (no other active sockets)
      if (
        disconnectedUserId &&
        !userTracking.isUserOnline(disconnectedUserId)
      ) {
        /**
         * Notify other clients that user has left
         * @event user-left
         * @type {Object}
         * @property {string} userId - ID of the user who left
         * @property {string} username - Username of the user who left
         * @property {Date} timestamp - When the user left
         */
        socket.broadcast.emit("user-left", {
          userId: disconnectedUserId,
          username,
          timestamp: new Date(),
        });

        /**
         * Broadcast updated online users list to all remaining clients
         * @event online-users
         * @type {Object}
         * @property {Array<Object>} users - Array of currently online user objects
         * @property {number} count - Updated count of online users
         */
        io.emit("online-users", {
          users: userTracking.getOnlineUsers(),
          count: userTracking.getOnlineUserCount(),
        });
      }
    });

    /**
     * Handle socket errors
     * Logs any errors that occur on the socket connection
     *
     * @event error
     * @param {Error} error - The error object
     * @listens error
     */
    socket.on("error", (error) => {
      console.error(`Socket error for ${username}:`, error);
    });
  });

  /**
   * Handle connection errors that occur before successful connection
   * These are errors that prevent the socket from connecting successfully
   *
   * @event connection_error
   * @param {Error} error - The connection error object
   */
  io.on("connection_error", (error) => {
    console.error("Connection error:", error.message);
  });

  console.log("✅ Socket.io server initialized with authentication");

  return io;
}

/**
 * Generates a unique message ID using timestamp and random string.
 * Combines current timestamp with a random alphanumeric string to ensure uniqueness.
 *
 * @private
 * @returns {string} A unique message identifier in format: msg_timestamp_randomstring
 *
 * @example
 * // Returns something like: "msg_1698765432123_a3f8k2p9q"
 * const messageId = generateMessageId();
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
