import { JobsRepository } from '../db/repositories/jobsRepo.js';
import { ScanItemsRepository, type QualifiedScanItemRow } from '../db/repositories/scanItemsRepo.js';
import { SettingsRepository } from '../db/repositories/settingsRepo.js';
import { getOpenRouterApiKey } from '../security/secretStore.js';
import {
  OpenRouterClient,
  type ConsolidationFeedbackItem,
  type ConsolidatedPromptResult,
} from '../openrouter/client.js';

export interface ConsolidateFeedbackOptions {
  jobRef?: string;
  limit?: number;
}

export interface ConsolidateFeedbackJobResult {
  jobId: string;
  jobSlug: string;
  jobName: string;
  pendingCount: number;
  consolidatedCount: number;
  promptUpdated: boolean;
  oldPrompt?: string;
  newPrompt?: string;
  changeSummary?: string[];
  rationale?: string;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}

export interface ConsolidateFeedbackResult {
  jobRef?: string;
  totalPendingBefore: number;
  totalPendingAfter: number;
  totalConsolidated: number;
  requiresConsolidation: boolean;
  jobs: ConsolidateFeedbackJobResult[];
}

function toFeedbackItem(row: QualifiedScanItemRow): ConsolidationFeedbackItem {
  return {
    id: row.id,
    type: row.type,
    subreddit: row.subreddit,
    title: row.title,
    body: row.body,
    qualificationReason: row.qualificationReason,
    userIsValid: row.isValid,
    userReason: row.isValidReason,
  };
}

function toJobPromptResult(result: ConsolidatedPromptResult): Pick<
  ConsolidateFeedbackJobResult,
  'changeSummary' | 'rationale' | 'promptTokens' | 'completionTokens'
> {
  return {
    changeSummary: result.changeSummary,
    rationale: result.rationale,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export async function consolidateFeedback(
  options: ConsolidateFeedbackOptions = {},
): Promise<ConsolidateFeedbackResult> {
  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();

  let jobId: string | undefined;
  if (options.jobRef) {
    const job = jobsRepo.getByRef(options.jobRef);
    if (!job) {
      throw new Error(`Job not found: ${options.jobRef}`);
    }

    jobId = job.id;
  }

  const pendingRows = scanItemsRepo.listPendingFeedbackConsolidation(jobId, options.limit);
  const totalPendingBefore = pendingRows.length;
  if (totalPendingBefore === 0) {
    return {
      jobRef: options.jobRef,
      totalPendingBefore: 0,
      totalPendingAfter: 0,
      totalConsolidated: 0,
      requiresConsolidation: false,
      jobs: [],
    };
  }

  const apiKey = await getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Run snoopy settings to configure it first.');
  }

  const settingsRepo = new SettingsRepository();
  const appSettings = settingsRepo.getAppSettings();
  const openRouterClient = new OpenRouterClient(apiKey);

  const groupedByJob = new Map<string, QualifiedScanItemRow[]>();
  for (const row of pendingRows) {
    const existing = groupedByJob.get(row.jobId) ?? [];
    existing.push(row);
    groupedByJob.set(row.jobId, existing);
  }

  const jobResults: ConsolidateFeedbackJobResult[] = [];
  let totalConsolidated = 0;

  for (const [currentJobId, rows] of groupedByJob) {
    const job = jobsRepo.getById(currentJobId);
    if (!job) {
      jobResults.push({
        jobId: currentJobId,
        jobSlug: 'unknown',
        jobName: 'Unknown job',
        pendingCount: rows.length,
        consolidatedCount: 0,
        promptUpdated: false,
        error: `Job no longer exists: ${currentJobId}`,
      });
      continue;
    }

    try {
      const oldPrompt = job.qualificationPrompt;
      const result = await openRouterClient.consolidateQualificationPrompt({
        model: appSettings.model,
        modelSettings: appSettings.modelSettings,
        currentQualificationPrompt: oldPrompt,
        feedbackItems: rows.map(toFeedbackItem),
      });

      const newPrompt = result.revisedQualificationPrompt;
      jobsRepo.updateQualificationPromptById(job.id, newPrompt);
      const consolidatedCount = scanItemsRepo.markFeedbackConsolidated(rows.map((row) => row.id));
      totalConsolidated += consolidatedCount;

      jobResults.push({
        jobId: job.id,
        jobSlug: job.slug,
        jobName: job.name,
        pendingCount: rows.length,
        consolidatedCount,
        promptUpdated: true,
        oldPrompt,
        newPrompt,
        ...toJobPromptResult(result),
      });
    } catch (error) {
      jobResults.push({
        jobId: job.id,
        jobSlug: job.slug,
        jobName: job.name,
        pendingCount: rows.length,
        consolidatedCount: 0,
        promptUpdated: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const totalPendingAfter = scanItemsRepo.countPendingFeedbackConsolidation(jobId);
  return {
    jobRef: options.jobRef,
    totalPendingBefore,
    totalPendingAfter,
    totalConsolidated,
    requiresConsolidation: totalPendingAfter > 0,
    jobs: jobResults,
  };
}
