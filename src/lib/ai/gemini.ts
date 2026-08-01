import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "./constants";

let client: GoogleGenerativeAI | null = null;

function getClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Add it to your server environment (.env)."
    );
  }
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export function getGeminiModel(model = GEMINI_MODEL) {
  return getClient().getGenerativeModel({ model });
}

export type InlineImagePart = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};
