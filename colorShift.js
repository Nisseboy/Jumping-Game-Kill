let baseColors = [];
for (let i = 0; i < 8; i++) {
  baseColors.push(hsl2rgb(i / 8 * 360, 0.5, 0.5));
}

let colorShiftTargets = {};
let colorShiftColors = {
  background: undefined,
  wall: undefined,
  spike: undefined,
};

function initColorShift() {
  for (let tex in nde.tex) {
    if (!tex.includes("material")) continue;

    let texture = nde.tex[tex];

    let newTexture = new Img(texture.size);
    newTexture.image(texture, vecZero, texture.size);

    colorShiftTargets[tex] = newTexture;

    colorShiftColors[texture.ctx.getImageData(texture.size.x / 2, texture.size.y / 2, 1, 1).data[0]] = undefined;
  }

  colorShift();
}

function colorShift() {
  for (let originalCol in colorShiftColors) {
    colorShiftColors[originalCol] = undefined;
  }

  for (let originalCol in colorShiftColors) {
    let newCol;
    do {
      newCol = baseColors[Math.floor(Math.random() * baseColors.length)];
    } while (Object.values(colorShiftColors).includes(newCol))

    colorShiftColors[originalCol] = newCol;
  }

  for (let tex in colorShiftTargets) {
    let texture = nde.tex[tex];
    texture.image(colorShiftTargets[tex], vecZero, texture.size);

    let col = colorShiftColors[colorShiftTargets[tex].ctx.getImageData(texture.size.x / 2, texture.size.y / 2, 1, 1).data[0]];

    texture.set("fill", `rgb(${col.r}, ${col.g}, ${col.b})`);
    texture.ctx.globalCompositeOperation = "source-atop";
    texture.rect(vecZero, texture.size);
    texture.ctx.globalCompositeOperation = "source-over";
  }

  scenes.game.backgroundColor = colorShiftColors["background"];
  scenes.editor.backgroundColor = colorShiftColors["background"];
}

function hsl2rgb(h,s,l) {
   let a=s*Math.min(l,1-l);
   let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
   return new Vec(f(0) * 255, f(8) * 255, f(4) * 255);
}

let currentSkin;
let skinTexs = {};
let ogColorIndexes = {};

function initSkins() {
  for (let tex in nde.tex) {
    if (!tex.includes("skins")) continue;

    let split = tex.split("/");
    let name = split[split.length - 1];
    
    let texture = nde.tex[tex];
    
    texture.loadPixels();
    skinTexs[name] = texture.pixels;
  }

  for (let tex in nde.tex) {
    if (tex.includes("skins") || !tex.includes("player")) continue;
    let texture = nde.tex[tex];
    if (texture instanceof Animation) continue;    
    
    texture.loadPixels();
    let p = texture.pixels;
    let colorIndexes = [];
    for (let i = 0; i < p.length; i+=4) {
      let c = -1;
      for (let j = 0; j < skinTexs.base.length; j+=4) {
        if (p[i] == skinTexs.base[j] && p[i+1] == skinTexs.base[j+1] && p[i+2] == skinTexs.base[j+2]) {
          c = j;
          break;
        }
      }
      colorIndexes[i / 4] = c;
    }
    ogColorIndexes[tex] = colorIndexes;
  }

  setSkin(levelData.skin);
}

function setSkin(skinName) {
  currentSkin = skinName;
  let skin = skinTexs[skinName];
  
  
  if (!skin) {cycleSkin(); return;}


  for (let tex in nde.tex) {
    if (tex.includes("skins") || !tex.includes("player")) continue;
    let texture = nde.tex[tex];
    if (texture instanceof Animation) continue;    
    
    texture.loadPixels();
    let pix = texture.pixels;
    let og = ogColorIndexes[tex];

    for (let i = 0; i < pix.length; i += 4) {
      let colorIndex = og[i / 4];
      if (colorIndex == -1) continue;
      

      pix[i] = skin[colorIndex+0];
      pix[i+1] = skin[colorIndex+1];
      pix[i+2] = skin[colorIndex+2];
      pix[i+3] = skin[colorIndex+3];
    }

    texture.updatePixels();    
  }


  levelData.skin = skinName;
  saveLevelData();
}

function cycleSkin() {
  let index = skins.findIndex(e=>e.name == currentSkin);
  if (index == -1) index = 0;

  let skin = skins[(index + 1) % skins.length];
  if (skin.unlockF && !skin.unlockF) {
    cycleSkin();
    return;
  }

  setSkin(skin.name);
}