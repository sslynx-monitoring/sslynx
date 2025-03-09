const fs = require('fs');
const path = require('path');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();

// Database setup
const db = new sqlite3.Database('ssl_monitor.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to SQLite database.');
});

db.run(`CREATE TABLE IF NOT EXISTS ssl_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE,
    expiration_date TEXT,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Log setup
const logFile = path.join(__dirname, 'ssl_monitor.log');
function logMessage(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logLine);
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to check SSL expiration
function checkSSL(domain) {
    const options = { method: 'GET', agent: new https.Agent({ rejectUnauthorized: false }) };
    
    https.get(`https://${domain}`, options, (res) => {
        const cert = res.socket.getPeerCertificate();
        if (cert && cert.valid_to) {
            const expirationDate = new Date(cert.valid_to);
            const expirationISO = expirationDate.toISOString();
            const issuer = cert.issuer ? cert.issuer.O : 'Unknown';
            const subject = cert.subject ? cert.subject.CN : 'Unknown';
            const daysRemaining = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
            
            console.log(`${domain} SSL expires on:`, expirationDate);
            logMessage(`${domain} SSL expires on: ${expirationISO}`);
            
            db.run(`INSERT INTO ssl_checks (domain, expiration_date) VALUES (?, ?) 
                   ON CONFLICT(domain) DO UPDATE SET expiration_date = excluded.expiration_date, last_checked = CURRENT_TIMESTAMP`, 
                   [domain, expirationISO]);

            // Send email alerts based on the days remaining
            if (daysRemaining <= 30 && daysRemaining > 15) {
                sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining);
            } else if (daysRemaining <= 15 && daysRemaining > 5) {
                sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining);
            } else if (daysRemaining <= 5 && daysRemaining > 0) {
                sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining);
            } else if (daysRemaining <= 0) {
                sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining);
            }
        }
    }).on('error', (err) => {
        console.error(`Error checking ${domain}:`, err.message);
        logMessage(`Error checking ${domain}: ${err.message}`);
    });
}

// Function to send email alert with HTML content
function sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ALERT_RECIPIENT,
        subject: `SSL Certificate Expiry Alert for ${domain}`,
        html: fs.readFileSync(path.join(__dirname, 'email_template.html'), 'utf8')
            .replace('{{domain}}', domain)
            .replace('{{expirationDate}}', expirationDate.toLocaleString())
            .replace('{{issuer}}', issuer)
            .replace('{{subject}}', subject)
            .replace('{{daysRemaining}}', daysRemaining)
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Email sending failed:', err);
            logMessage(`Email sending failed for ${domain}: ${err}`);
        } else {
            console.log('Alert email sent:', info.response);
            logMessage(`Alert email sent for ${domain}: ${info.response}`);
        }
    });
}

// Example usage
const domains = process.env.SSL_DOMAINS ? process.env.SSL_DOMAINS.split(',') : ['example.com'];
domains.forEach(checkSSL);

// Run checks periodically
setInterval(() => {
    domains.forEach(checkSSL);
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Test mode logic
const args = process.argv.slice(2);
if (args[0] === '/test' && args[1] && args[2]) {
    const testDomain = args[1];
    const testEmail = args[2];

    console.log(`Running test for domain: ${testDomain}`);
    checkSSL(testDomain);
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: testEmail,
        subject: `SSL Test Alert for ${testDomain}`,
        html: fs.readFileSync(path.join(__dirname, 'email_template.html'), 'utf8')
            .replace('{{domain}}', testDomain)
            .replace('{{expirationDate}}', 'Test Date')
            .replace('{{issuer}}', 'Test Issuer')
            .replace('{{subject}}', 'Test Subject')
            .replace('{{daysRemaining}}', 'N/A')
    }, (err, info) => {
        if (err) console.error('Test email sending failed:', err);
        else console.log('Test email sent:', info.response);
    });
} else {
    console.log('Usage: node ssl_monitor.js /test "domain.com" "sendtoemail@mail.com"');
}
