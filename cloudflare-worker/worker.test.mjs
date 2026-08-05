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
