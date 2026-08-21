import Conversation from "../model/conversation.model.js";
import Message from "../model/message.model.js";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";
import { io } from "../socket/socket.js";

export const sendMessage = async (senderId, receiverId, messageText) => {
  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, "You cannot send messages to yourself");
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Recipient user not found");
  }

  // Find existing conversation between the two users
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  // If no conversation exists yet, create one
  if (!conversation) {
    conversation = new Conversation({
      participants: [senderId, receiverId],
      messages: [],
    });
  }

  // Create new message
  const newMessage = new Message({
    senderId,
    receiverId,
    message: messageText,
  });

  conversation.messages.push(newMessage._id);
  conversation.lastMessage = newMessage._id;

  // Save conversation and message concurrently
  await Promise.all([conversation.save(), newMessage.save()]);

  // Real-time delivery to receiver's room via Socket.IO
  io.to(receiverId.toString()).emit("newMessage", newMessage);

  return newMessage;
};

export const getMessages = async (currentUserId, targetUserId) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  const conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, targetUserId] },
  }).populate("messages");

  if (!conversation) {
    return [];
  }

  // Mark all unread incoming messages as read
  const unreadCount = await Message.countDocuments({
    senderId: targetUserId,
    receiverId: currentUserId,
    read: false,
  });

  if (unreadCount > 0) {
    await Message.updateMany(
      {
        senderId: targetUserId,
        receiverId: currentUserId,
        read: false,
      },
      {
        $set: { read: true, readAt: new Date() },
      }
    );

    // Notify the target user that their messages were read
    io.to(targetUserId.toString()).emit("messagesRead", {
      readerId: currentUserId.toString(),
      readAt: new Date(),
    });
  }

  return conversation.messages;
};

export const getConversations = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate({
      path: "participants",
      select: "username fullname profileimg bio",
    })
    .populate({
      path: "lastMessage",
    })
    .sort({ updatedAt: -1 });

  // Map each conversation to include the other participant and unread count
  const formattedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      const unreadCount = await Message.countDocuments({
        senderId: otherParticipant?._id,
        receiverId: userId,
        read: false,
      });

      return {
        _id: conv._id,
        otherUser: otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    })
  );

  return formattedConversations;
};

export const markAsRead = async (userId, senderId) => {
  const result = await Message.updateMany(
    {
      senderId: senderId,
      receiverId: userId,
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    }
  );

  if (result.modifiedCount > 0) {
    io.to(senderId.toString()).emit("messagesRead", {
      readerId: userId.toString(),
      readAt: new Date(),
    });
  }

  return { markedCount: result.modifiedCount };
};
