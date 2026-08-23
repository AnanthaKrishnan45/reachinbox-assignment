import express from "express";
import cors from "cors";
import { prisma } from "./config/prisma";
import emailRoutes from "./routes/emailRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "ReachInbox backend is running",
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "PostgreSQL connection is working",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use("/api/emails", emailRoutes);

export default app;