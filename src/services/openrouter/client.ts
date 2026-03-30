import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { z } from 'zod';
import type { ClarificationQuestion, GeneratedJobSpec } from '../../types/job.js';
import type { ModelSettings } from '../../types/settings.js';
import type { RedditComment } from '../reddit/client.js';
import { logger } from '../../utils/logger.js';
import { buildClarificationPrompt, buildSpecPrompt } from './prompts.js';

const clarificationSchema = z.object({
  questions: z.array(z.object({ id: z.string(), question: z.string() })).min(1)
});

const specSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(2),
  description: z.string().min(5),
  qualificationPrompt: z.string().min(8),
  suggestedSubreddits: z.array(z.string().min(2)).min(1)
});

const qualifySchema = z.object({
  qualified: z.boolean(),
  reason: z.string().min(1).max(80)
});

export interface QualificationResult {
  qualified: boolean;
  reason: string;
  promptTokens: number;
  completionTokens: number;
}

export interface OpenRouterTraceHooks {
  onRequest?: (operation: string, payload: unknown) => void;
  onResponse?: (operation: string, payload: unknown) => void;
  onError?: (operation: string, payload: unknown) => void;
}

interface QualificationRequestBase {
  model: string;
  modelSettings: ModelSettings;
  qualificationPrompt: string;
}

interface QualifyPostRequest extends QualificationRequestBase {
  postTitle: string;
  postBody: string;
}

interface QualifyCommentThreadRequest extends QualificationRequestBase {
  postTitle: string;
  postBody: string;
  targetAuthor: string;
  thread: RedditComment[];
}

function toAlphaLabel(index: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let value = index;
  let label = '';

  do {
    label = `${alphabet[value % 26]}${label}`;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

function buildAnonymizedThreadLines(thread: RedditComment[], targetAuthor: string): string[] {
  const authorLabels = new Map<string, string>();
  let nextLabelIndex = 0;

  return thread.map((comment) => {
    const author = comment.author || '[deleted]';
    let displayAuthor = author;

    if (author !== targetAuthor) {
      const existingLabel = authorLabels.get(author);
      if (existingLabel) {
        displayAuthor = existingLabel;
      } else {
        const generatedLabel = `User ${toAlphaLabel(nextLabelIndex)}`;
        nextLabelIndex += 1;
        authorLabels.set(author, generatedLabel);
        displayAuthor = generatedLabel;
      }
    }

    return `- (${displayAuthor}) ${comment.body}`;
  });
}

interface CompletionLike {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

const QUALIFICATION_TOOL_NAME = 'submit_qualification';

const QUALIFICATION_TOOL = {
  type: 'function' as const,
  function: {
    name: QUALIFICATION_TOOL_NAME,
    description:
      'Submit final qualification result for one Reddit item. Use concise reason text only.',
    parameters: {
      type: 'object',
      properties: {
        qualified: {
          type: 'boolean'
        },
        reason: {
          type: 'string',
          maxLength: 80,
          description: 'A short reason under 80 characters.'
        }
      },
      required: ['qualified', 'reason'],
      additionalProperties: false
    }
  }
};

export interface OpenRouterModelOption {
  id: string;
  name: string;
}

export class OpenRouterClientError extends Error {
  readonly kind: 'auth' | 'rate_limit' | 'api' | 'parse' | 'unknown';

  constructor(kind: OpenRouterClientError['kind'], message: string) {
    super(message);
    this.name = 'OpenRouterClientError';
    this.kind = kind;
  }
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
}

function parseStructuredJson<T>(raw: string): T {
  try {
    return JSON.parse(extractJsonPayload(raw)) as T;
  } catch (error) {
    throw new OpenRouterClientError(
      'parse',
      `OpenRouter returned a response that was not valid JSON. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function toOpenRouterError(error: unknown): OpenRouterClientError {
  if (error instanceof OpenRouterClientError) {
    return error;
  }

  if (error instanceof OpenAI.AuthenticationError) {
    return new OpenRouterClientError('auth', 'OpenRouter authentication failed. Check your API key and try again.');
  }

  if (error instanceof OpenAI.RateLimitError) {
    return new OpenRouterClientError('rate_limit', 'OpenRouter rate limit reached. Try again shortly.');
  }

  if (error instanceof OpenAI.APIError) {
    return new OpenRouterClientError(
      'api',
      `OpenRouter request failed (${error.status ?? 'unknown status'}). ${error.message}`
    );
  }

  if (error instanceof Error) {
    return new OpenRouterClientError('unknown', error.message);
  }

  return new OpenRouterClientError('unknown', 'OpenRouter request failed for an unknown reason.');
}

function tryExtractQualification(raw: string): { qualified: boolean; reason: string } | null {
  const trimmed = raw.trim();
  const qualifiedMatch = trimmed.match(/"qualified"\s*:\s*(true|false)/i);
  const reasonMatch = trimmed.match(/"reason"\s*:\s*"([\s\S]*)/i);

  if (!qualifiedMatch || !reasonMatch) {
    return null;
  }

  let reason = reasonMatch[1]
    .replace(/\\n/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/["}\]]+\s*$/, '')
    .trim();

  if (!reason) {
    reason = 'No reason provided';
  }

  return {
    qualified: qualifiedMatch[1].toLowerCase() === 'true',
    reason: reason.slice(0, 80)
  };
}

export class OpenRouterClient {
  private readonly client: OpenAI;
  private readonly apiKey: string;
  private readonly modelCapabilityCache = new Map<string, boolean>();
  private readonly traceHooks?: OpenRouterTraceHooks;

  constructor(apiKey: string, traceHooks?: OpenRouterTraceHooks) {
    this.apiKey = apiKey;
    this.traceHooks = traceHooks;
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1'
    });
  }

  private traceRequest(operation: string, payload: unknown): void {
    this.traceHooks?.onRequest?.(operation, payload);
  }

  private traceResponse(operation: string, payload: unknown): void {
    this.traceHooks?.onResponse?.(operation, payload);
  }

  private traceError(operation: string, error: unknown): void {
    this.traceHooks?.onError?.(operation, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  async modelSupportsTools(model: string): Promise<boolean> {
    if (this.modelCapabilityCache.has(model)) {
      return this.modelCapabilityCache.get(model)!;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });

      if (!response.ok) {
        this.modelCapabilityCache.set(model, false);
        return false;
      }

      const json = (await response.json()) as {
        data?: Array<{ id: string; supported_parameters?: string[] }>;
      };
      const modelData = (json.data ?? []).find((m) => m.id === model);
      const supports = modelData?.supported_parameters?.includes('tools') ?? false;
      this.modelCapabilityCache.set(model, supports);
      return supports;
    } catch {
      this.modelCapabilityCache.set(model, false);
      return false;
    }
  }

  async listModels(): Promise<OpenRouterModelOption[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models (${response.status})`);
    }

    const json = (await response.json()) as { data?: Array<{ id: string; name?: string }> };
    return (json.data ?? []).slice(0, 50).map((item) => ({
      id: item.id,
      name: item.name ?? item.id
    }));
  }

  async generateClarificationQuestions(criteria: string, model: string): Promise<ClarificationQuestion[]> {
    try {
      const completion = await this.client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [{ role: 'user', content: buildClarificationPrompt(criteria) }]
      });

      const raw = completion.choices[0]?.message?.content ?? '';
      const parsed = clarificationSchema.parse(parseStructuredJson(raw));
      return parsed.questions.slice(0, 4);
    } catch (error) {
      throw toOpenRouterError(error);
    }
  }

  async generateJobSpec(
    criteria: string,
    answers: Array<{ question: string; answer: string }>,
    model: string
  ): Promise<GeneratedJobSpec> {
    try {
      const completion = await this.client.chat.completions.create({
        model,
        temperature: 0.4,
        messages: [{ role: 'user', content: buildSpecPrompt(criteria, answers) }]
      });

      const raw = completion.choices[0]?.message?.content ?? '';
      const parsed = specSchema.parse(parseStructuredJson(raw));

      return {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
        qualificationPrompt: parsed.qualificationPrompt,
        suggestedSubreddits: parsed.suggestedSubreddits.map((value) =>
          value.replace(/^r\//i, '').trim()
        )
      };
    } catch (error) {
      throw toOpenRouterError(error);
    }
  }

  async qualifyPost(input: QualifyPostRequest): Promise<QualificationResult> {
    const userMessage = [`Post title: ${input.postTitle}`, '', `Post body: ${input.postBody}`].join('\n');
    return this.runQualification(input, userMessage);
  }

  async qualifyCommentThread(input: QualifyCommentThreadRequest): Promise<QualificationResult> {
    const threadText = buildAnonymizedThreadLines(input.thread, input.targetAuthor).join('\n');

    const userMessage = [
      `Post title: ${input.postTitle}`,
      '',
      `Post body: ${input.postBody}`,
      '',
      'Comment thread (chronological):',
      threadText,
      '',
      `Important: QUALIFY ONLY the final comment line authored by ${input.targetAuthor}.`,
      'Treat all earlier lines as context only and do not qualify them.'
    ].join('\n');

    return this.runQualification(input, userMessage);
  }

  private async runQualification(
    input: QualificationRequestBase,
    userMessage: string
  ): Promise<QualificationResult> {
    const systemPrompt = [
      'You are a lead qualification classifier for Reddit monitoring jobs.',
      '',
      'Apply this qualification rubric exactly:',
      input.qualificationPrompt,
      '',
      'Respond only as JSON with this schema:',
      '{"qualified": boolean, "reason": string}',
      'The reason must be concise, no more than 12 words, and no more than 80 characters.'
    ].join('\n');

    const supportsTools = await this.modelSupportsTools(input.model);
    const baseMaxTokens = Math.max(80, input.modelSettings.maxTokens);
    const expandedMaxTokens = Math.max(baseMaxTokens, 800);

    try {
      let parsed: { qualified: boolean; reason: string } | null = null;
      let promptTokens = 0;
      let completionTokens = 0;

      if (supportsTools) {
        const toolPayload: ChatCompletionCreateParamsNonStreaming = {
          model: input.model,
          temperature: input.modelSettings.temperature,
          top_p: input.modelSettings.topP,
          max_tokens: baseMaxTokens,
          tools: [QUALIFICATION_TOOL],
          tool_choice: {
            type: 'function',
            function: {
              name: QUALIFICATION_TOOL_NAME
            }
          },
          parallel_tool_calls: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        };
        this.traceRequest('chat.completions.create.tools', toolPayload);
        const completion = (await this.client.chat.completions.create(toolPayload)) as CompletionLike;
        this.traceResponse('chat.completions.create.tools', completion);

        const toolCalls = completion.choices?.[0]?.message?.tool_calls;
        parsed = this.parseQualificationToolCalls(toolCalls);

        if (!parsed) {
          parsed = this.parseQualificationContent(completion.choices?.[0]?.message?.content ?? '');
        }

        promptTokens = completion.usage?.prompt_tokens ?? 0;
        completionTokens = completion.usage?.completion_tokens ?? 0;

        if (!parsed && this.isTruncatedWithoutStructuredOutput(completion)) {
          logger.warn(
            `Qualification tool-call truncated for model ${input.model}; retrying with max_tokens=${expandedMaxTokens}.`
          );
          const retryToolPayload: ChatCompletionCreateParamsNonStreaming = {
            model: input.model,
            temperature: 0,
            top_p: 1,
            max_tokens: expandedMaxTokens,
            tools: [QUALIFICATION_TOOL],
            tool_choice: {
              type: 'function',
              function: {
                name: QUALIFICATION_TOOL_NAME
              }
            },
            parallel_tool_calls: false,
            messages: [
              {
                role: 'system',
                content: `${systemPrompt}\nReturn only the function arguments. Do not add any extra text.`
              },
              { role: 'user', content: userMessage }
            ]
          };
          this.traceRequest('chat.completions.create.tools.retry', retryToolPayload);
          const retryWithTools = (await this.client.chat.completions.create(retryToolPayload)) as CompletionLike;
          this.traceResponse('chat.completions.create.tools.retry', retryWithTools);

          parsed = this.parseQualificationToolCalls(retryWithTools.choices?.[0]?.message?.tool_calls);
          if (!parsed) {
            parsed = this.parseQualificationContent(retryWithTools.choices?.[0]?.message?.content ?? '');
          }

          promptTokens += retryWithTools.usage?.prompt_tokens ?? 0;
          completionTokens += retryWithTools.usage?.completion_tokens ?? 0;
        }
      }

      if (!parsed) {
        const jsonFallbackPayload: ChatCompletionCreateParamsNonStreaming = {
          model: input.model,
          temperature: 0,
          top_p: 1,
          max_tokens: Math.max(120, Math.min(baseMaxTokens, 400)),
          response_format: {
            type: 'json_object'
          },
          messages: [
            {
              role: 'system',
              content:
                `${systemPrompt}\nOutput one compact JSON object only, with no markdown and no extra text.`
            },
            { role: 'user', content: userMessage }
          ]
        };
        this.traceRequest('chat.completions.create.json_fallback', jsonFallbackPayload);
        const retry = (await this.client.chat.completions.create(jsonFallbackPayload)) as CompletionLike;
        this.traceResponse('chat.completions.create.json_fallback', retry);

        parsed = this.parseQualificationContent(retry.choices?.[0]?.message?.content ?? '');
        promptTokens += retry.usage?.prompt_tokens ?? 0;
        completionTokens += retry.usage?.completion_tokens ?? 0;

        if (!parsed && this.isTruncatedWithoutStructuredOutput(retry)) {
          logger.warn(
            `Qualification JSON fallback truncated for model ${input.model}; retrying with max_tokens=${expandedMaxTokens}.`
          );
          const expandedJsonRetryPayload: ChatCompletionCreateParamsNonStreaming = {
            model: input.model,
            temperature: 0,
            top_p: 1,
            max_tokens: expandedMaxTokens,
            response_format: {
              type: 'json_object'
            },
            messages: [
              {
                role: 'system',
                content:
                  `${systemPrompt}\nOutput one compact JSON object only, with no markdown and no extra text.`
              },
              { role: 'user', content: userMessage }
            ]
          };
          this.traceRequest('chat.completions.create.json_fallback.retry', expandedJsonRetryPayload);
          const expandedJsonRetry = (await this.client.chat.completions.create(expandedJsonRetryPayload)) as CompletionLike;
          this.traceResponse('chat.completions.create.json_fallback.retry', expandedJsonRetry);

          parsed = this.parseQualificationContent(expandedJsonRetry.choices?.[0]?.message?.content ?? '');
          promptTokens += expandedJsonRetry.usage?.prompt_tokens ?? 0;
          completionTokens += expandedJsonRetry.usage?.completion_tokens ?? 0;
        }
      }

      if (!parsed) {
        logger.warn(`Qualification output invalid after retries for model ${input.model}.`);
        return {
          qualified: false,
          reason: 'Model output invalid; marked unqualified',
          promptTokens,
          completionTokens
        };
      }

      return {
        qualified: parsed.qualified,
        reason: parsed.reason,
        promptTokens,
        completionTokens
      };
    } catch (error) {
      this.traceError('chat.completions.create', error);
      throw toOpenRouterError(error);
    }
  }

  private isTruncatedWithoutStructuredOutput(completion: CompletionLike): boolean {
    const choice = completion.choices?.[0];
    if (!choice || choice.finish_reason !== 'length') {
      return false;
    }

    const message = choice.message;
    const hasContent = typeof message?.content === 'string' && message.content.trim().length > 0;
    const hasToolArgs =
      Array.isArray(message?.tool_calls) &&
      message.tool_calls.some((toolCall) => Boolean(toolCall.function?.arguments?.trim()));

    return !hasContent && !hasToolArgs;
  }

  private parseQualificationToolCalls(
    toolCalls: Array<{ type?: string; function?: { name?: string; arguments?: string } }> | undefined
  ): { qualified: boolean; reason: string } | null {
    if (!toolCalls || toolCalls.length === 0) {
      return null;
    }

    const qualificationToolCall = toolCalls.find(
      (toolCall) => toolCall.type === 'function' && toolCall.function?.name === QUALIFICATION_TOOL_NAME
    );

    const rawArgs = qualificationToolCall?.function?.arguments;
    if (!rawArgs) {
      return null;
    }

    try {
      return qualifySchema.parse(parseStructuredJson(rawArgs));
    } catch {
      const recovered = tryExtractQualification(rawArgs);
      if (!recovered) {
        return null;
      }

      try {
        return qualifySchema.parse(recovered);
      } catch {
        return null;
      }
    }
  }

  private parseQualificationContent(raw: string): { qualified: boolean; reason: string } | null {
    try {
      return qualifySchema.parse(parseStructuredJson(raw));
    } catch {
      const recovered = tryExtractQualification(raw);
      if (!recovered) {
        return null;
      }

      try {
        return qualifySchema.parse(recovered);
      } catch {
        return null;
      }
    }
  }
}
