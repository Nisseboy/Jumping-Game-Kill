let ITEMHOLDERID = 1

let idLookup;
let player;

let cameraSmoothing = 7;

class SceneGame extends Scene {
  constructor() {
    super();

    this.cam = new Camera(new Vec(0, 0));
    this.cam.w = 16;
    this.cam.renderW = nde.w;
  }


  loadWorld(w) {            
    this.world = w.copy();
    this.player = this.world.getComponents(PlayerInput)[0].ob;
    player = this.player;

    this.world.addComponent(new PhysicsManager());

    colorShift();

    this.initParticles();

    this.elapsedTime = 0;
  }

  start() {
    if (this.nextLevelScheduled) {
      this.loadWorld(this.nextLevelScheduled);
    }
    this.nextLevelScheduled = undefined;    
  }

  inputdown(key) {    
    if (nde.getKeyEqual(key,"Pause")) {
      nde.transition = new TransitionNoise((this.inEditor) ? scenes.editor : scenes.levelPicker, new TimerTime(0.2), true, 160);
    }
    if (nde.getKeyEqual(key,"Reload")) {
      this.restart();
    }
  }
  inputup(key) {
    
  }

  restart() {
    this.nextLevelScheduled = allRooms.find(e=>e.name == this.world.name);
  }
  nextLevel() {
    if (this.inEditor) {
      nde.transition = new TransitionNoise(scenes.editor, new TimerTime(0.2), true, 160);
      return;
    }
    if ((levelData.bestTimes[this.world.name] ?? 100000) > this.elapsedTime) levelData.bestTimes[this.world.name] = this.elapsedTime;
    saveLevelData();

    let currentIndex = allRooms.findIndex(e=>e.name == this.world.name);
    
    if (currentIndex == allRooms.length - 1) {
      this.nextLevelScheduled = nde.assets["winscreen"];
      return;
    }
    this.nextLevelScheduled = allRooms[currentIndex + 1];
  }

  update(dt) {  
    if (this.nextLevelScheduled) {      
      nde.transition = new TransitionNoise(scenes.game, new TimerTime(0.4), true, 160);
      return;
    }

    //this.playerInput.mousePos.from(this.cam.untransformVec(nde.mouse));    
    this.world.update(dt);
    

    let lerpFactor = Math.exp(-cameraSmoothing * dt)
    
    this.cam.pos.mul(lerpFactor);
    this.cam.pos.addV(player.transform.pos._mul(1 - lerpFactor));

    this.cam.pos.x = Math.max(this.cam.pos.x, 8);
    this.cam.pos.x = Math.min(this.cam.pos.x, this.world.grid.size.x - 8);
    this.cam.pos.y = Math.max(this.cam.pos.y, 4.5);
    this.cam.pos.y = Math.min(this.cam.pos.y, this.world.grid.size.y - 4.5);

    moveListener(this.cam.pos);
    
    this.updateParticles(dt);

    this.elapsedTime += dt;
  }

  initParticles() {
    this.particles = [];

    let particlesPerBlock = 1;
    let lifetime = 10;

    let grid = this.world.getComponent(Grid);
    let num = grid.size.x * grid.size.y * particlesPerBlock;

    for (let i = 0; i < num; i++) {
      this.particles.push(this.createWorldParticle(i / num * lifetime));
    }
  }
  
  updateParticles(dt) {
    let grid = this.world.getComponent(Grid);

    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];

      p.time-=dt;
      p.rot = (p.rot || 0) + (p.av || 0) * dt * Math.PI * 2;

      if (p.shrink) p.size = Math.max(p.size - p.shrink, 0);

      if (p.vel) { 
        p.vel.y += p.gravity * dt;
         
        if (p.physics) grid.collideMoveVector(p.pos, p.vel, dt);
        else p.pos.addV(p.vel._mul(dt));
      }

      if (p.time <= 0 || p.size < 0) { 
        if (p.regen) {
          this.particles.splice(i, 1, this.createWorldParticle()); 
        } else {
          this.particles.splice(i, 1); i--; 
        }
      }
    }
  }

  createWorldParticle(lifetime = 10) {
    let grid = this.world.getComponent(Grid);
    let gravity = 0.07;
    return {
      pos: new Vec(Math.random() * grid.size.x, Math.random() * grid.size.y),
      size: 0.03,
      time: lifetime,
      c: new Vec(200, 200, 200),
      av: 0.2,
      vel: new Vec(Math.random() * 0.2 - 0.1, -0.5 + gravity * (10 - lifetime)),
      regen: true,

      gravity: gravity,
      physics: false,
    }
  }

  render() {
    super.render();

    let cam = this.cam;
    cam.renderW = nde.w;
    renderer.set("fill", "rgba(255, 255, 255, 1");




    cam._(renderer, () => {
      for (let i of this.particles) {
        renderer._(() => {
          renderer.translate(i.pos);
          renderer.rotate(i.rot);
          renderer.set("fill", i.c);
          renderer.set("lineWidth", 0);
          renderer.scale(i.size);
          renderer.rect(vecNegHalv, vecOne);
        });
      }

      this.world.getComponent(Grid).cam = cam;
      this.world.render();
    });

    
    renderer.set("font", "30px monospace")
    renderer.set("textAlign", ["right", "top"]);
    renderer.text(formatTime(this.elapsedTime), new Vec(renderer.size.x - 5, 5));

  }
}