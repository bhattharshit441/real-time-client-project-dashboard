import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

// Wraps a Zod schema as Express middleware so every route validates input
// server-side, regardless of what the frontend does.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsed.body ?? req.body;
    next();
  };
}
