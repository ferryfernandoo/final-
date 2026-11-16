import { proxyAgentBackend } from './_proxy.js';

export const config = { runtime: 'edge' };

export default function handler(req) {
  return proxyAgentBackend(req, '/agent/execute');
}
