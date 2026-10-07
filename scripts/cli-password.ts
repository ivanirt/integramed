/**
 * Reads a password from a hidden TTY prompt (with confirmation) or from stdin.
 * Never writes the password to stdout, stderr, or a file.
 * SET_PASSWORD and CREATE_USER_PASSWORD are ignored.
 */

const DEPRECATED_ENV = ["SET_PASSWORD", "CREATE_USER_PASSWORD"] as const;

export function warnDeprecatedPasswordEnv(): void {
  for (const name of DEPRECATED_ENV) {
    if (!process.env[name]) continue;
    console.error(
      `[${name}] está en desuso y se ignora. Escribe la contraseña en el prompt oculto o pásala por stdin. No la pongas en el entorno, en los argumentos ni en un archivo.`,
    );
  }
}

/** True for --password, --pass, -p, and the same flags with the value attached (`-psecret`, `--password=…`). */
export function isPasswordArgument(arg: string): boolean {
  const name = arg.split("=", 1)[0];
  return name.startsWith("--pass") || name.startsWith("-p");
}

export function rejectPasswordArguments(argv: string[]): void {
  for (const arg of argv) {
    if (!isPasswordArgument(arg)) continue;
    console.error("No pases la contraseña como argumento. Se lee del prompt oculto o de stdin.");
    process.exit(1);
  }
}

/**
 * One raw chunk from the hidden prompt.
 * A newline ends the entry. Anything after the first newline is a second line and is rejected.
 */
export function appendHiddenChunk(
  value: string,
  chunk: string,
): { kind: "continue"; value: string } | { kind: "submit"; value: string } | { kind: "reject" } | { kind: "interrupt" } {
  if (chunk === "\u0003") return { kind: "interrupt" };
  const breakAt = chunk.search(/\r|\n/);
  if (breakAt >= 0) {
    let next = value;
    for (const char of chunk.slice(0, breakAt)) {
      if (char.charCodeAt(0) >= 32) next += char;
    }
    const rest = chunk.slice(breakAt).replace(/[\r\n]/g, "");
    if (rest.length > 0) return { kind: "reject" };
    return { kind: "submit", value: next };
  }
  if (chunk === "\u007f" || chunk === "\b") return { kind: "continue", value: value.slice(0, -1) };
  if (chunk === "\u0015") return { kind: "continue", value: "" };
  let next = value;
  for (const char of chunk) {
    if (char.charCodeAt(0) >= 32) next += char;
  }
  return { kind: "continue", value: next };
}

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    if (!stdin.isTTY) {
      console.error("Esta terminal no puede ocultar la contraseña.");
      process.exit(1);
    }
    try {
      stdin.setRawMode(true);
    } catch {
      console.error("No se pudo ocultar la contraseña en este terminal.");
      process.exit(1);
    }
    stdout.write(prompt);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const cleanup = () => {
      stdin.removeListener("data", onData);
      try {
        stdin.setRawMode(false);
      } catch {
        /* already restored */
      }
      stdin.pause();
    };
    const onData = (key: string) => {
      const step = appendHiddenChunk(value, key);
      if (step.kind === "interrupt") {
        stdout.write("\n");
        cleanup();
        process.exit(130);
      }
      if (step.kind === "reject") {
        stdout.write("\n");
        cleanup();
        console.error("La contraseña tiene que ir en una sola línea.");
        process.exit(1);
      }
      if (step.kind === "submit") {
        stdout.write("\n");
        cleanup();
        resolve(step.value);
        return;
      }
      value = step.value;
    };
    stdin.on("data", onData);
  });
}

async function readStdinLine(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  return line;
}

export async function readCliPassword(): Promise<string> {
  if (process.stdin.isTTY) {
    const first = await readHidden("Contraseña: ");
    const second = await readHidden("Repite la contraseña: ");
    if (first !== second) {
      console.error("Las contraseñas no coinciden.");
      process.exit(1);
    }
    if (!first) {
      console.error("La contraseña está vacía.");
      process.exit(1);
    }
    return first;
  }
  const line = await readStdinLine();
  if (!line) {
    console.error("Falta la contraseña en stdin.");
    process.exit(1);
  }
  return line;
}
