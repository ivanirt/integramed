export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runNodeStartup } = await import("./instrumentation-node");
    await runNodeStartup();
  }
}
