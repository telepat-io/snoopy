jest.mock('../../src/ui/components/CliHeader.js', () => ({
  SNOOPY_WORDMARK: 'Snoopy'
}));

function setTty(stdinEnabled: boolean, stdoutEnabled: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinEnabled
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutEnabled
  });
}

describe('console ui helpers', () => {
  const originalStdoutIsTty = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const originalStdinIsTty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const originalColumns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();

    if (originalStdoutIsTty) {
      Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTty);
    }

    if (originalStdinIsTty) {
      Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTty);
    }

    if (originalColumns) {
      Object.defineProperty(process.stdout, 'columns', originalColumns);
    }
  });

  it('detects rich tty only when stdin and stdout are both interactive', async () => {
    setTty(true, false);
    let consoleUi = await import('../../src/cli/ui/consoleUi.js');
    expect(consoleUi.isRichTty()).toBe(false);

    jest.resetModules();
    setTty(true, true);
    consoleUi = await import('../../src/cli/ui/consoleUi.js');
    expect(consoleUi.isRichTty()).toBe(true);
  });

  it('prints the cli header only once per module instance in rich tty mode', async () => {
    jest.resetModules();
    setTty(true, true);
    const logs: string[] = [];
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });
    const { printCliHeader } = await import('../../src/cli/ui/consoleUi.js');

    printCliHeader('First subtitle');
    printCliHeader('Second subtitle');

    expect(logs).toHaveLength(4);
    expect(logs[1]).toContain('Snoopy');
    expect(logs[2]).toContain('First subtitle');
    consoleSpy.mockRestore();
  });

  it('prints plain-text helper output outside rich tty mode', async () => {
    jest.resetModules();
    setTty(false, false);
    Object.defineProperty(process.stdout, 'columns', { configurable: true, value: 80 });
    const logs: string[] = [];
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });
    const { printSection, printMuted, printSuccess, printWarning, printError, printInfo, printKeyValue } = await import(
      '../../src/cli/ui/consoleUi.js'
    );

    printSection('Section Title');
    printMuted('muted');
    printSuccess('done');
    printWarning('careful');
    printError('broken');
    printInfo('info');
    printKeyValue('Model', 'kimi');

    expect(logs).toEqual([
      'Section Title',
      'muted',
      '[ok] done',
      '[warn] careful',
      '[error] broken',
      '- info',
      'Model               : kimi'
    ]);
    consoleSpy.mockRestore();
  });

  it('prints colored helper output in rich tty mode', async () => {
    jest.resetModules();
    setTty(true, true);
    Object.defineProperty(process.stdout, 'columns', { configurable: true, value: 40 });
    const logs: string[] = [];
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });
    const { printSection, printInfo, printKeyValue } = await import('../../src/cli/ui/consoleUi.js');

    printSection('Status');
    printInfo('informative');
    printKeyValue('ID', '123');

    expect(logs[0]).toContain('\u001b[36m');
    expect(logs[1]).toContain('\u001b[90m');
    expect(logs[2]).toContain('\u001b[34m');
    expect(logs[3]).toContain('\u001b[34m');
    consoleSpy.mockRestore();
  });

  it('omits optional post fields and shows pending status without a reason', async () => {
    jest.resetModules();
    setTty(false, false);
    const { formatPostScanBlock } = await import('../../src/cli/ui/consoleUi.js');

    const output = formatPostScanBlock({
      postId: 'post-1',
      title: '   ',
      bodySnippet: '',
      qualified: undefined,
      qualificationReason: '   '
    });

    expect(output).toContain('  ID: post-1');
    expect(output).toContain('  Status: pending');
    expect(output).not.toContain('Title:');
    expect(output).not.toContain('Snippet:');
    expect(output).not.toContain('Reason:');
    expect(output).not.toContain('Totals:');
  });

  it('normalizes whitespace and fills missing justification for comment blocks', async () => {
    jest.resetModules();
    setTty(false, false);
    const { formatCommentScanBlock } = await import('../../src/cli/ui/consoleUi.js');

    const output = formatCommentScanBlock({
      postId: 'post-1',
      commentId: 'comment-1',
      author: 'writer',
      commentSnippet: '  first\n\nsecond  ',
      qualified: false,
      qualificationReason: '   '
    });

    expect(output).toContain('  Snippet: first second');
    expect(output).toContain('  Status: not qualified');
    expect(output).toContain('  Reason: No justification provided.');
    expect(output).not.toContain('  Comment:');
    expect(output).not.toContain('  Post:');
  });
});