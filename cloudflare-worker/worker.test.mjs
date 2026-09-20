import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerSource = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const workerModuleUrl = `data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`;
const { default: worker } = await import(workerModuleUrl);

class MemoryKV {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    if (Array.isArray(key)) {
      return new Map(key.map((item) => [item, this.values.get(item) ?? null]));
    }
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, String(value));
  }
}

function createEnv() {
  return {
    LEADERBOARD_KV: new MemoryKV(),
    CORS_ALLOW_ORIGIN: 'https://leaderboard.raymondjones.dev,http://localhost:3000',
  };
}

function solvedResponse(count) {
  return new Response(JSON.stringify({
    data: {
      matchedUser: {
        submitStatsGlobal: {
          acSubmissionNum: [{ difficulty: 'All', count }],
        },
      },
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('returns two empty 30-day progress lists', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/august-problems'),
    createEnv()
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(result.progress), ['nafis', 'saad']);
  assert.equal(result.progress.nafis.length, 30);
  assert.equal(result.progress.saad.length, 30);
  assert.equal(result.progress.nafis.every((value) => value === false), true);
});

test('stores each client check-off independently', async () => {
  const env = createEnv();
  const updateResponse = await worker.fetch(
    new Request('https://worker.example/august-problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify({ client: 'nafis', problem: 4, completed: true }),
    }),
    env
  );
  const readResponse = await worker.fetch(
    new Request('https://worker.example/august-problems'),
    env
  );
  const result = await readResponse.json();

  assert.equal(updateResponse.status, 200);
  assert.equal(result.progress.nafis[3], true);
  assert.equal(result.progress.saad[3], false);
});

test('rejects invalid checklist updates', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/august-problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify({ client: 'someone-else', problem: 31, completed: 'yes' }),
    }),
    createEnv()
  );

  assert.equal(response.status, 400);
});

test('scheduled refresh updates only its batch and rolls over from prior history', async () => {
  const env = createEnv();
  const users = Array.from({ length: 6 }, (_, index) => ({
    name: `user-${index}`,
    current_problem_count: 100 + index,
    current_problem_delta: 10,
    month_start_problem_count: 90 + index,
    month_baseline_month: '2026-09',
    problems_each_week: [{ date: '2026-09-30', count: 100 + index }],
    is_active: true,
  }));
  await env.LEADERBOARD_KV.put('leetcode:data', JSON.stringify(users));
  await env.LEADERBOARD_KV.put('users:list', '[]');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const username = JSON.parse(options.body).variables.username;
    return solvedResponse(110 + Number(username.split('-')[1]));
  };
  try {
    await worker.scheduled({
      cron: '0 15 * * *',
      scheduledTime: Date.parse('2026-10-02T15:00:00Z'),
    }, env);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const updated = JSON.parse(await env.LEADERBOARD_KV.get('leetcode:data'));
  assert.equal(updated[0].month_baseline_month, '2026-10');
  assert.equal(updated[0].month_start_problem_count, 100);
  assert.equal(updated[0].current_problem_count, 110);
  assert.equal(updated[0].current_problem_delta, 10);
  assert.deepEqual(updated[0].problems_each_week.at(-1), {
    date: '2026-10-02',
    count: 110,
  });
  assert.equal(updated[1].month_baseline_month, '2026-09');
  assert.equal(updated[3].current_problem_count, 113);
});

test('scheduled refresh initializes approved users at zero monthly progress', async () => {
  const env = createEnv();
  await env.LEADERBOARD_KV.put('leetcode:data', '[]');
  await env.LEADERBOARD_KV.put('users:list', JSON.stringify([{
    leetcode_username: 'new-user',
    display_name: 'New User',
  }]));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => solvedResponse(42);
  try {
    await worker.scheduled({
      cron: '0 15 * * *',
      scheduledTime: Date.parse('2026-09-20T15:00:00Z'),
    }, env);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const [user] = JSON.parse(await env.LEADERBOARD_KV.get('leetcode:data'));
  assert.equal(user.current_problem_count, 42);
  assert.equal(user.month_start_problem_count, 42);
  assert.equal(user.current_problem_delta, 0);
  assert.equal(user.month_baseline_month, '2026-09');
  assert.deepEqual(user.problems_each_week, [{ date: '2026-09-20', count: 42 }]);
});

test('new users keep their pending baseline until their assigned batch runs', async () => {
  const env = createEnv();
  await env.LEADERBOARD_KV.put('leetcode:data', JSON.stringify([{
    name: 'existing-user',
    current_problem_count: 10,
    month_start_problem_count: 10,
    month_baseline_month: '2026-09',
    problems_each_week: [],
  }]));
  await env.LEADERBOARD_KV.put('users:list', JSON.stringify([{
    leetcode_username: 'second-batch-user',
    display_name: 'Second Batch User',
  }]));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => solvedResponse(42);
  try {
    await worker.scheduled({
      cron: '0 15 * * *',
      scheduledTime: Date.parse('2026-09-20T15:00:00Z'),
    }, env);
    let users = JSON.parse(await env.LEADERBOARD_KV.get('leetcode:data'));
    assert.equal(users[1].pending_monthly_baseline, true);

    await worker.scheduled({
      cron: '10 15 * * *',
      scheduledTime: Date.parse('2026-09-20T15:10:00Z'),
    }, env);
    users = JSON.parse(await env.LEADERBOARD_KV.get('leetcode:data'));
    assert.equal(users[1].month_start_problem_count, 42);
    assert.equal(users[1].current_problem_delta, 0);
    assert.equal('pending_monthly_baseline' in users[1], false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
