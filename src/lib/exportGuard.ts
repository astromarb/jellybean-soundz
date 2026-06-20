import { Sound, AppMode } from '../types';
import { checkExportRights } from './rights';

/**
 * Run the rights pre-check before an export. In Commercial mode, if any sound
 * has uncertain rights, show a warning listing the offenders and let the user
 * decide. Returns true when the export should proceed.
 *
 * Personal and Research modes never block — they are non-commercial workspaces.
 */
export function confirmExportRights(sounds: Sound[], mode: AppMode, what = 'export'): boolean {
  if (mode !== 'commercial') return true;

  const { offenders } = checkExportRights(sounds, mode);
  if (offenders.length === 0) return true;

  const list = offenders
    .slice(0, 12)
    .map((o) => `  • ${o.sound.name} — ${o.reason}`)
    .join('\n');
  const more = offenders.length > 12 ? `\n  …and ${offenders.length - 12} more` : '';

  const message =
    `⚠️ Commercial-Safe mode: this ${what} includes ${offenders.length} sound` +
    `${offenders.length === 1 ? '' : 's'} with uncertain commercial rights:\n\n` +
    `${list}${more}\n\n` +
    `These may not be cleared for commercial use. Export anyway?`;

  return window.confirm(message);
}
