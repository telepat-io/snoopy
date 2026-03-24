// Notification utility for job completion
import notifier from 'node-notifier';

export function sendJobNotification({ jobName, qualifiedCount, discoveredCount, newCount }: {
  jobName: string;
  qualifiedCount: number;
  discoveredCount?: number;
  newCount?: number;
}) {
  const message = `${qualifiedCount} post${qualifiedCount === 1 ? '' : 's'} qualified` +
    (typeof discoveredCount === 'number' && typeof newCount === 'number'
      ? ` (out of ${discoveredCount} scanned, ${newCount} new)`
      : '');
  notifier.notify({
    title: `Job Complete: ${jobName}`,
    message,
    wait: false
  });
}
