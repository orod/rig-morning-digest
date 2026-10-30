import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  const normal = [
    line('2026-10-28T02:00:00+01:00', 'zeta-sync', 'ok', 'ana'),
    line('2026-10-28T02:05:00+01:00', 'alpha-backup', 'retry', 'bo', 'timeout'),
    line('2026-10-28T02:10:00+01:00', 'alpha-backup', 'ok', 'bo'),
    line('2026-10-28T02:15:00+01:00', 'mid-report', 'fail', null, 'boom'),
  ];
  fs.writeFileSync(path.join(runsDir, '2026-10-28.jsonl'), normal.join('\n') + '\n');
  fs.writeFileSync(path.join(runsDir, '2026-10-27.jsonl'), '');
  const bad = [normal[0], 'this is not json', normal[1]];
  fs.writeFileSync(path.join(runsDir, '2026-10-26.jsonl'), bad.join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

const jobsInHtml = (html: string) =>
  ['alpha-backup', 'mid-report', 'zeta-sync'].filter((j) => html.includes(j)).sort(
    (a, b) => html.indexOf(a) - html.indexOf(b),
  );

describe('GET /digest/:night', () => {
  it('renders one table with rows sorted by job', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(jobsInHtml(html)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/digest/2020-01-01');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty file', async () => {
    const res = await app.request('/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders 200 with good rows when a line is bad', async () => {
    const res = await app.request('/digest/2026-10-26');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('zeta-sync');
    expect(html).toContain('alpha-backup');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns { night, rows, badLines } sorted by job', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
    expect(body.rows[0]).toMatchObject({ job: 'alpha-backup', owner: 'bo', runs: 2, retries: 1, lastStatus: 'ok' });
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/api/digest/2020-01-01');
    expect(res.status).toBe(404);
  });

  it('gives empty rows and no bad lines for an empty file', async () => {
    const res = await app.request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await app.request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'zeta-sync']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    expect(jobsInHtml(html)).toEqual(body.rows.map((r) => r.job));
  });
});
