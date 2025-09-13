<script>
  import ObjectivesGraph from "$lib/components/objectivesGraph/ObjectivesGraph.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import AnimationController from "$lib/components/animationController/AnimationController.svelte";
  import { ActionBlock, Animation } from "$lib/utils/animation.js";
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
    FadeInAnimation,
  } from "matanim";

  let canvas;

  const animation = new Animation();

  $effect(() => {
    const scene = new Scene(canvas);

    const line = new Line(
      [
        { x: 550, y: 130 },
        { x: 700, y: 420 },
      ],
      { lineWidth: 5 },
    );
    const text = new Text([{ x: 100, y: 300 }], "Č", {
      fontSize: 72,
    });
    const mathText = new MathText([{ x: 800, y: 550 }], "\\text{c}", {
      fontSize: 73,
      lineWidth: 1,
      borderColor: "rgb(250, 250, 250)",
      fillColor: "rgb(250, 250, 250)",
    });

    scene.add(text);

    const coordinateSystem = new CoordinateSystem(
      [
        { x: 100, y: 322 },
        { x: 1300, y: 322 },
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
        yAxisLabel: "y\\text{-os}",
      },
    );

    // coordinateSystem.translate({ x: -700, y: 0 });

    const parabola = new FunctionPlot(
      coordinateSystem,
      (x) => 3 * Math.sin(x),
      {
        dashed: true,
      },
    );

    const vector = new Vector([
      coordinateSystem.pointToCoords(-3, 2),
      coordinateSystem.pointToCoords(-2, 4),
    ]);

    const piCharacter = new PiCharacter([{ x: -90, y: 0 }]);
    piCharacter.scale(0.4, 0.4);
    piCharacter.translate({ x: -200, y: 420 });
    parabola.translate({ x: 100, y: 0 });

    const bubbleWithText = new BubbleWithText(
      [{ x: 115, y: 430 }],
      "Bok ovo je prva Linija,\n a ovo je druga \\(2\\pi + x = y\\)\n jos jedna",
      {
        fontSize: 10,
      },
    );

    ///////////////////
    // ADD ANIMATIONS
    ///////////////////

    scene.add(piCharacter);

    const animationManager = new AnimationManager(scene);

    animationManager.add(
      new OutlineThanFillAnimation(coordinateSystem, {
        duration: 1000,
        toTop: false,
      }),
    );

    setTimeout(() => {
      animationManager.add(
        new ScaleAnimation(coordinateSystem, {
          xScale: 1.75,
          yScale: 1.75,
          center: coordinateSystem.getCenter(),
          easingFunction: easeInOutElastic,
          duration: 1000,
        }),
      );
    }, 1500);

    const animBlock1 = new ActionBlock();

    animBlock1.addDo(() => {
      animationManager.add(
        new OutlineThanFillAnimation(bubbleWithText, {
          duration: 2000,
        }),
      );
      animationManager.add(
        new TranslateAnimation(piCharacter, {
          delta: { x: 200, y: 0 },
          easingFunction: easeInOutElastic,
          durations: 500,
        }),
      );
    });

    animation.addDoBlockToBottom(animBlock1);

    const animBlock2 = new ActionBlock();
    animBlock2.addDo(() => {
      animationManager.add(new SquintingEyeAnimation(piCharacter.leftEye));
      animationManager.add(new SquintingEyeAnimation(piCharacter.rightEye));
      animationManager.add(
        new WavingRightArmAnimation(piCharacter, {
          easingFunction: easeInOutBack,
          animationManager: animationManager,
        }),
      );
    });

    animation.addDoBlockToBottom(animBlock2);

    const animBlock3 = new ActionBlock();
    animBlock3.addDo(() => {
      animationManager.add(new UnSquintingEyeAnimation(piCharacter.leftEye));
      animationManager.add(new UnSquintingEyeAnimation(piCharacter.rightEye));
    });

    animation.addDoBlockToBottom(animBlock3);
  });
</script>

<Separator class="mt-2" />
<canvas bind:this={canvas}></canvas>
<AnimationController {animation} />

<style>
  canvas {
    width: 100%;
    height: calc(100vh - 93px - 28px - 44px);
    display: block;
  }
</style>
