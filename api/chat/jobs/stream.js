import { proxyChatJobs } from './_proxy.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const queryId = url.searchParams.get('jobId');
  const parts = url.pathname.replace(/\/+$/, '').split('/');
  const idx = parts.lastIndexOf('jobs');
  const pathId = queryId || (idx !== -1 && parts[idx + 1] ? parts[idx + 1] : '');
  return proxyChatJobs(req, `/api/chat/jobs/${encodeURIComponent(pathId)}/stream`);
}
