import RequestMetric from "@/app/models/request-metric.model";
import connectDB from "@/utils/db";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/auth/require-admin";
import Link from "next/link";
import { redirect } from "next/navigation";

async function loadMetrics() {
  await connectDB();
  const metrics = await RequestMetric.find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const summary = await RequestMetric.aggregate([
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

  return {
    metrics: metrics.map((row) => ({
      id: String(row._id),
      userIdHash: row.userIdHash,
      feature: row.feature,
      model: row.model,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      status: row.status,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    })),
    summary: summary.map((row) => ({
      feature: row._id,
      count: row.count,
      avgLatencyMs: Math.round(row.avgLatencyMs ?? 0),
      avgInputTokens: Math.round(row.avgInputTokens ?? 0),
      avgOutputTokens: Math.round(row.avgOutputTokens ?? 0),
    })),
  };
}

export default async function MetricsPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/app");
  }

  let data: Awaited<ReturnType<typeof loadMetrics>> | null = null;
  let error: string | null = null;
  try {
    data = await loadMetrics();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load metrics";
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Request metrics</h1>
          <p className="text-sm opacity-70 mt-1">
            Admin-only latency and token proxy logs for AI endpoints.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/api/metrics?format=csv"
            className="px-4 py-2 rounded-full border border-accentGray/30 text-sm hover:opacity-100 opacity-80"
          >
            Export CSV
          </Link>
          <Link
            href="/app"
            className="px-4 py-2 rounded-full bg-accentBlue/20 text-accentBlue text-sm"
          >
            Back to chat
          </Link>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {data && (
        <>
          <section className="grid md:grid-cols-3 gap-4">
            {data.summary.map((row) => (
              <div
                key={row.feature}
                className="rounded-2xl border border-accentGray/20 p-4 bg-rtlLight dark:bg-rtlDark"
              >
                <p className="text-xs uppercase opacity-60">{row.feature}</p>
                <p className="text-2xl font-semibold mt-1">{row.count}</p>
                <p className="text-sm opacity-70 mt-2">
                  Avg {row.avgLatencyMs}ms · ~{row.avgInputTokens} in / ~
                  {row.avgOutputTokens} out tokens
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-x-auto rounded-2xl border border-accentGray/20">
            <table className="min-w-full text-sm">
              <thead className="bg-rtlLight dark:bg-rtlDark">
                <tr className="text-left opacity-70">
                  <th className="p-3">Time</th>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">User hash</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map((row) => (
                  <tr key={row.id} className="border-t border-accentGray/10">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">{row.feature}</td>
                    <td className="p-3">{row.model ?? "—"}</td>
                    <td className="p-3">{row.latencyMs}ms</td>
                    <td className="p-3">
                      {row.inputTokens} / {row.outputTokens}
                    </td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3 font-mono text-xs">{row.userIdHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
