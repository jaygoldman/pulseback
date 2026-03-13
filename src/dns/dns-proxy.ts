// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dns2 has no TypeScript types
import dns2 from "dns2";
import { logger } from "../logger.js";

const { Packet } = dns2;

interface DnsProxyOptions {
  port: number;
  serverIp: string;
  interceptedHosts: string[];
  upstream: string;
}

export function createDnsProxy(options: DnsProxyOptions) {
  const { port, serverIp, interceptedHosts, upstream } = options;
  const interceptedSet = new Set(interceptedHosts.map((h) => h.toLowerCase()));

  const server = dns2.createServer({
    udp: true,
    handle: async (request: unknown, send: (response: unknown) => void) => {
      const req = request as {
        questions: Array<{ name: string; type: number }>;
        header: Record<string, unknown>;
      };
      const response = Packet.createResponseFromRequest(req);
      const question = req.questions[0];

      if (!question) {
        send(response);
        return;
      }

      const name = question.name.toLowerCase();

      if (interceptedSet.has(name) && question.type === Packet.TYPE.A) {
        logger.debug("DNS intercepted", { hostname: name, ip: serverIp });
        response.answers.push({
          name: question.name,
          type: Packet.TYPE.A,
          class: Packet.CLASS.IN,
          ttl: 60,
          address: serverIp,
        });
        send(response);
        return;
      }

      // Forward to upstream
      try {
        const resolver = new dns2({ nameServers: [upstream] });
        const result = await resolver.resolveA(question.name);
        response.answers = result.answers;
        send(response);
      } catch (err) {
        logger.warn("DNS upstream failed", { hostname: name, error: String(err) });
        response.header.rcode = 2; // SERVFAIL
        send(response);
      }
    },
  });

  let running = false;

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.on("listening", () => {
          running = true;
          logger.info("DNS proxy started", { port });
          resolve();
        });
        server.listen({ udp: port });
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        if (!running) {
          resolve();
          return;
        }
        server.close().then(() => {
          running = false;
          logger.info("DNS proxy stopped");
          resolve();
        });
      }),
    isRunning: () => running,
  };
}
