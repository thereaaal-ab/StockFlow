import type { Express } from "express";
import { createServer, type Server } from "http";
import recurringCostsRoutes from "./recurringCostsRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/settings", recurringCostsRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
