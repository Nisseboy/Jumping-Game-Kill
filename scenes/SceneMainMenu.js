class SceneMainMenu extends Scene {
  constructor() {
    super();

    this.cam = new Camera(new Vec(800, 450));
    this.cam.w = 1600;
    this.cam.renderW = nde.w;

    this.start(); //Initialize settings
  }

  start() {

    this.ui = createDefaultUIRoot([
      new UIButtonText({
        style: {...buttonStyle,},
        textStyle: {...buttonStyle,},
        text: (urlPath == "editor") ? "Enter Editor" : "Play",

        events: {mousedown: [() => {
          if (urlPath == "editor") nde.setScene(scenes.editor);

          else nde.transition = new TransitionNoise(scenes.levelPicker, new TimerTime(2), true, 160);
        }]},
      }),

          
      new UIBase({
        style: {
          minSize: buttonStyle.minSize || new Vec(0, 0),
        },
      }),
      new UIButtonText({
        style: {...buttonStyle,},
        textStyle: {...buttonStyle},
        text: (urlPath == "editor") ? "Exit Editor" : "Editor",

        events: {mousedown: [() => {
          if (urlPath == "editor") setUrlPath("");

          else setUrlPath("editor");
        }]},
      }),
      new UIBase({
        style: {
          minSize: buttonStyle.minSize || new Vec(0, 0),
        },
      }),

      new UIButtonText({
        style: {...buttonStyle},
        textStyle: {...buttonStyle},
        text: "Settings",

        events: {mousedown: [() => {
          nde.transition = new TransitionNoise(scenes.settings, new TimerTime(0.2), true, 160);
        }]},
      }),

      
    ]);     
  }

  render() {
    let cam = this.cam;
    cam.renderW = nde.w;

    renderer._(()=>{
      renderer.set("fill", backgroundCol);
      renderer.rect(vecZero, new Vec(nde.w, nde.w / 16 * 9));
    });



    cam._(renderer, ()=>{
      this.ui.renderUI();
    });
  }
}