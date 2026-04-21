const SERVICE_NAME = 'snoopy';
const OPENROUTER_ACCOUNT_NAME = 'openrouter_api_key';
const REDDIT_CLIENT_SECRET_ACCOUNT_NAME = 'reddit_client_secret';
const OPENROUTER_ENV_NAME = 'SNOOPY_OPENROUTER_API_KEY';
const REDDIT_CLIENT_SECRET_ENV_NAME = 'SNOOPY_REDDIT_CLIENT_SECRET';

interface KeytarClient {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

let keytarClientPromise: Promise<KeytarClient | null> | undefined;

export class KeytarUnavailableError extends Error {
  constructor(message = 'Keychain storage is unavailable on this system.') {
    super(message);
    this.name = 'KeytarUnavailableError';
  }
}

async function getKeytarClient(): Promise<KeytarClient | null> {
  if (keytarClientPromise) {
    return keytarClientPromise;
  }

  keytarClientPromise = (async () => {
    try {
      const imported = (await import('keytar')) as { default?: unknown };
      const candidate = imported.default;

      if (
        candidate &&
        typeof candidate === 'object' &&
        typeof (candidate as KeytarClient).setPassword === 'function' &&
        typeof (candidate as KeytarClient).getPassword === 'function' &&
        typeof (candidate as KeytarClient).deletePassword === 'function'
      ) {
        return candidate as KeytarClient;
      }
    } catch {
      // Keytar can fail to load on systems missing native dependencies.
    }

    return null;
  })();

  return keytarClientPromise;
}

function readEnvSecret(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export async function isKeytarAvailable(): Promise<boolean> {
  const keytarClient = await getKeytarClient();
  return Boolean(keytarClient);
}

export async function setOpenRouterApiKey(apiKey: string): Promise<void> {
  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    throw new KeytarUnavailableError(
      `Unable to save OpenRouter API key because keychain storage is unavailable. Set ${OPENROUTER_ENV_NAME} instead.`
    );
  }

  await keytarClient.setPassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME, apiKey);
}

export async function deleteOpenRouterApiKey(): Promise<void> {
  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    return;
  }

  await keytarClient.deletePassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME);
}

export async function getOpenRouterApiKey(): Promise<string | null> {
  const keytarClient = await getKeytarClient();
  if (keytarClient) {
    try {
      const fromKeytar = await keytarClient.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT_NAME);
      if (fromKeytar) {
        return fromKeytar;
      }
    } catch {
      // Fall through to env fallback if keytar read fails.
    }
  }

  return readEnvSecret(OPENROUTER_ENV_NAME);
}

export async function setRedditClientSecret(secret: string): Promise<void> {
  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    throw new KeytarUnavailableError(
      `Unable to save Reddit client secret because keychain storage is unavailable. Set ${REDDIT_CLIENT_SECRET_ENV_NAME} instead.`
    );
  }

  await keytarClient.setPassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME, secret);
}

export async function getRedditClientSecret(): Promise<string | null> {
  const keytarClient = await getKeytarClient();
  if (keytarClient) {
    try {
      const fromKeytar = await keytarClient.getPassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME);
      if (fromKeytar) {
        return fromKeytar;
      }
    } catch {
      // Fall through to env fallback if keytar read fails.
    }
  }

  return readEnvSecret(REDDIT_CLIENT_SECRET_ENV_NAME);
}

export async function deleteRedditClientSecret(): Promise<void> {
  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    return;
  }

  await keytarClient.deletePassword(SERVICE_NAME, REDDIT_CLIENT_SECRET_ACCOUNT_NAME);
}
