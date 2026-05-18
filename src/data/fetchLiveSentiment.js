/**
 * POST /api/sentiment — populated by Vite dev middleware when ANTHROPIC_API_KEY is set.
 * Production: implement the same route on your host (never expose the key in the browser).
 */
export async function fetchLiveSentiment() {
  const res = await fetch("/api/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "sentiment_api_error");
  }
  if (data.live === false || data.error === "missing_anthropic_key") {
    throw new Error("missing_anthropic_key");
  }
  return data;
}
