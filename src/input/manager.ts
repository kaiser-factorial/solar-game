import Phaser from 'phaser';
import type { ControlScheme } from './types';
import { KeyboardControls } from './keyboard';

/**
 * Phase 2 registers mouse/face/hand schemes here, selected via
 * state.save.settings.controls. The MVP always returns keyboard —
 * webcam schemes must fall back here automatically when tracking drops.
 */
export function createControls(scene: Phaser.Scene): ControlScheme {
  return new KeyboardControls(scene);
}
