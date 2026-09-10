class SceneSettings extends Scene {
  constructor() {
    super();

    this.cam = new Camera(new Vec(800, 450));
    this.cam.w = 1600;
    this.cam.renderW = nde.w;

    this.start(); //To initialize settings
  }

  start() {
    let textInputSize = new Vec(300, 100);
    renderer._(() => {
      renderer.setAll(buttonStyle.text);
      let charSize = renderer.measureText("a");
      textInputSize.divV(charSize).floor().mulV(charSize).add(buttonStyle.padding * 2);
    });


    this.ui = createDefaultUIRoot([
      new UIButtonText({
        text: "Back",

        style: {...buttonStyle},
        textStyle: {...buttonStyle},

        events: {mousedown: [() => {
          nde.transition = new TransitionNoise(scenes.mainMenu, new TimerTime(0.2), true, 160);
        }]},
      }),

      new UISettingCollection({
        value: settings,
        hasLabels: true,

        style: {
          gap: 10,

          row: {gap: 10},
          label: {...buttonStyle,},
        },

        children: [
          new UISettingRange({
            name: "renderResolution", displayName: "Render Resolution",
            value: 100,
            min: 25, max: 100, step: 1,

            style: {...rangeStyle,},

            events: {
              change: [e=>{window.dispatchEvent(new Event('resize'));}]
            },
          }),
          
        ],

        events: {
          change: [function (value) {
            localStorage.setItem(settingsName, JSON.stringify(settings));          
          }],
        },
      }),
    ]);    
  }


  inputdown(key) {    
    if (nde.getKeyEqual(key,"Pause")) {
      nde.transition = new TransitionNoise(scenes.mainMenu, new TimerTime(0.2), true, 160);
    }
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