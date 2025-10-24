/**
 * Rooms Module
 * Handles room creation, joining, and management
 */

import { state } from "../state.js";
import * as ui from "./ui.js";
import * as dom from "../utils/dom.js";
import { emit } from "./socket.js";

/**
 * Initialize room event listeners
 */
export function initRoomListeners() {
  const createRoomBtn = ui.getElement("createRoomBtn");
  const refreshRoomsBtn = ui.getElement("refreshRoomsBtn");
  const closeCreateRoomBtn = ui.getElement("closeCreateRoomBtn");
  const createRoomForm = ui.getElement("createRoomForm");
  const createRoomModal = ui.getElement("createRoomModal");

  createRoomBtn.addEventListener("click", () => {
    ui.showModal(createRoomModal);
  });

  closeCreateRoomBtn.addEventListener("click", () => {
    ui.hideModal(createRoomModal);
  });

  createRoomModal.addEventListener("click", (e) => {
    if (e.target === createRoomModal) {
      ui.hideModal(createRoomModal);
    }
  });

  refreshRoomsBtn.addEventListener("click", loadPublicRooms);
  createRoomForm.addEventListener("submit", handleCreateRoom);
}

/**
 * Load public rooms from server
 */
export function loadPublicRooms() {
  emit("get-public-rooms", null, (response) => {
    if (response.success) {
      state.publicRooms = response.data;
      renderPublicRooms();
    } else {
      console.error("Failed to load public rooms:", response.error);
    }
  });
}

/**
 * Render user's rooms in sidebar
 */
export function renderMyRooms() {
  const myRoomsList = ui.getElement("myRoomsList");

  if (state.myRooms.length === 0) {
    ui.renderEmptyState(myRoomsList, "No rooms yet");
    return;
  }

  myRoomsList.innerHTML = state.myRooms
    .map(
      (room) => `
    <li class="room-item" data-room-id="${room.id}">
      <div class="room-item-name"># ${dom.escapeHtml(room.display_name)}</div>
      <div class="room-item-members">${room.role}</div>
    </li>
  `
    )
    .join("");

  // Add click handlers
  myRoomsList.querySelectorAll(".room-item").forEach((item) => {
    item.addEventListener("click", () => {
      const roomId = parseInt(item.dataset.roomId);
      const room = state.myRooms.find((r) => r.id === roomId);
      if (room) switchToRoom(room);
    });
  });
}

/**
 * Render public rooms in sidebar
 */
export function renderPublicRooms() {
  const publicRoomsList = ui.getElement("publicRoomsList");

  if (state.publicRooms.length === 0) {
    ui.renderEmptyState(publicRoomsList, "No public rooms");
    return;
  }

  publicRoomsList.innerHTML = state.publicRooms
    .map((room) => {
      const isMember = state.myRooms.some((r) => r.id === room.id);
      return `
      <li class="room-item" data-room-id="${
        room.id
      }" data-is-member="${isMember}">
        <div class="room-item-name"># ${dom.escapeHtml(room.display_name)}</div>
        <div class="room-item-members">${room.member_count} members ${
        isMember ? "✓" : ""
      }</div>
      </li>
    `;
    })
    .join("");

  // Add click handlers
  publicRoomsList.querySelectorAll(".room-item").forEach((item) => {
    item.addEventListener("click", () => {
      const roomId = parseInt(item.dataset.roomId);
      const isMember = item.dataset.isMember === "true";
      const room = state.publicRooms.find((r) => r.id === roomId);

      if (isMember) {
        switchToRoom(room);
      } else {
        joinRoom(roomId);
      }
    });
  });
}

/**
 * Switch to a room
 */
export function switchToRoom(room) {
  state.currentRoom = room;
  state.currentDMUser = null;

  // Update UI
  ui.updateChatHeader(`# ${room.display_name}`, room.description || "");
  ui.clearMessages();
  ui.enableMessageInput(`Message #${room.display_name}`);
  ui.highlightActiveRoom(room.id);

  // Get room messages
  emit("join-room", { roomId: room.id }, (response) => {
    if (response.success) {
      // Add to myRooms if not already there
      if (!state.myRooms.some((r) => r.id === room.id)) {
        state.myRooms.push(room);
        renderMyRooms();
      }

      // Display messages
      if (response.data.messages) {
        response.data.messages.forEach((msg) => {
          ui.addMessage({
            id: msg.id,
            userId: msg.sender_id,
            username: msg.sender_username,
            text: msg.content,
            timestamp: msg.created_at,
          });
        });
      }
    } else {
      ui.showError(response.error);
    }
  });
}

/**
 * Join a room
 */
export function joinRoom(roomId) {
  emit("join-room", { roomId }, (response) => {
    if (response.success) {
      const room = response.data.room;
      state.myRooms.push(room);
      renderMyRooms();
      loadPublicRooms();
      switchToRoom(room);
    } else {
      ui.showError(response.error);
    }
  });
}

/**
 * Leave a room
 */
export function leaveRoom(roomId) {
  emit("leave-room", { roomId }, (response) => {
    if (response.success) {
      // Remove from myRooms
      state.myRooms = state.myRooms.filter((r) => r.id !== roomId);
      renderMyRooms();
      loadPublicRooms();

      // Clear current room if it was active
      if (state.currentRoom && state.currentRoom.id === roomId) {
        state.currentRoom = null;
        ui.updateChatHeader("Select a room or user", "");
        ui.clearMessages();
        ui.disableMessageInput();
      }
    } else {
      ui.showError(response.error);
    }
  });
}

/**
 * Handle create room form submission
 */
function handleCreateRoom(e) {
  e.preventDefault();

  const name = ui.getElement("roomName").value.trim();
  const displayName = ui.getElement("roomDisplayName").value.trim();
  const description = ui.getElement("roomDescription").value.trim();

  if (!name || !displayName) {
    ui.showError("Room name and display name are required");
    return;
  }

  emit(
    "create-room",
    {
      name,
      displayName,
      description,
      isPublic: true,
    },
    (response) => {
      if (response.success) {
        const createRoomModal = ui.getElement("createRoomModal");
        const createRoomForm = ui.getElement("createRoomForm");

        ui.hideModal(createRoomModal);
        createRoomForm.reset();

        // Add to myRooms
        state.myRooms.push(response.data);
        renderMyRooms();
        loadPublicRooms();

        // Switch to new room
        switchToRoom(response.data);
      } else {
        ui.showError(response.error);
      }
    }
  );
}

/**
 * Get room members
 */
export function getRoomMembers(roomId, callback) {
  emit("get-room-members", { roomId }, callback);
}

/**
 * ========================================
 * SOCKET EVENT HANDLERS
 * ========================================
 */

/**
 * Handle user-rooms event (auto-join on connect)
 */
export function handleUserRooms(rooms) {
  console.log("📂 My rooms:", rooms);
  state.myRooms = rooms;
  renderMyRooms();
}

/**
 * Handle room-created event
 */
export function handleRoomCreated(data) {
  console.log("🆕 New room created:", data.room);

  // Add member_count to the room data (as string to match database query format)
  const room = {
    ...data.room,
    member_count: "1" // Creator is the first member
  };

  // Check if room already exists in publicRooms (shouldn't happen, but be safe)
  const existingIndex = state.publicRooms.findIndex(r => r.id === room.id);
  if (existingIndex !== -1) {
    // Update existing room
    state.publicRooms[existingIndex] = room;
  } else {
    // Add new room to the beginning of the list (newest first)
    state.publicRooms.unshift(room);
  }

  // Re-render the public rooms list
  renderPublicRooms();
}

/**
 * Handle user-joined-room event
 */
export function handleUserJoinedRoom(data) {
  if (state.currentRoom && state.currentRoom.id === data.roomId) {
    ui.addSystemMessage(`${data.username} joined the room`);
  }
}

/**
 * Handle user-left-room event
 */
export function handleUserLeftRoom(data) {
  if (state.currentRoom && state.currentRoom.id === data.roomId) {
    ui.addSystemMessage(`${data.username} left the room`);
  }
}
