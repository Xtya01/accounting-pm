// functions/_middleware.ts
// Cloudflare Access integration - multi-user
export const onRequest: PagesFunction = async (context) => {
  const { request, env, next, data } = context;
  
  // In production, Cloudflare Access adds these headers
  const email = request.headers.get('Cf-Access-Authenticated-User-Email') || 
                request.headers.get('x-test-user') || // for local dev
                'demo@company.ae';
  
  const userName = request.headers.get('Cf-Access-Authenticated-User-Name') || email.split('@')[0];
  
  // Ensure user exists in DB
  if (env.DB) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, email, name) VALUES (?1, ?1, ?2)'
    ).bind(email, userName).run();
  }
  
  data.user = { email, name: userName };
  
  // Protect API routes
  if (request.url.includes('/api/') && !email) {
    return new Response('Unauthorized - Enable Cloudflare Access', { status: 401 });
  }
  
  return next();
};
