import dotenv from "dotenv";
dotenv.config();
import { Server } from "socket.io";
import { socketAuthMiddleware } from "../middleware/socketAuth.js";
import * as userTracking from "../services/userTrackingService.js";
import * as roomService from "../services/roomService.js";

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
        if (process.env.NODE_ENV !== "production") {
          if (
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")
          ) {
            return callback(null, true);
          }
        }

        // Allow configured CLIENT_URL from environment variables
        const allowedOrigins = [
          process.env.CLIENT_URL || "http://localhost:5173",
        ];
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Reject all other origins
        callback(new Error("Not allowed by CORS"));
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
  io.on("connection", async (socket) => {
    const { userId, username } = socket.user;
    console.log(
      `🔌 User connected: ${username} (ID: ${userId}, Socket: ${socket.id})`
    );

    // Register user in tracking service
    userTracking.addUser(userId, socket.id);

    /**
     * Auto-join user's rooms
     *
     * When user connects, they should automatically join
     * all rooms they're a member of in the database
     *
     * This ensures they receive messages from their rooms
     */
    try {
      const userRooms = await roomService.getUserRooms(userId);
      for (const room of userRooms) {
        const roomName = `room:${room.id}`;
        socket.join(roomName);
        console.log(`  📂 ${username} auto-joined room: ${roomName}`);
      }
      socket.emit("user-rooms", userRooms);
    } catch (error) {
      console.error("Error auto-joining rooms:", error);
    }

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
     * =====================
     * ROOM OPERATIONS
     * =====================
     */

    /**
     * Handle room creation request
     * Creates a new room and automatically joins the creator
     *
     * @event create-room
     * @param {Object} data - Room creation data
     * @param {string} data.name - Unique room identifier
     * @param {string} [data.displayName] - Display name for the room
     * @param {string} [data.description] - Room description
     * @param {boolean} [data.isPublic=true] - Whether room is public
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {string} [callback.message] - Success message
     * @param {Object} [callback.data] - Created room data
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("create-room", async (data, callback) => {
      try {
        console.log(`📁 ${username} creating room: ${data.name}`);

        const room = await roomService.createRoom(data, userId);
        const roomName = `room:${room.id}`;
        socket.join(roomName);

        console.log(`✅ Room created: ${room.name} (ID: ${room.id})`);

        if (callback) {
          callback({
            success: true,
            message: "Room created successfully",
            data: room,
          });
        }

        if (room.is_public) {
          io.emit("room-created", {
            room,
            creator: username,
          });
        }
      } catch (error) {
        console.error("Create room error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle user joining a room
     * Adds user to room membership and sends room data
     *
     * @event join-room
     * @param {Object} data - Join room data
     * @param {number} data.roomId - ID of the room to join
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {string} [callback.message] - Success message
     * @param {Object} [callback.data] - Room and message data
     * @param {Object} [callback.data.room] - Room information
     * @param {Array} [callback.data.messages] - Recent room messages
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("join-room", async (data, callback) => {
      try {
        const { roomId } = data;

        console.log(`📁 ${username} joining room ID: ${roomId}`);

        await roomService.joinRoom(roomId, userId);

        const roomName = `room:${roomId}`;
        socket.join(roomName);

        const room = await roomService.getRoomById(roomId);

        const messages = await roomService.getRoomMessages(roomId, 50);

        console.log(`✅ ${username} joined room: ${room.name}`);

        if (callback) {
          callback({
            success: true,
            message: "Joined room successfully",
            data: {
              room,
              messages,
            },
          });
        }

        socket.to(roomName).emit("user-joined-room", {
          roomId,
          roomName: room.name,
          userId,
          username,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Join room error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle user leaving a room
     * Removes user from room membership
     *
     * @event leave-room
     * @param {Object} data - Leave room data
     * @param {number} data.roomId - ID of the room to leave
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {string} [callback.message] - Success message
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("leave-room", async (data, callback) => {
      try {
        const { roomId } = data;

        console.log(`📁 ${username} leaving room ID: ${roomId}`);

        const room = await roomService.getRoomById(roomId);

        await roomService.leaveRoom(roomId, userId);

        const roomName = `room:${roomId}`;
        socket.leave(roomName);

        console.log(`✅ ${username} left room: ${room.name}`);

        if (callback) {
          callback({
            success: true,
            message: "Left room successfully",
          });
        }

        socket.to(roomName).emit("user-left-room", {
          roomId,
          roomName: room.name,
          userId,
          username,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Leave room error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle request to get room members
     * Returns list of all members in a room
     *
     * @event get-room-members
     * @param {Object} data - Request data
     * @param {number} data.roomId - ID of the room
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {Array} [callback.data] - Array of room members
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("get-room-members", async (data, callback) => {
      try {
        const { roomId } = data;

        const isMember = roomService.isRoomMember(roomId, userId);

        if (!isMember) {
          throw new Error("Not authorized to view room members");
        }

        const members = await roomService.getRoomMembers(roomId);

        if (callback) {
          callback({ success: true, data: members });
        }
      } catch (error) {
        console.error("Get room members error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle request to get all public rooms
     * Returns list of publicly accessible rooms
     *
     * @event get-public-rooms
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {Array} [callback.data] - Array of public rooms
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("get-public-rooms", async (callback) => {
      try {
        const rooms = await roomService.getPublicRooms();

        if (callback) {
          callback({
            success: true,
            data: rooms,
          });
        }
      } catch (error) {
        console.error("Get public rooms error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * ================
     * MESSAGING
     * ================
     */

    /**
     * Handle room message
     * Saves and broadcasts message to all room members
     *
     * @event room-message
     * @param {Object} data - Message data
     * @param {number} data.roomId - ID of the room
     * @param {string} data.text - Message content
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {Object} [callback.data] - Saved message data
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("room-message", async (data, callback) => {
      try {
        const { roomId, text } = data;

        if (!text || !text.trim()) {
          throw new Error("Message cannot be empty");
        }

        if (text.length > 5000) {
          throw new Error("Message too long (max 5000 characters)");
        }

        console.log(
          `💬 Room message from ${username} in room ${roomId}: ${text.substring(
            0,
            50
          )}...`
        );

        const savedMessage = await roomService.saveMessage({
          roomId,
          senderId: userId,
          content: text,
          messageType: "text",
        });

        const message = {
          id: savedMessage.id,
          roomId,
          userId,
          username,
          text,
          timestamp: savedMessage.created_at,
        };

        const roomName = `room:${roomId}`;
        io.to(roomName).emit("room-message", message);

        if (callback) {
          callback({
            success: true,
            data: message,
          });
        }
      } catch (error) {
        console.error("Room message error:", error);
        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle direct message between users
     * Saves and sends message to specific recipient
     *
     * @event direct-message
     * @param {Object} data - Message data
     * @param {number} data.recipientId - ID of the recipient user
     * @param {string} data.text - Message content
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {Object} [callback.data] - Saved message data
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("direct-message", async (data, callback) => {
      try {
        const { recipientId, text } = data;

        if (!recipientId) {
          throw new Error("Recipient ID is required");
        }

        if (!text || !text.trim()) {
          throw new Error("Message cannot be empty");
        }

        if (text.length > 5000) {
          throw new Error("Message too long (max 5000 characters)");
        }

        console.log(
          `💬 DM from ${username} to user ${recipientId}: ${text.substring(
            0,
            50
          )}...`
        );

        const savedMessage = await roomService.saveMessage({
          senderId: userId,
          recipientId,
          content: text,
          messageType: "text",
        });

        const message = {
          id: savedMessage.id,
          senderId: userId,
          senderUsername: username,
          recipientId,
          text,
          timestamp: savedMessage.created_at,
        };

        const recipientSockets = userTracking.getUserSockets(recipientId);

        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("direct-message", message);
        });

        socket.emit("direct-message", message);

        if (callback) {
          callback({
            success: true,
            data: message,
          });
        }
      } catch (error) {
        console.error("Direct message error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle request to retrieve direct message history
     * Returns recent messages between current user and another user
     *
     * @event get-direct-messages
     * @param {Object} data - Request data
     * @param {number} data.otherUserId - ID of the other user in the conversation
     * @param {Function} callback - Response callback
     * @param {boolean} callback.success - Whether operation succeeded
     * @param {Array} [callback.data] - Array of direct messages
     * @param {string} [callback.error] - Error message if failed
     */
    socket.on("get-direct-messages", async (data, callback) => {
      try {
        const { otherUserId } = data;

        if (!otherUserId) {
          throw new Error("Other user ID is required");
        }

        const messages = await roomService.getDirectMessages(
          userId,
          otherUserId,
          50
        );

        if (callback) {
          callback({
            success: true,
            data: messages,
          });
        }
      } catch (error) {
        console.error("Get direct messages error:", error);

        if (callback) {
          callback({
            success: false,
            error: error.message,
          });
        }
      }
    });

    /**
     * Handle typing indicator for room
     * Notifies other room members that user is typing
     *
     * @event typing-room
     * @param {Object} data - Typing data
     * @param {number} data.roomId - ID of the room
     */
    socket.on("typing-room", async (data) => {
      const { roomId } = data;

      const roomName = `room:${roomId}`;
      socket.to(roomName).emit("user-typing-room", {
        roomId,
        userId,
        username,
      });
    });

    /**
     * Handle stop typing indicator for room
     * Notifies other room members that user stopped typing
     *
     * @event stop-typing-room
     * @param {Object} data - Typing data
     * @param {number} data.roomId - ID of the room
     */
    socket.on("stop-typing-room", async (data) => {
      const { roomId } = data;

      const roomName = `room:${roomId}`;
      socket.to(roomName).emit("user-stop-typing-room", {
        roomId,
        userId,
        username,
      });
    });

    /**
     * =============================
     * GLOBAL MESSAGING (backward compatibility)
     * =============================
     */

    /**
     * Handle global broadcast message
     * Legacy event for backward compatibility - broadcasts to all connected users
     *
     * @event message
     * @param {Object} data - Message data
     * @param {string} data.text - Message content
     * @deprecated Use room-message or direct-message instead
     */
    socket.on("message", (data) => {
      console.log(`💬 Global message from ${username}: ${data.text}`);
      const message = {
        id: generateMessageId(),
        userId,
        username,
        text: data.text,
        timestamp: new Date(),
      };

      io.emit("message", message);
    });

    /**
     * Handle global typing indicator
     * Legacy event for backward compatibility
     *
     * @event typing
     * @deprecated Use typing-room instead
     */
    socket.on("typing", () => {
      socket.broadcast.emit("user-typing", {
        userId,
        username,
      });
    });

    /**
     * Handle global stop typing indicator
     * Legacy event for backward compatibility
     *
     * @event stop-typing
     * @deprecated Use stop-typing-room instead
     */
    socket.on("stop-typing", () => {
      socket.broadcast.emit("user-stop-typing", {
        userId,
        username,
      });
    });

    /**
     * =====================
     * DISCONNECTION
     * =====================
     */

    /**
     * Handle socket disconnection
     * Removes user from tracking and notifies other clients if user is fully disconnected
     *
     * @event disconnect
     * @param {string} reason - Disconnection reason
     */
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${username} (Reason: ${reason})`);

      const disconnectedUserId = userTracking.removeUser(socket.id);

      if (
        disconnectedUserId &&
        !userTracking.isUserOnline(disconnectedUserId)
      ) {
        socket.broadcast.emit("user-left", {
          userId: disconnectedUserId,
          username,
          timestamp: new Date(),
        });

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
     */
    socket.on("error", (error) => {
      console.error(`Socket error for ${username}:`, error);
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

  console.log("✅ Socket.io server initialized with authentication and rooms");

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
