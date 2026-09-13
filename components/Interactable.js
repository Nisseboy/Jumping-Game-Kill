class Interactable extends Component {
  constructor(props = {}) {
    super();
    
    this.text = props.text ?? "";

    this.send = props.send ?? "";
    this.recieve = props.recieve ?? "";
    this.done = props.done ?? "";
  }

  start() {
    if (!this.getComponent(Collider)) {
      this.addComponent(new ColliderRect({size: this.transform.size}));
    }

    this.on("collisionEnter", (collider) => {            
      if (!this.recieve.split(",").includes("enter")) return; 
      if (!scenes.game.interactable.includes(this)) return;  
      
      if (collider.getComponent(PlayerInput)) this.interact();
    })
  }

  enable() {
    scenes.game.interactable.push(this);   
  }
  disable() {    
    let index = scenes.game.interactable.indexOf(this);
    if (index == -1) return;
    scenes.game.interactable.splice(index, 1);    
  }

  interact(...args) {
    this.fire("interact", ...args);

    let split = this.send.split(",");
    for (let id of split) {
      for (let interactable of scenes.game.interactable) {
        if (interactable.recieve.split(",").includes(id)) interactable.interact();
      }
    }

    if (this.done == "remove") this.ob.remove();
    if (this.done == "disable") this.active = false;
  }

  from(data) {
    super.from(data);

    this.text = data.text;
    this.send = data.send;
    this.recieve = data.recieve;
    this.done = data.done;
    
    return this;
  }
}