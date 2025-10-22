import { verifyToken } from "../services/authService.js";

/**
 * Socket.io authentication middleware.
 * Validates JWT tokens provided during socket handshake and attaches user data to the socket.
 * This middleware runs before the socket connection is established.
 *
 * @async
 * @function socketAuthMiddleware
 * @param {import('socket.io').Socket} socket - The Socket.io socket instance attempting to connect
 * @param {Function} next - Callback function to continue or reject the connection
 * @param {Error} [next.error] - Optional error to reject the connection with
 *
 * @throws {Error} "Authentication required" - If no token is provided in socket.handshake.auth.token
 * @throws {Error} "Authentication failed: {reason}" - If token verification fails
 *
 * @description
 * The middleware performs the following steps:
 * 1. Extracts the JWT token from socket.handshake.auth.token
 * 2. Verifies the token using the authService.verifyToken() function
 * 3. Attaches decoded user data (userId, username) to socket.user
 * 4. Calls next() to allow the connection or next(error) to reject it
 *
 * @example
 * // Used in Socket.io server initialization
 * io.use(socketAuthMiddleware);
 *
 * @example
 * // Client-side usage (how clients should provide the token)
 * const socket = io('http://localhost:3000', {
 *   auth: {
 *     token: 'your-jwt-token-here'
 *   }
 * });
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    // Extract JWT token from socket handshake authentication data
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log("❌ Connection rejected: No token provided");
      return next(new Error("Authentication required"));
    }

    console.log("🔐 Verifying token for socket connection...");
    // Verify the JWT token and decode user information
    const decoded = await verifyToken(token);

    // Attach authenticated user data to the socket for use in event handlers
    socket.user = {
      userId: decoded.userId,
      username: decoded.username,
    };

    console.log(
      `✅ Socket authenticated: ${socket.user.username} (${socket.id})`
    );

    // Allow the connection to proceed
    next();
  } catch (error) {
    // Reject the connection if authentication fails
    console.log(`❌ Socket authentication failed: ${error.message}`);
    next(new Error(`Authentication failed: ${error.message}`));
  }
}
