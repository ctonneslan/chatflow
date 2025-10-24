# ChatFlow

A modern, real-time chat application built with WebSocket technology, featuring JWT authentication, room-based messaging, and direct messages.

## Features

### Core Functionality
- **Real-time Communication**: Built on Socket.io for instant message delivery
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Room Management**: Create and join public or private chat rooms
- **Direct Messaging**: One-on-one conversations between users
- **User Tracking**: Online/offline status and active user tracking
- **Message Persistence**: All messages stored in PostgreSQL database
- **Typing Indicators**: Real-time typing status in rooms

### Security
- JWT token-based authentication
- Bcrypt password hashing
- CORS protection
- Helmet.js security headers
- Socket authentication middleware

## Tech Stack

### Backend
- **Node.js** with Express 5
- **Socket.io** for WebSocket communication
- **PostgreSQL** for data persistence
- **JWT** for authentication
- **bcrypt** for password security

### Frontend
- Vanilla JavaScript (ES6 modules)
- Socket.io client
- Modern CSS with responsive design

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd chatflow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/chatflow

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Client Configuration (for CORS)
CLIENT_URL=http://localhost:5173
```

### 4. Set up the database
```bash
# Create database and tables
npm run db:init

# Or if you need to reset an existing database
npm run db:reset
```

## Usage

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for auto-reloading on file changes.

### Production Mode
```bash
npm start
```

### Accessing the Application
1. Open `frontend/rooms-test-client.html` in your browser
2. Register a new account or login with existing credentials
3. Create rooms or start chatting with other users

## Project Structure

```
chatflow/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   ├── setup.js            # Database setup script
│   │   ├── create-db.js        # Database creation script
│   │   └── reset.js            # Database reset script
│   ├── middleware/
│   │   ├── auth.js             # HTTP authentication middleware
│   │   └── socketAuth.js       # Socket authentication middleware
│   ├── services/
│   │   ├── roomService.js      # Room and message operations
│   │   └── userTrackingService.js  # Online user tracking
│   ├── socket/
│   │   └── socketServer.js     # Socket.io server setup
│   └── server.js               # Express server entry point
├── frontend/
│   ├── js/
│   │   ├── modules/
│   │   │   ├── auth.js         # Authentication logic
│   │   │   ├── rooms.js        # Room management
│   │   │   ├── messaging.js    # Message handling
│   │   │   ├── socket.js       # Socket connection management
│   │   │   └── ui.js           # UI utilities
│   │   ├── utils/
│   │   │   └── dom.js          # DOM utilities
│   │   ├── state.js            # Application state
│   │   ├── config.js           # Frontend configuration
│   │   └── app.js              # Application entry point
│   ├── rooms-test-client.html  # Main client interface
│   └── styles.css              # Application styles
└── package.json
```

## Database Schema

### Tables
- **users**: User accounts and profiles
- **rooms**: Chat rooms (public/private)
- **room_members**: Room membership and roles
- **messages**: All messages (room and direct)

### Key Features
- Automatic timestamp tracking
- Soft delete support
- User role management (owner, admin, member)
- Efficient indexing for message retrieval

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Socket Events

#### Client to Server
- `create-room` - Create a new room
- `join-room` - Join an existing room
- `leave-room` - Leave a room
- `get-public-rooms` - Get list of public rooms
- `get-room-members` - Get members of a room
- `room-message` - Send message to room
- `direct-message` - Send direct message to user
- `get-direct-messages` - Retrieve direct message history
- `typing-room` - Indicate typing in room
- `stop-typing-room` - Stop typing indicator

#### Server to Client
- `connect` - Successful connection
- `welcome` - Welcome message with user info
- `user-rooms` - List of user's rooms on connect
- `room-created` - New room created (broadcast)
- `user-joined-room` - User joined a room
- `user-left-room` - User left a room
- `room-message` - New room message
- `direct-message` - New direct message
- `user-typing-room` - User is typing in room
- `user-stop-typing-room` - User stopped typing
- `user-joined` - User connected globally
- `user-left` - User disconnected globally
- `online-users` - Updated online users list

## Development

### Database Scripts
```bash
# Initialize fresh database
npm run db:init

# Reset database (drops and recreates all tables)
npm run db:reset

# Create database only
npm run db:create

# Set up tables only
npm run db:setup
```

### Debugging
Access debug tools in the browser console:
```javascript
// Check application status
ChatFlow.status()

// View current state
ChatFlow.debug.getState()

// Get list of all debug commands
ChatFlow.debug.help()
```

## Recent Updates

### Room System Fixes
- Fixed public rooms not loading on initial connection
- Fixed public rooms not updating in real-time when created
- Improved room member count tracking
- Enhanced room creation broadcast to all clients

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Author

Charlie Tonneslan

## Acknowledgments

- Built with Socket.io for real-time communication
- Uses PostgreSQL for reliable data persistence
- Inspired by modern chat applications
