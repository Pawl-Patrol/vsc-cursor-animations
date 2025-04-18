export async function getWebGPUContext(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("Failed to get GPU adapter.");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("Failed to get GPU device.");
  }

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const context = canvas.getContext("webgpu")! as unknown as GPUCanvasContext;

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "premultiplied" });

  return { device, canvas, context, format };
}

export type GPUContext = Awaited<ReturnType<typeof getWebGPUContext>>;
