import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const SNOOPY_MARKER = 'snoopy';

export type AgentRuntime =
  | 'claude'
  | 'claude-desktop'
  | 'chatgpt'
  | 'gemini'
  | 'codex'
  | 'cursor'
  | 'vscode'
  | 'opencode'
  | 'generic-mcp';

const SUPPORTED_RUNTIMES: AgentRuntime[] = [
  'claude',
  'claude-desktop',
  'chatgpt',
  'gemini',
  'codex',
  'cursor',
  'vscode',
  'opencode',
  'generic-mcp',
];

type AgentInstallResult = {
  runtime: AgentRuntime;
  installed: boolean;
  configPath: string;
  message: string;
};

type AgentStatusEntry = {
  runtime: AgentRuntime;
  installed: boolean;
  configPath: string;
};

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    return raw as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function readTomlFile(path: string): string {
  if (!existsSync(path)) {
    return '';
  }
  return readFileSync(path, 'utf8');
}

function writeTomlFile(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content);
}

// --- Claude Code ---
function installClaude(): AgentInstallResult {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SNOOPY_MARKER] = { command: 'snoopy', args: ['mcp'] };
  settings.mcpServers = mcpServers;
  writeJsonFile(settingsPath, settings);

  return {
    runtime: 'claude',
    installed: true,
    configPath: settingsPath,
    message: `Registered Snoopy MCP server in ${settingsPath}`,
  };
}

function uninstallClaude(): AgentInstallResult {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  delete mcpServers[SNOOPY_MARKER];
  settings.mcpServers = mcpServers;
  writeJsonFile(settingsPath, settings);

  return {
    runtime: 'claude',
    installed: false,
    configPath: settingsPath,
    message: `Removed Snoopy MCP server from ${settingsPath}`,
  };
}

function isClaudeInstalled(): boolean {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in mcpServers;
}

// --- Claude Desktop ---
function getClaudeDesktopConfigPath(): string {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  }
  return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

function installClaudeDesktop(): AgentInstallResult {
  const configPath = getClaudeDesktopConfigPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SNOOPY_MARKER] = { command: 'snoopy', args: ['mcp'] };
  config.mcpServers = mcpServers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'claude-desktop',
    installed: true,
    configPath,
    message: `Registered Snoopy MCP server in ${configPath}`,
  };
}

function uninstallClaudeDesktop(): AgentInstallResult {
  const configPath = getClaudeDesktopConfigPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  delete mcpServers[SNOOPY_MARKER];
  config.mcpServers = mcpServers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'claude-desktop',
    installed: false,
    configPath,
    message: `Removed Snoopy MCP server from ${configPath}`,
  };
}

function isClaudeDesktopInstalled(): boolean {
  const configPath = getClaudeDesktopConfigPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in mcpServers;
}

// --- ChatGPT Desktop ---
function installChatGpt(): AgentInstallResult {
  console.log('[snoopy] ChatGPT Desktop uses remote MCP servers via Developer Mode.');
  console.log('[snoopy] To register Snoopy with ChatGPT:');
  console.log('  1. Open ChatGPT Desktop > Settings > Apps > Advanced settings');
  console.log('  2. Enable Developer mode');
  console.log('  3. Create a new MCP app pointing to Snoopy (requires a remote MCP proxy)');
  console.log('[snoopy] Note: ChatGPT Desktop requires a remote HTTP MCP endpoint, not local stdio.');
  console.log('[snoopy] For local usage, consider using a stdio-to-HTTP proxy.');

  return {
    runtime: 'chatgpt',
    installed: false,
    configPath: 'manual-setup',
    message: 'ChatGPT Desktop requires manual MCP app setup via Developer Mode. See printed instructions.',
  };
}

function uninstallChatGpt(): AgentInstallResult {
  return {
    runtime: 'chatgpt',
    installed: false,
    configPath: 'manual-setup',
    message: 'ChatGPT Desktop MCP apps are managed in the ChatGPT Desktop UI.',
  };
}

function isChatGptInstalled(): boolean {
  return false;
}

// --- Gemini ---
function getGeminiSettingsPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Gemini', 'settings.json');
  }
  return join(homedir(), '.gemini', 'settings.json');
}

function installGemini(): AgentInstallResult {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SNOOPY_MARKER] = { command: 'snoopy', args: ['mcp'] };
  settings.mcpServers = mcpServers;
  writeJsonFile(settingsPath, settings);

  return {
    runtime: 'gemini',
    installed: true,
    configPath: settingsPath,
    message: `Registered Snoopy MCP server in ${settingsPath}`,
  };
}

function uninstallGemini(): AgentInstallResult {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  delete mcpServers[SNOOPY_MARKER];
  settings.mcpServers = mcpServers;
  writeJsonFile(settingsPath, settings);

  return {
    runtime: 'gemini',
    installed: false,
    configPath: settingsPath,
    message: `Removed Snoopy MCP server from ${settingsPath}`,
  };
}

function isGeminiInstalled(): boolean {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);
  const mcpServers = (settings.mcpServers as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in mcpServers;
}

// --- Codex ---
function getCodexConfigPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'codex', 'config.toml');
  }
  return join(homedir(), '.codex', 'config.toml');
}

function installCodex(): AgentInstallResult {
  const configPath = getCodexConfigPath();
  let content = readTomlFile(configPath);

  const marker = `[mcp_servers.${SNOOPY_MARKER}]`;
  if (content.includes(marker)) {
    return {
      runtime: 'codex',
      installed: true,
      configPath,
      message: `Snoopy MCP server already registered in ${configPath}`,
    };
  }

  const section = `\n${marker}\ncommand = "snoopy"\nargs = ["mcp"]\nenabled = true\ntool_timeout_sec = 120\n`;
  content += section;
  writeTomlFile(configPath, content);

  return {
    runtime: 'codex',
    installed: true,
    configPath,
    message: `Registered Snoopy MCP server in ${configPath}`,
  };
}

function uninstallCodex(): AgentInstallResult {
  const configPath = getCodexConfigPath();
  let content = readTomlFile(configPath);

  const marker = `[mcp_servers.${SNOOPY_MARKER}]`;
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    return {
      runtime: 'codex',
      installed: false,
      configPath,
      message: `Snoopy MCP server not found in ${configPath}`,
    };
  }

  const afterMarker = content.slice(markerIndex + marker.length);
  const nextSectionMatch = afterMarker.match(/\n\[/);
  const endIndex = nextSectionMatch
    ? markerIndex + marker.length + nextSectionMatch.index! + 1
    : content.length;

  content = content.slice(0, markerIndex) + content.slice(endIndex);
  writeTomlFile(configPath, content.trimEnd() + '\n');

  return {
    runtime: 'codex',
    installed: false,
    configPath,
    message: `Removed Snoopy MCP server from ${configPath}`,
  };
}

function isCodexInstalled(): boolean {
  const configPath = getCodexConfigPath();
  const content = readTomlFile(configPath);
  return content.includes(`[mcp_servers.${SNOOPY_MARKER}]`);
}

// --- Cursor ---
function getCursorMcpPath(): string {
  return join(homedir(), '.cursor', 'mcp.json');
}

function installCursor(): AgentInstallResult {
  const configPath = getCursorMcpPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  mcpServers[SNOOPY_MARKER] = { command: 'snoopy', args: ['mcp'] };
  config.mcpServers = mcpServers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'cursor',
    installed: true,
    configPath,
    message: `Registered Snoopy MCP server in ${configPath}`,
  };
}

function uninstallCursor(): AgentInstallResult {
  const configPath = getCursorMcpPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  delete mcpServers[SNOOPY_MARKER];
  config.mcpServers = mcpServers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'cursor',
    installed: false,
    configPath,
    message: `Removed Snoopy MCP server from ${configPath}`,
  };
}

function isCursorInstalled(): boolean {
  const configPath = getCursorMcpPath();
  const config = readJsonFile(configPath);
  const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in mcpServers;
}

// --- VS Code ---
function getVSCodeMcpPath(): string {
  return join(process.cwd(), '.vscode', 'mcp.json');
}

function installVSCode(): AgentInstallResult {
  const configPath = getVSCodeMcpPath();
  const config = readJsonFile(configPath);
  const servers = (config.servers as Record<string, unknown>) ?? {};
  servers[SNOOPY_MARKER] = {
    type: 'stdio',
    command: 'snoopy',
    args: ['mcp'],
  };
  config.servers = servers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'vscode',
    installed: true,
    configPath,
    message: `Registered Snoopy MCP server in ${configPath}`,
  };
}

function uninstallVSCode(): AgentInstallResult {
  const configPath = getVSCodeMcpPath();
  const config = readJsonFile(configPath);
  const servers = (config.servers as Record<string, unknown>) ?? {};
  delete servers[SNOOPY_MARKER];
  config.servers = servers;
  writeJsonFile(configPath, config);

  return {
    runtime: 'vscode',
    installed: false,
    configPath,
    message: `Removed Snoopy MCP server from ${configPath}`,
  };
}

function isVSCodeInstalled(): boolean {
  const configPath = getVSCodeMcpPath();
  const config = readJsonFile(configPath);
  const servers = (config.servers as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in servers;
}

// --- OpenCode ---
function getOpenCodeConfigPath(): string {
  return join(process.cwd(), 'opencode.json');
}

function installOpenCode(): AgentInstallResult {
  const configPath = getOpenCodeConfigPath();
  const config = readJsonFile(configPath);
  const mcp = (config.mcp as Record<string, unknown>) ?? {};
  mcp[SNOOPY_MARKER] = {
    type: 'local',
    command: ['snoopy', 'mcp'],
    enabled: true,
  };
  config.mcp = mcp;
  writeJsonFile(configPath, config);

  return {
    runtime: 'opencode',
    installed: true,
    configPath,
    message: `Registered Snoopy MCP server in ${configPath}`,
  };
}

function uninstallOpenCode(): AgentInstallResult {
  const configPath = getOpenCodeConfigPath();
  const config = readJsonFile(configPath);
  const mcp = (config.mcp as Record<string, unknown>) ?? {};
  delete mcp[SNOOPY_MARKER];
  config.mcp = mcp;
  writeJsonFile(configPath, config);

  return {
    runtime: 'opencode',
    installed: false,
    configPath,
    message: `Removed Snoopy MCP server from ${configPath}`,
  };
}

function isOpenCodeInstalled(): boolean {
  const configPath = getOpenCodeConfigPath();
  const config = readJsonFile(configPath);
  const mcp = (config.mcp as Record<string, unknown>) ?? {};
  return SNOOPY_MARKER in mcp;
}

// --- Generic MCP ---
function installGenericMcp(): AgentInstallResult {
  const config = {
    mcpServers: {
      snoopy: {
        command: 'snoopy',
        args: ['mcp'],
      },
    },
  };

  console.log('[snoopy] Generic MCP server configuration:');
  console.log('');
  console.log('JSON format:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');
  console.log('Add this to your agent framework\'s MCP server configuration.');

  return {
    runtime: 'generic-mcp',
    installed: false,
    configPath: 'manual',
    message: 'Printed generic MCP config to stdout. Add to your agent framework manually.',
  };
}

function uninstallGenericMcp(): AgentInstallResult {
  return {
    runtime: 'generic-mcp',
    installed: false,
    configPath: 'manual',
    message: 'Remove the snoopy MCP server entry from your agent framework config manually.',
  };
}

function isGenericMcpInstalled(): boolean {
  return false;
}

// --- Dispatch ---
type RuntimeHandlers = {
  install: () => AgentInstallResult;
  uninstall: () => AgentInstallResult;
  isInstalled: () => boolean;
};

const RUNTIME_HANDLERS: Record<AgentRuntime, RuntimeHandlers> = {
  'claude': { install: installClaude, uninstall: uninstallClaude, isInstalled: isClaudeInstalled },
  'claude-desktop': { install: installClaudeDesktop, uninstall: uninstallClaudeDesktop, isInstalled: isClaudeDesktopInstalled },
  'chatgpt': { install: installChatGpt, uninstall: uninstallChatGpt, isInstalled: isChatGptInstalled },
  'gemini': { install: installGemini, uninstall: uninstallGemini, isInstalled: isGeminiInstalled },
  'codex': { install: installCodex, uninstall: uninstallCodex, isInstalled: isCodexInstalled },
  'cursor': { install: installCursor, uninstall: uninstallCursor, isInstalled: isCursorInstalled },
  'vscode': { install: installVSCode, uninstall: uninstallVSCode, isInstalled: isVSCodeInstalled },
  'opencode': { install: installOpenCode, uninstall: uninstallOpenCode, isInstalled: isOpenCodeInstalled },
  'generic-mcp': { install: installGenericMcp, uninstall: uninstallGenericMcp, isInstalled: isGenericMcpInstalled },
};

function validateRuntime(runtime: string): AgentRuntime {
  if (!SUPPORTED_RUNTIMES.includes(runtime as AgentRuntime)) {
    throw new Error(
      `Unsupported runtime "${runtime}". Supported: ${SUPPORTED_RUNTIMES.join(', ')}`,
    );
  }
  return runtime as AgentRuntime;
}

export async function agentInstall(runtime: string): Promise<AgentInstallResult> {
  const rt = validateRuntime(runtime);
  const result = RUNTIME_HANDLERS[rt].install();
  console.log(`[snoopy] ${result.message}`);
  return result;
}

export async function agentUninstall(runtime: string): Promise<AgentInstallResult> {
  const rt = validateRuntime(runtime);
  const result = RUNTIME_HANDLERS[rt].uninstall();
  console.log(`[snoopy] ${result.message}`);
  return result;
}

export async function agentStatus(): Promise<{ runtimes: AgentStatusEntry[] }> {
  const runtimes: AgentStatusEntry[] = SUPPORTED_RUNTIMES.map((rt) => {
    let configPath = '';
    try {
      switch (rt) {
        case 'claude': configPath = join(homedir(), '.claude', 'settings.json'); break;
        case 'claude-desktop': configPath = getClaudeDesktopConfigPath(); break;
        case 'chatgpt': configPath = 'manual-setup'; break;
        case 'gemini': configPath = getGeminiSettingsPath(); break;
        case 'codex': configPath = getCodexConfigPath(); break;
        case 'cursor': configPath = getCursorMcpPath(); break;
        case 'vscode': configPath = getVSCodeMcpPath(); break;
        case 'opencode': configPath = getOpenCodeConfigPath(); break;
        case 'generic-mcp': configPath = 'manual'; break;
      }
    } catch {
      configPath = 'unknown';
    }

    return {
      runtime: rt,
      installed: RUNTIME_HANDLERS[rt].isInstalled(),
      configPath,
    };
  });

  return { runtimes };
}
