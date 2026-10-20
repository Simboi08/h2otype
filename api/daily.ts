import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDaily } from "../server/dailyApi.ts";

// Vercel Node function; no database key enters the browser bundle.
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  let body = "";
  if (req.body !== undefined)
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  else
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 1_000_000) {
        res.statusCode = 413;
        res.end();
        return;
      }
    }
  const headers = new Headers();
  if (typeof req.headers.origin === "string")
    headers.set("origin", req.headers.origin);
  const response = await handleDaily(
    new Request(`https://${req.headers.host ?? "localhost"}/api/daily`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    }),
    {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  );
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}
