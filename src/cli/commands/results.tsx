import React from 'react';
import { render } from 'ink';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import {
  ScanItemsRepository,
  type CommentThreadNodeRow,
  type ScanItemRow
} from '../../services/db/repositories/scanItemsRepo.js';
import {
  isRichTty,
  printCommandScreen,
  printError,
  printInfo,
  printKeyValue,
  printSection,
  printWarning
} from '../ui/consoleUi.js';
import { formatLocalTimestamp } from '../ui/time.js';
import { resolveJobFromArgOrPrompt } from './selection.js';
import { ResultsViewer } from '../../ui/components/ResultsViewer.js';
import type { ResultsViewerItem } from '../../ui/components/resultsViewerModel.js';

function buildViewerItems(
  items: ScanItemRow[],
  loadThreadNodes: (scanItemId: string) => CommentThreadNodeRow[]
): ResultsViewerItem[] {
  return items.map((item) => ({
    ...item,
    commentThreadNodes: item.type === 'comment' ? loadThreadNodes(item.id) : []
  }));
}

function printFlatResults(items: ResultsViewerItem[]): void {
  printSection('Results');

  items.forEach((item, index) => {
    printInfo(`${index + 1}. ${item.type} ${item.qualified ? 'qualified' : 'not qualified'} ${formatLocalTimestamp(item.redditPostedAt)}`);
    printKeyValue('Subreddit', `r/${item.subreddit}`);
    printKeyValue('Author', item.author);
    printKeyValue('Title', item.title ?? '-');
    printKeyValue('Reason', item.qualificationReason ?? '-');
    printKeyValue('URL', item.url);
    printKeyValue('Item ID', item.id);

    if (item.type === 'comment') {
      if (item.commentThreadNodes.length === 0) {
        printWarning('Thread unavailable for this item.');
      } else {
        printKeyValue('Thread nodes', String(item.commentThreadNodes.length));
      }
    }
  });
}

export async function showResults(jobRef?: string): Promise<void> {
  printCommandScreen('Results', 'Job Results');

  const jobsRepo = new JobsRepository();
  const scanItemsRepo = new ScanItemsRepository();

  const job = await resolveJobFromArgOrPrompt(jobsRepo, jobRef, {
    requiredForMessage: 'results viewing'
  });

  if (!job) {
    return;
  }

  const items = scanItemsRepo.listByJob(job.id);
  if (items.length === 0) {
    printWarning(`No results found for ${job.name} (${job.slug}).`);
    return;
  }

  const viewerItems = buildViewerItems(items, (scanItemId) => scanItemsRepo.listCommentThreadNodes(scanItemId));

  if (!isRichTty()) {
    printWarning('Rich terminal not detected; rendering flat output.');
    printFlatResults(viewerItems);
    return;
  }

  try {
    const app = render(
      <ResultsViewer
        jobName={job.name}
        jobSlug={job.slug}
        items={viewerItems}
        onExit={() => {
          app.unmount();
        }}
      />
    );

    await app.waitUntilExit();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Failed to open results viewer: ${message}`);
  }
}
