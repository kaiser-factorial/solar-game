import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { SignInScene } from './scenes/SignIn';
import { CharacterCreatorScene } from './scenes/CharacterCreator';
import { StarMapScene } from './scenes/StarMap';
import { PlanetScene } from './scenes/Planet';
import { HUDScene } from './scenes/HUD';
import { mountReactOverlay } from './react/mount';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#05060f',
  pixelArt: true,
  dom: { createContainer: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    BootScene,
    SignInScene,
    CharacterCreatorScene,
    StarMapScene,
    PlanetScene,
    HUDScene,
  ],
});

// Debug/test handle (also handy for tuning with the nephews from the console).
(window as unknown as { __game: Phaser.Game }).__game = game;

mountReactOverlay(game);
