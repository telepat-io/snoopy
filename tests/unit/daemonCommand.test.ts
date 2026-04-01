import fs from 'node:fs';
import childProcess from 'node:child_process';
import { ensureAppDirs } from '../../src/utils/paths.js';
import { ensureDaemonRunning, isDaemonRunning, requestDaemonReload } from '../../src/services/daemonControl.js';

describe('daemon reload signaling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    const paths = ensureAppDirs();
    fs.rmSync(paths.pidFilePath, { force: true });
  });

  it('reports daemon state when pid file is missing or stale', () => {
    expect(isDaemonRunning()).toEqual({ running: false, pid: null });

    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, '1234', 'utf8');
    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) {
        throw new Error('stale pid');
      }

      return true;
    }) as typeof process.kill);

    expect(isDaemonRunning()).toEqual({ running: false, pid: 1234 });
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

  it('starts the daemon when not already running and writes the new pid file', () => {
    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, '9999', 'utf8');

    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) {
        throw new Error('stale pid');
      }

      return true;
    }) as typeof process.kill);

    const unref = jest.fn();
    const spawnSpy = jest.spyOn(childProcess, 'spawn').mockReturnValue({
      pid: 4321,
      unref
    } as unknown as childProcess.ChildProcess);

    const result = ensureDaemonRunning();

    expect(result).toEqual({ started: true, pid: 4321 });
    expect(spawnSpy).toHaveBeenCalledWith(process.execPath, [process.argv[1]!, 'daemon', 'run'], {
      detached: true,
      stdio: 'ignore'
    });
    expect(unref).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(paths.pidFilePath, 'utf8')).toBe('4321');
  });

  it('does not start a new daemon when one is already running', () => {
    const paths = ensureAppDirs();
    fs.writeFileSync(paths.pidFilePath, '1234', 'utf8');
    jest.spyOn(process, 'kill').mockImplementation(((pid: number, signal?: NodeJS.Signals | number) => {
      if (signal === 0) {
        return true;
      }

      throw new Error('unexpected signal');
    }) as typeof process.kill);
    const spawnSpy = jest.spyOn(childProcess, 'spawn');

    const result = ensureDaemonRunning();

    expect(result).toEqual({ started: false, pid: 1234 });
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
