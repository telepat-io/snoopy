import fs from 'node:fs';
import { createRunLogger } from '../../src/services/logging/runLogger.js';

describe('runLogger', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('writes structured entries to a per-run log file', () => {
    const runLogger = createRunLogger('test-run');

    runLogger.info('hello');
    runLogger.warn('heads up');
    runLogger.logRequest('POST', 'chat.completions.create', { foo: 'bar' });
    runLogger.logResponse(200, { ok: true });
    runLogger.error('boom');

    const content = fs.readFileSync(runLogger.getLogFilePath(), 'utf8');
    expect(content).toContain('[INFO] hello');
    expect(content).toContain('[WARN] heads up');
    expect(content).toContain('[REQUEST] POST chat.completions.create');
    expect(content).toContain('"foo": "bar"');
    expect(content).toContain('[RESPONSE] Status 200');
    expect(content).toContain('"ok": true');
    expect(content).toContain('[ERROR] boom');
  });

  it('creates logs directory when missing', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockImplementation(() => false);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as unknown as string);
    const appendSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation(() => undefined);

    const runLogger = createRunLogger('missing-dir');
    runLogger.info('hello');

    expect(existsSpy).toHaveBeenCalled();
    expect(mkdirSpy).toHaveBeenCalledWith(expect.stringContaining('/logs'), { recursive: true });
    expect(appendSpy).toHaveBeenCalled();
  });
});
