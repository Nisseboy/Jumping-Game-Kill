class Banana extends Component {
  constructor() {
    super();
  }

  init() {
    this.addComponent(new ColliderRect({size: this.transform.size}));

  }
  start() {
    this.on("collisionEnter", collider => {
      let player = collider.ob.getComponent(PlayerInput);

      if (!player) return;

      player.slip();
    })
  }
}