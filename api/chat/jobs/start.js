import { proxyChatJobs } from './_proxy.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  return proxyChatJobs(req, '/api/chat/jobs/start');
}
