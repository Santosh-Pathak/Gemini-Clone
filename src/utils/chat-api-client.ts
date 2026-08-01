"use client";

/**
 * Read a text/plain streaming Response and invoke onChunk with the
 * cumulative text after each chunk (matches prior Gemini stream UX).
 */
export async function readTextStream(
  response: Response,
  onChunk: (accumulated: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    onChunk(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onChunk(accumulated);
    }
    accumulated += decoder.decode();
    onChunk(accumulated);
    return accumulated;
  } finally {
    reader.releaseLock();
  }
}

export async function fileToBase64Image(file: File): Promise<{
  data: string;
  mimeType: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image file"));
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

  const [, base64 = ""] = dataUrl.split(",");
  return { data: base64, mimeType: file.type || "image/png" };
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error && typeof data.error === "string") return data.error;
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
}
