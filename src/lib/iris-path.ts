/** Split an SVG path `d` into subpath strings. Sampling and warping stay in the browser. */

const PARAMS: Record<string, number> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
  z: 0,
};

export function splitSubpaths(d: string): string[] {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi);
  if (!tokens) return [];
  const subs: string[] = [];
  let current: string[] = [];
  let i = 0;

  const flush = () => {
    if (current.length) subs.push(current.join(" "));
    current = [];
  };

  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!/^[A-Za-z]$/.test(cmd)) {
      i += 1;
      continue;
    }
    const count = PARAMS[cmd.toLowerCase()];
    if (count == null) {
      i += 1;
      continue;
    }
    i += 1;
    if (count === 0) {
      current.push(cmd);
      continue;
    }
    let first = true;
    while (i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])) {
      if (i + count > tokens.length) break;
      const args = tokens.slice(i, i + count);
      i += count;
      const use = first ? cmd : cmd === "M" ? "L" : cmd === "m" ? "l" : cmd;
      if (first && (cmd === "M" || cmd === "m") && current.length) flush();
      current.push(`${use} ${args.join(" ")}`);
      first = false;
    }
  }
  flush();
  return subs;
}
