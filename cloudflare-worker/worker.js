const PUBLIC_READ_KEYS = new Set(['leetcode:data', 'github:data']);
const ADMIN_READ_KEYS = new Set(['users:list', 'leetcode:data', 'github:data']);
const REGISTER_DAILY_LIMIT = 5;
const REGISTER_MINUTE_LIMIT = 2;
const MAX_BODY_BYTES = 4096;

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
        return register(request, env);
      }

      if (url.pathname === '/' && request.method === 'GET') {
        return getValue(request, env, url.searchParams.get('key'));
      }

      if (url.pathname === '/' && request.method === 'POST') {
        return putValue(request, env);
      }

      return json({ error: 'Not found' }, 404, request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, request, env);
      }

      console.error(error);
      return json({ error: 'Unexpected server error' }, 500, request, env);
    }
  }
};

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

  const body = await readJsonBody(request);
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

  const body = await readJsonBody(request);
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

  const users = await readJsonList(env, 'users:list');
  const leaderboard = await readJsonList(env, 'leetcode:data');
  const leetcodeLower = candidate.leetcode_username.toLowerCase();
  const githubLower = candidate.github_username.toLowerCase();

  const alreadyRegistered = users.some((user) =>
    String(user.leetcode_username || '').toLowerCase() === leetcodeLower ||
    (githubLower && String(user.github_username || '').toLowerCase() === githubLower)
  );

  const alreadyRanked = leaderboard.some((user) =>
    String(user.name || '').toLowerCase() === leetcodeLower
  );

  if (alreadyRegistered || alreadyRanked) {
    return json({ error: 'This profile is already registered.' }, 409, request, env);
  }

  users.push({
    id: crypto.randomUUID(),
    leetcode_username: candidate.leetcode_username,
    github_username: candidate.github_username || '',
    display_name: candidate.display_name || candidate.leetcode_username,
    created_at: new Date().toISOString(),
    source: 'self-registration'
  });

  await env.LEADERBOARD_KV.put('users:list', JSON.stringify(users));

  return json({
    ok: true,
    message: 'Registration received! You will appear on the leaderboard after the next update.'
  }, 201, request, env);
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError('Request body is too large', 413);
  }

  try {
    return await request.json();
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
