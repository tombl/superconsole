#!/usr/bin/env deno
import { SuperConsole } from "../mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

await using console = new SuperConsole();

class Spinner {
  #symbols: string[];
  #i = 0;
  #interval = setInterval(() => this.#tick(), 100);

  constructor(symbols: string[]) {
    this.#symbols = symbols;
  }

  text = "Loading...";

  #tick() {
    console.status = `${this.#symbols[this.#i]} ${this.text}`;
    this.#i = (this.#i + 1) % this.#symbols.length;
  }

  [Symbol.dispose]() {
    clearInterval(this.#interval);
  }
  stop() {
    clearInterval(this.#interval);
  }
}

using spinner = new Spinner(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]);

await sleep(1000);

spinner.text = "Still loading...";

await sleep(500);

console.log("Something is happening...");

await sleep(500);

spinner.text = "Almost there...";

await sleep(1000);

spinner.stop();

console.log("✓  Done!");
