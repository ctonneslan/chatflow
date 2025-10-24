/**
 * Room Service
 *
 * Handles all room-related operations including creation, membership management,
 * and message persistence for the ChatFlow application.
 *
 * Features:
 * - Room creation with validation
 * - Public/private room management
 * - Member join/leave operations
 * - Message storage and retrieval (room and direct messages)
 * - Room membership verification
 */

import { Pool } from "pg";

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/chatflow",
});

/**
 * Creates a new room and adds the creator as the owner
 *
 * @param {Object} roomData - The room configuration
 * @param {string} roomData.name - Unique room identifier (lowercase, alphanumeric with hyphens)
 * @param {string} roomData.displayName - Human-readable room name
 * @param {string} [roomData.description] - Optional room description
 * @param {boolean} [roomData.isPublic=true] - Whether the room is publicly accessible
 * @param {number} creatorId - User ID of the room creator
 * @returns {Promise<Object>} The created room object
 * @throws {Error} If validation fails or room name already exists
 */
export async function createRoom(roomData, creatorId) {
  const { name, displayName, description, isPublic = true } = roomData;

  // Validate required fields
  if (!name || !displayName) {
    throw new Error("Room name and display name are required");
  }

  // Validate room name format (lowercase alphanumeric with hyphens only)
  const nameRegex = /^[a-z0-9-]+$/;
  if (!nameRegex.test(name)) {
    throw new Error(
      "Room name can only contain lowercase letters, numbers, and hyphens"
    );
  }

  // Validate room name length
  if (name.length < 3 || name.length > 100) {
    throw new Error("Room name must be between 3 and 100 characters");
  }

  try {
    const client = await pool.connect();

    try {
      // Use transaction to ensure room and membership are created atomically
      await client.query("BEGIN");

      // Insert the new room
      const roomResult = await client.query(
        `INSERT INTO rooms (name, display_name, description, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, displayName, description, isPublic, creatorId]
      );

      const room = roomResult.rows[0];

      // Add creator as room owner
      await client.query(
        `INSERT INTO room_members (room_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [room.id, creatorId]
      );

      await client.query("COMMIT");

      console.log(`✅ Room created: ${name} by user ${creatorId}`);

      return room;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create room error:", error);

    // Handle duplicate room name (unique constraint violation)
    if (error.code === "23505") {
      throw new Error("Room name already exists");
    }

    throw error;
  }
}

/**
 * Retrieves all public rooms with their member counts
 *
 * @returns {Promise<Array<Object>>} Array of public rooms with member_count field
 * @throws {Error} If database query fails
 */
export async function getPublicRooms() {
  try {
    const result = await pool.query(
      `SELECT
            r.*,
            COUNT(rm.id) as member_count
        FROM rooms r
        LEFT JOIN room_members rm ON r.id = rm.room_id
        WHERE r.is_public = true
        GROUP BY r.id
        ORDER BY r.created_at DESC`
    );
    return result.rows;
  } catch (error) {
    console.error("Get public rooms error:", error);
    throw error;
  }
}

/**
 * Retrieves a room by its ID
 *
 * @param {number} roomId - The room's database ID
 * @returns {Promise<Object|null>} The room object or null if not found
 * @throws {Error} If database query fails
 */
export async function getRoomById(roomId) {
  try {
    const result = await pool.query(`SELECT * FROM rooms WHERE id = $1`, [
      roomId,
    ]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Get room by ID error:", error);
    throw error;
  }
}

/**
 * Retrieves a room by its unique name
 *
 * @param {string} roomName - The room's unique name identifier
 * @returns {Promise<Object|null>} The room object or null if not found
 * @throws {Error} If database query fails
 */
export async function getRoomByName(roomName) {
  try {
    const result = await pool.query("SELECT * FROM rooms WHERE name = $1", [
      roomName,
    ]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Get room by name error:", error);
    throw error;
  }
}

/**
 * Adds a user to a public room as a member
 *
 * @param {number} roomId - The room's database ID
 * @param {number} userId - The user's database ID
 * @returns {Promise<Object>} The room membership record
 * @throws {Error} If room not found, room is private, or database query fails
 */
export async function joinRoom(roomId, userId) {
  try {
    const room = await getRoomById(roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.is_public) {
      throw new Error("Room is private");
    }

    // Attempt to add user as member (idempotent operation)
    const result = await pool.query(
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (room_id, user_id) DO NOTHING
       RETURNING *`,
      [roomId, userId]
    );

    // If no rows returned, user was already a member
    if (result.rows.length === 0) {
      console.log(`User ${userId} already in room ${roomId}`);
      const existing = await pool.query(
        `SELECT * FROM room_members
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
      return existing.rows[0];
    }

    console.log(`✅ User ${userId} joined room ${roomId}`);
    return result.rows[0];
  } catch (error) {
    console.error("Join room error:", error);
    throw error;
  }
}

/**
 * Removes a user from a room (owners cannot leave)
 *
 * @param {number} roomId - The room's database ID
 * @param {number} userId - The user's database ID
 * @returns {Promise<boolean>} True if successfully removed
 * @throws {Error} If user is not a member, is the owner, or database query fails
 */
export async function leaveRoom(roomId, userId) {
  try {
    // Check membership and role
    const memberCheck = await pool.query(
      `SELECT role FROM room_members
         WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error("Not a member of this room");
    }

    // Prevent room owner from leaving (they must delete the room instead)
    if (memberCheck.rows[0].role === "owner") {
      throw new Error("Room owner cannot leave. Delete the room instead");
    }

    const result = await pool.query(
      `DELETE FROM room_members
       WHERE room_id = $1 AND user_id = $2
       RETURNING id`,
      [roomId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Not a member of this room");
    }

    console.log(`✅ User ${userId} left room ${roomId}`);
    return true;
  } catch (error) {
    console.error("Leave room error:", error);
    throw error;
  }
}

/**
 * Retrieves all members of a room with their user details
 * Results are ordered by role (owner, admin, member) then join date
 *
 * @param {number} roomId - The room's database ID
 * @returns {Promise<Array<Object>>} Array of member objects with user details
 * @throws {Error} If database query fails
 */
export async function getRoomMembers(roomId) {
  try {
    const result = await pool.query(
      `SELECT
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                rm.role,
                rm.joined_at
            FROM room_members rm
            JOIN users u ON rm.user_id = u.id
            WHERE rm.room_id = $1
            ORDER BY
              CASE rm.role
                WHEN 'owner' THEN 1
                WHEN 'admin' THEN 2
                ELSE 3
              END,
              rm.joined_at ASC
            `,
      [roomId]
    );

    return result.rows;
  } catch (error) {
    console.error("Get room members error:", error);
    throw error;
  }
}

/**
 * Checks if a user is a member of a room
 *
 * @param {number} roomId - The room's database ID
 * @param {number} userId - The user's database ID
 * @returns {Promise<boolean>} True if user is a member, false otherwise
 * @throws {Error} If database query fails
 */
export async function isRoomMember(roomId, userId) {
  try {
    const result = await pool.query(
      `SELECT id FROM room_members
       WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error("Is room member error:", error);
    throw error;
  }
}

/**
 * Retrieves all rooms a user is a member of
 * Includes the user's role and join date for each room
 *
 * @param {number} userId - The user's database ID
 * @returns {Promise<Array<Object>>} Array of rooms with role and joined_at fields
 * @throws {Error} If database query fails
 */
export async function getUserRooms(userId) {
  try {
    const result = await pool.query(
      `SELECT
        r.*,
        rm.role,
        rm.joined_at
       FROM rooms r
       JOIN room_members rm ON r.id = rm.room_id
       WHERE rm.user_id = $1
       ORDER BY rm.joined_at DESC
      `,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Get user rooms error:", error);
    throw error;
  }
}

/**
 * Saves a message to the database (room message or direct message)
 * For room messages, validates that sender is a member
 *
 * @param {Object} messageData - The message data
 * @param {number|null} [messageData.roomId=null] - Room ID for room messages
 * @param {number} messageData.senderId - User ID of the sender
 * @param {number|null} [messageData.recipientId=null] - User ID for direct messages
 * @param {string} messageData.content - Message content
 * @param {string} [messageData.messageType='text'] - Type of message (text, image, etc.)
 * @returns {Promise<Object>} The saved message object
 * @throws {Error} If validation fails or database query fails
 */
export async function saveMessage(messageData) {
  const {
    roomId = null,
    senderId,
    recipientId = null,
    content,
    messageType = "text",
  } = messageData;

  // Validate message destination (must have either roomId or recipientId)
  if (!roomId && !recipientId) {
    throw new Error("Message must have either roomId or recipientId");
  }

  if (!content) {
    throw new Error("Message content is required");
  }

  try {
    // Verify sender is a member of the room (for room messages)
    if (roomId) {
      const isMember = await isRoomMember(roomId, senderId);
      if (!isMember) {
        throw new Error("User is not a member of this room");
      }
    }

    const result = await pool.query(
      `
        INSERT INTO messages (room_id, sender_id, recipient_id, content, message_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
      [roomId, senderId, recipientId, content, messageType]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Save message error:", error);
    throw error;
  }
}

/**
 * Retrieves messages from a room with sender details
 * Returns messages in chronological order (oldest first)
 *
 * @param {number} roomId - The room's database ID
 * @param {number} [limit=50] - Maximum number of messages to retrieve
 * @returns {Promise<Array<Object>>} Array of messages with sender details
 * @throws {Error} If database query fails
 */
export async function getRoomMessages(roomId, limit = 50) {
  try {
    const result = await pool.query(
      `
            SELECT
              m.*,
              u.username as sender_username,
              u.display_name as sender_display_name,
              u.avatar_url as sender_avatar_url
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = $1 AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT $2`,
      [roomId, limit]
    );
    // Reverse to get chronological order (oldest first)
    return result.rows.reverse();
  } catch (error) {
    console.error("Get room messages error:", error);
    throw error;
  }
}

/**
 * Retrieves direct messages between two users with sender details
 * Returns messages in chronological order (oldest first)
 *
 * @param {number} user1Id - First user's database ID
 * @param {number} user2Id - Second user's database ID
 * @param {number} [limit=50] - Maximum number of messages to retrieve
 * @returns {Promise<Array<Object>>} Array of direct messages with sender details
 * @throws {Error} If database query fails
 */
export async function getDirectMessages(user1Id, user2Id, limit = 50) {
  try {
    const result = await pool.query(
      `
        SELECT
          m.*,
          u.username as sender_username,
          u.display_name as sender_display_name,
          u.avatar_url as sender_avatar_url
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.room_id IS NULL
          AND m.deleted_at IS NULL
          AND (
              (m.sender_id = $1 AND m.recipient_id = $2) OR
              (m.sender_id = $2 AND m.recipient_id = $1)
            )
        ORDER BY m.created_at DESC
        LIMIT $3`,
      [user1Id, user2Id, limit]
    );

    // Reverse to get chronological order (oldest first)
    return result.rows.reverse();
  } catch (error) {
    console.error("Get direct messages error:", error);
    throw error;
  }
}
