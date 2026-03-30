import React, { useMemo, useState } from 'react';
import { Text, useInput, useStdout } from 'ink';
import { uiTheme } from '../theme.js';
import { AppFrame, Panel } from './AppFrame.js';
import {
  buildScrollableResultLines,
  nextContentScrollTop,
  nextItemIndex,
  type ResultsViewerItem
} from './resultsViewerModel.js';

interface ResultsViewerProps {
  jobName: string;
  jobSlug: string;
  items: ResultsViewerItem[];
  onExit: () => void;
}

export function ResultsViewer({ jobName, jobSlug, items, onExit }: ResultsViewerProps): React.JSX.Element {
  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const terminalCols = stdout?.columns ?? 80;

  const [cursor, setCursor] = useState(0);
  const [contentScrollTop, setContentScrollTop] = useState(0);

  const item = items[cursor];
  const resultLines = useMemo(() => {
    if (!item) {
      return [];
    }

    return buildScrollableResultLines(item, Math.max(20, terminalCols - 8));
  }, [item, terminalCols]);

  // Most of the terminal height is allocated to one scrollable result pane.
  const contentWindowSize = Math.max(5, terminalRows - 10);
  const visibleContent = resultLines.slice(contentScrollTop, contentScrollTop + contentWindowSize);
  const aboveCount = contentScrollTop;
  const belowCount = Math.max(0, resultLines.length - (contentScrollTop + contentWindowSize));
  const metadataStartIndex = resultLines.indexOf('Metadata');

  useInput((input, key) => {
    if (key.leftArrow) {
      const next = nextItemIndex(cursor, 'left', items.length);
      if (next !== cursor) {
        setCursor(next);
        setContentScrollTop(0);
      }
      return;
    }

    if (key.rightArrow) {
      const next = nextItemIndex(cursor, 'right', items.length);
      if (next !== cursor) {
        setCursor(next);
        setContentScrollTop(0);
      }
      return;
    }

    if (key.upArrow) {
      setContentScrollTop((prev) => nextContentScrollTop(prev, 'up', resultLines.length, contentWindowSize));
      return;
    }

    if (key.downArrow) {
      setContentScrollTop((prev) => nextContentScrollTop(prev, 'down', resultLines.length, contentWindowSize));
      return;
    }

    if (key.escape || input === 'q' || input === 'Q') {
      onExit();
    }
  });

  if (!item) {
    return (
      <AppFrame subtitle="Results" statusText="No items" statusTone="warning" hints={['q quit']}>
        <Panel title="No Results">
          <Text color={uiTheme.ink.warning}>No results available.</Text>
        </Panel>
      </AppFrame>
    );
  }

  const qualificationMark = item.qualified ? '✓' : 'x';
  const qualificationText = item.qualified ? 'Qualified' : 'Not Qualified';
  const qualificationColor = item.qualified ? uiTheme.ink.success : uiTheme.ink.danger;
  const contentLinkLabel = item.type === 'comment' ? 'Comment URL' : 'Post URL';

  const renderLine = (line: string, absoluteIndex: number): React.JSX.Element => {
    const isMetadataLine = metadataStartIndex !== -1 && absoluteIndex > metadataStartIndex;

    if (isMetadataLine) {
      const match = line.match(/^([^:]+):(\s*)(.*)$/);
      if (match) {
        const [, label, gap, value] = match;
        return (
          <Text color={uiTheme.ink.textPrimary}>
            <Text color={uiTheme.ink.info}>{`${label}:`}</Text>
            {`${gap}${value}`}
          </Text>
        );
      }

      if (line.startsWith(' ')) {
        return <Text color={uiTheme.ink.textMuted}>{line}</Text>;
      }
    }

    if (line === 'Metadata' || line === 'Title' || line === 'Body' || line === 'Thread (root -> target)' || line === 'Target Comment Body') {
      return (
        <Text color={uiTheme.ink.accent} bold>
          {line}
        </Text>
      );
    }

    return <Text color={uiTheme.ink.textPrimary}>{line}</Text>;
  };

  return (
    <AppFrame
      subtitle="Results"
      description={`${jobName} (${jobSlug})`}
      statusText={`${cursor + 1} / ${items.length}`}
      statusTone="info"
      hints={['←→ result', '↑↓ scroll', 'q quit']}
    >
      <Text color={qualificationColor}>{`${qualificationMark} ${qualificationText}`}</Text>
      <Text color={uiTheme.ink.info}>{`${contentLinkLabel}: `}<Text color={uiTheme.ink.textPrimary}>{item.url}</Text></Text>

      <Panel title="Result">
        {aboveCount > 0 ? <Text color={uiTheme.ink.textMuted}>↑ {aboveCount} more</Text> : null}
        {visibleContent.map((line, index) => (
          <React.Fragment key={`${index}:${line.slice(0, 24)}`}>
            {renderLine(line, contentScrollTop + index)}
          </React.Fragment>
        ))}
        {belowCount > 0 ? <Text color={uiTheme.ink.textMuted}>↓ {belowCount} more</Text> : null}
      </Panel>
    </AppFrame>
  );
}
