import { handleDaily } from "../../server/dailyApi.js";
import type { DailyEnvironment } from "../../server/dailyApi.js";

// Cloudflare Pages equivalent of the Vercel function.
export function onRequest({
  request,
  env,
}: {
  request: Request;
  env: DailyEnvironment;
}) {
  return handleDaily(request, env);
}
