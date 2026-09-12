// Central error type so every handler can throw and let the errorHandler
// middleware turn it into a consistent JSON shape - no raw stack traces leak out.
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const Errors = {
  unauthorized: (msg = "Unauthorized") => new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "Forbidden") => new AppError(403, "FORBIDDEN", msg),
  notFound: (msg = "Not found") => new AppError(404, "NOT_FOUND", msg),
  badRequest: (msg = "Bad request") => new AppError(400, "BAD_REQUEST", msg),
  conflict: (msg = "Conflict") => new AppError(409, "CONFLICT", msg),
};
