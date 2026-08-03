import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

let embeddings: GoogleGenerativeAIEmbeddings | null = null;

export function getEmbeddingsModel() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Add it to your server environment (.env)."
    );
  }
  if (!embeddings) {
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: "text-embedding-004",
    });
  }
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const model = getEmbeddingsModel();
  const vector = await model.embedQuery(text);
  return vector;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingsModel();
  return model.embedDocuments(texts);
}
