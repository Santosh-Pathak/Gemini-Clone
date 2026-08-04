import connectDB from "@/utils/db";
import Chat from "@/app/models/chat.model";
import { Types } from "mongoose";
import { z } from "zod";

export const listRecentChatsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("How many recent chats to return (default 5)."),
});

export async function listRecentChatsForUser(
  userId: string,
  limit = 5
): Promise<string> {
  await connectDB();

  const chats = await Chat.aggregate([
    { $match: { participant: new Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$chatID",
        chatID: { $first: "$chatID" },
        title: { $first: "$chatInfo.title" },
        lastPrompt: { $first: "$message.userPrompt" },
        lastResponse: { $first: "$message.llmResponse" },
        updatedAt: { $first: "$updatedAt" },
        isPinned: { $first: "$isPinned" },
      },
    },
    { $sort: { isPinned: -1, updatedAt: -1 } },
    { $limit: limit },
  ]);

  if (chats.length === 0) {
    return "No recent chats found for this user.";
  }

  return chats
    .map((chat, index) => {
      const title =
        (chat.title as string | null) ||
        (chat.lastPrompt as string | null)?.slice(0, 60) ||
        "Untitled chat";
      const snippet = ((chat.lastResponse as string) || "").slice(0, 120);
      return `${index + 1}. ${title} [chatID: ${chat.chatID}]${snippet ? `\n   Last reply: ${snippet}` : ""}`;
    })
    .join("\n");
}
