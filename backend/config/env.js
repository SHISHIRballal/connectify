import dotenv from "dotenv";
dotenv.config();

const requiredVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\u274c Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}`,
  );
  console.error(`\nSee .env.example for reference.`);
  process.exit(1);
}

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // AI Moderation & Intelligence Configuration (Backend Exclusive)
  AI_API_KEY: process.env.AI_API_KEY || "",
  AI_PROVIDER: process.env.AI_PROVIDER || "mock", // "mock" | "gemini" | "openai"
  AI_MODEL: process.env.AI_MODEL || "gemini-1.5-flash",
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS, 10) || 5000,
  AI_MODERATION_FAIL_MODE: process.env.AI_MODERATION_FAIL_MODE || "FAIL_OPEN",
};

export default env;
