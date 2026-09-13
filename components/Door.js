class Door extends Component {
  constructor() {
    super();
  }

  init() {
    this.addComponent(new ColliderRect({size: this.transform.size}));
    this.open = false;
  }

  start() {
    this.on("interact", () => {
      this.open = true;
    });
    this.on("collisionEnter", () => {
      if (!this.open) return;

      scenes.game.nextLevel();
    })

    this.getComponent(Sprite).tex = new StateMachineImg(
      new StateMachineNodeCondition(()=>this.open, 
        new StateMachineNodeResult(nde.tex["door"]),
        new StateMachineNodeResult(nde.tex["door/1"]),
      )
    );
  }
}