import { auth } from "@/auth";
import { rateLimit } from "@/lib/ai/rate-limit";
import { NextResponse } from "next/server";

export async function requireAuthedUser(rateLimitKeyPrefix: string) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      ),
    };
  }

  const limit = rateLimit(`${rateLimitKeyPrefix}:${userId}`);
  if (!limit.success) {
    return {
      error: NextResponse.json(
        {
          error: "Too many requests. Please wait and try again.",
          retryAfterMs: limit.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        }
      ),
    };
  }

  return { userId, session };
}
