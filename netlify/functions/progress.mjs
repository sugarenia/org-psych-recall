// Stores flashcard progress per sync code in Netlify Blobs.
// GET  /api/progress?key=<code>  -> saved progress JSON, or null
// PUT  /api/progress?key=<code>  -> replaces saved progress with the request body
import { getStore } from "@netlify/blobs";

const CODE = /^[a-z0-9]{4}(-[a-z0-9]{4}){4}$/;
const MAX_BYTES = 256 * 1024;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const key = new URL(req.url).searchParams.get("key") || "";
  if (!CODE.test(key)) return json({ error: "Invalid sync code" }, 400);

  const store = getStore({ name: "progress", consistency: "strong" });

  if (req.method === "GET") {
    const data = await store.get(key, { type: "json" });
    return json(data ?? null);
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "Progress too large" }, 413);
    let data;
    try { data = JSON.parse(text); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!data || typeof data !== "object" || typeof data.cards !== "object") {
      return json({ error: "Unexpected progress format" }, 400);
    }
    await store.setJSON(key, data);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/progress" };
