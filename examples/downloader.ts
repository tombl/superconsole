#!/usr/bin/env deno
import { SuperConsole } from "../mod.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const random = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function fakeFetch(size: number) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      while (size > 0) {
        const chunk = new Uint8Array(
          Math.min(size, random(50, 100)),
        );
        controller.enqueue(chunk);
        size -= chunk.length;
        await sleep(random(10, 30));
      }
      controller.close();
    },
  });
}

class ProgressReportingStream extends TransformStream {
  bytes = 0;

  constructor(report: (bytes: number) => void) {
    super({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
        this.bytes += chunk.length;
        report(this.bytes);
      },
    });
  }
}

function drawBar(progress: number, width: number) {
  const SYMBOLS = " ▏▎▍▌▋▊▉█";
  // const SYMBOLS = " #";
  // const SYMBOLS = "  ⡇⣿";

  const filled = Math.floor(progress * width);
  const partial = Math.floor((progress * width) % 1 * SYMBOLS.length);
  const remainder = width - filled;

  return (
    SYMBOLS[SYMBOLS.length - 1].repeat(filled) +
    SYMBOLS[partial] +
    " ".repeat(remainder)
  ).slice(0, width);
}

await using console = new SuperConsole();
const bars: Array<{ name: string; current: number; total: number } | null> = [];

function render() {
  console.status = bars.filter((b) => b !== null).map((bar) => {
    const progress = bar.current / bar.total;

    return [
      bar.name + ":",
      drawBar(progress, 50),
      `${(progress * 100).toFixed(0).padStart(3, " ")}%`,
      bar.current.toString().padStart(bar.total.toString().length, " "),
      "/",
      bar.total.toString(),
    ].join(" ");
  }).join("\n");
}

const promises = [];

for (let i = 0; i < 10; i++) {
  const start = Date.now();
  const total = random(1000, 10000);
  const body = fakeFetch(total);

  bars[i] = { name: `Download ${i}`, current: 0, total };
  render();

  promises.push(
    body
      .pipeThrough(
        new ProgressReportingStream((bytes) => {
          bars[i] = { name: `Download ${i}`, current: bytes, total };
          render();
        }),
      )
      .pipeTo(new WritableStream({ write: () => {}, close: () => {} }))
      .then(() => {
        const elapsed = Date.now() - start;
        bars[i] = null;
        console.log(`Download ${i}: done in ${elapsed}ms`);
      }),
  );
}

await Promise.all(promises);
