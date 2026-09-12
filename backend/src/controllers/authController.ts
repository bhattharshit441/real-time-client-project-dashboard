import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import * as authService from "../services/authService";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const cookieOpts = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { body } = loginSchema.parse({ body: req.body });
  const { accessToken, refreshToken, user } = await authService.login(body.email, body.password);
  res.cookie("refreshToken", refreshToken, cookieOpts);
  res.json({ accessToken, user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh(token);
  res.cookie("refreshToken", refreshToken, cookieOpts);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  await authService.logout(token);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ success: true });
});

// Used after a silent refresh (e.g. on page reload) to restore the
// user object in the frontend, since /refresh only returns a new access token.
export const me = [
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }),
];
