let wallJumpUnlock = 1;
let dashUnlock = 1;



let nde = new NDE(document.getElementsByTagName("main")[0]); //nde needs to be defined globally and be the single instance of NDE
nde.debug = window.location.href.includes("localhost");
nde.uiDebug = false;
//nde.targetFPS = 60;

let renderer = nde.renderer;
for (let asset of assetPaths) {
  nde.loadAsset(asset);
}


let settingsName = "jumpingGameKillSettings";
let settings = JSON.parse(localStorage.getItem(settingsName)) || {};

let levelData = JSON.parse(localStorage.getItem(settingsName + "-levelData")) || {
  bestTimes: {},
  skin: "green",
};
function saveLevelData() {
  localStorage.setItem(settingsName + "-levelData", JSON.stringify(levelData));
}

let urlPath = document.location.search.split("?id=")[1];

let scenes = {};

nde.controls = {
  "Move Up": "w",
  "Move Down": "s",
  "Move Left": "a",
  "Move Right": "d",

  "Jump": " ",
  "Dash": "Shift",
  
  "Interact": "f",
  "Reload": "r",
  "Change Skin": "k",

  "Run": "Shift",
  "Editor Place": "mouse0",
  "Editor Break": "mouse2",
  "Editor Pick": "mouse1",
  "Editor Snap Modifier": "Shift",
  "Editor Inventory": "e",


  "Pause": "Escape",
  "Debug Mode": "l",
  "UI Debug Mode": "k",
};


nde.on("keydown", e => {
  if (nde.getKeyEqual(e.key,"Debug Mode")) nde.debug = !nde.debug;
  if (nde.getKeyEqual(e.key,"UI Debug Mode")) nde.uiDebug = !nde.uiDebug;
});

nde.on("afterSetup", () => {
  initStyles();
  
  for (let path of scenePaths) {
    let name = path.split("Scene")[1];
    name = name[0].toLowerCase() + name.slice(1);
    scenes[name] = new (eval(path))();
  }

  processPrefabs();
  processMaterials();
  processRooms();
  initColorShift();
  initSkins();
  
  if (urlPath == "editor") {
    nde.setScene(scenes.editor);
    return;
  }
  
  nde.setScene(scenes.mainMenu);


  //scenes.game.loadWorld(allRooms[6]);
  //nde.setScene(scenes.game);
});

nde.on("update", dt => {
  renderer.set("font", "16px monospace");
  renderer.set("imageSmoothing", false);
});

nde.on("resize", e => {
  return nde.w * settings.renderResolution / 100;
  //return 432; //new width
});

function getSlotDown(key) {
  if (key) {
    if (nde.getKeyEqual(key, "Slot 1")) return 0;
    if (nde.getKeyEqual(key, "Slot 2")) return 1;
    if (nde.getKeyEqual(key, "Slot 3")) return 2;
    if (nde.getKeyEqual(key, "Slot 4")) return 3;
    if (nde.getKeyEqual(key, "Slot 5")) return 4;
    return -1;
  }

  if (nde.getKeyDown("Slot 1")) return 0;
  if (nde.getKeyDown("Slot 2")) return 1;
  if (nde.getKeyDown("Slot 3")) return 2;
  if (nde.getKeyDown("Slot 4")) return 3;
  if (nde.getKeyDown("Slot 5")) return 4;
  return -1;
}

function pixelScale(ob, scale = 1) {
  ob.transform.size.from(nde.tex[ob.getComponent(Sprite).tex].size).mul(1/20 * scale);
}

function processPrefabs() {
  for (let i in prefabs) {
    let p = prefabs[i];

    p.components ??= [];

    p.scale ??= 1;

    if (p.interactable) {
      if (!p.components.includes(Interactable)) p.components.push(Interactable);
    }
  }
}
function prefab(prefab, props = {}) {
  let type = prefabs[prefab];

  let ob = new Ob({name: prefab, ...props});

  if (type.tex) ob.addComponent(new Sprite(type.tex));
  if (type.texEditor) ob.addComponent(new SpriteEditor(type.texEditor));
  
  ob.transform.size.mul(type.scale);
  
  ob.addComponent(new Prefab(prefab));
  

  for (let c of type.components) {
    ob.addComponent(new c());
  }

  if (type.interactable) {
    let interactable = ob.getComponent(Interactable);
    
    for (let i in type.interactable) {
      interactable[i] = type.interactable[i];
    }
  }

  return ob;
}



function setUrlPath(path) {
  let split = path.split("=");
  if (split.length != 1) path = split[1];
  
  if (path == "") document.location.search = "";
  else document.location.search = "?id=" + path;
}

function formatTime(time) {
  return time.toFixed(2);
}

//For nde-Editor
function getContext() {
  return {
    nde,
    scenes,
  }
}