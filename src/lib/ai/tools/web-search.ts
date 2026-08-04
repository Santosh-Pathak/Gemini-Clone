import { z } from "zod";

export const webSearchSchema = z.object({
  query: z.string().min(1).describe("Search query"),
});

type TavilyResult = {
  results?: { title?: string; url?: string; content?: string }[];
};

async function searchWithTavily(query: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: "basic",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as TavilyResult;
  const items = data.results ?? [];
  if (items.length === 0) return "No Tavily results found.";

  return items
    .map((item, i) => {
      const title = item.title || "Untitled";
      const url = item.url || "";
      const snippet = (item.content || "").slice(0, 200);
      return `${i + 1}. ${title}${url ? ` (${url})` : ""}\n   ${snippet}`;
    })
    .join("\n");
}

async function searchWithDuckDuckGo(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_html=1&skip_disambig=1`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Web search request failed.");

  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<
      | { Text?: string; FirstURL?: string }
      | { Topics?: { Text?: string; FirstURL?: string }[] }
    >;
  };

  const lines: string[] = [];
  if (data.AbstractText) {
    lines.push(
      `Summary: ${data.AbstractText}${data.AbstractURL ? ` (${data.AbstractURL})` : ""}`
    );
  }

  const related: string[] = [];
  for (const topic of data.RelatedTopics ?? []) {
    if ("Text" in topic && topic.Text) {
      related.push(`- ${topic.Text}${topic.FirstURL ? ` (${topic.FirstURL})` : ""}`);
    } else if ("Topics" in topic && topic.Topics) {
      for (const sub of topic.Topics) {
        if (sub.Text) {
          related.push(
            `- ${sub.Text}${sub.FirstURL ? ` (${sub.FirstURL})` : ""}`
          );
        }
      }
    }
    if (related.length >= 5) break;
  }

  if (related.length > 0) {
    lines.push("Related:");
    lines.push(...related.slice(0, 5));
  }

  if (lines.length === 0) {
    return `No instant results for "${query}". Try rephrasing the query.`;
  }

  return lines.join("\n");
}

export async function runWebSearch(input: { query: string }): Promise<string> {
  const tavily = await searchWithTavily(input.query);
  if (tavily) return tavily;
  return searchWithDuckDuckGo(input.query);
}
