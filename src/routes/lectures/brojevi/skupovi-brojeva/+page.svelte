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
        fillColor: "rgb(250, 250, 250)",
      },
    );

    const piCharacter = new PiCharacter([{ x: -290, y: 420 }]);
    piCharacter.scale(0.4, 0.4);

    const bubbleWithText = new BubbleWithText(
      [{ x: 115, y: 385 }],
      `U ovoj lekciji naučit ćeš što su skupovi brojeva i koje sve vrste skupova postoje.
        Vidjet ćeš kako se prirodni, cijeli, racionalni i realni brojevi međusobno nadovezuju.
        Također, naučit ćeš razlikovati oznake otvorenih i zatvorenih intervala.
        Na kraju lekcije moći ćeš prepoznati u koji skup pripada bilo koji broj i točno \n zapisati skup pomoću odgovarajućih oznaka.`,
      {
        fontSize: 12,
      },
    );

    ///////////////////
    // ADD ANIMATIONS
    ///////////////////

    scene.add(piCharacter);

    const animationManager = new AnimationManager(scene);

    animationManager.add(
      new OutlineThanFillAnimation(bubbleWithText, {
        duration: 4000,
      }),
    );

    animationManager.add(
      new TranslateAnimation(piCharacter, {
        delta: { x: 200, y: 0 },
        easingFunction: easeInOutElastic,
        durations: 500,
      }),
    );

    setTimeout(() => {
      animationManager.add(
        new WavingRightArmAnimation(piCharacter, {
          easingFunction: easeInOutBack,
          animationManager: animationManager,
        }),
      );
    }, 500);

    // const animBlock1 = new ActionBlock();

    // animation.addDoBlockToBottom(animBlock1);
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
