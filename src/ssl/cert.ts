import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "selfsigned";
import { logger } from "../logger.js";

export interface SslCert {
  key: string;
  cert: string;
}

export async function ensureSslCert(dataDir: string): Promise<SslCert> {
  const certDir = join(dataDir, "certs");
  const keyPath = join(certDir, "server.key");
  const certPath = join(certDir, "server.crt");

  if (existsSync(keyPath) && existsSync(certPath)) {
    logger.info("Using existing SSL certificate");
    return {
      key: readFileSync(keyPath, "utf-8"),
      cert: readFileSync(certPath, "utf-8"),
    };
  }

  logger.info("Generating self-signed SSL certificate");
  const attrs = [{ name: "commonName", value: "device.pulse.kodak.com" }];
  const pems = await generate(attrs, {
    days: 3650,
    keySize: 2048,
  });

  writeFileSync(keyPath, pems.private, { mode: 0o600 });
  writeFileSync(certPath, pems.cert, { mode: 0o644 });

  return {
    key: pems.private,
    cert: pems.cert,
  };
}
