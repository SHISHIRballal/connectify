import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import Message from "../model/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Map of userId -> Set of socketIds (to support multiple tabs/devices per user)
const userSocketMap = new Map();

export const isUserOnline = (userId) => {
  return userSocketMap.has(userId.toString()) && userSocketMap.get(userId.toString()).size > 0;
};

export const getOnlineUserIds = () => {
  return Array.from(userSocketMap.keys());
};

// Socket Authentication Middleware
io.use((socket, next) => {
  try {
    let token = null;

    // 1. Try handshake auth token
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }

    // 2. Try cookie header if no auth token
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie
        .split(";")
        .map((c) => c.trim())
        .reduce((acc, c) => {
          const [name, value] = c.split("=");
          acc[name] = value;
          return acc;
        }, {});
      token = cookies["jwt"];
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return next(new Error("Authentication error: Invalid token"));
    }

    // Attach authenticated userId to socket
    socket.userId = decoded.userId.toString();
    next();
  } catch (err) {
    return next(new Error("Authentication error: " + err.message));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;

  // Add socketId to user's set of active connections
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  userSocketMap.get(userId).add(socket.id);

  // Automatically join a personal room named after the userId
  socket.join(userId);

  // Broadcast updated list of online users to all clients
  io.emit("getOnlineUsers", getOnlineUserIds());

  // Typing indicator events
  socket.on("typing", ({ receiverId }) => {
    if (receiverId) {
      io.to(receiverId.toString()).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    if (receiverId) {
      io.to(receiverId.toString()).emit("stopTyping", { senderId: userId });
    }
  });

  // Real-time read receipt event
  socket.on("markMessagesAsRead", async ({ senderId }) => {
    try {
      if (!senderId) return;

      await Message.updateMany(
        {
          senderId: senderId,
          receiverId: userId,
          read: false,
        },
        {
          $set: { read: true, readAt: new Date() },
        }
      );

      // Notify the original sender that their messages were read
      io.to(senderId.toString()).emit("messagesRead", {
        readerId: userId,
        readAt: new Date(),
      });
    } catch (err) {
      console.error("Error marking messages as read via socket:", err.message);
    }
  });

  // Disconnection cleanup
  socket.on("disconnect", () => {
    if (userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
      }
    }

    // Broadcast updated online users
    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { app, io, server };
