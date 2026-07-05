import Phaser from 'phaser';
import { state } from '../systems/save';
import { configured, signInWithNamePin, signOutUser } from '../lib/supabase';
import { txt, sprinkleStars } from '../systems/ui';

/** Keep kid-typed names safe to drop into innerHTML. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

export class SignInScene extends Phaser.Scene {
  constructor() {
    super('SignIn');
  }

  create(): void {
    this.game.events.emit('ss-scene', 'signin');
    sprinkleStars(this);
    txt(this, 480, 90, 'MOON SHARD', 52, '#ffe08a');

    // A saved character means someone has played on this computer (or is signed
    // in online). Greet them and let them Continue or hand off to a New player,
    // rather than silently dropping straight into their save.
    if (state.character) {
      this.showWelcomeBack();
    } else {
      this.showSignInForm();
    }
  }

  // ---- returning player ---------------------------------------------------

  private showWelcomeBack(): void {
    txt(this, 480, 150, 'Welcome back!', 24);
    const name = escapeHtml(state.playerName || 'Scout');
    const where = state.authed ? 'saved online ✓' : 'saved on this computer';
    // Guests share a single local slot, so a new guest replaces this game. The
    // real way to keep two separate games is a name + PIN each — nudge toward it.
    const guestWarn = state.authed
      ? ''
      : '<br>(This computer only holds one guest game — use a name + PIN each to keep two separate ones!)';

    const el = this.add.dom(480, 340).createFromHTML(`
      <div class="ss-form">
        <div class="ss-welcome-name">${name}</div>
        <div class="ss-hint">${where}</div>
        <div id="ss-main" class="ss-stack">
          <button class="ss-btn" id="ss-continue">▶ Continue</button>
          <button class="ss-btn ghost" id="ss-new">👋 New player</button>
        </div>
        <div id="ss-confirm" class="ss-stack" style="display:none;">
          <div class="ss-hint">Start fresh as someone new?${guestWarn}</div>
          <button class="ss-btn" id="ss-new-yes">Yes, I'm new</button>
          <button class="ss-btn ghost" id="ss-new-cancel">Never mind</button>
        </div>
      </div>
    `);

    el.addListener('click');
    el.on('click', (ev: Event) => {
      const id = (ev.target as HTMLElement)?.id;
      if (id === 'ss-continue') this.scene.start('StarMap');
      else if (id === 'ss-new') this.toggleConfirm(el, true);
      else if (id === 'ss-new-cancel') this.toggleConfirm(el, false);
      else if (id === 'ss-new-yes') void this.startNewPlayer(el);
    });
  }

  private toggleConfirm(el: Phaser.GameObjects.DOMElement, show: boolean): void {
    const main = el.getChildByID('ss-main') as HTMLElement | null;
    const confirm = el.getChildByID('ss-confirm') as HTMLElement | null;
    if (main) main.style.display = show ? 'none' : 'flex';
    if (confirm) confirm.style.display = show ? 'flex' : 'none';
  }

  private async startNewPlayer(el: Phaser.GameObjects.DOMElement): Promise<void> {
    const yes = el.getChildByID('ss-new-yes') as HTMLButtonElement | null;
    if (yes) {
      yes.disabled = true;
      yes.textContent = 'One sec…';
    }
    // Sign out any online session AND wipe local state, so the next player
    // starts from a clean slate (and their own name+PIN loads their own save,
    // not this one). signOutUser handles both the guest and online cases.
    await signOutUser();
    this.scene.restart(); // no character now → renders the sign-in form
  }

  // ---- first-time / new player -------------------------------------------

  private showSignInForm(): void {
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
