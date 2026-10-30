import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestMissing, DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const id = c.req.param('night');
    // Only a plain date names a night; keeps the path out of the filesystem.
    const night = /^\d{4}-\d{2}-\d{2}$/.test(id) ? readNight(config.runsDir, id) : null;
    if (!night) {
      return c.html(
        <Layout title={`digest ${id}`} lane={lane()}>
          <DigestMissing night={id} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${id}`} lane={lane()}>
        <DigestPage night={night} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const id = c.req.param('night');
    // Same night as the page, or the same 404 (ADR 0001: page and JSON never disagree).
    const night = /^\d{4}-\d{2}-\d{2}$/.test(id) ? readNight(config.runsDir, id) : null;
    if (!night) return c.json({ error: 'no such night', night: id }, 404);
    return c.json(night);
  });

  return app;
}
