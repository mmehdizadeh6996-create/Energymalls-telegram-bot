import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET must be set to enable admin authentication.",
  );
}

const PgStore = connectPgSimple(session);

export const sessionMiddleware: RequestHandler = session({
  store: new PgStore({
    pool,
    tableName: "user_sessions",
  }),
  name: "oiltrade.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: "auto",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
});
