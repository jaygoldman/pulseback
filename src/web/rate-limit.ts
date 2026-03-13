import type { Request, Response, NextFunction } from "express";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimit(maxAttempts = 5, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const entry = attempts.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        res.status(429).json({ error: "Too many login attempts. Try again later." });
        return;
      }
      entry.count++;
    } else {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
    }
    next();
  };
}
