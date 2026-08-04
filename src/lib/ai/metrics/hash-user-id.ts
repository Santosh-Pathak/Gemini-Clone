import { createHash } from "node:crypto";

/** One-way hash so metrics never store raw user ids. */
export function hashUserId(userId: string): string {
  return createHash("sha256")
    .update(`${userId}:${process.env.NEXTAUTH_SECRET ?? "dev-secret"}`)
    .digest("hex")
    .slice(0, 16);
}
