import { Builder, parseStringPromise } from "xml2js";

const builder = new Builder({
  xmldec: { version: "1.0", encoding: "UTF-8" },
  renderOpts: { pretty: true },
});

export function buildXml(rootName: string, obj: Record<string, unknown>): string {
  return builder.buildObject({ [rootName]: obj });
}

export async function parseXml<T = Record<string, unknown>>(xml: string): Promise<T> {
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
  });
  return result as T;
}
