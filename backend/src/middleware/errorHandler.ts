import { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";

// Consistent structured error shape everywhere. Never leaks stack traces to the client.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};

export function notFoundHandler(_req: any, res: any) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
