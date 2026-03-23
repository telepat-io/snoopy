import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const LABEL = 'com.snoopy.daemon';

export function installMacStartup(commandPath: string): string {
  const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(launchAgentsDir, `${LABEL}.plist`);

  fs.mkdirSync(launchAgentsDir, { recursive: true });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${commandPath}</string>
      <string>daemon</string>
      <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>`;

  fs.writeFileSync(plistPath, xml);
  execSync(`launchctl unload ${plistPath} >/dev/null 2>&1 || true`);
  execSync(`launchctl load ${plistPath}`);
  return plistPath;
}

export function uninstallMacStartup(): void {
  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
  execSync(`launchctl unload ${plistPath} >/dev/null 2>&1 || true`);
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
}
