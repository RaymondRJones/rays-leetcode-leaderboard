const PUBLIC_READ_KEYS = new Set(['leetcode:data', 'github:data']);
const ADMIN_READ_KEYS = new Set(['users:list', 'registrations:pending', 'leetcode:data', 'github:data']);
const REGISTER_DAILY_LIMIT = 5;
const REGISTER_MINUTE_LIMIT = 2;
const MAX_PENDING_REGISTRATIONS = 500;
const MAX_REGISTER_BODY_BYTES = 4096;
const MAX_ADMIN_BODY_BYTES = 5 * 1024 * 1024;
const MAX_AUGUST_PROGRESS_BODY_BYTES = 512;
const AUGUST_CLIENTS = ['nafis', 'saad'];
const AUGUST_PROBLEM_COUNT = 30;
const AUGUST_PROGRESS_PREFIX = 'checklist:august-2026';
const DAILY_REFRESH_CRONS = ['0 15 * * *', '10 15 * * *', '20 15 * * *'];
const PROFILE_MISSING_THRESHOLD = 3;
const LEETCODE_QUERY = `
  query userProblemsSolved($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ ok: true }, 200, request, env);
      }

      if (url.pathname === '/register' && request.method === 'POST') {
        return await register(request, env);
      }

      if (url.pathname === '/august-problems' && request.method === 'GET') {
        return await getAugustProgress(request, env);
      }

      if (url.pathname === '/august-problems' && request.method === 'POST') {
        return await updateAugustProgress(request, env);
      }

      if (url.pathname === '/' && request.method === 'GET') {
        return await getValue(request, env, url.searchParams.get('key'));
      }

      if (url.pathname === '/' && request.method === 'POST') {
        return await putValue(request, env);
      }

      return json({ error: 'Not found' }, 404, request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, request, env);
      }

      console.error(JSON.stringify({
        message: 'Unexpected Worker error',
        error: error instanceof Error ? error.message : String(error),
        path: url.pathname
      }));
      return json({ error: 'Unexpected server error' }, 500, request, env);
    }
  },

  async scheduled(controller, env) {
    const summary = await refreshLeaderboardBatch(
      env,
      controller.cron,
      new Date(controller.scheduledTime)
    );
    console.log(JSON.stringify({ event: 'daily-leaderboard-refresh', ...summary }));
  }
};

async function refreshLeaderboardBatch(env, cron, scheduledAt) {
  const batchIndex = DAILY_REFRESH_CRONS.indexOf(cron);
  if (batchIndex === -1) {
    throw new Error(`Unknown leaderboard refresh cron: ${cron}`);
  }

  const [leaderboard, registrations] = await Promise.all([
    readJsonList(env, 'leetcode:data'),
    readJsonList(env, 'users:list')
  ]);
  const knownNames = new Set(
    leaderboard.map((user) => String(user.name || '').toLowerCase())
  );
  const newNames = new Set();

  for (const registration of registrations) {
    const username = String(registration.leetcode_username || '').trim();
    if (!username || knownNames.has(username.toLowerCase())) {
      continue;
    }
    leaderboard.push(createLeaderboardUser(registration));
    knownNames.add(username.toLowerCase());
    newNames.add(username.toLowerCase());
  }

  const batch = leaderboard.filter(
    (_user, index) => index % DAILY_REFRESH_CRONS.length === batchIndex
  );
  let updated = 0;
  let unavailable = 0;
  let notFound = 0;

  await mapWithConcurrency(batch, 5, async (user) => {
    const result = await fetchProblemCount(user.name);
    if (result.status === 'unavailable') {
      unavailable += 1;
      return;
    }
    if (result.status === 'not_found') {
      recordProfileMissing(user, scheduledAt);
      notFound += 1;
      return;
    }

    const isNew = newNames.has(String(user.name).toLowerCase());
    recordProfileSuccess(user, scheduledAt);
    updateProblemCount(user, result.count, scheduledAt, isNew);
    recordProblemHistory(user, result.count, scheduledAt);
    updated += 1;
  });

  await env.LEADERBOARD_KV.put('leetcode:data', JSON.stringify(leaderboard));
  return {
    cron,
    batch: batchIndex + 1,
    batchSize: batch.length,
    leaderboardUsers: leaderboard.length,
    newUsers: newNames.size,
    updated,
    unavailable,
    notFound
  };
}

function createLeaderboardUser(registration) {
  const username = String(registration.leetcode_username || '').trim();
  return {
    name: username,
    display_name: registration.display_name || username,
    elo: 0,
    prev_elo: 0,
    prev_problem_count: 0,
    current_problem_count: 0,
    current_problem_delta: 0,
    problems_each_week: [],
    month_start_problem_count: 0,
    month_baseline_month: '',
    is_active: true,
    profile_not_found_count: 0
  };
}

async function fetchProblemCount(username) {
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'rays-leetcode-leaderboard-daily-refresh'
      },
      body: JSON.stringify({
        operationName: 'userProblemsSolved',
        query: LEETCODE_QUERY,
        variables: { username }
      })
    });
    if (!response.ok) {
      return { status: 'unavailable' };
    }
    const result = await response.json();
    if (result.errors || !result.data) {
      return { status: 'unavailable' };
    }
    if (!result.data.matchedUser) {
      return { status: 'not_found' };
    }
    const totals = result.data.matchedUser.submitStatsGlobal?.acSubmissionNum;
    const all = Array.isArray(totals)
      ? totals.find((entry) => entry.difficulty === 'All') || totals[0]
      : null;
    const count = Number(all?.count);
    return Number.isFinite(count) ? { status: 'ok', count } : { status: 'unavailable' };
  } catch (error) {
    console.error(`LeetCode refresh failed for ${username}`, error);
    return { status: 'unavailable' };
  }
}

function recordProfileSuccess(user, now) {
  user.last_profile_check = now.toISOString();
  user.profile_not_found_count = 0;
  user.is_active = true;
  delete user.last_profile_error;
  delete user.inactive_reason;
  delete user.inactive_since;
}

function recordProfileMissing(user, now) {
  const failures = Number(user.profile_not_found_count || 0) + 1;
  user.last_profile_check = now.toISOString();
  user.profile_not_found_count = failures;
  if (failures >= PROFILE_MISSING_THRESHOLD) {
    user.is_active = false;
    user.inactive_reason = 'LeetCode profile not found';
    user.inactive_since ||= now.toISOString();
  }
}

function updateProblemCount(user, count, now, isNew) {
  const { month, date } = challengeDate(now);
  if (isNew) {
    user.month_start_problem_count = count;
    user.month_baseline_month = month;
  } else if (user.month_baseline_month !== month) {
    const history = Array.isArray(user.problems_each_week) ? user.problems_each_week : [];
    const priorSnapshots = history.filter((point) =>
      point && typeof point === 'object' && point.date < `${month}-01` && Number.isFinite(Number(point.count))
    );
    const baseline = priorSnapshots.length
      ? priorSnapshots.reduce((latest, point) => point.date > latest.date ? point : latest).count
      : user.current_problem_count;
    user.month_start_problem_count = Number(baseline || 0);
    user.month_baseline_month = month;
  }

  user.current_problem_count = count;
  user.current_problem_delta = Math.max(0, count - Number(user.month_start_problem_count || 0));
  user.last_profile_check = now.toISOString();
  return date;
}

function recordProblemHistory(user, count, now) {
  const { date } = challengeDate(now);
  if (!Array.isArray(user.problems_each_week)) {
    user.problems_each_week = [];
  }
  const existing = user.problems_each_week.find((point) =>
    point && typeof point === 'object' && point.date === date
  );
  if (existing) {
    existing.count = count;
  } else {
    user.problems_each_week.push({ date, count });
  }
}

function challengeDate(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );
  return {
    month: `${parts.year}-${parts.month}`,
    date: `${parts.year}-${parts.month}-${parts.day}`
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await mapper(item);
    }
  });
  await Promise.all(workers);
}

function augustProgressKey(client, problem) {
  return `${AUGUST_PROGRESS_PREFIX}:${client}:${problem}`;
}

async function getAugustProgress(request, env) {
  const keys = AUGUST_CLIENTS.flatMap((client) =>
    Array.from({ length: AUGUST_PROBLEM_COUNT }, (_, index) => augustProgressKey(client, index + 1))
  );
  const values = await env.LEADERBOARD_KV.get(keys);
  const progress = Object.fromEntries(AUGUST_CLIENTS.map((client) => [
    client,
    Array.from(
      { length: AUGUST_PROBLEM_COUNT },
      (_, index) => values.get(augustProgressKey(client, index + 1)) === '1'
    )
  ]));

  return json({ progress }, 200, request, env);
}

async function updateAugustProgress(request, env) {
  if (!originAllowed(request, env)) {
    return json({ error: 'Origin is not allowed' }, 403, request, env);
  }

  const body = await readJsonBody(request, MAX_AUGUST_PROGRESS_BODY_BYTES);
  const client = String(body.client || '').toLowerCase();
  const problem = Number(body.problem);

  if (!AUGUST_CLIENTS.includes(client)) {
    return json({ error: 'Unknown client' }, 400, request, env);
  }

  if (!Number.isInteger(problem) || problem < 1 || problem > AUGUST_PROBLEM_COUNT) {
    return json({ error: 'Problem must be an integer from 1 to 30' }, 400, request, env);
  }

  if (typeof body.completed !== 'boolean') {
    return json({ error: 'Completed must be true or false' }, 400, request, env);
  }

  await env.LEADERBOARD_KV.put(
    augustProgressKey(client, problem),
    body.completed ? '1' : '0'
  );

  return json({ ok: true, client, problem, completed: body.completed }, 200, request, env);
}

async function getValue(request, env, key) {
  if (!key) {
    return json({ error: 'Missing key' }, 400, request, env);
  }

  const isAdmin = isAdminRequest(request, env);
  if (!PUBLIC_READ_KEYS.has(key) && !(isAdmin && ADMIN_READ_KEYS.has(key))) {
    return json({ error: 'Forbidden' }, 403, request, env);
  }

  const value = await env.LEADERBOARD_KV.get(key);
  return json({ value }, 200, request, env);
}

async function putValue(request, env) {
  if (!isAdminRequest(request, env)) {
    return json({ error: 'Admin token required' }, 401, request, env);
  }

  const body = await readJsonBody(request, MAX_ADMIN_BODY_BYTES);
  if (!body.key || typeof body.value !== 'string') {
    return json({ error: 'Expected { key, value }' }, 400, request, env);
  }

  if (!ADMIN_READ_KEYS.has(body.key)) {
    return json({ error: 'Key is not writable through this endpoint' }, 403, request, env);
  }

  await env.LEADERBOARD_KV.put(body.key, body.value);
  return json({ ok: true }, 200, request, env);
}

async function register(request, env) {
  if (!originAllowed(request, env)) {
    return json({ error: 'Origin is not allowed' }, 403, request, env);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimited = await checkRateLimit(env, ip);
  if (rateLimited) {
    return json({ error: 'Too many registration attempts. Try again later.' }, 429, request, env);
  }

  const body = await readJsonBody(request, MAX_REGISTER_BODY_BYTES);
  if (body.website) {
    return json({ error: 'Registration rejected' }, 400, request, env);
  }

  const candidate = normalizeRegistration(body);
  const validationError = validateRegistration(candidate);
  if (validationError) {
    return json({ error: validationError }, 400, request, env);
  }

  const turnstileError = await verifyTurnstile(body.turnstileToken, request, env);
  if (turnstileError) {
    return json({ error: turnstileError }, 400, request, env);
  }

  const [leetcodeExists, githubExists] = await Promise.all([
    verifyLeetCodeUser(candidate.leetcode_username),
    candidate.github_username ? verifyGitHubUser(candidate.github_username) : Promise.resolve(true)
  ]);

  if (!leetcodeExists) {
    return json({ error: 'That LeetCode username could not be verified.' }, 400, request, env);
  }

  if (!githubExists) {
    return json({ error: 'That GitHub username could not be verified.' }, 400, request, env);
  }

  const [users, pendingRegistrations, leaderboard] = await Promise.all([
    readJsonList(env, 'users:list'),
    readJsonList(env, 'registrations:pending'),
    readJsonList(env, 'leetcode:data')
  ]);
  const leetcodeLower = candidate.leetcode_username.toLowerCase();
  const githubLower = candidate.github_username.toLowerCase();

  const alreadyRegistered = users.some((user) =>
    String(user.leetcode_username || '').toLowerCase() === leetcodeLower ||
    (githubLower && String(user.github_username || '').toLowerCase() === githubLower)
  );

  const alreadyRanked = leaderboard.some((user) =>
    String(user.name || '').toLowerCase() === leetcodeLower
  );

  const alreadyPending = pendingRegistrations.some((user) =>
    String(user.leetcode_username || '').toLowerCase() === leetcodeLower ||
    (githubLower && String(user.github_username || '').toLowerCase() === githubLower)
  );

  if (alreadyRegistered || alreadyRanked) {
    return json({ error: 'This profile is already registered.' }, 409, request, env);
  }

  if (alreadyPending) {
    return json({ error: 'This profile is already awaiting review.' }, 409, request, env);
  }

  if (pendingRegistrations.length >= MAX_PENDING_REGISTRATIONS) {
    return json({ error: 'The review queue is currently full. Try again later.' }, 503, request, env);
  }

  pendingRegistrations.push({
    id: crypto.randomUUID(),
    leetcode_username: candidate.leetcode_username,
    github_username: candidate.github_username || '',
    display_name: candidate.display_name || candidate.leetcode_username,
    created_at: new Date().toISOString(),
    source: 'self-registration',
    status: 'pending'
  });

  await env.LEADERBOARD_KV.put('registrations:pending', JSON.stringify(pendingRegistrations));

  return json({
    ok: true,
    message: 'Registration submitted for review. Approved profiles appear after the next update.'
  }, 201, request, env);
}

async function readJsonBody(request, maxBodyBytes) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBodyBytes) {
    throw new HttpError('Request body is too large', 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    throw new HttpError('Request body is too large', 413);
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new HttpError('Request body must be valid JSON', 400);
  }
}

function normalizeRegistration(body) {
  return {
    leetcode_username: String(body.leetcode_username || '').trim(),
    github_username: String(body.github_username || '').trim().replace(/^@/, ''),
    display_name: String(body.display_name || '').trim().replace(/\s+/g, ' ')
  };
}

function validateRegistration(candidate) {
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(candidate.leetcode_username)) {
    return 'LeetCode username must be 3-32 letters, numbers, underscores, or hyphens.';
  }

  if (candidate.github_username && !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(candidate.github_username)) {
    return 'GitHub username is not valid.';
  }

  if (candidate.display_name.length > 60) {
    return 'Display name must be 60 characters or fewer.';
  }

  if (/https?:\/\//i.test(candidate.display_name) || /[\u0000-\u001F\u007F]/.test(candidate.display_name)) {
    return 'Display name contains unsupported characters.';
  }

  return '';
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return '';
  }

  if (!token) {
    return 'Verification challenge is required.';
  }

  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);

  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    formData.append('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  return result.success ? '' : 'Verification challenge failed.';
}

async function verifyLeetCodeUser(username) {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'rays-leetcode-leaderboard-registration'
    },
    body: JSON.stringify({
      operationName: 'userPublicProfile',
      query: `
        query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            username
          }
        }
      `,
      variables: { username }
    })
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return Boolean(result.data && result.data.matchedUser);
}

async function verifyGitHubUser(username) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'rays-leetcode-leaderboard-registration'
    }
  });

  return response.ok;
}

async function readJsonList(env, key) {
  const value = await env.LEADERBOARD_KV.get(key);
  if (!value || value === 'null') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to parse ${key}`, error);
    return [];
  }
}

async function checkRateLimit(env, ip) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);

  const dailyKey = `rate:register:${ip}:${day}`;
  const minuteKey = `rate:register:${ip}:${minute}`;

  const [dailyCount, minuteCount] = await Promise.all([
    incrementCounter(env, dailyKey, 172800),
    incrementCounter(env, minuteKey, 120)
  ]);

  return dailyCount > REGISTER_DAILY_LIMIT || minuteCount > REGISTER_MINUTE_LIMIT;
}

async function incrementCounter(env, key, expirationTtl) {
  const current = Number(await env.LEADERBOARD_KV.get(key) || 0);
  const next = current + 1;
  await env.LEADERBOARD_KV.put(key, String(next), { expirationTtl });
  return next;
}

function isAdminRequest(request, env) {
  if (!env.ADMIN_API_TOKEN) {
    return false;
  }

  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.ADMIN_API_TOKEN}`;
}

function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  if (!origin || allowedOrigins.length === 0) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))
    ? origin
    : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

function getAllowedOrigins(env) {
  return String(env.CORS_ALLOW_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env)
    }
  });
}
