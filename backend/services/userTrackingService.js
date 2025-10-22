/**
 * @fileoverview User tracking service for managing online users and their socket connections.
 * Handles the mapping between users and their multiple socket connections (multi-tab support).
 *
 * @module userTrackingService
 */

/**
 * Map of userId to Set of socketIds
 * Tracks all socket connections for each user (supports multiple tabs/devices)
 * @type {Map<string, Set<string>>}
 */
const userSockets = new Map();

/**
 * Map of socketId to userId
 * Reverse lookup to find which user owns a socket
 * @type {Map<string, string>}
 */
const socketUsers = new Map();

/**
 * Registers a new socket connection for a user.
 * Supports multiple simultaneous connections per user (e.g., multiple browser tabs).
 *
 * @function addUser
 * @param {string} userId - The unique identifier of the user
 * @param {string} socketId - The unique socket connection identifier
 *
 * @description
 * - Creates a new Set for the user if this is their first connection
 * - Adds the socket ID to the user's connection set
 * - Creates reverse mapping for quick socket-to-user lookup
 * - Logs connection information including total connections for the user
 *
 * @example
 * addUser('user123', 'socket-abc-123');
 * // User user123 connected (socket: socket-abc-123)
 * // Total connections for user: 1
 */
export function addUser(userId, socketId) {
  // Initialize Set for new users
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  // Add socket to user's connection set
  userSockets.get(userId).add(socketId);

  // Create reverse mapping for quick lookup
  socketUsers.set(socketId, userId);

  console.log(`👤 User ${userId} connected (socket : ${socketId})`);
  console.log(`   Total connections for user: ${userSockets.get(userId).size}`);
}

/**
 * Removes a socket connection and cleans up user tracking if it was their last connection.
 *
 * @function removeUser
 * @param {string} socketId - The socket connection identifier to remove
 * @returns {string|null} The userId that was associated with the socket, or null if socket not found
 *
 * @description
 * - Finds the user associated with the socket
 * - Removes the socket from the user's connection set
 * - If this was the user's last connection, removes the user entirely
 * - Cleans up the reverse mapping
 * - Logs appropriate messages based on whether user still has active connections
 *
 * @example
 * const userId = removeUser('socket-abc-123');
 * if (userId) {
 *   console.log(`User ${userId} disconnected`);
 * }
 */
export function removeUser(socketId) {
  // Find the user associated with this socket
  const userId = socketUsers.get(socketId);

  if (!userId) {
    console.log(`⚠️ Socket ${socketId} not found in tracking`);
    return null;
  }

  // Remove socket from user's connection set
  const userSocketSet = userSockets.get(userId);
  if (userSocketSet) {
    userSocketSet.delete(socketId);

    // If no more connections, remove user entirely
    if (userSocketSet.size === 0) {
      userSockets.delete(userId);
      console.log(
        `👤 User ${userId} is now offline (last socket disconnected)`
      );
    } else {
      console.log(
        `👤 User ${userId} still has ${userSocketSet.size} connection(s)`
      );
    }
  }

  // Clean up reverse mapping
  socketUsers.delete(socketId);
  return userId;
}

/**
 * Gets all socket IDs associated with a user.
 * Useful for sending messages to all of a user's open connections.
 *
 * @function getUserSockets
 * @param {string} userId - The unique identifier of the user
 * @returns {string[]} Array of socket IDs for the user, empty array if user not found
 *
 * @example
 * const sockets = getUserSockets('user123');
 * sockets.forEach(socketId => {
 *   io.to(socketId).emit('notification', data);
 * });
 */
export function getUserSockets(userId) {
  const socketSet = userSockets.get(userId);
  return socketSet ? Array.from(socketSet) : [];
}

/**
 * Gets the user ID associated with a socket connection.
 * Reverse lookup to identify which user owns a particular socket.
 *
 * @function getUserBySocket
 * @param {string} socketId - The socket connection identifier
 * @returns {string|null} The userId associated with the socket, or null if not found
 *
 * @example
 * const userId = getUserBySocket('socket-abc-123');
 * if (userId) {
 *   console.log(`Socket belongs to user ${userId}`);
 * }
 */
export function getUserBySocket(socketId) {
  return socketUsers.get(socketId) || null;
}

/**
 * Checks if a user has at least one active socket connection.
 *
 * @function isUserOnline
 * @param {string} userId - The unique identifier of the user
 * @returns {boolean} True if user has one or more active connections, false otherwise
 *
 * @example
 * if (isUserOnline('user123')) {
 *   console.log('User is online');
 * }
 */
export function isUserOnline(userId) {
  const socketSet = userSockets.get(userId);
  return socketSet && socketSet.size > 0;
}

/**
 * Gets an array of all currently online user IDs.
 *
 * @function getOnlineUsers
 * @returns {string[]} Array of user IDs that have at least one active connection
 *
 * @example
 * const onlineUserIds = getOnlineUsers();
 * console.log(`${onlineUserIds.length} users online`);
 */
export function getOnlineUsers() {
  return Array.from(userSockets.keys());
}

/**
 * Gets the count of unique users currently online.
 *
 * @function getOnlineUserCount
 * @returns {number} Number of unique users with active connections
 *
 * @example
 * const count = getOnlineUserCount();
 * io.emit('user-count', { count });
 */
export function getOnlineUserCount() {
  return userSockets.size;
}

/**
 * Calculates comprehensive statistics about online users and connections.
 * Useful for monitoring and analytics.
 *
 * @function getConnectionStats
 * @returns {Object} Statistics object
 * @returns {number} returns.onlineUsers - Number of unique online users
 * @returns {number} returns.totalConnections - Total number of socket connections
 * @returns {string} returns.averageConnectionsPerUser - Average connections per user (formatted to 2 decimals)
 *
 * @example
 * const stats = getConnectionStats();
 * console.log(`${stats.onlineUsers} users with ${stats.totalConnections} total connections`);
 * console.log(`Average: ${stats.averageConnectionsPerUser} connections per user`);
 */
export function getConnectionStats() {
  // Count total socket connections across all users
  let totalConnections = 0;
  for (const socketSet of userSockets.values()) {
    totalConnections += socketSet.size;
  }

  return {
    onlineUsers: userSockets.size,
    totalConnections,
    averageConnectionsPerUser:
      userSockets.size > 0
        ? (totalConnections / userSockets.size).toFixed(2)
        : 0,
  };
}
