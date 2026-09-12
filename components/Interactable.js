class Interactable extends Component {
  constructor(props = {}) {
    super();
    
    this.text = props.text || "";
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
  }

  from(data) {
    super.from(data);

    this.text = data.text;
    
    return this;
  }
}