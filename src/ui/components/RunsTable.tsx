import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { RunRow } from '../../services/db/repositories/runsRepo.js';
import { formatRunDisplayTimestamp } from '../../cli/ui/time.js';
import { uiTheme } from '../theme.js';
import { AppFrame, Panel } from './AppFrame.js';
import {
  buildDetailLines,
  computeColumnWidths,
  computeScrollWindow,
  formatHeaderRow,
  formatTableRow
} from './runsTableModel.js';

const WINDOW_SIZE = 10;
const COL_SEP = '  ';

type View = 'list' | 'detail';

interface RunsTableProps {
  totalRuns: number;
  getRunAt: (index: number) => RunRow | null;
  onExit: () => void;
}

export function RunsTable({ totalRuns, getRunAt, onExit }: RunsTableProps): React.JSX.Element {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;

  // Respect terminal height: cap window so we leave room for header + footer
  const maxWindow = Math.max(1, Math.min(WINDOW_SIZE, terminalRows - 8));

  const [view, setView] = useState<View>('list');
  const [cursor, setCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const currentRun = getRunAt(cursor);

  const { scrollTop: nextScrollTop, visibleStart, visibleEnd } = computeScrollWindow(
    cursor,
    scrollTop,
    totalRuns,
    maxWindow
  );

  const visibleRuns: RunRow[] = [];
  for (let index = visibleStart; index < visibleEnd; index += 1) {
    const run = getRunAt(index);
    if (run) {
      visibleRuns.push(run);
    }
  }

  const widthSample = currentRun ? [currentRun, ...visibleRuns] : visibleRuns;
  const widths = computeColumnWidths(widthSample);
  const header = formatHeaderRow(widths);

  if (nextScrollTop !== scrollTop) {
    setScrollTop(nextScrollTop);
  }

  const aboveCount = visibleStart;
  const belowCount = totalRuns - visibleEnd;

  useInput((input, key) => {
    if (view === 'list') {
      if (key.upArrow) {
        const next = Math.max(0, cursor - 1);
        setCursor(next);
        const win = computeScrollWindow(next, scrollTop, totalRuns, maxWindow);
        setScrollTop(win.scrollTop);
        return;
      }

      if (key.downArrow) {
        const next = Math.min(totalRuns - 1, cursor + 1);
        setCursor(next);
        const win = computeScrollWindow(next, scrollTop, totalRuns, maxWindow);
        setScrollTop(win.scrollTop);
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
    if (key.escape || key.leftArrow || input === 'q' || input === 'Q') {
      if (key.escape || key.leftArrow) {
        setView('list');
      } else {
        onExit();
      }
    }
  });

  if (view === 'detail') {
    const run = currentRun;
    if (!run) return <></>;
    const detailLines = buildDetailLines(run);
    const title = `${formatRunDisplayTimestamp(run)} — ${run.jobName ?? run.jobId}`;

    return (
      <AppFrame
        subtitle="Run History"
        statusText={`${cursor + 1} / ${totalRuns}`}
        statusTone="info"
        hints={['Esc / ← back', 'q quit']}
      >
        <Panel title={title}>
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
      subtitle="Run History"
      statusText={`${cursor + 1} / ${totalRuns}`}
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
        {visibleRuns.map((run, idx) => {
          const absoluteIndex = visibleStart + idx;
          const isSelected = absoluteIndex === cursor;
          const cells = formatTableRow(run, widths);
          const statusColor =
            run.status === 'completed'
              ? uiTheme.ink.success
              : run.status === 'failed'
                ? uiTheme.ink.danger
                : uiTheme.ink.textMuted;

          return (
            <Box key={run.id} flexDirection="row">
              {cells.map((cell, i) => {
                const color =
                  isSelected
                    ? uiTheme.ink.focus
                    : i === 5 // status column
                      ? statusColor
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
