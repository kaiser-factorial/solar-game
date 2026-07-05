import Phaser from 'phaser';
import { state, type Character } from '../systems/save';
import { ensurePlayerTexture, OPTION_NAMES } from '../systems/textures';
import { sprinkleStars, txt } from '../systems/ui';

const SLOTS: (keyof Character)[] = ['skin', 'hair', 'suit', 'visor', 'accessory', 'pattern'];
const OPTION_COUNT = 6;

const DEFAULT_CHARACTER: Character = { skin: 0, hair: 1, suit: 2, visor: 0, accessory: 0, pattern: 0 };

/**
 * Owns only the live sprite preview (necessarily Phaser/canvas-rendered) and
 * the actual `ch` data — all interactive UI is the React
 * CharacterCreatorPanel (src/react/CharacterCreatorPanel.tsx), which sends
 * intents via game.events and receives the current state back via
 * 'ss-creator-sync', mirroring the Settings dialog's split.
 */
export class CharacterCreatorScene extends Phaser.Scene {
  private ch!: Character;
  private preview!: Phaser.GameObjects.Image;

  constructor() {
    super('CharacterCreator');
  }

  create(): void {
    this.game.events.emit('ss-scene', 'creator');
    sprinkleStars(this);
    this.ch = state.character ? { ...state.character } : { ...DEFAULT_CHARACTER };

    txt(this, 480, 60, 'Make your scout!', 36, '#ffe08a');
    txt(this, 250, 120, `Scout ${state.playerName}`, 20, '#9fb0d8');
    this.preview = this.add.image(250, 300, ensurePlayerTexture(this, this.ch)).setScale(4.5);
    this.tweens.add({ targets: this.preview, y: 292, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });

    const onCycle = ({ slot, dir }: { slot: keyof Character; dir: number }) => {
      this.ch[slot] = (this.ch[slot] + dir + OPTION_COUNT) % OPTION_COUNT;
      this.refresh();
    };
    const onRandomize = () => {
      for (const slot of SLOTS) this.ch[slot] = Math.floor(Math.random() * OPTION_COUNT);
      this.refresh();
    };
    const onDone = () => this.done();

    this.game.events.on('ss-creator-cycle', onCycle);
    this.game.events.on('ss-creator-randomize', onRandomize);
    this.game.events.on('ss-creator-done', onDone);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ss-creator-cycle', onCycle);
      this.game.events.off('ss-creator-randomize', onRandomize);
      this.game.events.off('ss-creator-done', onDone);
    });

    this.sync();
  }

  private sync(): void {
    this.game.events.emit('ss-creator-sync', { ch: { ...this.ch }, names: OPTION_NAMES });
  }

  private refresh(): void {
    this.preview.setTexture(ensurePlayerTexture(this, this.ch));
    this.sync();
  }

  private done(): void {
    state.character = { ...this.ch };
    state.touch();
    state.flush();
    this.scene.start('StarMap');
  }
}
