interface WorkerEnv {
  ASSETS: {
    fetch: (req: Request) => Promise<Response>;
  };
}

const STATIC_EXTENSIONS = new Set([
  'js',
  'mjs',
  'css',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'svg',
  'ico',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'wasm',
  'json',
  'webmanifest',
  'txt',
  'xml',
]);

const ALLOWED_EXACT_PATHS = new Set([
  '/',
  '/index.html',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/manifest.json',
]);

const workerEdgeHandler = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('.');
    const ext = pathParts.length > 1 ? pathParts[pathParts.length - 1].toLowerCase() : '';

    if (!STATIC_EXTENSIONS.has(ext) && !ALLOWED_EXACT_PATHS.has(url.pathname)) {
      const redirectUrl = new URL('/', request.url);
      return Response.redirect(redirectUrl.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    if (STATIC_EXTENSIONS.has(ext) && ext !== 'txt' && ext !== 'xml') {
      headers.set('Cache-Control', 'public, max-age=2592000, immutable');
    } else {
      headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), browsing-topics=()'
    );
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://buttons.github.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://picsum.photos; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' data: blob: https://api.github.com; frame-src https://ghbtns.com https://buttons.github.io; object-src 'none'; base-uri 'self';"
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default workerEdgeHandler;
