import { describe, it, expect, afterEach } from "vitest";
import { createDnsProxy } from "./dns-proxy.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dns2 has no TypeScript types
import dns2 from "dns2";

describe("dns-proxy", () => {
  let server: ReturnType<typeof createDnsProxy> | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("resolves intercepted hostnames to server IP", async () => {
    server = createDnsProxy({
      port: 15353,
      serverIp: "192.168.1.100",
      interceptedHosts: ["device.pulse.kodak.com"],
      upstream: "8.8.8.8",
    });
    await server.start();

    const resolver = new dns2({ nameServers: ["127.0.0.1"], port: 15353 });
    const result = await resolver.resolveA("device.pulse.kodak.com");
    expect(result.answers[0].address).toBe("192.168.1.100");
  });

  it("forwards non-intercepted queries upstream", async () => {
    server = createDnsProxy({
      port: 15354,
      serverIp: "192.168.1.100",
      interceptedHosts: ["device.pulse.kodak.com"],
      upstream: "8.8.8.8",
    });
    await server.start();

    const resolver = new dns2({ nameServers: ["127.0.0.1"], port: 15354 });
    const result = await resolver.resolveA("example.com");
    expect(result.answers.length).toBeGreaterThan(0);
    expect(result.answers[0].address).not.toBe("192.168.1.100");
  });
});
