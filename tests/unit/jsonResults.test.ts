import fs from 'node:fs';
import path from 'node:path';
import type { Job } from '../../src/types/job.js';
import { ensureAppDirs } from '../../src/utils/paths.js';
import { JsonResultsExporter } from '../../src/services/export/jsonResults.js';
import { createExportFileName } from '../../src/services/export/fileNaming.js';
import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';

describe('JsonResultsExporter', () => {
  function makeJob(slug: string): Job {
    const now = new Date().toISOString();
    return {
      id: `job-${slug}`,
      slug,
      name: `Job ${slug}`,
      description: 'desc',
      qualificationPrompt: 'prompt',
      subreddits: ['askreddit'],
      scheduleCron: '*/30 * * * *',
      enabled: true,
      monitorComments: true,
      createdAt: now,
      updatedAt: now
    };
  }

  function makeRow(id: string, overrides: Partial<QualifiedScanItemRow> = {}): QualifiedScanItemRow {
    return {
      id,
      jobId: 'job-1',
      runId: 'run-1',
      author: 'author',
      title: 'Title',
      body: 'Body',
      url: `https://reddit.com/${id}`,
      redditPostedAt: '2026-02-01T00:00:00.000Z',
      viewed: false,
      validated: false,
      processed: false,
      qualificationReason: 'fit',
      createdAt: '2026-02-01 00:00:00',
      ...overrides
    };
  }

  it('writes JSON array and returns summary with timestamped filename', () => {
    const paths = ensureAppDirs();
    const exporter = new JsonResultsExporter();
    const job = makeJob(`json-export-${Date.now()}`);
    const exportedAt = new Date('2026-03-31T14:22:00.000Z');

    const summary = exporter.exportJobResults(job, [makeRow('r1'), makeRow('r2')], exportedAt);
    const outputPath = path.join(paths.resultsDir, createExportFileName(job.slug, 'json', exportedAt));

    expect(summary.outputPath).toBe(outputPath);
    expect(summary.rowCount).toBe(2);

    const rawContent = fs.readFileSync(outputPath, 'utf8');
    const parsed = JSON.parse(rawContent) as QualifiedScanItemRow[];

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(expect.objectContaining({ id: 'r1', runId: 'run-1' }));
    expect(parsed[1]).toEqual(expect.objectContaining({ id: 'r2' }));
  });

  it('writes an empty array when there are no qualified rows', () => {
    const paths = ensureAppDirs();
    const exporter = new JsonResultsExporter();
    const job = makeJob(`json-empty-${Date.now()}`);
    const exportedAt = new Date('2026-03-31T14:22:00.000Z');

    exporter.exportJobResults(job, [], exportedAt);

    const outputPath = path.join(paths.resultsDir, createExportFileName(job.slug, 'json', exportedAt));
    const rawContent = fs.readFileSync(outputPath, 'utf8');
    const parsed = JSON.parse(rawContent) as QualifiedScanItemRow[];

    expect(parsed).toEqual([]);
  });
});
