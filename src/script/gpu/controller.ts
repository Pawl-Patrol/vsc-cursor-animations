import { AnimationConfiguration } from "../../common/types";
import { Bridge } from "../vscode/bridge";
import { Editor } from "../vscode/editor";
import { AnimationBase } from "./animation/base";
import { CursorTrail } from "./animation/CursorTrail";
import { initWebGPU } from "./initWebGPU";
import { GPUContext, VscodeContext } from "./types";

const ANIMATIONS = {
  "cursor-trail": CursorTrail,
} satisfies Record<string, typeof AnimationBase>;

export class AnimationController {
  animation?: AnimationBase;
  running = false;

  constructor(
    private gpu: GPUContext,
    private vscode: VscodeContext,
    private config: AnimationConfiguration
  ) {}

  static async run() {
    const vscode = {
      editor: await Editor.loopUntilEditorElementExists(),
      bridge: await Bridge.waitUntilConnectionCanBeEstablished(),
    };
    vscode.bridge.sendMessage({ type: "config-request", payload: {} });
    const config = await vscode.bridge.waitForMessage("config-response");
    const gpu = await initWebGPU(vscode.editor.canvas);
    const controller = new AnimationController(gpu, vscode, config);
    controller.startAnimation("cursor-trail"); // TODO: move
  }

  setupEvents() {
    new ResizeObserver(() => this.animation?.onCanvasResize()).observe(
      this.vscode.editor.element
    );

    this.vscode.bridge.onMessage(async (m) => {
      if (m.type === "config-response") {
        this.animation?.build();
        Object.assign(this.config, m.payload);
        console.log("New configuration", m.payload);
      }
    });
  }

  startAnimation(name: keyof typeof ANIMATIONS, durationMs?: number) {
    const Animation = ANIMATIONS[name];
    this.animation = new Animation(this.gpu, this.vscode, this.config);
    this.animation.build();

    const animate = (time: number) => {
      if (!this.running) {
        return;
      }
      this.animation!.render(time);
      requestAnimationFrame(animate);
    };

    this.running = true;
    requestAnimationFrame(animate);

    if (durationMs) {
      setTimeout(() => (this.running = false), durationMs);
    }
  }
}
