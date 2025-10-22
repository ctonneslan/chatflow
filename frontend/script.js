/**
 * @fileoverview ChatFlow Frontend Client Application
 * Handles user authentication, WebSocket connections, and real-time messaging.
 * Uses Socket.io for WebSocket communication with JWT authentication.
 *
 * @author ChatFlow Team
 * @version 1.0.0
 */

/**
 * Global state variables
 */

/**
 * Socket.io client instance for WebSocket communication
 * @type {Socket|null}
 */
let socket = null;

/**
 * JWT authentication token received from login/register
 * @type {string|null}
 */
let token = null;

/**
 * Current authenticated user object
 * @type {Object|null}
 * @property {string} id - User's unique identifier
 * @property {string} username - User's username
 * @property {string} email - User's email address
 * @property {string} displayName - User's display name
 */
let currentUser = null;

/**
 * DOM Element References
 * Cached references to frequently accessed DOM elements
 */
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const authError = document.getElementById("auth-error");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");

const registerUsername = document.getElementById("register-username");
const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerDisplayName = document.getElementById("register-display-name");
const registerBtn = document.getElementById("register-btn");

const userInfo = document.getElementById("user-info");
const statusDiv = document.getElementById("status");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");
const onlineCount = document.getElementById("online-count");
const onlineList = document.getElementById("online-list");

/**
 * Authenticates a user via HTTP login endpoint.
 * On success, stores the JWT token and connects to the WebSocket server.
 *
 * @async
 * @function login
 * @returns {Promise<void>}
 *
 * @description
 * 1. Validates input fields are not empty
 * 2. Sends POST request to /api/auth/login endpoint
 * 3. Stores JWT token and user data on successful authentication
 * 4. Transitions UI to chat section
 * 5. Establishes WebSocket connection with the token
 *
 * @throws {Error} If login credentials are invalid or server is unavailable
 *
 * @example
 * // Called when user clicks login button
 * await login();
 */
async function login() {
  const usernameOrEmail = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!usernameOrEmail || !password) {
    showError("Please enter username and password");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    /**
     * Call login endpoint
     *
     * This is HTTP request (not WebSocket)
     * Gets JWT token from server
     */
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    console.log("✅ Login successful");

    /**
     * Store token and user data
     * Now we can connect to WebSocket with this token
     */
    token = data.data.token;
    currentUser = data.data.user;

    // Show chat UI
    showChatSection();

    // Connect to WebSocket with token
    connectSocket();
  } catch (error) {
    console.error("Login error:", error);
    showError(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
}

/**
 * Registers a new user account via HTTP register endpoint.
 * On success, stores the JWT token and connects to the WebSocket server.
 *
 * @async
 * @function register
 * @returns {Promise<void>}
 *
 * @description
 * 1. Validates all required fields are filled
 * 2. Sends POST request to /api/auth/register endpoint with user data
 * 3. Stores JWT token and user data on successful registration
 * 4. Transitions UI to chat section
 * 5. Establishes WebSocket connection with the token
 *
 * @throws {Error} If registration fails (e.g., username taken, invalid email)
 *
 * @example
 * // Called when user clicks register button
 * await register();
 */
async function register() {
  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const displayName = registerDisplayName.value.trim();

  if (!username || !email || !password) {
    showError("Please fill in all required fields");
    return;
  }

  try {
    registerBtn.disabled = true;
    registerBtn.textContent = "Registering...";

    const response = await fetch("http://localhost:3000/api/auth/register", {
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

    // Store token and user data
    token = data.data.token;
    currentUser = data.data.user;

    // Show chat UI
    showChatSection();

    // Connect to WebSocket
    connectSocket();
  } catch (error) {
    console.error("Registration error:", error);
    showError(error.message);
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = "Register";
  }
}

/**
 * Establishes WebSocket connection to the server using Socket.io with JWT authentication.
 * Sets up all socket event listeners for connection lifecycle and chat events.
 *
 * @function connectSocket
 * @returns {void}
 *
 * @description
 * Creates a Socket.io connection with the following configuration:
 * - Passes JWT token in auth object for server-side authentication
 * - Enables automatic reconnection with exponential backoff
 * - Registers event handlers for:
 *   - Connection lifecycle (connect, disconnect, reconnect)
 *   - Chat events (message, welcome, user-joined, user-left)
 *   - Online user updates
 *   - Typing indicators
 *
 * The server's socketAuthMiddleware validates the token before allowing connection.
 *
 * @requires token - Must be set before calling this function
 *
 * @example
 * // After successful login/register
 * token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * connectSocket();
 */
function connectSocket() {
  console.log("🔌 Connecting to Socket.io with token...");

  /**
   * Creating socket connection
   *
   * Pass token in auth object
   * Server's socketAuthMiddleware will verify this
   */
  socket = io("http://localhost:3000", {
    auth: { token: token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  /**
   * Connection successful
   * Only fires if authentication succeeded
   */
  socket.on("connect", () => {
    console.log("✅ Connected to server");
    console.log("Socket ID:", socket.id);

    statusDiv.textContent = "Connected";
    statusDiv.className = "status connected";

    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
  });

  /**
   * Connection failed
   *
   * This fires if authentication fails
   * error.message contains rejection reason from server
   */
  socket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error.message);

    statusDiv.textContent = `Connection failed: ${error.message}`;
    statusDiv.className = "status disconnected";

    /**
     * If authentication failed, show auth section again
     * User needs to login again (token might be expired)
     */
    if (error.message.includes("Authentication")) {
      addSystemMessage("Authentication failed. Please login again.");
      showAuthSection();
    }
  });

  /**
   * Disconnected from server
   */
  socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);

    statusDiv.textContent = `Disconnected (${reason})`;
    statusDiv.className = "status disconnected";

    messageInput.disabled = true;
    sendBtn.disabled = true;

    addSystemMessage("Disconnected. Attempting to reconnect...");
  });

  /**
   * Reconnecting
   */
  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`Reconnecting...Attempt ${attemptNumber}`);
    statusDiv.textContent = `Reconnecting... (${attemptNumber})`;
    statusDiv.className = "status connecting";
  });

  /**
   * Reconnected successfully
   */
  socket.on("reconnect", (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    addSystemMessage("Reconnected successfully");
  });

  /**
   * Welcome message from server
   * Sent only to this user when they connect
   */
  socket.on("welcome", (data) => {
    console.log("👋 Welcome:", data);
    addSystemMessage(data.message);
    onlineCount.textContent = data.onlineUsers;
  });

  /**
   * Online users list
   */
  socket.on("online-users", (data) => {
    console.log(`👥 Online users:`, data);
    updateOnlineUsers(data.users, data.count);
  });

  /**
   * User joined notification
   * Someone else connected
   */
  socket.on("user-joined", (data) => {
    console.log(`👤 User joined:`, data.username);
    addSystemMessage(`${data.username} joined the chat`);
  });

  /**
   * User left noticiation
   * Someone else disconnected
   */
  socket.on("user-left", (data) => {
    console.log(`👤 User left:`, data.username);
    addSystemMessage(`${data.username} left the chat`);
  });

  /**
   * Chat message received
   *
   * Message includes:
   *  - userId, username (set by server, can't be spoofed)
   *  - text (from sender)
   *  - timestamp, id (set by server)
   */
  socket.on("message", (data) => {
    console.log(`💬 Message received:`, data);

    /**
     * Check if message is from current user
     * Display differently (own vs other)
     */
    const isOwnMessage = data.userId === currentUser.id;
    addMessage(data.username, data.text, isOwnMessage);
  });

  /**
   * User typing indicator
   */
  socket.on("user-typing", (data) => {
    console.log("⌨️ User typing:", data.username);
    // Could show "Alice is typing..." indicator
  });

  /**
   * User stopped typing
   */
  socket.on("user-stop-typing", (data) => {
    console.log("User stopped typing:", data.username);
    // Hide typing indicator
  });
}

/**
 * Sends a chat message to the server via WebSocket.
 * The server will broadcast the message to all connected clients.
 *
 * @function sendMessage
 * @returns {void}
 *
 * @description
 * 1. Validates message input is not empty
 * 2. Emits 'message' event to server with message text
 * 3. Server adds userId, username, timestamp, and id
 * 4. Server broadcasts enriched message to all clients
 * 5. Clears input field and refocuses for next message
 *
 * @requires socket - Must be connected before calling
 *
 * @example
 * // User types message and clicks send
 * messageInput.value = 'Hello everyone!';
 * sendMessage(); // Emits to server
 */
function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  /**
   * Emit message event to server
   *
   * Server will:
   *    1. Add userId, username (from socket.user)
   *    2. Add timestamp, id
   *    3. Broadcast to all clients
   */
  socket.emit("message", { text });

  // Clear input
  messageInput.value = "";
  messageInput.focus();
}

/**
 * Logs out the current user and cleans up the application state.
 *
 * @function logout
 * @returns {void}
 *
 * @description
 * 1. Disconnects the WebSocket connection
 * 2. Clears all stored authentication data (token, user)
 * 3. Transitions UI back to authentication section
 * 4. Clears all chat messages from the display
 *
 * @example
 * // User clicks logout button
 * logout();
 */
function logout() {
  // Disconnect socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Clear stored data
  token = null;
  currentUser = null;

  showAuthSection();

  // Clear messages
  messagesDiv.innerHTML = "";

  console.log("👋 Logged out");
}

/**
 * UI Helper Functions
 * Functions for managing the user interface and DOM manipulation
 */

/**
 * Displays the authentication section and hides the chat section.
 *
 * @function showAuthSection
 * @returns {void}
 */
function showAuthSection() {
  authSection.classList.remove("hidden");
  chatSection.classList.add("hidden");
  authError.classList.add("hidden");
}

/**
 * Displays the chat section and hides the authentication section.
 * Shows the current user's information in the UI.
 *
 * @function showChatSection
 * @returns {void}
 */
function showChatSection() {
  authSection.classList.add("hidden");
  chatSection.classList.remove("hidden");
  // Show user info
  userInfo.innerHTML = `
        <strong>Logged in as:</strong> ${
          currentUser.displayName || currentUser.username
        }
        <br>
        <strong>Email:</strong> ${currentUser.email}
      `;
}

/**
 * Displays an error message to the user in the auth section.
 * Error automatically hides after 5 seconds.
 *
 * @function showError
 * @param {string} message - The error message to display
 * @returns {void}
 *
 * @example
 * showError('Invalid username or password');
 */
function showError(message) {
  authError.textContent = message;
  authError.classList.remove("hidden");

  setTimeout(() => {
    authError.classList.add("hidden");
  }, 5000);
}

/**
 * Adds a chat message to the message display area.
 * Applies different styling for own messages vs. other users' messages.
 *
 * @function addMessage
 * @param {string} sender - Username of the message sender
 * @param {string} text - The message text content
 * @param {boolean} [isOwn=false] - Whether this message is from the current user
 * @returns {void}
 *
 * @description
 * - Sanitizes message text to prevent XSS attacks
 * - Displays sender as "You" for own messages
 * - Adds timestamp
 * - Auto-scrolls to show the latest message
 *
 * @example
 * addMessage('Alice', 'Hello everyone!', false);
 * addMessage('Bob', 'Hi Alice!', true);
 */
function addMessage(sender, text, isOwn = false) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${isOwn ? "own" : "other"}`;

  const time = new Date().toLocaleTimeString();
  const displayName = isOwn ? "You" : sender;
  messageEl.innerHTML = `
    <div class="message-sender">${displayName}</div>
    <div class="message-text">${escapeHtml(text)}</div>
    <div class="message-time">${time}</div>
  `;

  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Adds a system message to the message display area.
 * Used for notifications like user joined/left, connection status, etc.
 *
 * @function addSystemMessage
 * @param {string} text - The system message text
 * @returns {void}
 *
 * @description
 * - Displays with distinct system message styling
 * - Sanitizes text to prevent XSS
 * - Auto-scrolls to show the latest message
 *
 * @example
 * addSystemMessage('Alice joined the chat');
 * addSystemMessage('Reconnected successfully');
 */
function addSystemMessage(text) {
  const messageEl = document.createElement("div");
  messageEl.className = "message system";

  const time = new Date().toLocaleTimeString();
  messageEl.innerHTML = `
    <div class="message-sender">System</div>
    <div class="message-text">${escapeHtml(text)}</div>
    <div class-"message-time">${time}</div>
    `;

  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Updates the online users count display.
 *
 * @function updateOnlineUsers
 * @param {string[]} userIds - Array of online user IDs
 * @param {number} count - Total count of online users
 * @returns {void}
 *
 * @description
 * Updates the UI to show the current number of online users.
 * Handles singular/plural grammar correctly.
 *
 * @example
 * updateOnlineUsers(['user1', 'user2', 'user3'], 3);
 * // Displays: "3 users online"
 */
function updateOnlineUsers(userIds, count) {
  onlineCount.textContent = count;
  onlineList.innerHTML = `<div class="user-tag">${count} user${
    count !== 1 ? "s" : ""
  } online</div>`;
}

/**
 * Escapes HTML special characters to prevent XSS (Cross-Site Scripting) attacks.
 * Converts potentially dangerous characters into their HTML entity equivalents.
 *
 * @function escapeHtml
 * @param {string} text - The text to escape
 * @returns {string} The escaped HTML-safe text
 *
 * @description
 * Uses the browser's built-in text content sanitization to escape:
 * - < becomes &lt;
 * - > becomes &gt;
 * - & becomes &amp;
 * - " becomes &quot;
 * - ' becomes &#39;
 *
 * This prevents malicious users from injecting scripts or HTML into messages.
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>');
 * // Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Event listeners
 */

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
sendBtn.addEventListener("click", sendMessage);
logoutBtn.addEventListener("click", logout);

// Send on Enter
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Login on Enter
loginPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});

// Register on Enter
registerPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    register();
  }
});

console.log("🚀 ChatFlow client ready");
