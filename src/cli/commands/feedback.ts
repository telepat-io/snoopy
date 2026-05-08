import { createInterface } from 'node:readline/promises';
import { diff } from 'jest-diff';
import type { CommentThreadNodeRow } from '../../services/db/repositories/scanItemsRepo.js';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import { ScanItemsRepository, type QualifiedScanItemRow } from '../../services/db/repositories/scanItemsRepo.js';
import { consolidateFeedback } from '../../services/feedback/consolidationService.js';
import {
  isRichTty,
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printMuted,
  printSection,
  printSuccess,
  printWarning,
} from '../ui/consoleUi.js';

interface FeedbackSubmitOptions {
  valid?: boolean;
  invalid?: boolean;
  reason?: string;
  json?: boolean;
}

interface FeedbackReviewOptions {
  json?: boolean;
  limit?: number;
}

interface FeedbackConsolidateOptions {
  limit?: number;
  json?: boolean;
}

const MAX_DIFF_OUTPUT_LINES = 120;

function formatPromptDiff(oldPrompt: string, newPrompt: string): { text: string; truncated: boolean } | null {
  const output = diff(oldPrompt, newPrompt, {
    aAnnotation: 'old prompt',
    bAnnotation: 'new prompt',
    expand: false,
  });

  if (!output) {
    return null;
  }

  const lines = output.split('\n');
  if (lines.length <= MAX_DIFF_OUTPUT_LINES) {
    return { text: output, truncated: false };
  }

  return {
    text: lines.slice(0, MAX_DIFF_OUTPUT_LINES).join('\n'),
    truncated: true,
  };
}

async function promptLine(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(message)).trim();
  } finally {
    rl.close();
  }
}

async function promptValidity(): Promise<'valid' | 'invalid' | 'quit'> {
  while (true) {
    const answer = (await promptLine('Mark as (v)alid, (i)nvalid, or (q)uit: ')).toLowerCase();
    if (answer === 'v' || answer === 'valid') {
      return 'valid';
    }

    if (answer === 'i' || answer === 'invalid') {
      return 'invalid';
    }

    if (answer === 'q' || answer === 'quit' || answer === 'exit') {
      return 'quit';
    }

    printWarning('Please enter v, i, or q.');
  }
}

async function promptRequiredReason(): Promise<string> {
  while (true) {
    const answer = await promptLine('Reason (required for invalid feedback): ');
    if (answer.length > 0) {
      return answer;
    }

    printWarning('A reason is required when marking a result as invalid.');
  }
}

async function promptConsolidateBeforeExit(): Promise<boolean> {
  const answer = (await promptLine('Run consolidate now before exiting? [Y/n]: ')).toLowerCase();
  if (!answer) {
    return true;
  }

  return answer !== 'n' && answer !== 'no';
}

function validateSubmitFlags(options: FeedbackSubmitOptions): { isValid: boolean; reason: string | null } {
  const hasValid = options.valid === true;
  const hasInvalid = options.invalid === true;

  if (hasValid === hasInvalid) {
    throw new Error('Choose exactly one: --valid or --invalid.');
  }

  if (hasInvalid) {
    const reason = options.reason?.trim() ?? '';
    if (!reason) {
      throw new Error('A reason is required when using --invalid.');
    }

    return { isValid: false, reason };
  }

  return { isValid: true, reason: null };
}

function printThread(commentThreadNodes: CommentThreadNodeRow[]): void {
  if (commentThreadNodes.length === 0) {
    printWarning('Thread unavailable for this comment.');
    return;
  }

  printSection('Thread (root -> target)');
  commentThreadNodes.forEach((node, index) => {
    const marker = node.isTarget ? 'target' : `depth ${node.depth}`;
    printInfo(`${index + 1}. ${node.author} (${marker})`);
    printMuted(`  ${node.body}`);
  });
}

function printReviewItem(row: QualifiedScanItemRow, commentThreadNodes: CommentThreadNodeRow[]): void {
  printSection(`Result ${row.id}`);
  printKeyValue('Type', row.type);
  printKeyValue('Subreddit', `r/${row.subreddit}`);
  printKeyValue('Author', row.author);
  printKeyValue('URL', row.url);
  printKeyValue('Posted', row.redditPostedAt);
  if (row.title) {
    printKeyValue('Title', row.title);
  }

  if (row.qualificationReason) {
    printKeyValue('Qualification reason', row.qualificationReason);
  }

  if (row.type === 'comment') {
    printThread(commentThreadNodes);
  }

  printSection('Content');
  printMuted(row.body);
}

export async function feedbackSubmit(resultId: string, options: FeedbackSubmitOptions = {}): Promise<void> {
  printCommandScreen('Feedback', 'Submit feedback');
  const scanItemsRepo = new ScanItemsRepository();

  const row = scanItemsRepo.getQualifiedById(resultId);
  if (!row) {
    throw new Error(`Qualified result not found: ${resultId}`);
  }

  const { isValid, reason } = validateSubmitFlags(options);
  const updated = scanItemsRepo.submitFeedback(resultId, isValid, reason);
  if (!updated) {
    throw new Error(`Failed to save feedback for result: ${resultId}`);
  }

  const pendingCount = scanItemsRepo.countPendingFeedbackConsolidation(row.jobId);
  const payload = {
    resultId,
    saved: true,
    feedback: {
      validated: true,
      isValid,
      isValidReason: reason,
      feedbackConsolidated: false,
    },
    pendingFeedbackConsolidationCount: pendingCount,
    requiresConsolidation: pendingCount > 0,
    recommendedNextCommand: 'snoopy feedback consolidate',
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printSuccess(`Saved feedback for result ${resultId}.`);
  printKeyValue('Valid', isValid ? 'yes' : 'no');
  if (!isValid && reason) {
    printKeyValue('Reason', reason);
  }

  if (pendingCount > 0) {
    printInfo(`Consolidation pending for ${pendingCount} result(s). Run snoopy feedback consolidate.`);
  }
}

async function runInteractiveReview(rows: QualifiedScanItemRow[], runConsolidateOnExit: () => Promise<void>): Promise<void> {
  const scanItemsRepo = new ScanItemsRepository();

  let validatedCount = 0;
  let invalidCount = 0;
  let earlyExit = false;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    const commentThreadNodes = row.type === 'comment' ? scanItemsRepo.listCommentThreadNodes(row.id) : [];

    printCommandScreen('Feedback review', `Item ${index + 1}/${rows.length}`);
    printReviewItem(row, commentThreadNodes);

    const verdict = await promptValidity();
    if (verdict === 'quit') {
      earlyExit = true;
      break;
    }

    const isValid = verdict === 'valid';
    const reason = isValid ? null : await promptRequiredReason();
    scanItemsRepo.submitFeedback(row.id, isValid, reason);

    validatedCount += 1;
    if (!isValid) {
      invalidCount += 1;
    }

    printSuccess(`Saved feedback for ${row.id}.`);
  }

  printSection('Review summary');
  printKeyValue('Validated this session', String(validatedCount));
  printKeyValue('Marked invalid', String(invalidCount));
  printKeyValue('Early exit', earlyExit ? 'yes' : 'no');

  if (earlyExit) {
    const shouldConsolidateNow = await promptConsolidateBeforeExit();
    if (shouldConsolidateNow) {
      await runConsolidateOnExit();
    } else {
      printWarning('Skipping consolidate. Prompt quality will not improve until consolidate runs.');
    }
    return;
  }

  await runConsolidateOnExit();
}

export async function feedbackReview(jobRef?: string, options: FeedbackReviewOptions = {}): Promise<void> {
  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();

  let jobId: string | undefined;
  if (jobRef) {
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      throw new Error(`Job not found: ${jobRef}`);
    }

    jobId = job.id;
  }

  const limit = options.limit ?? 10;
  const rows = scanItemsRepo.listUnvalidatedQualified(jobId, limit);

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  printCommandScreen('Feedback', 'Review feedback queue');

  if (rows.length === 0) {
    printInfo('No more results to validate. Exiting review.');
    return;
  }

  if (!isRichTty()) {
    printError('Interactive review requires a rich terminal. Use --json in non-interactive mode.');
    return;
  }

  const runConsolidateOnExit = async (): Promise<void> => {
    printInfo('Running feedback consolidation...');
    const result = await consolidateFeedback({ jobRef, limit });
    printSuccess(`Consolidated ${result.totalConsolidated} result(s).`);
    if (result.requiresConsolidation) {
      printWarning(`Still pending: ${result.totalPendingAfter}. Run snoopy feedback consolidate again.`);
    }
  };

  await runInteractiveReview(rows, runConsolidateOnExit);
}

export async function feedbackConsolidate(jobRef?: string, options: FeedbackConsolidateOptions = {}): Promise<void> {
  printCommandScreen('Feedback', 'Consolidate feedback');
  const result = await consolidateFeedback({
    jobRef,
    limit: options.limit,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.totalPendingBefore === 0) {
    printInfo('No pending feedback to consolidate.');
    return;
  }

  result.jobs.forEach((jobResult) => {
    printInfo(`${jobResult.jobName} (${jobResult.jobSlug})`);
    printKeyValue('Pending', String(jobResult.pendingCount));
    printKeyValue('Consolidated', String(jobResult.consolidatedCount));
    if (jobResult.error) {
      printError(jobResult.error);
      return;
    }

    if (jobResult.changeSummary && jobResult.changeSummary.length > 0) {
      printKeyValue('Changes', jobResult.changeSummary.join(' | '));
    }

    if (!jobResult.promptUpdated || !jobResult.oldPrompt || !jobResult.newPrompt) {
      return;
    }

    if (jobResult.oldPrompt === jobResult.newPrompt) {
      printMuted('Prompt did not change.');
      return;
    }

    const promptDiff = formatPromptDiff(jobResult.oldPrompt, jobResult.newPrompt);
    if (!promptDiff) {
      printMuted('Prompt updated, but no textual diff was produced.');
      return;
    }

    printSection(`Prompt diff (${jobResult.jobSlug})`);
    console.log(promptDiff.text);
    if (promptDiff.truncated) {
      printWarning(`Prompt diff truncated to ${MAX_DIFF_OUTPUT_LINES} lines.`);
    }
  });

  if (result.requiresConsolidation) {
    printWarning(`Consolidation incomplete. ${result.totalPendingAfter} result(s) still pending.`);
    return;
  }

  printSuccess(`Consolidated ${result.totalConsolidated} result(s) across ${result.jobs.length} job(s).`);
}
