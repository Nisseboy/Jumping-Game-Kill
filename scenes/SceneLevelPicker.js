class SceneLevelPicker extends Scene {
  constructor() {
    super();

    this.cam = new Camera(new Vec(800, 450));
    this.cam.w = 1600;
    this.cam.renderW = nde.w;

    this.backgroundColor = new Vec(50, 140, 190);
  }

  start() {
    let groups = [];
    let groupSize = 10;

    for (let i = 0; i < allRooms.length; i++) {
      let group = Math.floor(i / groupSize);
      let groupIndex = i % groupSize;

      if (groupIndex == 0) groups[group] = [];

      groups[group][groupIndex] = allRooms[i];
    }

    

    this.ui = createDefaultUIRoot([
      new UIButtonText({
        text: "Back",

        style: {...buttonStyle},
        textStyle: {...buttonStyle},

        events: {mousedown: [() => {
          nde.transition = new TransitionNoise(scenes.mainMenu, new TimerTime(0.2), true, 160);
        }]},
      }),

      new UIBase({
        style: {
          gap: 8,
        },

        children: groups.map(group => {
          return new UIBase({
            style: {
              fill: "rgba(0, 0, 0, 0.2)",
              padding: 8,
              direction: "column",
              gap: 4,
            },

            children: group.map(e => {
              let beforeIndex = allRooms.indexOf(e) - 1;
              let unlocked = beforeIndex == -1 || levelData.bestTimes[allRooms[beforeIndex].name] != undefined;
              let time = levelData.bestTimes[e.name];

              let color = unlocked ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)";
              if (time <= e.getComponent(LevelDescriptor).time) color = "rgba(255, 208, 0, 0.64)";
              else if (time <= e.getComponent(LevelDescriptor).time + 1) color = "rgba(255, 248, 218, 0.45)";
              else if (time <= e.getComponent(LevelDescriptor).time + 2) color = "rgba(165, 113, 0, 0.74)";

              let button = new UIButton({
                style: {...buttonStyle,
                  growX: true,
                  gap: 15,
                  fill: color,
                  hover: {
                    fill: "rgba(255, 0, 0, 0.6)"
                  },
                },

                children: [
                  new UIText({
                    text: e.name,

                    style: {...buttonStyle,},
                  }),

                  new UIBase({style: {growX: true}}),

                  new UIText({
                    text: formatTime(time ?? 0),

                    style: {...buttonStyle,
                      text: {font: "12px monospace", fill: "rgba(255, 255, 255, 1)"},
                    }
                  })
                ],

                events: {"mousedown": [() => {
                  scenes.game.loadWorld(e);
                  nde.transition = new TransitionNoise(scenes.game, new TimerTime(0.2), true, 160);
                }]},
              });
              
              if (!unlocked) button.style.hover.fill = button.style.fill;

              return button;
            }),
          });
        }),
      }),

      
      
    ]);     
  }


  inputdown(key) {    
    if (nde.getKeyEqual(key,"Pause")) {
      nde.transition = new TransitionNoise(scenes.mainMenu, new TimerTime(0.2), true, 160);
    }
  }

  render() {
    super.render();

    let cam = this.cam;
    cam.renderW = nde.w;

    cam._(renderer, ()=>{
      this.ui.renderUI();
    });
  }
}