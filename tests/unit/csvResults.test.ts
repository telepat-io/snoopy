import fs from 'node:fs';
import path from 'node:path';
import type { Job } from '../../src/types/job.js';
import { ensureAppDirs } from '../../src/utils/paths.js';
import { CsvResultsExporter } from '../../src/services/export/csvResults.js';
import type { QualifiedScanItemRow } from '../../src/services/db/repositories/scanItemsRepo.js';

describe('CsvResultsExporter', () => {
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
      qualificationReason: 'fit',
      createdAt: '2026-02-01 00:00:00',
      ...overrides
    };
  }

  it('writes header and rows and overwrites existing file content', () => {
    const paths = ensureAppDirs();
    const exporter = new CsvResultsExporter();
    const job = makeJob(`csv-overwrite-${Date.now()}`);

    const outputPath = path.join(paths.resultsDir, `${job.slug}.csv`);
    fs.writeFileSync(outputPath, 'stale file\n', 'utf8');

    const summary = exporter.exportJobResults(job, [makeRow('r1')]);

    expect(summary.outputPath).toBe(outputPath);
    expect(summary.rowCount).toBe(1);

    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content.startsWith('URL,Title,Truncated Content,Author,Justification,Date\n')).toBe(true);
    expect(content).toContain('https://reddit.com/r1,Title,Body,author,fit,2026-02-01T00:00:00.000Z');
    expect(content).not.toContain('stale file');
  });

  it('escapes quotes, commas, and multiline values and truncates content to 300 chars', () => {
    const paths = ensureAppDirs();
    const exporter = new CsvResultsExporter();
    const job = makeJob(`csv-escape-${Date.now()}`);

    const longBody = `${'x'.repeat(320)} tail`;
    exporter.exportJobResults(job, [
      makeRow('r2', {
        title: 'Title with, comma and "quote"',
        body: longBody,
        qualificationReason: 'reason with\nnewline',
        author: 'auth,or'
      })
    ]);

    const outputPath = path.join(paths.resultsDir, `${job.slug}.csv`);
    const content = fs.readFileSync(outputPath, 'utf8');

    expect(content).toContain('"Title with, comma and ""quote"""');
    expect(content).toContain('"auth,or"');
    expect(content).toContain('"reason with\nnewline"');
    expect(content).toContain(`${'x'.repeat(300)}...`);
    expect(content).not.toContain(`${'x'.repeat(320)} tail`);
  });
});
