
let prefabs = {
  "Player": {
    tex: "player/skins/cowboy",
    components: [PlayerInput],
  },
  "Key": {
    tex: "key",
    components: [Key],
    scale: 0.5,
    interactable: {
      send: "door0",
      recieve: "enter",
      done: "remove",
    },
  },
  "Door": {
    tex: "door/1",
    components: [Door],
    scale: 1,
    interactable: {
      recieve: "door0",
    }
  },
  "Chicken Machine": {
    tex: "machines/chickencrusher/1",
    components: [Machine],
    scale: 2,
    interactable: {
      recieve: "player",
    }
  },
  "Banana": {
    tex: "banana",
    components: [Banana],
    scale: 0.5,
  },
};




let materials = [
  new MaterialTex("air"),

  new Material("wall", {
    render: (pos) => {
      renderer.set("fill", colorShiftColors["wall"]);
      renderer.rect(pos, new Vec(1.01, 1.01));
    }
  }),
  new Material("spike", {
    hitbox: "circle",
    hurt: true,
    render: (pos) => { 
      renderer.set("fill", colorShiftColors["spike"]);

      renderer.triangle(
        new Vec(pos.x, pos.y + 0.25), 
        new Vec(pos.x + 1, pos.y + 0.25),
        new Vec(pos.x + 0.5, pos.y + 1),
      );
      renderer.triangle(
        new Vec(pos.x, pos.y + 0.75), 
        new Vec(pos.x + 1, pos.y + 0.75),
        new Vec(pos.x + 0.5, pos.y),
      );
    }
  }),
];



let skins = [
  {name: "green"},
  {name: "cowboy"},
  {name: "ninja"},
  {name: "shrek"},
  {name: "king"},
  {name: "kingking"},
];