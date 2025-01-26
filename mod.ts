const ANSI_CURSOR_UP = "\x1b[1A";
const ANSI_CLEAR_LINE = "\x1b[2K";

function debounceThrottle(
  fn: () => Promise<void>,
  ms: number,
): () => Promise<void> {
  let last = 0;
  let timeout: number | undefined;
  let p: PromiseWithResolvers<void> | undefined;
  return async () => {
    const now = Date.now();
    if (now - last > ms) {
      last = now;
      await fn();
    } else {
      const { resolve, reject } = p ??= Promise.withResolvers();
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        last = Date.now();
        fn()
          .then(resolve, reject)
          .finally(() => p = undefined);
      }, ms);
      await p.promise;
    }
  };
}

function serialize(fn: () => Promise<void>): () => Promise<void> {
  let promise: Promise<void> | undefined;
  return () => promise = promise?.then(fn) ?? fn();
}

export class SuperConsole {
  #writer: WritableStreamDefaultWriter<Uint8Array>;
  constructor(options: {
    writable?: WritableStream<Uint8Array>;
  } = {}) {
    this.#writer = (options.writable ?? Deno.stdout.writable).getWriter();
  }

  #state: "clean" | "dirty" | "disposed" = "clean";
  #status = "";
  get status(): string {
    return this.#status;
  }
  set status(value: string) {
    this.#status = value;
    this.#state = "dirty";
    this.#update();
  }

  #queue: Array<() => void | Promise<void>> = [];
  enqueue(fn: () => void | Promise<void>) {
    this.#queue.push(fn);
    this.#state = "dirty";
    this.#update();
  }

  log(...args: unknown[]) {
    this.enqueue(() => console.log(...args));
  }

  #lines = 0;
  #encoder = new TextEncoder();
  #update = debounceThrottle(
    serialize(async () => {
      if (this.#state !== "dirty") return;
      this.#state = "clean";

      await this.#writer.write(this.#encoder.encode(
        (ANSI_CURSOR_UP + "\r" + ANSI_CLEAR_LINE).repeat(this.#lines),
      ));

      for (const fn of this.#queue) await fn();
      this.#queue.length = 0;

      let status = this.#status;
      if (!status.endsWith("\n") && status !== "") status += "\n";

      await this.#writer.write(this.#encoder.encode(status));

      this.#lines = 0;
      for (const char of status) if (char === "\n") this.#lines++;
    }),
    16,
  );

  async [Symbol.asyncDispose]() {
    this.#status = "";
    this.#state = "dirty";
    await this.#update();
    this.#state = "disposed";
    this.#writer.releaseLock();
  }
}
