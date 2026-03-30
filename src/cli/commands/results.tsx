import React from 'react';
import { render } from 'ink';
import { JobsRepository } from '../../services/db/repositories/jobsRepo.js';
import {
  ScanItemsRepository,
  type CommentThreadNodeRow
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

const MAX_ITEM_CACHE = 256;
const MAX_THREAD_CACHE = 256;
const FLAT_OUTPUT_LIMIT = 50;

function setBoundedMapValue<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (map.has(key)) {
    map.delete(key);
  }

  map.set(key, value);
  if (map.size <= maxSize) {
    return;
  }

  const oldestKey = map.keys().next().value as K | undefined;
  if (oldestKey !== undefined) {
    map.delete(oldestKey);
  }
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

  const totalItems = scanItemsRepo.countByJob(job.id);
  if (totalItems === 0) {
    printWarning(`No results found for ${job.name} (${job.slug}).`);
    return;
  }

  if (!isRichTty()) {
    printWarning('Rich terminal not detected; rendering flat output.');
    const flatRows = scanItemsRepo.listByJobPage(job.id, FLAT_OUTPUT_LIMIT, 0);
    const flatItems = flatRows.map((item) => ({
      ...item,
      commentThreadNodes: item.type === 'comment' ? scanItemsRepo.listCommentThreadNodes(item.id) : []
    }));
    printFlatResults(flatItems);
    if (totalItems > flatItems.length) {
      printInfo(`Showing first ${flatItems.length} of ${totalItems} result(s). Use a rich TTY to browse all items.`);
    }
    return;
  }

  const itemCache = new Map<number, ResultsViewerItem>();
  const threadCache = new Map<string, CommentThreadNodeRow[]>();

  const getItemAt = (index: number): ResultsViewerItem | null => {
    if (index < 0 || index >= totalItems) {
      return null;
    }

    const cached = itemCache.get(index);
    if (cached) {
      setBoundedMapValue(itemCache, index, cached, MAX_ITEM_CACHE);
      return cached;
    }

    const row = scanItemsRepo.getByJobIndex(job.id, index);
    if (!row) {
      return null;
    }

    let commentThreadNodes: CommentThreadNodeRow[] = [];
    if (row.type === 'comment') {
      const cachedThread = threadCache.get(row.id);
      if (cachedThread) {
        commentThreadNodes = cachedThread;
        setBoundedMapValue(threadCache, row.id, cachedThread, MAX_THREAD_CACHE);
      } else {
        commentThreadNodes = scanItemsRepo.listCommentThreadNodes(row.id);
        setBoundedMapValue(threadCache, row.id, commentThreadNodes, MAX_THREAD_CACHE);
      }
    }

    const viewerItem: ResultsViewerItem = {
      ...row,
      commentThreadNodes
    };
    setBoundedMapValue(itemCache, index, viewerItem, MAX_ITEM_CACHE);
    return viewerItem;
  };

  try {
    const app = render(
      <ResultsViewer
        jobName={job.name}
        jobSlug={job.slug}
        totalItems={totalItems}
        getItemAt={getItemAt}
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
