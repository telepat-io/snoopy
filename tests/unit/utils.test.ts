import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../src/utils/logger.js';
import { ensureAppDirs, getAppPaths } from '../../src/utils/paths.js';

describe('utils paths and logger', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('uses SNOOPY_ROOT_DIR when present', () => {
    const existing = process.env.SNOOPY_ROOT_DIR;
    process.env.SNOOPY_ROOT_DIR = '/tmp/snoopy-custom-root';

    const paths = getAppPaths();
    expect(paths.rootDir).toBe('/tmp/snoopy-custom-root');
    expect(paths.dbPath).toBe('/tmp/snoopy-custom-root/snoopy.db');

    process.env.SNOOPY_ROOT_DIR = existing;
  });

  it('falls back to user home directory when SNOOPY_ROOT_DIR is not set', () => {
    const existing = process.env.SNOOPY_ROOT_DIR;
    delete process.env.SNOOPY_ROOT_DIR;

    const paths = getAppPaths();
    expect(paths.rootDir).toBe(path.join(os.homedir(), '.snoopy'));

    process.env.SNOOPY_ROOT_DIR = existing;
  });

  it('creates only missing app directories', () => {
    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((target) => String(target).endsWith('/logs'));
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as unknown as string);

    const paths = ensureAppDirs();

    expect(paths.rootDir).toBeTruthy();
    expect(existsSpy).toHaveBeenCalled();
    expect(mkdirSpy).toHaveBeenCalledTimes(2);
  });

  it('writes info, warn, and error log entries', () => {
    const appendSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation(() => undefined);

    logger.info('hello');
    logger.warn('heads up');
    logger.error('boom');

    expect(appendSpy).toHaveBeenCalledTimes(3);
    expect(appendSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/snoopy.log'),
      expect.stringContaining('[INFO] hello')
    );
    expect(appendSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/snoopy.log'),
      expect.stringContaining('[WARN] heads up')
    );
    expect(appendSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/snoopy.log'),
      expect.stringContaining('[ERROR] boom')
    );
  });
});