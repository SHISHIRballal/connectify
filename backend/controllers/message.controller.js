import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
} from "../services/message.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const sendMessageController = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { message } = req.body;

    const newMessage = await sendMessage(senderId, receiverId, message);
    return ApiResponse.success(res, 201, "Message sent successfully", newMessage);
  } catch (error) {
    next(error);
  }
};

export const getMessagesController = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    const messages = await getMessages(currentUserId, targetUserId);
    return ApiResponse.success(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    next(error);
  }
};

export const getConversationsController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await getConversations(userId);
    return ApiResponse.success(
      res,
      200,
      "Conversations fetched successfully",
      conversations
    );
  } catch (error) {
    next(error);
  }
};

export const markAsReadController = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const senderId = req.params.id;

    const result = await markAsRead(currentUserId, senderId);
    return ApiResponse.success(res, 200, "Messages marked as read", result);
  } catch (error) {
    next(error);
  }
};
