require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// 🔥 GLOBAL CRASH PROTECTION
process.on("uncaughtException", err => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", err => {
  console.error("🔥 UNHANDLED PROMISE REJECTION:", err);
  process.exit(1);
});

(async () => {
  try {
    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log(" Database connected");

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    //  GRACEFUL SHUTDOWN (Render sends SIGTERM)
    process.on("SIGTERM", () => {
      console.log(" SIGTERM RECEIVED. Shutting down gracefully...");
      server.close(() => {
        console.log(" Server closed");
        process.exit(0);
      });
    });

  } catch (err) {
    console.error(" Startup failed:", err);
    process.exit(1);
  }
})();
