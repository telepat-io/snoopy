import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testRootDir = path.join(os.tmpdir(), `snoopy-jest-${process.pid}`);

fs.rmSync(testRootDir, { recursive: true, force: true });
fs.mkdirSync(testRootDir, { recursive: true });

process.env.SNOOPY_ROOT_DIR = testRootDir;
