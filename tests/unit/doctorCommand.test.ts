import fs from 'node:fs';
import keytar from 'keytar';
import { runDoctor } from '../../src/cli/commands/doctor.js';
import { ensureAppDirs } from '../../src/utils/paths.js';

// consoleUi transitively imports Ink which is ESM-only and fails to parse in Jest.
// Stub the whole module; printMuted/printWarning/printError forward to console.log
// so we can capture output via the existing console.log spy.
jest.mock('../../src/cli/ui/consoleUi.js', () => ({
  printCommandScreen: jest.fn(),
  printKeyValue: jest.fn(),
  printSection: jest.fn(),
  printSuccess: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn((text: string) => console.log(`[warn] ${String(text)}`)),
  printError: jest.fn((text: string) => console.log(`[error] ${String(text)}`)),
  printMuted: jest.fn((text: string) => console.log(String(text)))
}));

jest.mock('keytar', () => ({
  __esModule: true,
  default: {
    setPassword: jest.fn(),
    getPassword: jest.fn(),
    deletePassword: jest.fn()
  }
}));

const keytarMock = keytar as unknown as {
  getPassword: jest.Mock;
};

describe('runDoctor fix hints', () => {
  let logs: string[];

  beforeEach(() => {
    jest.restoreAllMocks();
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg ?? ''));
    });

    const paths = ensureAppDirs();
    fs.rmSync(paths.pidFilePath, { force: true });

    keytarMock.getPassword.mockResolvedValue(null);
  });

  function hasLog(text: string): boolean {
    return logs.some((line) => line.includes(text));
  }

  it('suggests snoopy daemon start when daemon is not running', async () => {
    await runDoctor();

    expect(hasLog('snoopy daemon start')).toBe(true);
  });

  it('suggests snoopy settings when OpenRouter API key is missing', async () => {
    await runDoctor();

    expect(hasLog('snoopy settings')).toBe(true);
  });

  it('does not suggest daemon start when daemon is already running', async () => {
    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, String(process.pid), 'utf8');
    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) return true;
      throw new Error('unexpected signal');
    }) as typeof process.kill);

    await runDoctor();

    expect(hasLog('snoopy daemon start')).toBe(false);
  });

  it('does not suggest snoopy settings when API key is configured', async () => {
    keytarMock.getPassword.mockResolvedValue('or-test-key-abc123');

    await runDoctor();

    expect(hasLog('snoopy settings')).toBe(false);
  });
});
