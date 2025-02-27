import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sslRoutes from "./routes/sslRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ssl", sslRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`✅ SSLynx API running on http://localhost:${PORT}`);
});
