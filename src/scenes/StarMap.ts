import Phaser from 'phaser';
import { state } from '../systems/save';
import { ORB_COLORS } from '../content';
import { txt, makeButton, sprinkleStars, toast } from '../systems/ui';

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

export class StarMapScene extends Phaser.Scene {
  private angles: Record<string, number> = {};
  private moonAngle = 0;
  private nodes: Record<string, Phaser.GameObjects.Container> = {};
  private moonNode!: Phaser.GameObjects.Container;
  private fx!: Phaser.GameObjects.Graphics;
  private positions: Record<string, { x: number; y: number }> = {};

  constructor() {
    super('StarMap');
  }

  create(): void {
    this.scene.stop('HUD'); // safety net — the HUD belongs to planets only
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
      const node = this.add.container(0, 0).setDepth(3);
      const dot = this.add.circle(0, 0, b.size, b.color);
      const label = txt(this, 0, b.size + 14, b.name, 13, '#9fb0d8');
      node.add([dot, label]);
      if (b.id === 'saturn') node.add(this.add.ellipse(0, 0, b.size * 3.2, b.size, 0xd8c07a, 0.35));
      this.nodes[b.id] = node;
    });

    // the Moon — where every scout begins
    this.moonNode = this.add.container(0, 0).setDepth(3);
    this.moonNode.add(this.add.circle(0, 0, 4.5, 0xd8dce8));
    this.moonNode.add(txt(this, 0, 15, 'Moon', 12, '#eaf2ff'));

    // UI chrome
    txt(this, 16, 20, 'SOLAR SCOUTS', 20, '#ffe08a').setOrigin(0, 0.5);
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
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.drawStatusRow());
  }

  private statusRow?: Phaser.GameObjects.Container;
  private drawStatusRow(): void {
    this.statusRow?.destroy();
    const c = this.add.container(0, 0).setDepth(10);
    const h = state.save.hearts;
    for (let i = 0; i < h.max; i++) {
      const key = h.current >= i + 1 ? 'heart-full' : h.current >= i + 0.5 ? 'heart-half' : 'heart-empty';
      c.add(this.add.image(24 + i * 26, 72, key));
    }
    state.save.orbs.forEach((id, i) => {
      c.add(this.add.image(932 - i * 30, 66, 'orb').setTint(ORB_COLORS[id] ?? 0xffffff));
    });
    this.statusRow = c;
  }

  private unlocked(id: string): boolean {
    if (id === 'moon') return true;
    if (id === 'mars') return !!state.save.planets['moon']?.bossDefeated;
    return false;
  }

  private handleClick(p: Phaser.Input.Pointer): void {
    if (this.scene.isActive('Settings')) return;
    let hit: string | null = null;
    let best = 26;
    for (const [id, pos] of Object.entries(this.positions)) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, pos.x, pos.y);
      if (d < best) {
        best = d;
        hit = id;
      }
    }
    if (!hit) return;
    if (hit === 'moon' || (hit === 'mars' && this.unlocked('mars'))) {
      state.save.currentPlanet = hit;
      state.touch();
      this.scene.start('Planet', { planetId: hit });
    } else if (hit === 'mars') {
      toast(this, 'Mars is locked — beat the Moon boss first!');
    } else if (hit === 'earth') {
      toast(this, 'Earth — coming soon!');
    } else {
      const name = BODIES.find((b) => b.id === hit)?.name ?? hit;
      toast(this, `${name} — coming soon!`);
    }
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

    // glow rings on landable worlds, orb badge on beaten ones
    const pulse = 0.35 + 0.25 * Math.sin(_time / 300);
    for (const id of ['moon', 'mars']) {
      const pos = this.positions[id];
      if (!pos) continue;
      if (state.save.planets[id]?.bossDefeated) {
        this.fx.fillStyle(ORB_COLORS[id], 0.9);
        this.fx.fillCircle(pos.x + 10, pos.y - 10, 4);
      }
      if (this.unlocked(id)) {
        this.fx.lineStyle(2, 0x7fd4ff, pulse);
        this.fx.strokeCircle(pos.x, pos.y, 14);
      } else {
        this.fx.lineStyle(2, 0x666a7a, 0.5);
        this.fx.strokeCircle(pos.x, pos.y, 12);
      }
    }
  }
}
