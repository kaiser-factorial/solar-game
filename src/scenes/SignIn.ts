import Phaser from 'phaser';
import { state } from '../systems/save';
import { configured, signInWithNamePin } from '../lib/supabase';
import { txt, sprinkleStars } from '../systems/ui';

export class SignInScene extends Phaser.Scene {
  constructor() {
    super('SignIn');
  }

  create(): void {
    sprinkleStars(this);
    txt(this, 480, 90, 'MOON SHARD', 52, '#ffe08a');
    txt(this, 480, 140, "Who's playing?", 24);

    const online = configured();
    const el = this.add.dom(480, 330).createFromHTML(`
      <div class="ss-form">
        <input id="ss-name" maxlength="12" placeholder="your name" autocomplete="off" />
        <input id="ss-pin" maxlength="4" inputmode="numeric" type="password"
               placeholder="4-digit secret PIN" autocomplete="off" />
        ${online ? '<button class="ss-btn" id="ss-play">🚀 Play!</button>' : ''}
        <button class="ss-btn ghost" id="ss-guest">Play as guest (saves on this computer)</button>
        <div class="ss-msg" id="ss-msg">${
          online ? 'Your PIN keeps your save safe — remember it!' : 'Online saves are not set up yet.'
        }</div>
      </div>
    `);
    el.addListener('click');
    el.on('click', (ev: Event) => {
      const id = (ev.target as HTMLElement)?.id;
      if (id === 'ss-play') void this.tryPlay(el);
      if (id === 'ss-guest') this.playAsGuest(el);
    });
  }

  private field(el: Phaser.GameObjects.DOMElement, id: string): string {
    return ((el.getChildByID(id) as HTMLInputElement)?.value ?? '').trim();
  }

  private msg(el: Phaser.GameObjects.DOMElement, s: string): void {
    const m = el.getChildByID('ss-msg') as HTMLElement;
    if (m) m.textContent = s;
  }

  private playAsGuest(el: Phaser.GameObjects.DOMElement): void {
    state.playerName = this.field(el, 'ss-name') || 'Scout';
    state.authed = false;
    state.touch();
    this.next();
  }

  private async tryPlay(el: Phaser.GameObjects.DOMElement): Promise<void> {
    const name = this.field(el, 'ss-name');
    const pin = this.field(el, 'ss-pin');
    if (name.length < 2) return this.msg(el, 'Type your name first (2+ letters)!');
    if (!/^\d{4}$/.test(pin)) return this.msg(el, 'Your PIN needs exactly 4 numbers.');
    this.msg(el, 'Connecting to mission control…');
    const r = await signInWithNamePin(name, pin);
    if (!r.ok) return this.msg(el, r.error ?? 'Something went wrong — try again!');
    this.next();
  }

  private next(): void {
    this.scene.start(state.character ? 'StarMap' : 'CharacterCreator');
  }
}
