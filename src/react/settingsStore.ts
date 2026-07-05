/**
 * Whether the Settings dialog is open. Plain module state (not the
 * startup-race-prone pattern sceneStore.ts needs) — this only ever toggles
 * well after mount, from a real gear-icon click, so a simple listener set
 * is safe. Read from both React (to show the Dialog) and Phaser (StarMap.ts,
 * to suppress its own hover/click handling while the dialog is open).
 */
let open = false;
const listeners = new Set<() => void>();

export function isSettingsOpen(): boolean {
  return open;
}

export function setSettingsOpen(next: boolean): void {
  open = next;
  listeners.forEach((l) => l());
}

export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
