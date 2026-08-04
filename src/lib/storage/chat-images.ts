import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";
import connectDB from "@/utils/db";

const BUCKET_NAME = "chatImages";

async function getBucket(): Promise<GridFSBucket> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB is not connected");
  }
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function uploadChatImage(params: {
  userId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<string> {
  const bucket = await getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(params.filename, {
      metadata: {
        userId: params.userId,
        mimeType: params.mimeType,
      },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.end(params.buffer);
  });
}

export async function getChatImageMeta(imageId: string) {
  const bucket = await getBucket();
  const files = await bucket
    .find({ _id: new ObjectId(imageId) })
    .limit(1)
    .toArray();
  return files[0] ?? null;
}

export async function assertChatImageAccess(imageId: string, userId: string) {
  const file = await getChatImageMeta(imageId);
  if (!file) {
    throw new Error("Image not found");
  }
  const ownerId = (file.metadata as { userId?: string } | undefined)?.userId;
  if (ownerId !== userId) {
    throw new Error("Forbidden");
  }
  return file;
}

export async function openChatImageDownload(imageId: string, userId: string) {
  await assertChatImageAccess(imageId, userId);
  const bucket = await getBucket();
  const file = await getChatImageMeta(imageId);
  const mimeType =
    (file?.metadata as { mimeType?: string } | undefined)?.mimeType ||
    "image/png";
  return {
    stream: bucket.openDownloadStream(new ObjectId(imageId)),
    mimeType,
    filename: file?.filename ?? "image",
  };
}

export async function getChatImageBase64(
  imageId: string,
  userId: string
): Promise<{ data: string; mimeType: string }> {
  const { stream, mimeType } = await openChatImageDownload(imageId, userId);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    data: Buffer.concat(chunks).toString("base64"),
    mimeType,
  };
}
