"use server";
import Chat from "@/app/models/chat.model";
import { Message } from "../types/types";
import connectDB from "../utils/db";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
}

function assertSameUser(sessionUserId: string, requestedUserId: string) {
  if (sessionUserId !== requestedUserId) {
    throw new Error("Forbidden");
  }
}

export const createChat = async (
  chat: Message & { userID: string; chatID: string; imgName?: string }
) => {
  try {
    const userId = await requireSessionUserId();
    assertSameUser(userId, chat.userID);
    await connectDB();
    const { userPrompt, llmResponse, chatID, imgName } = chat;
    const data = await Chat.create({
      participant: userId,
      chatID,
      message: { userPrompt, llmResponse, imgName },
    });
    revalidatePath(`/app/${chatID}`);
    const serializedData = JSON.parse(JSON.stringify(data));
    return { message: serializedData, success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
};

export const getSidebarChat = async (userID: string) => {
  try {
    const sessionUserId = await requireSessionUserId();
    assertSameUser(sessionUserId, userID);
    await connectDB();
    const data = await Chat.aggregate([
      { $match: { participant: new Types.ObjectId(sessionUserId) } },
      {
        $group: {
          _id: "$chatID",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { isPinned: -1, createdAt: -1 } },
    ]);
    return { success: true, message: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error("Error in getSidebarChat:", error);
    return { success: false, message: error.message };
  }
};

export const getChatHistory = async ({
  userID,
  chatID,
}: {
  userID: string;
  chatID: string;
}) => {
  try {
    const sessionUserId = await requireSessionUserId();
    assertSameUser(sessionUserId, userID);
    await connectDB();
    const data = await Chat.find({
      participant: new Types.ObjectId(sessionUserId),
      chatID: chatID,
    });
    return { success: true, message: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error("Error in getChatHistory:", error);
    return { success: false, message: error.message };
  }
};

export const deleteChat = async (chatID: string) => {
  try {
    await connectDB();
    const userId = await requireSessionUserId();
    const data = await Chat.deleteMany({
      participant: new Types.ObjectId(userId),
      chatID: chatID,
    });
    revalidatePath("/app");
    return { success: true, message: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error("Error in deleteChat:", error);
    return { success: false, message: error.message };
  }
};

export const renameChat = async (
  chatID: string,
  message: Partial<{ title: string | null; icon: string | null }>
) => {
  try {
    const userId = await requireSessionUserId();
    await connectDB();

    const chatInfo = {
      ...(message.title ? { title: message.title } : {}),
      ...(message.icon ? { icon: message.icon } : {}),
    };

    const result = await Chat.updateMany(
      {
        participant: new Types.ObjectId(userId),
        chatID,
      },
      { $set: { chatInfo } }
    );

    if (!result) {
      return {
        success: false,
        message: "Chat not found or user not authorized",
      };
    }
    revalidatePath("/app");
    return { success: true, message: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("Error in renameChat:", error);
    return {
      success: false,
      message: error.message || "An error occurred while renaming the chat",
    };
  }
};

export const pinChat = async (chatID: string, pinStatus: boolean) => {
  try {
    const userId = await requireSessionUserId();
    await connectDB();

    const result = await Chat.updateMany(
      {
        participant: new Types.ObjectId(userId),
        chatID,
      },
      { $set: { isPinned: pinStatus } }
    );
    if (!result) {
      return {
        success: false,
        message: "Chat not found or user not authorized",
      };
    }
    revalidatePath("/app");
    return { success: true, message: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("Error in pinChat:", error);
    return {
      success: false,
      message: error.message || "An error occurred while pinning the chat",
    };
  }
};

export const updateResponse = async ({
  chatUniqueId,
  updatedResponse,
}: {
  chatUniqueId: string;
  updatedResponse: string;
}) => {
  try {
    const userId = await requireSessionUserId();
    await connectDB();

    const updatedChat = await Chat.findOneAndUpdate(
      {
        _id: chatUniqueId,
        participant: new Types.ObjectId(userId),
      },
      {
        $set: {
          "message.llmResponse": updatedResponse,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedChat) {
      return {
        success: false,
        message: "Chat not found or user not authorized",
      };
    }
    return {
      success: true,
      message: JSON.parse(JSON.stringify(updatedChat)),
    };
  } catch (error: any) {
    console.error("Error updating response:", error);
    return {
      success: false,
      message: error.message || "An error occurred while updating response",
    };
  }
};
