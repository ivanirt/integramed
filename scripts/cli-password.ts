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

export function rejectPasswordArguments(argv: string[]): void {
  for (const arg of argv) {
    const name = arg.split("=", 1)[0];
    if (name === "--password" || name === "--pass" || name === "-p") {
      console.error("No pases la contraseña como argumento. Se lee del prompt oculto o de stdin.");
      process.exit(1);
    }
  }
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
      if (key === "\u0003") {
        stdout.write("\n");
        cleanup();
        process.exit(130);
      }
      if (key === "\r" || key === "\n" || key.endsWith("\n") || key.endsWith("\r")) {
        const extra = key.replace(/[\r\n]/g, "");
        if (extra && extra.charCodeAt(0) >= 32) value += extra;
        stdout.write("\n");
        cleanup();
        resolve(value);
        return;
      }
      if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (key === "\u0015") {
        value = "";
        return;
      }
      let printable = "";
      for (const char of key) {
        if (char.charCodeAt(0) >= 32) printable += char;
      }
      value += printable;
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
