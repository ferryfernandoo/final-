import { proxyChatJobs } from './_proxy.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const queryId = url.searchParams.get('jobId');
  const pathParts = url.pathname.replace(/\/+$/, '').split('/');
  const pathId = queryId || pathParts[pathParts.length - 1] || '';
  return proxyChatJobs(req, `/api/chat/jobs/${encodeURIComponent(pathId)}`);
}
