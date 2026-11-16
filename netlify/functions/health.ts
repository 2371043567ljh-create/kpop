import type { Config, Context } from '@netlify/functions';
import { handleHealthWeb } from '../../api/_lib/gemini.ts';

export default async function handler(
  request: Request,
  _context: Context
): Promise<Response> {
  return handleHealthWeb(request);
}

export const config: Config = {
  path: '/api/health',
};
