class Machine extends Component {
  init() {
    this.ob.addComponent(new Interactable({text: "Interact"}))
  }

  start() {
    this.on("interact", () => {
      let sprite = this.getComponent(Sprite);
      let split = sprite.tex.split("/");
      split.pop();
      sprite.tex = split.join("/");      

      this.getComponent(Interactable).active = false;
    });
  }
}