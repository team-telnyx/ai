// Preloaded through NODE_OPTIONS in the local regression and every Node child.
// Guard TCP before DNS/connect, covering fetch, HTTP and HTTPS (including redirects).
// This is a test assertion, not a sandbox for untrusted/native code or other protocols.
const { Socket } = require("node:net");
const base = new URL(process.env.TELNYX_API_BASE_URL);
if (base.hostname !== "127.0.0.1" || !base.port) {
  throw new Error("The read-only egress guard requires a literal loopback API URL");
}
const connect = Socket.prototype.connect;
Socket.prototype.connect = function (...args) {
  // net.connect passes normalized arguments as an array; direct socket users
  // can pass an options object or the (port, host) overload instead.
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const first = normalized[0];
  const options = typeof first === "object" && first !== null
    ? first
    : { port: first, host: typeof normalized[1] === "string" ? normalized[1] : "localhost" };
  // tsx uses a local IPC socket. It is not a TCP connection.
  if (!options.path && (options.host !== "127.0.0.1" || Number(options.port) !== Number(base.port))) {
    process.stderr.write(`READONLY_EGRESS_BLOCKED ${options.host ?? "localhost"}:${options.port}\n`);
    // Reporter code swallows fetch errors, so throwing alone cannot fail the test.
    process.exit(86);
  }
  return Reflect.apply(connect, this, args);
};
