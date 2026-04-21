import type { Job } from '../../types/job.js';
import { SettingsRepository } from '../db/repositories/settingsRepo.js';
import { ActiveRunConflictError, RunsRepository } from '../db/repositories/runsRepo.js';
import { ScanItemsRepository } from '../db/repositories/scanItemsRepo.js';
import { getOpenRouterApiKey } from '../security/secretStore.js';
import { logger } from '../../utils/logger.js';
import { sendJobNotification } from '../../utils/notify.js';
import { OpenRouterClient } from '../openrouter/client.js';
import type { ModelSettings } from '../../types/settings.js';
import type { RedditComment } from '../reddit/client.js';
import { getRecentSubredditPosts, getRedditPostComments } from '../reddit/client.js';
import { createRunLogger } from '../logging/runLogger.js';
import { cleanupOldLogs } from '../logging/logRotation.js';
import { toSnippet } from '../../utils/scanLogFormatting.js';

interface QualifyStats {
  promptTokens: number;
  completionTokens: number;
}

export interface JobRunOptions {
  maxNewItems?: number;
  onProgress?: (event: JobRunProgressEvent) => void;
}

export type JobRunProgressEvent =
  | {
      type: 'run_start';
      jobId: string;
      jobName: string;
      subredditCount: number;
      maxNewItems?: number;
    }
  | {
      type: 'run_skipped';
      reason: 'missing_api_key' | 'already_running';
      message: string;
    }
  | {
      type: 'subreddit_fetched';
      subreddit: string;
      postCount: number;
    }
  | {
      type: 'post_scanned';
      postId: string;
      subreddit: string;
      status: 'existing' | 'new';
      title?: string;
      bodySnippet?: string;
      postUrl?: string;
      qualified?: boolean;
      qualificationReason?: string;
      itemsNew: number;
      itemsQualified: number;
    }
  | {
      type: 'comments_loaded';
      postId: string;
      subreddit: string;
      authors: number;
      threads: number;
    }
  | {
      type: 'comment_scanned';
      postId: string;
      commentId: string;
      author: string;
      status: 'existing' | 'new';
      commentSnippet?: string;
      postUrl?: string;
      commentUrl?: string;
      qualified?: boolean;
      qualificationReason?: string;
      itemsNew: number;
      itemsQualified: number;
    }
  | {
      type: 'limit_reached';
      maxNewItems: number;
      itemsNew: number;
    }
  | {
      type: 'run_complete';
      itemsDiscovered: number;
      itemsNew: number;
      itemsQualified: number;
      promptTokens: number;
      completionTokens: number;
      estimatedCostUsd: number | null;
    }
  | {
      type: 'run_failed';
      message: string;
    };

function getThreads(comments: RedditComment[], previousThreadComments: RedditComment[] = []): RedditComment[][] {
  let threads: RedditComment[][] = [];
  for (const comment of comments) {
    if (comment.replies.length > 0) {
      threads = [...threads, ...getThreads(comment.replies, [...previousThreadComments, comment])];
      continue;
    }

    threads.push([...previousThreadComments, comment]);
  }

  return threads;
}

function getAllAuthors(comments: RedditComment[]): string[] {
  const authors = new Set<string>();
  for (const comment of comments) {
    if (comment.author) {
      authors.add(comment.author);
    }

    for (const replyAuthor of getAllAuthors(comment.replies)) {
      authors.add(replyAuthor);
    }
  }

  return Array.from(authors);
}

function getThreadsByAuthor(threads: RedditComment[][], author: string): RedditComment[][] {
  const trimmedAuthorThreads: RedditComment[][] = [];
  const threadsIncludingAuthor = threads.filter((thread) => thread.some((comment) => comment.author === author));

  for (const thread of threadsIncludingAuthor) {
    const userComments = thread.filter((comment) => comment.author === author);
    const lastUserComment = userComments[userComments.length - 1];
    if (!lastUserComment) {
      continue;
    }

    const index = thread.indexOf(lastUserComment);
    trimmedAuthorThreads.push(thread.slice(0, index + 1));
  }

  const uniqueThreads: RedditComment[][] = [];
  const lastIds = new Set<string>();
  for (const thread of trimmedAuthorThreads) {
    const lastComment = thread[thread.length - 1];
    if (!lastComment || lastIds.has(lastComment.id)) {
      continue;
    }

    lastIds.add(lastComment.id);
    uniqueThreads.push(thread);
  }

  return uniqueThreads;
}

function toCurrency(value: number): number {
  return Number(value.toFixed(6));
}

function buildCommentUrl(postUrl: string, comment: RedditComment): string {
  if (comment.url) {
    return comment.url;
  }

  const basePostUrl = postUrl.endsWith('/') ? postUrl : `${postUrl}/`;
  return `${basePostUrl}${comment.id}/`;
}

export class JobRunner {
  private readonly settingsRepo = new SettingsRepository();
  private readonly runsRepo = new RunsRepository();
  private readonly scanItemsRepo = new ScanItemsRepository();

  private emit(options: JobRunOptions, event: JobRunProgressEvent): void {
    options.onProgress?.(event);
  }

  async run(job: Job, options: JobRunOptions = {}): Promise<void> {
    const redditCredentials = await this.settingsRepo.getRedditCredentials();

    const apiKey = await getOpenRouterApiKey();
    if (!apiKey) {
      const message = `Skipped job ${job.name} (${job.id}): OpenRouter API key is not configured.`;
      this.runsRepo.addRun(job.id, 'skipped', message);
      this.emit(options, { type: 'run_skipped', reason: 'missing_api_key', message });
      logger.warn(message);
      return;
    }

    const appSettings = this.settingsRepo.getAppSettings();
    const model = appSettings.model;
    const modelSettings: ModelSettings = appSettings.modelSettings;
    let runId: string;
    try {
      runId = this.runsRepo.startRun(job.id);
    } catch (error) {
      if (error instanceof ActiveRunConflictError) {
        const message = `Skipped job ${job.name} (${job.id}): another run is already active.`;
        this.runsRepo.addRun(job.id, 'skipped', message);
        this.emit(options, { type: 'run_skipped', reason: 'already_running', message });
        logger.warn(message);
        return;
      }

      throw error;
    }
    const runLogger = createRunLogger(runId);
    this.runsRepo.setLogFilePath(runId, runLogger.getLogFilePath());
    const redditTraceHooks = {
      onRequest: (operation: string, payload: unknown) => runLogger.logRequest('GET', operation, payload),
      onResponse: (operation: string, payload: unknown) => runLogger.logResponse(operation, payload),
      onError: (operation: string, payload: unknown) => runLogger.error(`${operation}\n${JSON.stringify(payload, null, 2)}`)
    };
    const openRouter = new OpenRouterClient(apiKey, {
      onRequest: (operation: string, payload: unknown) => runLogger.logRequest('POST', operation, payload),
      onResponse: (operation: string, payload: unknown) => runLogger.logResponse(operation, payload),
      onError: (operation: string, payload: unknown) => runLogger.error(`${operation}\n${JSON.stringify(payload, null, 2)}`)
    });
    const runStats = {
      itemsDiscovered: 0,
      itemsNew: 0,
      itemsQualified: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: null as number | null
    };

    try {
      let limitReachedEmitted = false;
      runLogger.info(
        JSON.stringify(
          {
            event: 'run_start',
            jobId: job.id,
            jobName: job.name,
            jobSlug: job.slug,
            subreddits: job.subreddits,
            maxNewItems: options.maxNewItems ?? null,
            monitorComments: job.monitorComments,
            qualificationPrompt: job.qualificationPrompt,
            model,
            modelSettings
          },
          null,
          2
        )
      );
      logger.info(
        `Running job ${job.name} (${job.id}) against ${job.subreddits.length} subreddits${
          options.maxNewItems ? ` with maxNewItems=${options.maxNewItems}` : ''
        }.`
      );
      this.emit(options, {
        type: 'run_start',
        jobId: job.id,
        jobName: job.name,
        subredditCount: job.subreddits.length,
        maxNewItems: options.maxNewItems
      });

      const posts = [] as Awaited<ReturnType<typeof getRecentSubredditPosts>>;
      for (const subreddit of job.subreddits) {
        const subredditPosts = await getRecentSubredditPosts(subreddit, redditCredentials, redditTraceHooks);
        posts.push(...subredditPosts);
        runLogger.info(
          JSON.stringify(
            {
              event: 'subreddit_fetched',
              subreddit,
              postCount: subredditPosts.length
            },
            null,
            2
          )
        );
        this.emit(options, {
          type: 'subreddit_fetched',
          subreddit,
          postCount: subredditPosts.length
        });
      }

      runStats.itemsDiscovered = posts.length;

      for (const post of posts) {
        if (this.hasReachedLimit(runStats.itemsNew, options.maxNewItems)) {
          if (!limitReachedEmitted && typeof options.maxNewItems === 'number') {
            this.emit(options, {
              type: 'limit_reached',
              maxNewItems: options.maxNewItems,
              itemsNew: runStats.itemsNew
            });
            limitReachedEmitted = true;
          }
          break;
        }

        if (!this.scanItemsRepo.existsPost(job.id, post.id)) {
          runLogger.info(
            JSON.stringify(
              {
                event: 'post_qualify_start',
                postId: post.id,
                subreddit: post.subreddit,
                title: post.title,
                body: post.body,
                url: post.url
              },
              null,
              2
            )
          );
          const result = await openRouter.qualifyPost({
            model,
            modelSettings,
            qualificationPrompt: job.qualificationPrompt,
            postTitle: post.title,
            postBody: post.body
          });
          runLogger.info(JSON.stringify({ event: 'post_qualify_result', postId: post.id, result }, null, 2));

          const postInsert = this.scanItemsRepo.createWithStatus({
            jobId: job.id,
            runId,
            type: 'post',
            redditPostId: post.id,
            redditCommentId: null,
            subreddit: post.subreddit,
            author: post.author,
            title: post.title,
            body: post.body,
            url: post.url,
            redditPostedAt: post.postedAt,
            qualified: result.qualified,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            estimatedCostUsd: this.estimateCost(result.promptTokens, result.completionTokens),
            qualificationReason: result.reason
          });

          if (!postInsert.inserted) {
            this.emit(options, {
              type: 'post_scanned',
              postId: post.id,
              subreddit: post.subreddit,
              status: 'existing',
              itemsNew: runStats.itemsNew,
              itemsQualified: runStats.itemsQualified
            });
          } else {
            runStats.itemsNew += 1;
            if (result.qualified) {
              runStats.itemsQualified += 1;
            }
            this.accumulateTokens(runStats, result);
            this.emit(options, {
              type: 'post_scanned',
              postId: post.id,
              subreddit: post.subreddit,
              status: 'new',
              title: post.title,
              bodySnippet: toSnippet(post.body),
              postUrl: post.url,
              qualified: result.qualified,
              qualificationReason: result.reason,
              itemsNew: runStats.itemsNew,
              itemsQualified: runStats.itemsQualified
            });
          }
        } else {
          this.emit(options, {
            type: 'post_scanned',
            postId: post.id,
            subreddit: post.subreddit,
            status: 'existing',
            itemsNew: runStats.itemsNew,
            itemsQualified: runStats.itemsQualified
          });
        }

        if (this.hasReachedLimit(runStats.itemsNew, options.maxNewItems)) {
          if (!limitReachedEmitted && typeof options.maxNewItems === 'number') {
            this.emit(options, {
              type: 'limit_reached',
              maxNewItems: options.maxNewItems,
              itemsNew: runStats.itemsNew
            });
            limitReachedEmitted = true;
          }
          continue;
        }

        if (!job.monitorComments) {
          continue;
        }

        const comments = await getRedditPostComments(post.id, redditCredentials, redditTraceHooks);
        const threads = getThreads(comments);
        const authors = getAllAuthors(comments);
        runLogger.info(
          JSON.stringify(
            {
              event: 'comments_loaded',
              postId: post.id,
              subreddit: post.subreddit,
              authors: authors.length,
              threads: threads.length
            },
            null,
            2
          )
        );
        this.emit(options, {
          type: 'comments_loaded',
          postId: post.id,
          subreddit: post.subreddit,
          authors: authors.length,
          threads: threads.length
        });

        for (const author of authors) {
          if (this.hasReachedLimit(runStats.itemsNew, options.maxNewItems)) {
            if (!limitReachedEmitted && typeof options.maxNewItems === 'number') {
              this.emit(options, {
                type: 'limit_reached',
                maxNewItems: options.maxNewItems,
                itemsNew: runStats.itemsNew
              });
              limitReachedEmitted = true;
            }
            break;
          }

          const authorThreads = getThreadsByAuthor(threads, author);
          for (const thread of authorThreads) {
            if (this.hasReachedLimit(runStats.itemsNew, options.maxNewItems)) {
              if (!limitReachedEmitted && typeof options.maxNewItems === 'number') {
                this.emit(options, {
                  type: 'limit_reached',
                  maxNewItems: options.maxNewItems,
                  itemsNew: runStats.itemsNew
                });
                limitReachedEmitted = true;
              }
              break;
            }

            const lastComment = thread[thread.length - 1];
            if (!lastComment) {
              continue;
            }

            if (this.scanItemsRepo.existsComment(job.id, post.id, lastComment.id)) {
              this.emit(options, {
                type: 'comment_scanned',
                postId: post.id,
                commentId: lastComment.id,
                author,
                status: 'existing',
                itemsNew: runStats.itemsNew,
                itemsQualified: runStats.itemsQualified
              });
              continue;
            }

            runLogger.info(
              JSON.stringify(
                {
                  event: 'comment_qualify_start',
                  postId: post.id,
                  commentId: lastComment.id,
                  author,
                  postUrl: post.url,
                  commentUrl: buildCommentUrl(post.url, lastComment),
                  commentBody: lastComment.body,
                  thread
                },
                null,
                2
              )
            );
            const result = await openRouter.qualifyCommentThread({
              model,
              modelSettings,
              qualificationPrompt: job.qualificationPrompt,
              postTitle: post.title,
              postBody: post.body,
              targetAuthor: author,
              thread
            });
            runLogger.info(
              JSON.stringify(
                {
                  event: 'comment_qualify_result',
                  postId: post.id,
                  commentId: lastComment.id,
                  author,
                  result
                },
                null,
                2
              )
            );

            const commentInsert = this.scanItemsRepo.createWithStatus({
              jobId: job.id,
              runId,
              type: 'comment',
              redditPostId: post.id,
              redditCommentId: lastComment.id,
              subreddit: post.subreddit,
              author,
              title: post.title,
              body: lastComment.body,
              url: buildCommentUrl(post.url, lastComment),
              redditPostedAt: post.postedAt,
              qualified: result.qualified,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              estimatedCostUsd: this.estimateCost(result.promptTokens, result.completionTokens),
              qualificationReason: result.reason,
              commentThreadNodes: thread.map((threadComment, index) => ({
                redditCommentId: threadComment.id,
                parentRedditCommentId: index === 0 ? null : thread[index - 1]?.id ?? null,
                author: threadComment.author,
                body: threadComment.body,
                depth: index,
                isTarget: index === thread.length - 1
              }))
            });

            if (!commentInsert.inserted) {
              this.emit(options, {
                type: 'comment_scanned',
                postId: post.id,
                commentId: lastComment.id,
                author,
                status: 'existing',
                itemsNew: runStats.itemsNew,
                itemsQualified: runStats.itemsQualified
              });
            } else {
              runStats.itemsNew += 1;
              if (result.qualified) {
                runStats.itemsQualified += 1;
              }
              this.accumulateTokens(runStats, result);
              this.emit(options, {
                type: 'comment_scanned',
                postId: post.id,
                commentId: lastComment.id,
                author,
                status: 'new',
                commentSnippet: toSnippet(lastComment.body),
                postUrl: post.url,
                commentUrl: buildCommentUrl(post.url, lastComment),
                qualified: result.qualified,
                qualificationReason: result.reason,
                itemsNew: runStats.itemsNew,
                itemsQualified: runStats.itemsQualified
              });
            }
          }
        }
      }

      runStats.estimatedCostUsd = this.estimateCost(runStats.promptTokens, runStats.completionTokens);
      this.runsRepo.completeRun(runId, runStats);
      runLogger.info(JSON.stringify({ event: 'run_complete', runId, stats: runStats }, null, 2));
      this.emit(options, {
        type: 'run_complete',
        itemsDiscovered: runStats.itemsDiscovered,
        itemsNew: runStats.itemsNew,
        itemsQualified: runStats.itemsQualified,
        promptTokens: runStats.promptTokens,
        completionTokens: runStats.completionTokens,
        estimatedCostUsd: runStats.estimatedCostUsd
      });
      logger.info(
        `Completed job ${job.name} (${job.id}): discovered=${runStats.itemsDiscovered}, new=${runStats.itemsNew}, qualified=${runStats.itemsQualified}`
      );
      if (appSettings.notificationsEnabled) {
        sendJobNotification({
          jobName: job.name,
          qualifiedCount: runStats.itemsQualified,
          discoveredCount: runStats.itemsDiscovered,
          newCount: runStats.itemsNew
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.runsRepo.failRun(runId, message);
      runLogger.error(
        JSON.stringify(
          {
            event: 'run_failed',
            runId,
            message,
            stack: error instanceof Error ? error.stack : undefined
          },
          null,
          2
        )
      );
      this.emit(options, { type: 'run_failed', message });
      logger.error(`Job ${job.name} (${job.id}) failed: ${message}`);
    } finally {
      cleanupOldLogs();
    }
  }

  private accumulateTokens(total: QualifyStats, next: QualifyStats): void {
    total.promptTokens += next.promptTokens;
    total.completionTokens += next.completionTokens;
  }

  private hasReachedLimit(processedItems: number, maxNewItems?: number): boolean {
    return typeof maxNewItems === 'number' && maxNewItems > 0 && processedItems >= maxNewItems;
  }

  private estimateCost(promptTokens: number, completionTokens: number): number {
    // Temporary heuristic until per-model pricing is fetched from OpenRouter model metadata.
    const promptRatePerThousand = 0.0015;
    const completionRatePerThousand = 0.002;
    const estimated = (promptTokens / 1000) * promptRatePerThousand + (completionTokens / 1000) * completionRatePerThousand;
    return toCurrency(estimated);
  }
}
