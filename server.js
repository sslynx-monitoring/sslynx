const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

// Database setup
const db = new sqlite3.Database('ssl_monitor.db');

// Serve static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Route to fetch SSL certificate data
app.get('/api/ssl-status', (req, res) => {
    db.all('SELECT * FROM ssl_checks ORDER BY last_checked DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Route to display web UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Web UI running at http://localhost:${port}`);
});
