import { handleDaily } from "../../server/dailyApi.ts";
import type { DailyEnvironment } from "../../server/dailyApi.ts";

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
