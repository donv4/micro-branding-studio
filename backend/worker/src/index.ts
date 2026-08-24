import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CompileIconEndpoint } from './endpoints/compileIcon';

const app = new Hono();

// Global safety CORS layers
app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Content-Disposition'],
}));

// Bind the Chanfana OpenAPI adapter wrapper configuration block 
const openapi = fromHono(app, {
  docs_url: '/docs',
  openapi_url: '/openapi.json',
  schema: {
    info: {
      title: 'Universal Micro-Branding Studio API Engine',
      version: '1.0.0',
      description: 'Compiles multi-resolution raw binary windows header configurations on the fly.',
    },
  },
});

// Fix: Switched from .get to .post to catch incoming image bytes from your phone!
openapi.post('/branding/compile', CompileIconEndpoint);

export default app;
