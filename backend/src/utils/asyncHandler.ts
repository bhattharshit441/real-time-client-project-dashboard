import { NextFunction, Request, Response } from "express";

// Avoids repeating try/catch in every controller - any thrown/rejected error
// flows to the centralized errorHandler middleware.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
