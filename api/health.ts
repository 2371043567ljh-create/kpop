import { handleHealth } from './_lib/gemini.ts';
import type { ServerlessRequest, ServerlessResponse } from './_lib/http.ts';

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  await handleHealth(req, res);
}
