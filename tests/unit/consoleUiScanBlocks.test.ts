jest.mock('../../src/ui/components/CliHeader.js', () => ({
  SNOOPY_WORDMARK: 'Snoopy'
}));

import { formatCommentScanBlock, formatPostScanBlock } from '../../src/cli/ui/consoleUi.js';

function setTty(enabled: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: enabled
  });
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: enabled
  });
}

describe('scan block rendering in console UI', () => {
  const originalStdoutIsTty = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const originalStdinIsTty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  afterEach(() => {
    if (originalStdoutIsTty) {
      Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTty);
    }

    if (originalStdinIsTty) {
      Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTty);
    }
  });

  it('formats post scan output as a compact multiline block', () => {
    setTty(false);

    const output = formatPostScanBlock({
      postId: '1s4kmav',
      title: 'In loc sa mananc shaorma ca un om normal, am facut un site de review-uri',
      bodySnippet: 'Sunt un om cu o obsesie pentru shaorma si un laptop',
      qualified: true,
      qualificationReason: 'Original show and tell of live shawarma review website project',
      postUrl: 'https://reddit.com/post',
      itemsNew: 1,
      itemsQualified: 1
    });

    expect(output).toContain('Post\n');
    expect(output).toContain('  ID: 1s4kmav');
    expect(output).toContain('  Title: In loc sa mananc shaorma ca un om normal, am facut un site de review-uri');
    expect(output).toContain('  Snippet: Sunt un om cu o obsesie pentru shaorma si un laptop');
    expect(output).toContain('  Status: qualified');
    expect(output).toContain('  Reason: Original show and tell of live shawarma review website project');
    expect(output).toContain('  Post: https://reddit.com/post');
    expect(output).toContain('  Totals: new=1, qualified=1');
  });

  it('formats comment scan output as a compact multiline block', () => {
    setTty(false);

    const output = formatCommentScanBlock({
      postId: '1s4kmav',
      commentId: 't1_abc123',
      author: 'redditor123',
      commentSnippet: 'Ai facut deploy public?',
      qualified: false,
      qualificationReason: 'Question does not indicate interest beyond curiosity',
      postUrl: 'https://reddit.com/post',
      commentUrl: 'https://reddit.com/comment',
      itemsNew: 2,
      itemsQualified: 1
    });

    expect(output).toContain('Comment\n');
    expect(output).toContain('  Comment ID: t1_abc123');
    expect(output).toContain('  Post ID: 1s4kmav');
    expect(output).toContain('  Author: redditor123');
    expect(output).toContain('  Snippet: Ai facut deploy public?');
    expect(output).toContain('  Status: not qualified');
    expect(output).toContain('  Reason: Question does not indicate interest beyond curiosity');
    expect(output).toContain('  Comment: https://reddit.com/comment');
    expect(output).toContain('  Post: https://reddit.com/post');
    expect(output).toContain('  Totals: new=2, qualified=1');
  });

  it('applies ANSI colors to labels and status in rich TTY', () => {
    setTty(true);

    const output = formatPostScanBlock({
      postId: '1s4kmav',
      qualified: true,
      qualificationReason: 'Strong product demo with clear build context'
    });

    expect(output).toContain('\u001b[34mID:\u001b[0m');
    expect(output).toContain('\u001b[34mStatus:\u001b[0m \u001b[32mqualified\u001b[0m');
  });
});