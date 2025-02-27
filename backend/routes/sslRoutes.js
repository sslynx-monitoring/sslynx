import express from "express";
import { checkSSL } from "../utils/sslChecker.js";

const router = express.Router();

// Route to check SSL status of a domain
router.get("/check", async (req, res) => {
    const { domain } = req.query;

    if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
    }

    try {
        const sslData = await checkSSL(domain);
        res.json(sslData);
    } catch (error) {
        res.status(500).json({ error: "Failed to check SSL status" });
    }
});

export default router;
