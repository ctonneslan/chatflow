/**
 * Global State Management
 * Centralized state for the application
 */
class AppState {
  constructor() {
    this.socket = null;
    this.token = null;
    this.currentUser = null;
    this.currentRoom = null;
    this.currentDMUser = null;
    this.myRooms = [];
    this.publicRooms = [];
    this.onlineUsers = [];
  }

  // Reset all state (on logout)
  reset() {
    this.socket = null;
    this.token = null;
    this.currentUser = null;
    this.currentRoom = null;
    this.currentDMUser = null;
    this.myRooms = [];
    this.publicRooms = [];
    this.onlineUsers = [];
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.token !== null && this.currentUser !== null;
  }

  // Check if currently in a room
  isInRoom() {
    return this.currentRoom !== null;
  }

  // Check if currently in a DM
  isInDM() {
    return this.currentDMUser !== null;
  }

  getCurrentContext() {
    if (this.currentRoom) {
      return { type: "room", data: this.currentRoom };
    }
    if (this.currentDMUser) {
      return { type: "dm", data: this.currentDMUser };
    }
    return null;
  }
}

// Export singleton instance
export const state = new AppState();
