import Phaser from 'phaser';
import { state, type Character } from '../systems/save';
import { ensurePlayerTexture, OPTION_NAMES } from '../systems/textures';
import { txt, makeButton, sprinkleStars } from '../systems/ui';

const SLOTS: (keyof Character)[] = ['skin', 'hair', 'suit', 'visor'];
const SLOT_LABELS: Record<string, string> = {
  skin: 'Skin',
  hair: 'Hair',
  suit: 'Suit',
  visor: 'Visor',
};

export class CharacterCreatorScene extends Phaser.Scene {
  private ch!: Character;
  private preview!: Phaser.GameObjects.Image;
  private valueTexts: Partial<Record<keyof Character, Phaser.GameObjects.Text>> = {};

  constructor() {
    super('CharacterCreator');
  }

  create(): void {
    sprinkleStars(this);
    this.ch = state.character ? { ...state.character } : { skin: 0, hair: 1, suit: 2, visor: 0 };

    txt(this, 480, 60, 'Make your scout!', 36, '#ffe08a');
    txt(this, 250, 120, `Scout ${state.playerName}`, 20, '#9fb0d8');
    this.preview = this.add.image(250, 300, ensurePlayerTexture(this, this.ch)).setScale(4.5);
    this.tweens.add({ targets: this.preview, y: 292, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });

    SLOTS.forEach((slot, i) => {
      const y = 170 + i * 62;
      txt(this, 520, y, SLOT_LABELS[slot], 22, '#9fb0d8').setOrigin(0, 0.5);
      makeButton(this, 640, y, '<', () => this.cycle(slot, -1));
      this.valueTexts[slot] = txt(this, 730, y, this.optionName(slot), 22);
      makeButton(this, 820, y, '>', () => this.cycle(slot, 1));
    });

    makeButton(this, 640, 430, '🎲 Surprise me', () => {
      for (const slot of SLOTS) this.ch[slot] = Math.floor(Math.random() * 4);
      this.refresh();
    });
    makeButton(this, 480, 495, '🚀 BLAST OFF!', () => this.done(), 26);
  }

  private optionName(slot: keyof Character): string {
    return OPTION_NAMES[slot][this.ch[slot]];
  }

  private cycle(slot: keyof Character, dir: number): void {
    this.ch[slot] = (this.ch[slot] + dir + 4) % 4;
    this.refresh();
  }

  private refresh(): void {
    this.preview.setTexture(ensurePlayerTexture(this, this.ch));
    for (const slot of SLOTS) this.valueTexts[slot]?.setText(this.optionName(slot));
  }

  private done(): void {
    state.character = { ...this.ch };
    state.touch();
    state.flush();
    this.scene.start('StarMap');
  }
}
