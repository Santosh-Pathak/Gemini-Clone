import { auth } from "@/auth";

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdminSession() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const admins = parseAdminEmails();

  if (!session?.user?.id || !email) {
    return {
      error: "Unauthorized",
      status: 401 as const,
      session: null,
    };
  }

  if (admins.size === 0 || !admins.has(email)) {
    return {
      error: "Forbidden",
      status: 403 as const,
      session: null,
    };
  }

  return { session, error: null, status: 200 as const };
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.toLowerCase());
}
