import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import { Errors } from "../utils/AppError";

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role };
}

// Every protected route runs this. There is no "trust the frontend" path.
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Missing access token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(Errors.unauthorized("Invalid or expired access token"));
  }
}

// Role gate - stacks on top of requireAuth. A Developer hitting a PM-only
// route with a forged/edited token still gets 403 here, server-side.
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(Errors.forbidden("You do not have access to this resource"));
    }
    next();
  };
}
