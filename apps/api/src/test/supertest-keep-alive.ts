import { Agent, createServer, type RequestListener, type Server } from 'node:http';
import type supertest from 'supertest';

/**
 * Workaround for a native crash of Node 24.15.0 on Windows (libuv 1.51.0), see
 * nodejs/node#62991 and libuv/libuv#5107: every new TCP connection calls `RtlGetVersion()`
 * with an uninitialised OSVERSIONINFOW and the process randomly dies with exit code
 * 3221226505 (0xC0000409, STATUS_STACK_BUFFER_OVERRUN). Fixed in Node >= 24.16.0.
 *
 * Plain `request(app)` opens a fresh loopback connection for EVERY request (superagent uses
 * `agent: false`), so a test file made hundreds of connections and Vitest lost the whole file
 * ~1 run in 4. Here each Express app gets ONE listening server per test file and every request
 * goes through a keep-alive agent: a handful of connections per file instead of hundreds.
 * Requests, responses and assertions are exactly the same as with plain supertest.
 */
type SuperTestStatic = typeof supertest;
type TestAgent = ReturnType<SuperTestStatic>;

const keepAliveAgent = new Agent({ keepAlive: true });
const servers = new Map<RequestListener, Server>();

function listeningServer(app: RequestListener): Server {
  let server = servers.get(app);
  if (!server) {
    server = createServer(app);
    // 0 = no idle timeout: avoids a race where the server closes a pooled socket just as
    // the agent reuses it. Everything is closed in closeKeepAliveServers().
    server.keepAliveTimeout = 0;
    // Without a host, listen() binds synchronously, so supertest sees an already started
    // server (address() is set) and leaves it open between requests.
    server.listen(0);
    servers.set(app, server);
  }
  return server;
}

export function withKeepAlive(original: SuperTestStatic): SuperTestStatic {
  const request = (
    app: Parameters<SuperTestStatic>[0],
    options?: Parameters<SuperTestStatic>[1],
  ) => {
    const target =
      typeof app === 'function' && !(options as { http2?: boolean } | undefined)?.http2
        ? listeningServer(app as RequestListener)
        : app;
    const client = original(target, options);
    // `client` is a plain object with one function per HTTP method (get, post, …).
    type Method = (url: string) => { agent(a: Agent): unknown };
    const methods = client as unknown as Record<string, Method>;
    for (const [name, method] of Object.entries(methods)) {
      if (typeof method === 'function') {
        methods[name] = ((url: string) => method(url).agent(keepAliveAgent)) as Method;
      }
    }
    return client as TestAgent;
  };
  return Object.assign(request, original);
}

/** Closes the servers and pooled sockets opened by this test file. */
export async function closeKeepAliveServers() {
  keepAliveAgent.destroy();
  await Promise.all(
    [...servers.values()].map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
  servers.clear();
}
