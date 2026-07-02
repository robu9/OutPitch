import "./load-env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { startPipelineWorker } from "./jobs/company-pipeline.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import onboardingRoutes from "./routes/onboarding.js";
import chatRoutes from "./routes/chat.js";
import companiesRoutes from "./routes/companies.js";
import outreachRoutes from "./routes/outreach.js";

const app = express();

const corsOrigins = new Set(
  [
    config.appUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean)
);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        corsOrigins.has(origin) ||
        config.nodeEnv === "development"
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/outreach", outreachRoutes);

app.use(errorHandler);

startPipelineWorker();

app.listen(config.port, () => {
  console.log(`Outpitch API running on http://localhost:${config.port}`);
});
