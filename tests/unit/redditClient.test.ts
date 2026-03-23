describe('Reddit client', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('maps subreddit posts and filters AutoModerator without OAuth credentials', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            children: [
              {
                kind: 't3',
                data: {
                  id: 'p1',
                  subreddit: 'askreddit',
                  title: 'Need startup advice',
                  selftext: 'post body',
                  author: 'real-user',
                  permalink: '/r/askreddit/comments/p1/need_startup_advice/',
                  created_utc: 1700000000
                }
              },
              {
                kind: 't3',
                data: {
                  id: 'p2',
                  subreddit: 'askreddit',
                  title: 'Automod update',
                  selftext: '',
                  author: 'AutoModerator',
                  permalink: '/r/askreddit/comments/p2/automod_update/',
                  created_utc: 1700000001
                }
              }
            ]
          }
        })
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    const posts = await getRecentSubredditPosts('askreddit');

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe('p1');
    expect(posts[0]?.author).toBe('real-user');
    expect(posts[0]?.url).toContain('/r/askreddit/comments/p1/need_startup_advice/');
  });

  it('falls back to OAuth when unauthenticated access is denied', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fresh', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: { children: [] }
        })
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    const posts = await getRecentSubredditPosts('typescript', {
      appName: 'snoopy-tests',
      clientId: 'id',
      clientSecret: 'secret'
    });

    expect(posts).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('parses nested comment replies into a tree', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => [
          { data: { children: [] } },
          {
            data: {
              children: [
                {
                  kind: 't1',
                  data: {
                    id: 'c1',
                    author: 'author-a',
                    body: 'top',
                    replies: {
                      data: {
                        children: [
                          {
                            kind: 't1',
                            data: {
                              id: 'c2',
                              author: 'author-b',
                              body: 'reply'
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRedditPostComments } = await import('../../src/services/reddit/client.js');
    const comments = await getRedditPostComments('post-1');

    expect(comments).toHaveLength(1);
    expect(comments[0]?.id).toBe('c1');
    expect(comments[0]?.replies[0]?.id).toBe('c2');
  });

  it('throws actionable error when unauthenticated access is denied and no fallback credentials exist', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({})
    });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');

    await expect(getRecentSubredditPosts('typescript')).rejects.toThrow(
      'Reddit denied unauthenticated access. Configure OAuth fallback credentials in settings.'
    );
  });

  it('throws direct public API error for non-fallback status codes', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({})
    });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(getRecentSubredditPosts('typescript')).rejects.toThrow(
      'Reddit API request failed (500 Internal Server Error).'
    );
  });

  it('uses default user agent and retries OAuth after a 401 response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'first-token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'second-token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: { children: [] } })
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    const posts = await getRecentSubredditPosts(
      'typescript',
      {
        appName: '   ',
        clientId: 'id',
        clientSecret: 'secret'
      },
      {
        onRequest: jest.fn(),
        onResponse: jest.fn(),
        onError: jest.fn()
      }
    );

    expect(posts).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('https://www.reddit.com/r/typescript/new.json'),
      expect.objectContaining({
        headers: {
          'User-Agent': 'snoopy:reddit-client:v1'
        }
      })
    );
  });

  it('throws when OAuth credentials are incomplete', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({})
    });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(
      getRecentSubredditPosts('typescript', {
        appName: 'snoopy-tests',
        clientId: '',
        clientSecret: ''
      })
    ).rejects.toThrow('Reddit credentials are incomplete. clientId, clientSecret, and appName are required.');
  });

  it('maps comment defaults and excludes non-comment items', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => [
          { data: { children: [] } },
          {
            data: {
              children: [
                {
                  kind: 'more',
                  data: {
                    id: 'm1'
                  }
                },
                {
                  kind: 't1',
                  data: {
                    id: 'c3',
                    author: undefined,
                    selftext: 'fallback body'
                  }
                }
              ]
            }
          }
        ]
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRedditPostComments } = await import('../../src/services/reddit/client.js');
    const comments = await getRedditPostComments('post-1');

    expect(comments).toHaveLength(1);
    expect(comments[0]).toEqual(
      expect.objectContaining({
        id: 'c3',
        author: '[deleted]',
        body: 'fallback body'
      })
    );
  });

  it('throws when OAuth endpoint keeps returning unauthorized after token refresh', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'first-token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'second-token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({})
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(
      getRecentSubredditPosts('typescript', {
        appName: 'snoopy-tests',
        clientId: 'id',
        clientSecret: 'secret'
      })
    ).rejects.toThrow('Failed to authenticate with Reddit API.');
  });

  it('throws specific token acquisition error when access token is absent', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'invalid_client' })
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(
      getRecentSubredditPosts('typescript', {
        appName: 'snoopy-tests',
        clientId: 'id',
        clientSecret: 'secret'
      })
    ).rejects.toThrow('Failed to get Reddit access token: invalid_client');
  });

  it('reports OAuth request errors when authenticated call is non-OK', async () => {
    const onError = jest.fn();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({})
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(
      getRecentSubredditPosts(
        'typescript',
        { appName: 'snoopy-tests', clientId: 'id', clientSecret: 'secret' },
        { onError }
      )
    ).rejects.toThrow('Reddit API request failed (500 Server Error).');

    expect(onError).toHaveBeenCalledWith(
      'reddit.oauth',
      expect.objectContaining({ status: 500, statusText: 'Server Error' })
    );
  });

  it('reuses cached OAuth token before expiry', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'cached-token', expires_in: 3600 })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: { children: [] } })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: { children: [] } })
      });

    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await getRecentSubredditPosts('typescript', {
      appName: 'snoopy-tests',
      clientId: 'id',
      clientSecret: 'secret'
    });
    await getRecentSubredditPosts('typescript', {
      appName: 'snoopy-tests',
      clientId: 'id',
      clientSecret: 'secret'
    });

    const tokenFetchCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/api/v1/access_token')
    );
    expect(tokenFetchCalls).toHaveLength(1);
  });

  it('throws fallback fetch message when public request throws a non-Error value without credentials', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest.fn().mockRejectedValue('boom-string') as unknown as typeof fetch
    );

    const { getRecentSubredditPosts } = await import('../../src/services/reddit/client.js');
    await expect(getRecentSubredditPosts('typescript')).rejects.toThrow(
      'Failed to fetch Reddit content without OAuth credentials.'
    );
  });
});
