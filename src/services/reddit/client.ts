import type { RedditCredentials } from '../../types/settings.js';

interface RedditTokenState {
  accessToken: string;
  expiresAt: number;
}

export interface RedditTraceHooks {
  onRequest?: (operation: string, payload: unknown) => void;
  onResponse?: (operation: string, payload: unknown) => void;
  onError?: (operation: string, payload: unknown) => void;
}

const DEFAULT_USER_AGENT = 'snoopy:reddit-client:v1';

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  author: string;
  url: string;
  postedAt: string;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  permalink?: string;
  url?: string;
  replies: RedditComment[];
}

interface RedditThingData {
  id?: string;
  subreddit?: string;
  title?: string;
  selftext?: string;
  body?: string;
  author?: string;
  permalink?: string;
  created_utc?: number;
  replies?: {
    data?: {
      children?: RedditThing[];
    };
  };
}

interface RedditThing {
  kind?: string;
  data?: RedditThingData;
}

let tokenState: RedditTokenState | null = null;

function assertCredentials(credentials: RedditCredentials): void {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.appName) {
    throw new Error('Reddit credentials are incomplete. clientId, clientSecret, and appName are required.');
  }
}

async function getAccessToken(credentials: RedditCredentials): Promise<string> {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const authHeader = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    body: params,
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': credentials.appName
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate with Reddit (${response.status} ${response.statusText}).`);
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) {
    throw new Error(`Failed to get Reddit access token${data.error ? `: ${data.error}` : ''}`);
  }

  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  tokenState = {
    accessToken: data.access_token,
    // Keep a small safety margin so token is refreshed before hard expiry.
    expiresAt: Date.now() + Math.max(expiresInSec - 30, 1) * 1000
  };

  return data.access_token;
}

async function ensureToken(credentials: RedditCredentials): Promise<string> {
  if (tokenState && Date.now() < tokenState.expiresAt) {
    return tokenState.accessToken;
  }

  return getAccessToken(credentials);
}

async function callOAuthRedditApi(
  endpoint: string,
  credentials: RedditCredentials,
  traceHooks?: RedditTraceHooks
): Promise<unknown> {
  assertCredentials(credentials);

  const makeRequest = async (token: string): Promise<Response | null> => {
    const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': credentials.appName
      }
    });

    if (response.status === 401 && tokenState?.accessToken === token) {
      tokenState = null;
      return null;
    }

    return response;
  };

  let token = await ensureToken(credentials);
  let response = await makeRequest(token);
  if (!response) {
    token = await ensureToken(credentials);
    response = await makeRequest(token);
  }

  if (!response) {
    throw new Error('Failed to authenticate with Reddit API.');
  }

  if (!response.ok) {
    traceHooks?.onError?.('reddit.oauth', {
      endpoint,
      status: response.status,
      statusText: response.statusText
    });
    throw new Error(`Reddit API request failed (${response.status} ${response.statusText}).`);
  }

  traceHooks?.onRequest?.('reddit.oauth', {
    method: 'GET',
    url: `https://oauth.reddit.com${endpoint}`,
    headers: {
      Authorization: 'Bearer [redacted]',
      'User-Agent': credentials.appName
    }
  });

  const json = await response.json();
  traceHooks?.onResponse?.('reddit.oauth', {
    endpoint,
    status: response.status,
    body: json
  });

  return json;
}

function isFallbackEligibleStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

function getUserAgent(credentials?: RedditCredentials | null): string {
  return credentials?.appName?.trim() || DEFAULT_USER_AGENT;
}

async function callRedditApi(
  endpoint: string,
  credentials?: RedditCredentials | null,
  traceHooks?: RedditTraceHooks
): Promise<unknown> {
  const userAgent = getUserAgent(credentials);
  const unauthUrl = `https://www.reddit.com${endpoint}`;

  try {
    traceHooks?.onRequest?.('reddit.public', {
      method: 'GET',
      url: unauthUrl,
      headers: {
        'User-Agent': userAgent
      }
    });
    const unauthResponse = await fetch(unauthUrl, {
      headers: {
        'User-Agent': userAgent
      }
    });

    if (unauthResponse.ok) {
      const json = await unauthResponse.json();
      traceHooks?.onResponse?.('reddit.public', {
        endpoint,
        status: unauthResponse.status,
        body: json
      });
      return json;
    }

    traceHooks?.onError?.('reddit.public', {
      endpoint,
      status: unauthResponse.status,
      statusText: unauthResponse.statusText
    });

    if (!isFallbackEligibleStatus(unauthResponse.status)) {
      throw new Error(`Reddit API request failed (${unauthResponse.status} ${unauthResponse.statusText}).`);
    }
  } catch (error) {
    if (!credentials) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch Reddit content without OAuth credentials.');
    }
  }

  if (!credentials) {
    throw new Error('Reddit denied unauthenticated access. Configure OAuth fallback credentials in settings.');
  }

  return callOAuthRedditApi(endpoint, credentials, traceHooks);
}

function parseComment(thing: RedditThing): RedditComment {
  const data = thing.data ?? {};
  const replies = data.replies?.data?.children ?? [];
  const permalink = typeof data.permalink === 'string' ? data.permalink : undefined;

  return {
    id: String(data.id ?? ''),
    author: String(data.author ?? '[deleted]'),
    body: String(data.body ?? data.selftext ?? ''),
    permalink,
    url: permalink ? `https://www.reddit.com${permalink}` : undefined,
    replies: replies
      .filter((child) => child.kind === 't1')
      .map((child) => parseComment(child))
  };
}

export async function getRecentSubredditPosts(
  subreddit: string,
  credentials?: RedditCredentials | null,
  traceHooks?: RedditTraceHooks
): Promise<RedditPost[]> {
  const response = (await callRedditApi(
    `/r/${encodeURIComponent(subreddit)}/new.json?raw_json=1&limit=100`,
    credentials,
    traceHooks
  )) as {
    data?: { children?: RedditThing[] };
  };

  const children = response.data?.children ?? [];

  return children
    .filter((item) => item.kind === 't3')
    .map((item) => {
      const data = item.data ?? {};
      const postId = String(data.id ?? '');
      const postSubreddit = String(data.subreddit ?? subreddit);
      const permalink = String(data.permalink ?? `/r/${postSubreddit}/comments/${postId}/`);
      return {
        id: postId,
        subreddit: postSubreddit,
        title: String(data.title ?? ''),
        body: String(data.selftext ?? ''),
        author: String(data.author ?? '[deleted]'),
        url: `https://www.reddit.com${permalink}`,
        postedAt: new Date((Number(data.created_utc ?? Date.now() / 1000) || Date.now() / 1000) * 1000).toISOString()
      };
    })
    .filter((post) => post.author !== 'AutoModerator');
}

export async function getRedditPostComments(
  postId: string,
  credentials?: RedditCredentials | null,
  traceHooks?: RedditTraceHooks
): Promise<RedditComment[]> {
  const response = (await callRedditApi(
    `/comments/${encodeURIComponent(postId)}.json?raw_json=1&limit=500`,
    credentials,
    traceHooks
  )) as Array<{
    data?: { children?: RedditThing[] };
  }>;

  const listing = response[1];
  const comments = listing?.data?.children ?? [];
  return comments.filter((item) => item.kind === 't1').map((item) => parseComment(item));
}
