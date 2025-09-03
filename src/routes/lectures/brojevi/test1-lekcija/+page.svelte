<script>
  import ObjectivesGraph from "$lib/components/objectivesGraph/ObjectivesGraph.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import {
    Scene,
    Circle,
    Rectangle,
    AnimationManager,
    OutlineThanFillAnimation,
    Line,
    Text,
    MathText,
    NumberLine,
    CoordinateSystem,
    FunctionPlot,
    easeInExpo,
    easeInOutSine,
    Vector,
    PiCharacterBody,
    PiCharacter,
    BezierCurve,
    Eye,
    TranslateAnimation,
    easeInOutElastic,
    easeInOutBack,
    ScaleAnimation,
    SquintingEyeAnimation,
    UnSquintingEyeAnimation,
    WavingRightArmAnimation,
    MultiLineText,
    SpeechBubble,
    BubbleWithText,
    FadeOutAnimation,
    FadeInAnimation
  } from "matanim";

  let canvas;

  $effect(() => {
    const scene = new Scene(canvas);

    const line = new Line(
      [
        { x: 550, y: 130 },
        { x: 700, y: 420 }
      ],
      { lineWidth: 5 }
    );
    const text = new Text([{ x: 100, y: 300 }], "Funkcije su kao", {
      fontSize: 72
    });
    const mathText = new MathText(
      [{ x: 800, y: 550 }],
      `\\begin{aligned}
   x + y &= 5 \\\\
   x + y &= 5 \\\\
   x &= 2
\\end{aligned}
`,
      {
        fontSize: 73,
        lineWidth: 1,
        borderColor: "rgb(250, 250, 250)",
        fillColor: "rgb(250, 250, 250)"
      }
    );
    const numberLineX = new NumberLine(
      [
        { x: 100, y: 360 },
        { x: 1150, y: 360 }
      ],
      [-11, 11],
      {
        tickStep: 2
        // tickLabels: ["-1", "0", "1", "2", "\\pi", "4", "5"],
      }
    );

    // numberLineX.setTickLabels(["-1", "0", 1, 2, "\\pi", 4, 5]);

    const numberLineY = new NumberLine(
      [
        { x: 1100, y: 500 },
        { x: 1100, y: 30 }
      ],
      [-1, 5],
      { rotation: 90 }
    );

    const coordinateSystem = new CoordinateSystem(
      [
        { x: 100, y: 360 },
        { x: 1300, y: 360 }
      ],
      [-11, 11],
      [-6, 6],
      {
        tickStep: 1,
        hasLabels: true,
        skipLastLabel: false,
        skipFirstLabel: false,
        hasBorder: false,
        hasGrid: true,
        xAxisLabel: "x\\text{-os}",
        yAxisLabel: "y\\text{-os}"
      }
    );

    // coordinateSystem.translate({ x: -700, y: 0 });

    const parabola = new FunctionPlot(
      coordinateSystem,
      (x) => 3 * Math.sin(x),
      {
        dashed: true
      }
    );

    const vector = new Vector([
      coordinateSystem.pointToCoords(-3, 2),
      coordinateSystem.pointToCoords(-2, 4)
    ]);

    // const eye1 = new Eye([{ x: 45, y: 5 }]);
    // scene.add(eye1);

    // const eye2 = new Eye([{ x: 85, y: 5 }]);
    // scene.add(eye2);

    // const randolpfhBody = new PiCharacterBody([{ x: 0, y: 20 }]);
    // scene.add(randolpfhBody);

    // const mouth = new BezierCurve(
    //   [
    //     { x: 75, y: 38 },
    //     { x: 105, y: 38 },
    //     { x: 105, y: 38 },
    //     { x: 105, y: 45 },
    //     { x: 75, y: 38 },
    //   ],
    //   { color: "black" },
    // );
    // scene.add(mouth);

    const piCharacter = new PiCharacter([{ x: -90, y: 0 }]);
    piCharacter.scale(0.4, 0.4);
    piCharacter.translate({ x: -200, y: 480 });
    // coordinateSystem.translate({ x: 100, y: 0 });
    parabola.translate({ x: 100, y: 0 });

    // const circle = new Circle([piCharacter.getCenter()], 10);

    scene.add(piCharacter);
    ///////////////////
    // ADD ANIMATIONS
    ///////////////////

    const animationManager = new AnimationManager(scene);

    const bubbleWithText = new BubbleWithText(
      [{ x: 115, y: 490 }],
      "Bok ovo je prva Linija,\n a ovo je druga \\(2\\pi + x = y\\)\n jos jedna",
      {
        fontSize: 10
      }
    );

    // animationManager.add(new OutlineThanFillAnimation(circle));

    // animationManager.add(
    //   new OutlineThanFillAnimation(piCharacter, {
    //     duration: 1200,
    //     easingFunction: easeInOutSine,
    //   }),
    // );

    setTimeout(() => {
      animationManager.add(
        new OutlineThanFillAnimation(bubbleWithText, {
          duration: 2000
        })
      );

      animationManager.add(
        new TranslateAnimation(piCharacter, {
          delta: { x: 200, y: 0 },
          easingFunction: easeInOutElastic,
          durations: 500
        })
      );
    }, 3000);

    setTimeout(() => {
      animationManager.add(new SquintingEyeAnimation(piCharacter.leftEye));
      animationManager.add(new SquintingEyeAnimation(piCharacter.rightEye));

      animationManager.add(
        new WavingRightArmAnimation(piCharacter, {
          easingFunction: easeInOutBack,
          animationManager: animationManager
        })
      );
    }, 3800);

    setTimeout(() => {
      animationManager.add(new UnSquintingEyeAnimation(piCharacter.leftEye));
      animationManager.add(new UnSquintingEyeAnimation(piCharacter.rightEye));
    }, 4500);

    setTimeout(() => {
      animationManager.add(
        new ScaleAnimation(coordinateSystem, {
          xScale: 2,
          yScale: 2,
          center: coordinateSystem.getCenter(),
          easingFunction: easeInOutElastic,
          duration: 1000
        })
      );
      // animationManager.add(
      //   new TranslateAnimation(coordinateSystem, {
      //     delta: { x: -200, y: 200 },
      //     easingFunction: easeInOutElastic,
      //     duration: 1400,
      //   }),
      // );
    }, 1500);

    // setTimeout(() => {
    //   animationManager.add(
    //     new FadeOutAnimation(coordinateSystem, {
    //       duration: 2000,
    //     }),
    //   );
    // }, 5000);

    // animationManager.add(
    //   new OutlineThanFillAnimation(mathText, {
    //     duration: 1000,
    //   }),
    // );

    // setTimeout(() => {
    //   animationManager.add(new OutlineThanFillAnimation(circle));
    //   animationManager.add(new OutlineThanFillAnimation(vector));
    // }, 1000);

    // animationManager.add(new OutlineThanFillAnimation(rectangle));

    animationManager.add(
      new OutlineThanFillAnimation(coordinateSystem, {
        duration: 1000,
        toTop: false
      })
    );

    // setTimeout(() => {
    //   animationManager.add(
    //     new OutlineThanFillAnimation(parabola, {
    //       duration: 2000,
    //     }),
    //   );
    // }, 2500);

    // animationManager.add(new OutlineThanFillAnimation(text, 2000));
    // setTimeout(() => {
    //   text.translate({ x: -13, y: 90 });
    // }, 3000);
    // animationManager.add(new OutlineThanFillAnimation(numberLineX, 1000));

    // animationManager.add(new OutlineThanFillAnimation(numberLineY, 1000));

    // setTimeout(() => {
    //   animationManager.add(new OutlineThanFillAnimation(line, 1000));
    // }, 2000);
  });
</script>

<Separator class="mt-2" />
<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    width: 100%;
    height: calc(100vh - 93px - 28px);
    display: block;
  }
</style>
