import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { JobSummaryRow } from '../../services/db/repositories/jobsRepo.js';
import { uiTheme } from '../theme.js';
import { AppFrame, Panel } from './AppFrame.js';
import {
  buildJobDetailLines,
  computeJobColumnWidths,
  computeScrollWindow,
  formatJobHeaderRow,
  formatJobTableRow
} from './jobsTableModel.js';

const WINDOW_SIZE = 10;
const COL_SEP = '  ';

type View = 'list' | 'detail';

interface JobsTableProps {
  jobs: JobSummaryRow[];
  onExit: () => void;
}

export function JobsTable({ jobs, onExit }: JobsTableProps): React.JSX.Element {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const maxWindow = Math.max(1, Math.min(WINDOW_SIZE, terminalRows - 8));

  const [view, setView] = useState<View>('list');
  const [cursor, setCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const widths = computeJobColumnWidths(jobs);
  const header = formatJobHeaderRow(widths);

  const { scrollTop: nextScrollTop, visibleStart, visibleEnd } = computeScrollWindow(
    cursor,
    scrollTop,
    jobs.length,
    maxWindow
  );

  if (nextScrollTop !== scrollTop) {
    setScrollTop(nextScrollTop);
  }

  const visibleJobs = jobs.slice(visibleStart, visibleEnd);
  const aboveCount = visibleStart;
  const belowCount = jobs.length - visibleEnd;

  useInput((input, key) => {
    if (view === 'list') {
      if (key.upArrow) {
        const next = Math.max(0, cursor - 1);
        setCursor(next);
        setScrollTop(computeScrollWindow(next, scrollTop, jobs.length, maxWindow).scrollTop);
        return;
      }

      if (key.downArrow) {
        const next = Math.min(jobs.length - 1, cursor + 1);
        setCursor(next);
        setScrollTop(computeScrollWindow(next, scrollTop, jobs.length, maxWindow).scrollTop);
        return;
      }

      if (key.return) {
        setView('detail');
        return;
      }

      if (input === 'q' || input === 'Q') {
        onExit();
      }

      return;
    }

    // detail view
    if (key.escape || key.leftArrow) {
      setView('list');
      return;
    }

    if (input === 'q' || input === 'Q') {
      onExit();
    }
  });

  if (view === 'detail') {
    const job = jobs[cursor];
    if (!job) return <></>;
    const detailLines = buildJobDetailLines(job);

    return (
      <AppFrame
        subtitle="Jobs"
        statusText={`${cursor + 1} / ${jobs.length}`}
        statusTone="info"
        hints={['← back', 'q quit']}
      >
        <Panel title={job.jobName}>
          {detailLines.map((line) => (
            <Box key={line.label} flexDirection="row">
              <Text color={uiTheme.ink.info}>{line.label.padEnd(12)}</Text>
              <Text color={uiTheme.ink.textPrimary}>{line.value}</Text>
            </Box>
          ))}
        </Panel>
      </AppFrame>
    );
  }

  return (
    <AppFrame
      subtitle="Jobs"
      statusText={`${cursor + 1} / ${jobs.length}`}
      statusTone="info"
      hints={['↑↓ navigate', '↵ details', 'q quit']}
    >
      <Box flexDirection="column" marginTop={1} paddingLeft={1}>
        {/* Header */}
        <Box flexDirection="row">
          {header.map((cell, i) => (
            <Text key={i} bold color={uiTheme.ink.accent}>
              {i > 0 ? COL_SEP : ''}{cell}
            </Text>
          ))}
        </Box>

        {/* Scroll indicator: above */}
        {aboveCount > 0 && (
          <Text color={uiTheme.ink.textMuted}>  ↑ {aboveCount} more</Text>
        )}

        {/* Visible rows */}
        {visibleJobs.map((job, idx) => {
          const absoluteIndex = visibleStart + idx;
          const isSelected = absoluteIndex === cursor;
          const cells = formatJobTableRow(job, widths);

          return (
            <Box key={job.jobId} flexDirection="row">
              {cells.map((cell, i) => {
                const color = isSelected
                  ? uiTheme.ink.focus
                  : i === 0
                    ? uiTheme.ink.textPrimary
                    : uiTheme.ink.textMuted;

                return (
                  <Text key={i} color={color} inverse={isSelected && i === 0} bold={isSelected && i === 0}>
                    {i > 0 ? COL_SEP : ''}{cell}
                  </Text>
                );
              })}
            </Box>
          );
        })}

        {/* Scroll indicator: below */}
        {belowCount > 0 && (
          <Text color={uiTheme.ink.textMuted}>  ↓ {belowCount} more</Text>
        )}
      </Box>
    </AppFrame>
  );
}
