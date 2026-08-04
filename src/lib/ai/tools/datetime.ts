import { z } from "zod";

export const datetimeSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe("IANA timezone, e.g. Asia/Kolkata. Defaults to UTC."),
});

export async function getCurrentDatetime(input: {
  timezone?: string;
}): Promise<string> {
  const tz = input.timezone?.trim() || "UTC";
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "long",
  }).format(now);

  return `Current date/time (${tz}): ${formatted}`;
}
