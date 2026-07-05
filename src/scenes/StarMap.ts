import Phaser from 'phaser';
import { state } from '../systems/save';
import { ORB_COLORS } from '../content';
import { txt, makeButton, sprinkleStars, toast } from '../systems/ui';
import { audio } from '../systems/audio';

interface BodySpec {
  id: string;
  name: string;
  r: number; // orbit radius (px)
  size: number;
  color: number;
  playable?: boolean;
}

// Real orbits, fixed unlock order (PLAN.md §3.6). Phase 3 makes travel orbital.
const BODIES: BodySpec[] = [
  { id: 'mercury', name: 'Mercury', r: 55, size: 4, color: 0x9c9c9c },
  { id: 'venus', name: 'Venus', r: 82, size: 7, color: 0xd9a35a },
  { id: 'earth', name: 'Earth', r: 112, size: 8, color: 0x4a90d9 },
  { id: 'mars', name: 'Mars', r: 152, size: 6, color: 0xc1440e, playable: true },
  { id: 'jupiter', name: 'Jupiter', r: 202, size: 15, color: 0xc9a06c },
  { id: 'saturn', name: 'Saturn', r: 247, size: 13, color: 0xd8c07a },
  { id: 'uranus', name: 'Uranus', r: 287, size: 9, color: 0x7fd4d4 },
  { id: 'neptune', name: 'Neptune', r: 322, size: 9, color: 0x4666ff },
];

const CX = 480;
const CY = 300;
const SQUASH = 0.55;

/** Blend a planet color most of the way toward slate grey for locked worlds. */
function greyed(color: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const mix = (v: number, g: number) => Math.floor(v * 0.3 + g * 0.7);
  return Phaser.Display.Color.GetColor(mix(c.red, 0x4a), mix(c.green, 0x4f), mix(c.blue, 0x5c));
}

export class StarMapScene extends Phaser.Scene {
  private angles: Record<string, number> = {};
  private moonAngle = 0;
  private nodes: Record<string, Phaser.GameObjects.Container> = {};
  private moonNode!: Phaser.GameObjects.Container;
  private fx!: Phaser.GameObjects.Graphics;
  private positions: Record<string, { x: number; y: number }> = {};
  private hovered: string | null = null;

  constructor() {
    super('StarMap');
  }

  create(): void {
    this.game.events.emit('ss-scene', 'starmap');
    this.scene.stop('HUD'); // safety net — the HUD belongs to planets only
    this.hovered = null;
    this.positions = {};
    sprinkleStars(this, 110);

    // orbits
    const orbits = this.add.graphics().setDepth(-5);
    orbits.lineStyle(1, 0xffffff, 0.12);
    for (const b of BODIES) orbits.strokeEllipse(CX, CY, b.r * 2, b.r * 2 * SQUASH);

    // sun
    this.add.circle(CX, CY, 24, 0xffd75e, 0.25);
    this.add.circle(CX, CY, 16, 0xffd75e);
    this.add.circle(CX, CY, 10, 0xfff3c4);

    this.fx = this.add.graphics().setDepth(2);

    BODIES.forEach((b, i) => {
      this.angles[b.id] = i * 2.4;
      const locked = !this.landable(b.id);
      const node = this.add.container(0, 0).setDepth(3);
      const dot = this.add.circle(0, 0, b.size, locked ? greyed(b.color) : b.color);
      if (locked) dot.setAlpha(0.8);
      const label = txt(this, 0, b.size + 14, b.name, 13, locked ? '#575d6e' : '#9fb0d8');
      node.add([dot, label]);
      if (b.id === 'saturn') {
        node.add(
          this.add.ellipse(0, 0, b.size * 3.2, b.size, locked ? greyed(0xd8c07a) : 0xd8c07a, 0.35)
        );
      }
      this.nodes[b.id] = node;
    });

    // the Moon — where every scout begins
    this.moonNode = this.add.container(0, 0).setDepth(3);
    this.moonNode.add(this.add.circle(0, 0, 4.5, 0xd8dce8));
    this.moonNode.add(txt(this, 0, 15, 'Moon', 12, '#eaf2ff'));

    // UI chrome
    txt(this, 16, 20, 'MOON SHARD', 20, '#ffe08a').setOrigin(0, 0.5);
    txt(
      this,
      16,
      44,
      `Scout ${state.playerName} ${state.authed ? '• saved online ✓' : '• guest (this computer)'}`,
      14,
      '#9fb0d8'
    ).setOrigin(0, 0.5);
    this.drawStatusRow();
    makeButton(this, 924, 28, '⚙', () => this.scene.launch('Settings'));
    txt(this, 480, 520, 'Click a glowing world to land!', 16, '#9fb0d8');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleClick(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.handleHover(p));
    this.input.keyboard!.on('keydown-M', () => {
      toast(this, audio.toggle() ? 'Sound ON' : 'Sound OFF');
    });
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.game.events.emit('ss-scene', 'starmap');
      this.drawStatusRow();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.setDefaultCursor('default'));

    audio.music('map');
  }

  // Hearts are the React <HealthBar> overlay (src/react/GameOverlay.tsx) —
  // this row now only carries the shard/orb trophies.
  private statusRow?: Phaser.GameObjects.Container;
  private drawStatusRow(): void {
    this.statusRow?.destroy();
    const c = this.add.container(0, 0).setDepth(10);
    state.save.orbs.forEach((id, i) => {
      c.add(this.add.image(932 - i * 30, 66, 'orb').setTint(ORB_COLORS[id] ?? 0xffffff));
    });
    this.statusRow = c;
  }

  private landable(id: string): boolean {
    if (id === 'moon') return true;
    if (id === 'mars') return !!state.save.planets['moon']?.bossDefeated;
    return false;
  }

  private nodeFor(id: string): Phaser.GameObjects.Container | undefined {
    return id === 'moon' ? this.moonNode : this.nodes[id];
  }

  private hitTest(x: number, y: number): string | null {
    let hit: string | null = null;
    let best = 26;
    for (const [id, pos] of Object.entries(this.positions)) {
      const d = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
      if (d < best) {
        best = d;
        hit = id;
      }
    }
    return hit;
  }

  private handleHover(p: Phaser.Input.Pointer): void {
    if (this.scene.isActive('Settings')) return;
    const hit = this.hitTest(p.x, p.y);
    if (hit === this.hovered) return;

    // shrink the old friend back down
    if (this.hovered) {
      const prev = this.nodeFor(this.hovered);
      if (prev) this.tweens.add({ targets: prev, scale: 1, duration: 150, ease: 'Sine.out' });
    }
    this.hovered = hit;
    if (!hit) {
      this.input.setDefaultCursor('default');
      return;
    }

    // the planet says hello…
    const node = this.nodeFor(hit);
    if (node) {
      this.tweens.add({ targets: node, scale: 1.35, duration: 180, ease: 'Back.out' });
    }
    this.input.setDefaultCursor(this.landable(hit) ? 'pointer' : 'not-allowed');

    // …and the cursor waves back (little ring pulse at the pointer)
    const ring = this.add
      .circle(p.x, p.y, 6)
      .setStrokeStyle(2, this.landable(hit) ? 0x7fd4ff : 0x666a7a)
      .setDepth(50);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 350,
      onComplete: () => ring.destroy(),
    });
  }

  private handleClick(p: Phaser.Input.Pointer): void {
    if (this.scene.isActive('Settings')) return;
    const hit = this.hitTest(p.x, p.y);
    if (!hit) return;
    if (this.landable(hit)) {
      audio.sfx('click');
      state.save.currentPlanet = hit;
      state.touch();
      this.input.setDefaultCursor('default');
      this.scene.start('Planet', { planetId: hit });
      return;
    }
    audio.sfx('denied');
    if (hit === 'mars') toast(this, 'Mars is locked — beat the Moon boss first!');
    else if (hit === 'earth') toast(this, 'Earth — coming soon!');
    else toast(this, `${BODIES.find((b) => b.id === hit)?.name ?? hit} — coming soon!`);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.fx.clear();

    for (const b of BODIES) {
      this.angles[b.id] += (8 / b.r) * dt;
      const x = CX + Math.cos(this.angles[b.id]) * b.r;
      const y = CY + Math.sin(this.angles[b.id]) * b.r * SQUASH;
      this.nodes[b.id].setPosition(x, y);
      this.positions[b.id] = { x, y };
    }

    // Moon orbits Earth
    this.moonAngle += 1.1 * dt;
    const e = this.positions['earth'];
    const mx = e.x + Math.cos(this.moonAngle) * 24;
    const my = e.y + Math.sin(this.moonAngle) * 24 * 0.8;
    this.moonNode.setPosition(mx, my);
    this.positions['moon'] = { x: mx, y: my };

    // glow rings on landable worlds, shard badge on beaten ones
    const pulse = 0.35 + 0.25 * Math.sin(_time / 300);
    for (const id of ['moon', 'mars']) {
      const pos = this.positions[id];
      if (!pos) continue;
      if (state.save.planets[id]?.bossDefeated) {
        this.fx.fillStyle(ORB_COLORS[id], 0.9);
        this.fx.fillCircle(pos.x + 10, pos.y - 10, 4);
      }
      if (this.landable(id)) {
        this.fx.lineStyle(2, 0x7fd4ff, this.hovered === id ? 0.9 : pulse);
        this.fx.strokeCircle(pos.x, pos.y, this.hovered === id ? 17 : 14);
      } else {
        this.fx.lineStyle(2, 0x666a7a, 0.5);
        this.fx.strokeCircle(pos.x, pos.y, 12);
      }
    }
  }
}
