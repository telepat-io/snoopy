import { createInterface } from 'node:readline/promises';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import {
  isRichTty,
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printMuted,
  printSection,
  printSuccess,
  printWarning
} from '../ui/consoleUi.js';
import { editPromptInteractively } from './promptEditor.js';

interface ShowPromptOptions {
  raw?: boolean;
}

async function promptLine(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(message)).trim();
  } finally {
    rl.close();
  }
}

async function confirmEditPrompt(): Promise<boolean> {
  const answer = (await promptLine('Edit qualification prompt now? [y/N]: ')).toLowerCase();
  if (!answer) {
    return false;
  }

  return answer === 'y' || answer === 'yes';
}

function printPromptEnvelope(job: {
  id: string;
  slug: string;
  name: string;
  qualificationPrompt: string;
  updatedAt: string;
}): void {
  printKeyValue('Job', `${job.name} (${job.slug})`);
  printKeyValue('Job ID', job.id);
  printKeyValue('Updated', job.updatedAt);
  printSection('Qualification prompt');
  printMuted(job.qualificationPrompt);
}

export async function showPrompt(jobRef: string, options: ShowPromptOptions = {}): Promise<void> {
  const jobsRepo = new JobsRepository();
  const job = jobsRepo.getByRef(jobRef);
  if (!job) {
    printError(`Job not found: ${jobRef}`);
    return;
  }

  if (options.raw) {
    process.stdout.write(`${job.qualificationPrompt}\n`);
    return;
  }

  printCommandScreen('Prompt', 'View Prompt');
  printPromptEnvelope(job);

  if (!isRichTty()) {
    printInfo('Use --raw for non-interactive prompt retrieval.');
    return;
  }

  const shouldEdit = await confirmEditPrompt();
  if (!shouldEdit) {
    printInfo('Prompt unchanged.');
    return;
  }

  const updatedPrompt = await editPromptInteractively(job.qualificationPrompt);
  if (updatedPrompt === null) {
    printWarning('Prompt edit cancelled.');
    return;
  }

  const normalizedPrompt = updatedPrompt.trim();
  if (!normalizedPrompt) {
    printError('Prompt cannot be empty.');
    return;
  }

  if (normalizedPrompt === job.qualificationPrompt.trim()) {
    printInfo('Prompt unchanged.');
    return;
  }

  const updated = jobsRepo.updateQualificationPromptByRef(job.id, normalizedPrompt);
  if (!updated) {
    printError(`Failed to update prompt for job: ${job.id}`);
    return;
  }

  printSuccess(`Updated qualification prompt for ${updated.name} (${updated.slug}).`);
}

export async function setPrompt(jobRef: string, promptText: string): Promise<void> {
  const normalizedPrompt = promptText.trim();
  if (!normalizedPrompt) {
    throw new Error('Prompt cannot be empty.');
  }

  const jobsRepo = new JobsRepository();
  const existing = jobsRepo.getByRef(jobRef);
  if (!existing) {
    printError(`Job not found: ${jobRef}`);
    return;
  }

  const updated = jobsRepo.updateQualificationPromptByRef(existing.id, normalizedPrompt);
  if (!updated) {
    printError(`Failed to update prompt for job: ${existing.id}`);
    return;
  }

  printCommandScreen('Prompt', 'Set Prompt');
  printSuccess(`Updated qualification prompt for ${updated.name} (${updated.slug}).`);
  printKeyValue('Job ID', updated.id);
  printKeyValue('Updated', updated.updatedAt);
}
