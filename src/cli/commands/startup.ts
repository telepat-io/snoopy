import { getStartupStatus, installStartup, uninstallStartup } from '../../services/startup/index.js';
import { printCommandScreen, printInfo, printSuccess, printWarning } from '../ui/consoleUi.js';

export function enableStartupCommand(): void {
  printCommandScreen('Startup configuration', 'Startup Enable');
  const result = installStartup(process.argv[1]!);
  if (result.success) {
    printSuccess(`Startup enabled using ${result.method}: ${result.detail}`);
    return;
  }

  printWarning(`Startup enable failed: ${result.detail}`);
}

export function disableStartupCommand(): void {
  printCommandScreen('Startup configuration', 'Startup Disable');
  uninstallStartup();
  printSuccess('Startup registration disabled (where present).');
}

export function startupStatusCommand(): void {
  printCommandScreen('Startup configuration', 'Startup Status');
  const status = getStartupStatus();
  printInfo(`Startup reboot mode: ${status.method}`);
  printInfo(`Startup enabled: ${status.enabled ? 'yes' : 'no'}`);
  printInfo(`Details: ${status.detail}`);
}

export const installStartupCommand = enableStartupCommand;
export const uninstallStartupCommand = disableStartupCommand;
