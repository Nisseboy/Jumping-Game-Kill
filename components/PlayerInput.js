let playerW = 6 / 16;
let playerH = 11 / 16;

let playerSpeed = 7;

let playerJumpStrength = 12;
let graceTime = 1 / 10;
let coyoteTime = 1 / 10;

let playerDashTime = 0.25;
let playerDashSpeed = 20;
let dashGraceTime = 1 / 10;
let dashCooldown = 0.5;

let wallJumpStrength = 4;
let wallJumpTime = 1 / 5;

let gravity = 36;
let maxFallSpeed = 18;

let bounceFactor = 0.9;



let pickupRange = 1.5;

class PlayerInput extends Component {
  constructor() {
    super();

    this.unlockWallJump = false;
    this.unlockDash = false;

    this.mousePos = new Vec(0, 0);
    
    this.vel = new Vec(0, 0);
    this.grounded = 0;
    this.graceTime = 0;
    this.walled = 0;
    
    this.inJump = false;
    this.inWallJump = 0;

    this.lastDir = 1;

    this.dashGrace = 0;
    this.dash = 0;
    this.dashCooldown = 0;

    this.lastParticleTime = 0;
  }

  init() {
    this.addComponent(new ColliderRect({size: new Vec(playerW, playerH)}));
  }

  start() {
    this.sprite = this.getComponent(Sprite);

    this.sprite.offset.y = -2.5/16;
    this.transform.pos.y += 2.49/16;

    this.sprite.tex = new StateMachineImg(
      new StateMachineNodeCondition(()=>this.walled!=0, 
        new StateMachineNodeResult(nde.tex["player/wall/1"]),

        new StateMachineNodeCondition(()=>this.grounded==0,
          new StateMachineNodeCondition(()=>this.vel.y > 0,        
            new StateMachineNodeResult(nde.tex["player/fall/1"]),
            new StateMachineNodeResult(nde.tex["player/jump/1"]),
          ),
         
          new StateMachineNodeCondition(()=>this.vel.x != 0,
            new StateMachineNodeResult(nde.tex["player/run"]),
            new StateMachineNodeResult(nde.tex["player/idle"]),
          ),
        ),
      )
    );

    //From "player/run" when thats the state
    this.on("step", () => {
      //this.ob.audioSource.play(nde.aud[`duck/step/${Math.floor(Math.random() * 4 + 1)}`]);
    });


    let descriptors = [];
    let levelIndex = allRooms.findIndex(e=>e.name == scenes.game.world.name);
    if (scenes.game.inEditor) {
      this.unlockDash = true;
      this.unlockWallJump = true;
    } else {
      descriptors = allRooms.map((room, index) => {
        if (index > levelIndex) return undefined;

        return room.getComponent(LevelDescriptor);
      });
    }

    descriptors = descriptors.filter(e => e!=undefined);

    for (let d of descriptors) {
      if (d.unlockDash) this.unlockDash = true;
      if (d.unlockWalljump) this.unlockWallJump = true;
    }

    scenes.game.levelTime = descriptors[descriptors.length - 1]?.time ?? 10;
    
  }
  
  /*
  update(dt) {    
    
    let speedMult = nde.getKeyPressed("Run") ? 2 : 1;

    this.duck.move(new Vec(
      nde.getKeyPressed("Move Right") - nde.getKeyPressed("Move Left"),
      nde.getKeyPressed("Move Down") - nde.getKeyPressed("Move Up"),
    ).normalize().mul(this.speed * speedMult), dt);

    this.closestInteractable = undefined;
    let closestSqd = 1000;
    for (let i = 0; i < interactable.length; i++) {
      let item = interactable[i];
      let sqd = this.transform.pos._subV(item.transform.pos).sqMag();
      if (sqd < pickupRange) {
        let sqd2 = this.mousePos._subV(item.transform.pos).sqMag();
        if (sqd2 < closestSqd) {
          this.closestInteractable = item;
          closestSqd = sqd2;
        }
      }
    }

    if (nde.getKeyDown("Interact")) {
      if (this.closestInteractable) this.closestInteractable.interact(this.ob);      
      else scenes.game.closeInventory();
    }

  }
      */

  

  update(dt) {
    if (nde.getKeyDown("Change Skin")) cycleSkin();

    if (nde.getKeyDown("Jump")) {
      this.graceTime = graceTime;
    }
    if (nde.getKeyDown("Dash") && this.unlockDash) {
      this.dashGraceTime = dashGraceTime;
    }
    if (nde.getKeyUp("Jump")) {
      if (this.inJump && this.vel.y < 0) {
        this.vel.y *= 0.5;
      }
    }


    this.closestInteractable = undefined;
    this.mousePos.from(scenes.game.cam.untransformVec(nde.mouse));
    
    let closestSqd = 1000;
    for (let i = 0; i < interactable.length; i++) {
      let item = interactable[i];
      let sqd = this.transform.pos._subV(item.transform.pos).sqMag();
      
      if (sqd < pickupRange ** 2) {
        let sqd2 = this.mousePos._subV(item.transform.pos).sqMag();
        if (sqd2 < closestSqd) {
          this.closestInteractable = item;
          closestSqd = sqd2;
        }
      }
    }

    if (nde.getKeyDown("Interact") && this.closestInteractable) {
      this.closestInteractable.interact(this.ob);      
    }
    

    
    if (this.graceTime && (this.grounded || this.walled)) {
      this.vel.y = -playerJumpStrength;
      this.inJump = true;

      if (!this.grounded) {        
        this.vel.x += wallJumpStrength * -this.walled;
        this.inWallJump = wallJumpTime * this.walled;
      }

      this.graceTime = 0;
      this.grounded = 0;
    }


    this.vel.x *= Math.abs(this.inWallJump) / wallJumpTime;
    
    let movement = nde.getKeyPressed("Move Right") - nde.getKeyPressed("Move Left");

    if (movement < 0 && this.inWallJump >= 0) {
      this.vel.x = -playerSpeed;
      this.transform.size.x = -1;
    }
    if (movement > 0 && this.inWallJump <= 0) {
      this.vel.x = playerSpeed;
      this.transform.size.x = 1;
    }


    if (this.dashGraceTime && !this.dashCooldown) {
      this.dash = playerDashTime * movement;

      this.dashCooldown = dashCooldown;
      this.dashGraceTime = 0;
    }
    if (this.dash) {
      this.vel.x = Math.sign(this.dash) * playerDashSpeed;
    }


    this.grounded = Math.max(this.grounded - dt, 0)
    this.graceTime = Math.max(this.graceTime - dt, 0)
    this.dashGraceTime = Math.max(this.dashGraceTime - dt, 0)
    this.dashCooldown = Math.max(this.dashCooldown - dt, 0)

    if (this.inWallJump) this.inWallJump -= Math.sign(this.inWallJump) * dt;
    if (this.dash) this.dash -= Math.sign(this.dash) * dt;
    if (Math.abs(this.dash) <= dt) this.dash = 0;
    if (Math.abs(this.inWallJump) <= dt) this.inWallJump = 0;


    let maxFallSpeed_ = maxFallSpeed;

    this.vel.y += gravity * dt;
    if (this.inJump && this.vel.y > 0) {
      this.vel.y += gravity / 4 * dt;
    }
    if (this.walled) {
      maxFallSpeed_ = 3;
    }

    if (this.vel.y > maxFallSpeed_) {
      this.vel.y = maxFallSpeed_;
    }

    if (this.dash) { this.vel.y = 0; }


    this.move(dt);


    
    if (this.vel.x != 0 && this.grounded && scenes.game.elapsedTime - this.lastParticleTime > 0.05) {
      this.lastParticleTime = scenes.game.elapsedTime;

      scenes.game.particles.push({
        pos: this.transform.pos.copy().addV(new Vec(0, playerH * 0.5)),
        size: 0.05,
        time: 0.5 + Math.random() * 0.3,
        c: colorShiftColors["wall"],
        av:  Math.random() * 0.5 - 0.25,
        vel: new Vec(Math.random() * 1 - 0.5, Math.random() * 2 - 2),

        gravity: 2,

        physics: true,
      });
    }

    if (this.dash) {
      for (let i = 0; i < 10; i++) {
        scenes.game.particles.push({
          pos: this.transform.pos._subV(new Vec(0, playerH * 0.5 - playerH * i / 10)),
          size: 0.04,
          time: 0.5 + Math.random() * 0.3,
          c: new Vec(255, 255, 255),
          rps: 0.5,
          vel: new Vec(Math.random() * 2.4 - 1.2, Math.random() * 2.4 - 2.4),

          gravity: 0.1,

          physics: false,
        });
      }
    }
      
  }

  move(dt) {
    let p = this;
    let t = this.transform;

    function allPointsHave(colls, prop) {
      let have = true;
      for (let i of colls) {
        if (!materials[i.block][prop]) have = false;
      }
      return have;
    }

    p.walled = 0;

    let step = 0.005;
    let i = Math.abs(p.vel.x) * dt;
    while (i > 0) {
      i -= step;
      if (i < 0) {
        step += i;
        i = 0;
      }
      t.pos.x += step * Math.sign(p.vel.x);

      let colls = this.doesCollide();
      if (colls.length == 0) continue;

      let coll = colls[0];
      let block = coll.block;
      let point = coll.point;

      if (allPointsHave(colls, "bounce")) {
        t.pos.x -= step * Math.sign(p.vel.x);
        p.vel.x *= -bounceFactor;
        p.dash *= -1;
        continue;
      }

      if (point == 0 || point == 2) {
        p.walled = -1;
      }
      else {
        p.walled = 1;
      }

      if (allPointsHave(colls, "hurt")) {
        scenes.game.restart();
      }

      t.pos.x -= step * Math.sign(p.vel.x);
      p.vel.x = 0;
      if (this.unlockWallJump) p.inJump = false;
      if (p.dash) p.dash = undefined;
      break;
    }

    step = 0.005;
    i = Math.abs(p.vel.y) * dt;
    while (i > 0) {
      i -= step;
      if (i < 0) {
        step += i;
        i = 0;
      }
      t.pos.y += step * Math.sign(p.vel.y);

      let colls = this.doesCollide();
      if (colls.length == 0) continue;

      let coll = colls[0];
      let block = coll.block;
      let point = coll.point;

      if (allPointsHave(colls, "bounce")) {
        t.pos.y -= step * Math.sign(p.vel.y);
        p.vel.y *= -bounceFactor;
        continue;
      }

      if (point == 2 || point == 3) {
        let a = materials[block].launch || 0;
        let b = materials[colls[1]?.block || 0]?.launch || 0;
        if (a || b) {
          t.pos.y -= step * Math.sign(p.vel.y);
          p.vel.y = -Math.max(a, b);
          continue;
        }
        
        p.grounded = coyoteTime;
        p.inJump = false;

        
        for (let j = 0; j < Math.abs(p.vel.y); j++) {
          if (j == 0) continue;
          scenes.game.particles.push({
            pos: t.pos._subV(new Vec(0, step * Math.sign(p.vel.y) - playerH * 0.5)),
            size: 0.07,
            time: Math.random() * 0.4 + 0.4,
            c: colorShiftColors["wall"],
            rps: Math.random() * 0.5,
            vel: new Vec(Math.random() * 2.4 - 1.2, Math.random() * 1.2 - 1.2),
  
            gravity: 2,
  
            physics: true,
          });
        }
      }

      if (allPointsHave(colls, "hurt")) {
        scenes.game.restart()
      }


      t.pos.y -= step * Math.sign(p.vel.y);
      p.vel.y = 0;

      break;
    }

    if (!this.unlockWallJump) p.walled = 0;
  }

  doesCollide() {
    return scenes.game.world.grid.doesCollideBox({x: this.transform.pos.x - playerW / 2, y: this.transform.pos.y - playerH / 2, z: playerW, w: playerH});
  }

  render() {
    if (this.closestInteractable) {
      renderer._(() => {
        renderer.set("fill", "rgb(255,255,255)");
        renderer.set("font", "0.3px monospace");
        renderer.set("textAlign", ["center", "middle"]);
        renderer.text(`${this.closestInteractable.text} [${nde.getKeyCodes("Interact")[0]}]`, this.closestInteractable.transform.pos._subV(new Vec(0, this.closestInteractable.transform.size.y / 2)), 0.5);
      });
    }

  }

  from(data) {
    super.from(data);

    this.speed = data.speed;

    return this;
  }
}