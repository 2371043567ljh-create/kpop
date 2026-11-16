import type { Config, Context } from '@netlify/functions';
import { handleEvaluateActionWeb } from '../../api/_lib/gemini.ts';

export default async function handler(
  request: Request,
  _context: Context
): Promise<Response> {
  return handleEvaluateActionWeb(request);
}

export const config: Config = {
  path: '/api/ai/evaluate-action',
};
