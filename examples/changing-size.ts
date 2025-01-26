#!/usr/bin/env deno
import { SuperConsole } from "../mod.ts";

await using console = new SuperConsole();

let i = 0;
const id = setInterval(() => {
  console.status = "===================\n" + `${i++}\n`.repeat((i / 10) % 10);
}, 5);

for (let j = 0; j < 10; j++) {
  console.log(`Hello, world! ${j}`);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

clearInterval(id);
