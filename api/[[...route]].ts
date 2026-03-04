import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({ status: 'ok', time: new Date().toISOString() }),
);

export default handle(app);
