const fs = require('fs');
const path = require('path');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { send } = require('process');
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
            const daysIssued = Math.ceil((new Date() - new Date(cert.valid_from)) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
            const daysWarning = parseInt(process.env.EXPIRY_WARNING_DAYS) || 30;
            const alertThreshold = parseInt(process.env.ALERT_THRESHOLD_DAYS) || 7;
            const alertSent = cert.alert_sent === 1;

             // check if user did /test, cmd format would look like: /test "domain" "sendtoemail@email.com"
            if (!process.argv[0] === '/test') {

                logMessage(`${domain} SSL expires on: ${expirationISO}`);
                
                db.run(`INSERT INTO ssl_checks (domain, expiration_date) VALUES (?, ?) 
                    ON CONFLICT(domain) DO UPDATE SET expiration_date = excluded.expiration_date, last_checked = CURRENT_TIMESTAMP`, 
                    [domain, expirationISO]);

                if (daysRemaining <= daysWarning && !alertSent) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysRemaining);
                    db.run(`UPDATE ssl_checks SET alert_sent = 1 WHERE domain = ?`, [domain]);
                }

                if (daysRemaining <= 30 && daysRemaining > 15) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent);
                } else if (daysRemaining <= 15 && daysRemaining > 7) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent);
                } else if (daysRemaining <= 7 && daysRemaining > 0) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent);
                } else if (daysRemaining <= 0) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent);
                }

            } else {
                args2email = process.argv[2];
                if (args2email) {
                    sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent);
                }
                console.log(`Domain: ${domain}`);
                console.log("send email to: " + args2email);
            }
            

           

         
        }
    }).on('error', (err) => {
        console.error(`Error checking ${domain}:`, err.message);
        logMessage(`Error checking ${domain}: ${err.message}`);
    });
}

// Function to send email alert with HTML content
/*
Using this template for the email alert
SSL Certificate Expiry Alert
Your SSL certificate for the domain logger.witr.rit.edu is about to expire in 18 days. Please renew your certificate to avoid any service disruption.

Domain	{{domain}}
Issuer	Internet2
Valid From	{{validFrom}}
Valid To	3/26/2025, 11:59:59 PM
If you have any questions or need assistance, please contact your SSL provider or system administrator.

*/
function sendEmailAlert(domain, expirationDate, issuer, subject, daysIssued, daysRemaining, daysWarning, alertThreshold, alertSent) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `SSL Certificate Expiry Alert`,
        html: `
        h1 {
            font-size: 24px;
            color: #2a9d8f;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
        }
        .strong {
            font-weight: bold;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #777;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        .footer a {
            color: #2a9d8f;
            text-decoration: none;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .info-table th, .info-table td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .info-table th {
            background-color: #f0f0f0;
        }
        <h1>SSL Certificate Expiry Alert for ${domain}</h1>
        <p> Dear Subscriber, </p>
        <p>Your SSL certificate for the domain ${domain} is about to expire in ${daysRemaining} days. Please renew your certificate to avoid any service disruption.</p>
        <table>
            <tr><td>Domain:</td><td>${domain}</td></tr>
            <tr><td>Issuer:</td><td>${issuer}</td></tr>
            <tr><td>Subject CN :</td><td>${subject}</td></tr>
            <tr><td>Days Issued:</td><td>${daysIssued}</td></tr>
            <tr><td>Days Remaining:</td><td>${daysRemaining}</td></tr>
            <tr><td>Days Warning:</td><td>${daysWarning}</td></tr>
            <tr><td>Alert Threshold:</td><td>${alertThreshold}</td></tr>
            <tr><td>Valid From:</td><td>${expirationDate}</td></tr>
            <tr><td>Valid To:</td><td>${expirationDate}</td></tr>
        </table>
        <p>If you have any questions or need assistance, please contact your SSL provider or system administrator.</p>
        `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Email sending failed:', err);
        else console.log('Email sent:', info.response);
    });
}

// Example usage
const domains = process.env.SSL_DOMAINS ? process.env.SSL_DOMAINS.split(',') : [];
domains.forEach(checkSSL);

// Run checks periodically
setInterval(() => {
    domains.forEach(checkSSL);
}, 24 * 60 * 60 * 1000); // Every 24 hours


//for /test
const args = process.argv.slice(2);
if (args[0] === '/test' && args[1] && args[2]) {
    const testDomain = args[1];

    console.log(`Running test for domain: ${testDomain}`);
    checkSSL(testDomain);
}