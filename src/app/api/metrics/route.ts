import RequestMetric from "@/app/models/request-metric.model";
import connectDB from "@/utils/db";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "id,feature,model,latencyMs,inputTokens,outputTokens,status,createdAt\n";
  const headers = [
    "id",
    "userIdHash",
    "feature",
    "model",
    "latencyMs",
    "inputTokens",
    "outputTokens",
    "status",
    "createdAt",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((key) => {
          const value = row[key];
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdminSession();
    if (admin.error) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);
    const feature = searchParams.get("feature");
    const format = searchParams.get("format");

    await connectDB();
    const filter = feature ? { feature } : {};
    const rows = await RequestMetric.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const metrics = rows.map((row) => ({
      id: String(row._id),
      userIdHash: row.userIdHash,
      feature: row.feature,
      model: row.model,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      status: row.status,
      createdAt: row.createdAt,
    }));

    if (format === "csv") {
      return new Response(toCsv(metrics), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="request-metrics.csv"',
        },
      });
    }

    const totals = await RequestMetric.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$feature",
          count: { $sum: 1 },
          avgLatencyMs: { $avg: "$latencyMs" },
          avgInputTokens: { $avg: "$inputTokens" },
          avgOutputTokens: { $avg: "$outputTokens" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({
      metrics,
      summary: totals.map((row) => ({
        feature: row._id,
        count: row.count,
        avgLatencyMs: Math.round(row.avgLatencyMs ?? 0),
        avgInputTokens: Math.round(row.avgInputTokens ?? 0),
        avgOutputTokens: Math.round(row.avgOutputTokens ?? 0),
      })),
    });
  } catch (error) {
    console.error("[api/metrics]", error);
    const message =
      error instanceof Error ? error.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
