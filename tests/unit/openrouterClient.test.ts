import OpenAI from 'openai';
import { OpenRouterClient, OpenRouterClientError } from '../../src/services/openrouter/client.js';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  slug: z.string()
});

function parseLikeClient(raw: string): { name: string; slug: string } {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const payload = fencedMatch?.[1]
    ? fencedMatch[1].trim()
    : (() => {
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          return trimmed.slice(firstBrace, lastBrace + 1);
        }
        return trimmed;
      })();

  try {
    return schema.parse(JSON.parse(payload));
  } catch (error) {
    throw new OpenRouterClientError(
      'parse',
      `OpenRouter returned a response that was not valid JSON. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

describe('OpenRouter JSON parsing behavior', () => {
  it('accepts markdown fenced json responses', () => {
    const result = parseLikeClient('```json\n{"name":"AI Enthusiasts","slug":"ai-enthusiasts"}\n```');
    expect(result.slug).toBe('ai-enthusiasts');
  });

  it('accepts wrapper text around json objects', () => {
    const result = parseLikeClient('Here is the result:\n{"name":"AI Enthusiasts","slug":"ai-enthusiasts"}');
    expect(result.name).toBe('AI Enthusiasts');
  });

  it('throws a parse-classified client error on invalid json', () => {
    expect(() => parseLikeClient('not-json')).toThrow(OpenRouterClientError);
  });

  it('parses qualification result from tool call arguments when model supports tools', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(true);

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              {
                type: 'function',
                function: {
                  name: 'submit_qualification',
                  arguments: '{"qualified":true,"reason":"Strong fit for startup-help criteria"}'
                }
              }
            ]
          }
        }
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 4
      }
    });

    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyPost({
      model: 'test-model',
      modelSettings: {
        temperature: 0,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'Need feedback on my SaaS go-to-market plan',
      postBody: 'We are pre-seed and need distribution advice'
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.any(Array),
        tool_choice: {
          type: 'function',
          function: {
            name: 'submit_qualification'
          }
        }
      })
    );

    expect(result).toEqual({
      qualified: true,
      reason: 'Strong fit for startup-help criteria',
      promptTokens: 12,
      completionTokens: 4
    });
  });

  it('falls back to json_object when model does not support tools', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(false);

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"qualified":false,"reason":"Not a startup operator"}'
          }
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8
      }
    });

    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyPost({
      model: 'json-only-model',
      modelSettings: {
        temperature: 0,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'Cool dog video',
      postBody: 'Look at my dog'
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' }
      })
    );
    expect(createMock).toHaveBeenCalledTimes(1);

    expect(createMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ tools: expect.any(Array) })
    );

    expect(result).toEqual({
      qualified: false,
      reason: 'Not a startup operator',
      promptTokens: 10,
      completionTokens: 8
    });
  });

  it('retries tool calling with expanded max_tokens when first response is truncated', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(true);

    const createMock = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: null,
              tool_calls: []
            }
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 80
        }
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'submit_qualification',
                    arguments: '{"qualified":true,"reason":"Founder asks for concrete GTM help"}'
                  }
                }
              ]
            }
          }
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 300
        }
      });

    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyPost({
      model: 'test-model',
      modelSettings: {
        temperature: 0.2,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'Need GTM feedback for my B2B SaaS',
      postBody: 'We need advice on first distribution channel'
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tools: expect.any(Array),
        max_tokens: 100
      })
    );
    expect(createMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tools: expect.any(Array),
        max_tokens: 800,
        temperature: 0
      })
    );

    expect(result).toEqual({
      qualified: true,
      reason: 'Founder asks for concrete GTM help',
      promptTokens: 220,
      completionTokens: 380
    });
  });

  it('retries json fallback with expanded max_tokens when first json response is truncated', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(false);

    const createMock = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: null
            }
          }
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 120
        }
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"qualified":false,"reason":"No startup intent"}'
            }
          }
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 200
        }
      });

    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyPost({
      model: 'json-only-model',
      modelSettings: {
        temperature: 0,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'General motivational quote',
      postBody: 'Just vibes'
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        response_format: { type: 'json_object' },
        max_tokens: 120
      })
    );
    expect(createMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        response_format: { type: 'json_object' },
        max_tokens: 800
      })
    );

    expect(result).toEqual({
      qualified: false,
      reason: 'No startup intent',
      promptTokens: 45,
      completionTokens: 320
    });
  });

  it('caches model tool support lookups', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'model-a', supported_parameters: ['tools'] }]
      })
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as typeof fetch);

    const client = new OpenRouterClient('test-key');
    await expect(client.modelSupportsTools('model-a')).resolves.toBe(true);
    await expect(client.modelSupportsTools('model-a')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false for tool support when models endpoint is non-200', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    );

    const client = new OpenRouterClient('test-key');
    await expect(client.modelSupportsTools('model-b')).resolves.toBe(false);
  });

  it('lists models with default name fallback and 50 item cap', async () => {
    const items = Array.from({ length: 55 }, (_, i) => ({
      id: `model-${i + 1}`,
      name: i % 2 === 0 ? `Model ${i + 1}` : undefined
    }));
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: items }) }) as unknown as typeof fetch
    );

    const client = new OpenRouterClient('test-key');
    const models = await client.listModels();

    expect(models).toHaveLength(50);
    expect(models[0]).toEqual({ id: 'model-1', name: 'Model 1' });
    expect(models[1]).toEqual({ id: 'model-2', name: 'model-2' });
  });

  it('throws when listing models fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch
    );

    const client = new OpenRouterClient('test-key');
    await expect(client.listModels()).rejects.toThrow('Failed to fetch models (503)');
  });

  it('falls back to safe unqualified result when model output is invalid after retries', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(false);

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'not-json'
          }
        }
      ],
      usage: {
        prompt_tokens: 3,
        completion_tokens: 2
      }
    });

    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyPost({
      model: 'json-only-model',
      modelSettings: {
        temperature: 0,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'post',
      postBody: 'body'
    });

    expect(result).toEqual({
      qualified: false,
      reason: 'Model output invalid; marked unqualified',
      promptTokens: 3,
      completionTokens: 2
    });
  });

  it('extracts qualification data from malformed tool arguments when possible', () => {
    const client = new OpenRouterClient('test-key');
    const parsed = (
      client as unknown as {
        parseQualificationToolCalls: (
          calls: Array<{ type?: string; function?: { name?: string; arguments?: string } }>
        ) => { qualified: boolean; reason: string } | null;
      }
    ).parseQualificationToolCalls([
      {
        type: 'function',
        function: {
          name: 'submit_qualification',
          arguments: '{"qualified": true, "reason": "Strong fit for startup founders"'
        }
      }
    ]);

    expect(parsed).toEqual({
      qualified: true,
      reason: 'Strong fit for startup founders'
    });
  });

  it('returns null for invalid non-recoverable qualification content', () => {
    const client = new OpenRouterClient('test-key');
    const parsed = (
      client as unknown as {
        parseQualificationContent: (raw: string) => { qualified: boolean; reason: string } | null;
      }
    ).parseQualificationContent('totally invalid');

    expect(parsed).toBeNull();
  });

  it('wraps unexpected completion errors and triggers trace hook', async () => {
    const onError = jest.fn();
    const client = new OpenRouterClient('test-key', { onError });
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(false);

    const createMock = jest.fn().mockRejectedValue(new Error('boom'));
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    await expect(
      client.qualifyPost({
        model: 'json-only-model',
        modelSettings: {
          temperature: 0,
          maxTokens: 100,
          topP: 1
        },
        qualificationPrompt: 'qualify startup operators asking for help',
        postTitle: 'post',
        postBody: 'body'
      })
    ).rejects.toMatchObject({ kind: 'unknown', message: 'boom' });

    expect(onError).toHaveBeenCalled();
  });

  it('generates clarification questions and trims to at most four', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"questions":[{"id":"q1","question":"one?"},{"id":"q2","question":"two?"},{"id":"q3","question":"three?"},{"id":"q4","question":"four?"},{"id":"q5","question":"five?"}]}'
          }
        }
      ]
    });
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.generateClarificationQuestions('find founders', 'model-a');
    expect(result).toHaveLength(4);
    expect(result[0]?.id).toBe('q1');
  });

  it('throws parse-classified error when clarification response is invalid JSON', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'not-json'
          }
        }
      ]
    });
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    await expect(client.generateClarificationQuestions('find founders', 'model-a')).rejects.toMatchObject({
      kind: 'parse'
    });
  });

  it('generates a job spec and normalizes suggested subreddit prefixes', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"name":"Founder Requests","slug":"founder-requests","description":"Tracks founder asks","qualificationPrompt":"Decide if this asks for startup help.","suggestedSubreddits":["r/startups","entrepreneur"]}'
          }
        }
      ]
    });
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const spec = await client.generateJobSpec(
      'find founders',
      [{ question: 'q', answer: 'a' }],
      'model-a'
    );

    expect(spec.suggestedSubreddits).toEqual(['startups', 'entrepreneur']);
  });

  it('qualifies comment threads through the same qualification pipeline', async () => {
    const client = new OpenRouterClient('test-key');
    jest.spyOn(client, 'modelSupportsTools').mockResolvedValue(false);

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '{"qualified":true,"reason":"Latest author comment asks for GTM advice"}'
          }
        }
      ],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 6
      }
    });
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: {
        completions: {
          create: createMock
        }
      }
    };

    const result = await client.qualifyCommentThread({
      model: 'json-only-model',
      modelSettings: {
        temperature: 0,
        maxTokens: 100,
        topP: 1
      },
      qualificationPrompt: 'qualify startup operators asking for help',
      postTitle: 'Need GTM help',
      targetAuthor: 'alice',
      thread: [
        { id: 'c1', author: 'bob', body: 'context', replies: [] },
        { id: 'c2', author: 'alice', body: 'I need GTM ideas', replies: [] }
      ]
    });

    expect(result.qualified).toBe(true);
    expect(createMock).toHaveBeenCalled();
  });

  it('maps OpenAI AuthenticationError to auth client error', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest
      .fn()
      .mockRejectedValue(new OpenAI.AuthenticationError(undefined as never, undefined, undefined, new Headers()));
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: { completions: { create: createMock } }
    };

    await expect(client.generateClarificationQuestions('criteria', 'model')).rejects.toMatchObject({
      kind: 'auth'
    });
  });

  it('maps OpenAI RateLimitError to rate_limit client error', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest
      .fn()
      .mockRejectedValue(new OpenAI.RateLimitError(undefined as never, undefined, undefined, new Headers()));
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: { completions: { create: createMock } }
    };

    await expect(client.generateClarificationQuestions('criteria', 'model')).rejects.toMatchObject({
      kind: 'rate_limit'
    });
  });

  it('maps OpenAI APIError to api client error', async () => {
    const client = new OpenRouterClient('test-key');
    const createMock = jest.fn().mockRejectedValue(new OpenAI.APIError(undefined, undefined, undefined, undefined));
    (client as unknown as { client: { chat: { completions: { create: typeof createMock } } } }).client = {
      chat: { completions: { create: createMock } }
    };

    await expect(client.generateClarificationQuestions('criteria', 'model')).rejects.toMatchObject({
      kind: 'api'
    });
  });

  it('returns null when tool calls contain no qualification function payload', () => {
    const client = new OpenRouterClient('test-key');
    const parsed = (
      client as unknown as {
        parseQualificationToolCalls: (
          calls: Array<{ type?: string; function?: { name?: string; arguments?: string } }>
        ) => { qualified: boolean; reason: string } | null;
      }
    ).parseQualificationToolCalls([
      {
        type: 'function',
        function: {
          name: 'different_tool',
          arguments: '{"ok":true}'
        }
      }
    ]);

    expect(parsed).toBeNull();
  });
});
