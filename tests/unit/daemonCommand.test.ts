import fs from 'node:fs';
import { ensureAppDirs } from '../../src/utils/paths.js';
import { requestDaemonReload } from '../../src/services/daemonControl.js';

describe('daemon reload signaling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    const paths = ensureAppDirs();
    fs.rmSync(paths.pidFilePath, { force: true });
  });

  it('returns not reloaded when daemon pid is missing', () => {
    const result = requestDaemonReload();

    expect(result).toEqual({ reloaded: false, pid: null });
  });

  it('signals running daemon with SIGUSR2', () => {
    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, '1234', 'utf8');

    const killSpy = jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0 || signal === 'SIGUSR2') {
        return true;
      }

      throw new Error('unexpected signal');
    }) as typeof process.kill);

    const result = requestDaemonReload();

    expect(result).toEqual({ reloaded: true, pid: 1234 });
    expect(killSpy).toHaveBeenNthCalledWith(1, 1234, 0);
    expect(killSpy).toHaveBeenNthCalledWith(2, 1234, 'SIGUSR2');
  });

  it('returns not reloaded when signal delivery fails', () => {
    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, '1234', 'utf8');

    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) {
        return true;
      }

      throw new Error('signal failed');
    }) as typeof process.kill);

    const result = requestDaemonReload();

    expect(result).toEqual({ reloaded: false, pid: 1234 });
  });
});
