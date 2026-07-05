import Phaser from 'phaser';
import type { ControlScheme, InputIntent } from './types';

type Keys = Record<string, Phaser.Input.Keyboard.Key>;

export class KeyboardControls implements ControlScheme {
  private keys: Keys;

  constructor(scene: Phaser.Scene) {
    // Arrows AND WASD are both always live — no sub-toggle needed.
    this.keys = scene.input.keyboard!.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,X,J,E'
    ) as Keys;
  }

  update(): InputIntent {
    const k = this.keys;
    const left = k.LEFT.isDown || k.A.isDown;
    const right = k.RIGHT.isDown || k.D.isDown;
    const up = k.UP.isDown || k.W.isDown;
    const down = k.DOWN.isDown || k.S.isDown;
    const just = Phaser.Input.Keyboard.JustDown;
    return {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      aimX: (right ? 1 : 0) - (left ? 1 : 0),
      aimY: (down ? 1 : 0) - (up ? 1 : 0),
      jump: just(k.SPACE) || just(k.UP) || just(k.W),
      attack: just(k.X) || just(k.J),
      interact: just(k.E),
    };
  }

  destroy(): void {}
}
