import { createInterface } from 'node:readline/promises';
import readline from 'node:readline';
import type { Job } from '../../types/job.js';
import type { RunRow } from '../../services/db/repositories/runsRepo.js';
import { printError, printInfo, printWarning } from '../ui/consoleUi.js';
import { formatRunDisplayLabel } from '../ui/time.js';

type SelectIndexWithKeyboard = (lines: string[], kind: string) => Promise<number | null>;

function truncateForTerminalRow(value: string, reservedColumns = 2): string {
  const totalColumns = process.stdout.columns ?? 120;
  const maxColumns = Math.max(20, totalColumns - reservedColumns);
  if (value.length <= maxColumns) {
    return value;
  }

  if (maxColumns <= 3) {
    return '.'.repeat(maxColumns);
  }

  return `${value.slice(0, maxColumns - 3)}...`;
}

interface JobLookup {
  list(): Job[];
  getByRef(ref: string): Job | null;
}

interface RunLookup {
  getById(runId: string): RunRow | null;
  listByJob(jobId: string, limit?: number): RunRow[];
}

async function promptFromStdin(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(message);
  } finally {
    rl.close();
  }
}

async function selectIndexWithArrowKeys(lines: string[], kind: string): Promise<number | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return null;
  }

  let cursor = 0;
  let renderedLineCount = 0;

  const render = (): void => {
    if (renderedLineCount > 0) {
      process.stdout.write(`\u001b[${renderedLineCount}F`);
    }

    const outputLines = [`Select ${kind} (up/down arrows + Enter, q to cancel):`];
    lines.forEach((line, index) => {
      const prefix = `${index === cursor ? '>' : ' '} `;
      outputLines.push(`${prefix}${truncateForTerminalRow(line, prefix.length)}`);
    });

    process.stdout.write('\u001b[J');
    process.stdout.write(`${outputLines.join('\n')}\n`);
    renderedLineCount = outputLines.length;
  };

  return await new Promise<number | null>((resolve) => {
    const stdin = process.stdin;
    const wasRawMode = stdin.isRaw;

    const cleanup = (): void => {
      stdin.off('keypress', onKeypress);
      if (typeof stdin.setRawMode === 'function') {
        stdin.setRawMode(Boolean(wasRawMode));
      }
      stdin.pause();
      process.stdout.write('\u001b[?25h');
    };

    const finish = (value: number | null): void => {
      cleanup();
      resolve(value);
    };

    const onKeypress = (_str: string, key: readline.Key): void => {
      if (key.ctrl && key.name === 'c') {
        finish(null);
        return;
      }

      if (key.name === 'up') {
        cursor = cursor === 0 ? lines.length - 1 : cursor - 1;
        render();
        return;
      }

      if (key.name === 'down') {
        cursor = cursor === lines.length - 1 ? 0 : cursor + 1;
        render();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish(cursor);
        return;
      }

      if (key.name === 'escape' || key.name === 'q') {
        finish(null);
      }
    };

    readline.emitKeypressEvents(stdin);
    if (typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(true);
    }
    stdin.resume();
    process.stdout.write('\u001b[?25l');
    stdin.on('keypress', onKeypress);
    render();
  });
}

function isInteractiveSelectionAvailable(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function selectionCancelled(): null {
  printWarning('Selection cancelled.');
  return null;
}

async function pickIndexWithFallback(
  lines: string[],
  kind: string,
  selectIndex: SelectIndexWithKeyboard = selectIndexWithArrowKeys
): Promise<number | null> {
  if (lines.length === 0) {
    return null;
  }

  const keyboardChoice = await selectIndex(lines, kind);
  if (keyboardChoice !== null) {
    return keyboardChoice;
  }

  const answer = (await promptFromStdin(`Choose ${kind} [1-${lines.length}] (or q to cancel): `)).trim().toLowerCase();
  if (answer === 'q' || answer === 'quit' || answer === 'exit') {
    return selectionCancelled();
  }

  const parsed = Number.parseInt(answer, 10);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= lines.length) {
    return parsed - 1;
  }

  printWarning(`Invalid selection. Enter a number from 1-${lines.length}, or q to cancel.`);

  while (true) {
    const retryAnswer = (await promptFromStdin(`Choose ${kind} [1-${lines.length}] (or q to cancel): `)).trim().toLowerCase();
    if (retryAnswer === 'q' || retryAnswer === 'quit' || retryAnswer === 'exit') {
      return selectionCancelled();
    }

    const retryParsed = Number.parseInt(retryAnswer, 10);
    if (Number.isInteger(retryParsed) && retryParsed >= 1 && retryParsed <= lines.length) {
      return retryParsed - 1;
    }

    printWarning(`Invalid selection. Enter a number from 1-${lines.length}, or q to cancel.`);
  }
}

export async function resolveJobFromArgOrPrompt(
  jobsRepo: JobLookup,
  jobRef: string | undefined,
  options: {
    selectIndex?: SelectIndexWithKeyboard;
    requiredForMessage?: string;
  } = {}
): Promise<Job | null> {
  if (jobRef) {
    const job = jobsRepo.getByRef(jobRef);
    if (!job) {
      printError(`Job not found: ${jobRef}`);
      return null;
    }

    return job;
  }

  if (!isInteractiveSelectionAvailable()) {
    const suffix = options.requiredForMessage ? ` for ${options.requiredForMessage}` : '';
    printError(`Missing job reference${suffix}. Provide <jobRef> when running non-interactively.`);
    return null;
  }

  const jobs = jobsRepo.list();
  if (jobs.length === 0) {
    printWarning('No jobs configured yet.');
    return null;
  }

  const jobLines = jobs.map((job, index) => {
    const state = job.enabled ? 'on' : 'off';
    return `${index + 1}. ${job.name} (${job.slug}) [${job.id}] state=${state}`;
  });

  const selectedIndex = await pickIndexWithFallback(jobLines, 'job', options.selectIndex);
  if (selectedIndex === null) {
    return null;
  }

  return jobs[selectedIndex] ?? null;
}

export async function resolveRunFromArgOrPrompt(
  runsRepo: RunLookup,
  runId: string | undefined,
  selectedJob: Job,
  options: { selectIndex?: SelectIndexWithKeyboard } = {}
): Promise<RunRow | null> {
  if (runId) {
    const run = runsRepo.getById(runId);
    if (!run) {
      printError(`Run not found: ${runId}`);
      return null;
    }

    return run;
  }

  const runs = runsRepo.listByJob(selectedJob.id, 20);
  if (runs.length === 0) {
    printWarning(`No run history found for ${selectedJob.name} (${selectedJob.slug}).`);
    return null;
  }

  printInfo(`Runs for ${selectedJob.name} (${selectedJob.slug}):`);
  const runLines = runs.map((run, index) => {
    const status = run.status;
    return `${index + 1}. ${run.id} ${status} ${formatRunDisplayLabel(run)}`;
  });

  const selectedIndex = await pickIndexWithFallback(runLines, 'run', options.selectIndex);
  if (selectedIndex === null) {
    return null;
  }

  return runs[selectedIndex] ?? null;
}