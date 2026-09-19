class Prefab extends Component {
  constructor(pType) {
    super();

    this.pType = pType;
  }

  get info() {
    return prefabs[this.pType];
  }

  init() {
    //pixelScale(this.ob, this.info.scale);
    this.ob.info = this.info;

    let info = this.info;

    let sprite = this.getComponent(Sprite);
    if (sprite) sprite.tex = info.tex;

    this.transform.size.from(vecOne);
    if (info.scale) this.transform.size.mul(info.scale);

    for (let c of info.components) {
      if (this.getComponent(c)) continue;

      let component = new c();

      let componentInfo = info[component.constructor.name.toLowerCase()];
      
      if (componentInfo) {
        for (let prop in componentInfo) {
          component[prop] = componentInfo[prop];
        }
      }

      this.addComponent(component);
    }
  }

  start() {
    this.ob.info = this.info;
  }



  from(data) {
    super.from(data);

    this.pType = data.pType;

    return this;
  }

  strip() {
    delete this.ob.info;

    super.strip();
  }
}
