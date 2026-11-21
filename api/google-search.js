import handler from './serp-search.js';

export const config = {
  runtime: 'edge',
};

export default function googleSearchHandler(request) {
  return handler(request);
}


