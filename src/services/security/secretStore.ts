import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import keytar from 'keytar';
import { ensureAppDirs } from '../../utils/paths.js';

const SERVICE_NAME = 'snoopy';
const OPENROUTER_ACCOUNT_NAME = 'openrouter_api_key';
const REDDIT_CLIENT_SECRET_ACCOUNT_NAME = 'reddit_client_secret';
const FILE_NAME = 'secrets.enc';

interface FallbackSecrets {
  openrouter_api_key?: string;
  reddit_client_secret?: string;
}

function getFallbackPath(): string {
  const paths = ensureAppDirs();
  return path.join(paths.rootDir, FILE_NAME);
}

function getMachineKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(`${process.platform}:${process.arch}:${process.env.USER ?? process.env.USERNAME ?? 'user'}`)
    .digest();
}

function encrypt(value: string): string {
  const iv = crypto.randomBytes(16);
  const key = getMachineKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(value: string): string {
  const [ivHex, contentHex] = value.split(':');
  if (!ivHex || !contentHex) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const content = Buffer.from(contentHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getMachineKey(), iv);
  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  return decrypted.toString('utf8');
}

function readFallbackSecrets(): FallbackSecrets {
  const filePath = getFallbackPath();
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const decrypted = decrypt(fs.readFileSync(filePath, 'utf8'));
    const parsed = JSON.parse(decrypted) as FallbackSecrets;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Legacy fallback stored only OpenRouter API key as a plaintext payload before encryption.
  }

  try {
    const legacyValue = decrypt(fs.readFileSync(filePath, 'utf8'));
    return legacyValue ? { openrouter_api_key: legacyValue } : {};
  } catch {
    return {};
  }
}

function writeFallbackSecrets(secrets: FallbackSecrets): void {
  const sanitized: FallbackSecrets = {
    openrouter_api_key: secrets.openrouter_api_key?.trim() ? secrets.openrouter_api_key : undefined,
    reddit_client_secret: secrets.reddit_client_secret?.trim() ? secrets.reddit_client_secret : undefined
  };

  if (!sanitized.openrouter_api_key && !sanitized.reddit_client_secret) {
    const filePath = getFallbackPath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  const payload = encrypt(JSON.stringify(sanitized));
  fs.writeFileSync(getFallbackPath(), payload, { mode: 0o600 });
}

function setFallbackSecret(key: keyof FallbackSecrets, value: string): void {
  const current = readFallbackSecrets();
  current[key] = value;
  writeFallbackSecrets(current);
}

function getFallbackSecret(key: keyof FallbackSecrets): string | null {
  const current = readFallbackSecrets();
  return current[key] ?? null;
}

function deleteFallbackSecret(key: keyof FallbackSecrets): void {
  const current = readFallbackSecrets();
  delete current[key];
  writeFallbackSecrets(current);
}

export async function setOpenRouterApiKey(apiKey: string): Promise<void> {
  try {
    await keytar.setPassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME, apiKey);
    return;
  } catch {
    setFallbackSecret('openrouter_api_key', apiKey);
  }
}

export async function deleteOpenRouterApiKey(): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME);
  } catch {
    // Ignore keychain deletion failures and continue with file cleanup.
  }

  deleteFallbackSecret('openrouter_api_key');
}

export async function getOpenRouterApiKey(): Promise<string | null> {
  try {
    const fromKeytar = await keytar.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME);
    if (fromKeytar) {
      return fromKeytar;
    }
  } catch {
    // Fallback to encrypted file when keytar is unavailable.
  }

  return getFallbackSecret('openrouter_api_key');
}

export async function setRedditClientSecret(secret: string): Promise<void> {
  try {
    await keytar.setPassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME, secret);
    return;
  } catch {
    setFallbackSecret('reddit_client_secret', secret);
  }
}

export async function getRedditClientSecret(): Promise<string | null> {
  try {
    const fromKeytar = await keytar.getPassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME);
    if (fromKeytar) {
      return fromKeytar;
    }
  } catch {
    // Fallback to encrypted file when keytar is unavailable.
  }

  return getFallbackSecret('reddit_client_secret');
}

export async function deleteRedditClientSecret(): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME);
  } catch {
    // Ignore keychain deletion failures and continue with file cleanup.
  }

  deleteFallbackSecret('reddit_client_secret');
}
