import type { Request, Response } from "express";
import { buildXml } from "./xml.js";

export function handleProfile(req: Request, res: Response): void {
  const { profileID } = req.params;

  const xml = buildXml("profile", {
    id: profileID,
    name: "Admin",
    emailAddress: "admin@kodak-pulse.local",
  });

  res.status(200).type("application/xml").send(xml);
}
