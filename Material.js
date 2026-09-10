/*
         Opaque  Solid   Inside
Ground   N       N       N
Floor    N       N       Y
Wall     Y       Y       Y
Window   N       Y       Y
Fence    N       Y       N


*/

let materialGroups = {" ": []};
class Material {
  constructor(name, props = {}) {
    this.solid = true;

    if (props.components) {
      this.components = props.components;
    }
    if (props.hitbox) {
      this.hitbox = props.hitbox;
    }
    this.hurt = props.hurt ?? false;

    this.render = props.render ?? (() => {});
    this.fullName = name;
    this.name = name;

    materialGroups[" "].push(this);
  }
}

class MaterialTex extends Material {
  constructor(tex, props = {}) {
    props.render = (pos) => {
      renderer.image(nde.tex[this.tex], pos, vecOne);
    };
    super(tex, props);

    this.tex = "material/" + tex;
  }
}

function getMaterialId(name) {
  return materials.findIndex(e=>e.fullName == name);
}

function processMaterials() {
  return
  for (let texName in nde.tex) {
    let split = texName.split("/");
    if (split.splice(0, 1)[0] != "material") continue;
    let name = split.join("/");

    if (materials.find(e=>e.fullName == name)) continue;

    materials.push(new Material(name));
  }
}