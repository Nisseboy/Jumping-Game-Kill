class Key extends Component {
  constructor() {
    super();
  }

  init() {
    this.addComponent(new ColliderRect({size: this.transform.size}));

  }
  start() {
    this.lastParticleTime = 0;
  }

  update() {
    if (scenes.game.elapsedTime - this.lastParticleTime > 0.1) {
      this.lastParticleTime = scenes.game.elapsedTime;
      scenes.game.particles.push({
        pos: this.transform.pos.copy(),
        size: 0.05,
        time: 3,
        c: "#ffcc35",
        av: Math.random() * 0.5 - 0.25,
        vel: new Vec(Math.random() * 1 - 0.5, Math.random() * 1 - 1),

        gravity: 2,

        physics: true,
      });
    }
  }
}