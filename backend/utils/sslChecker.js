import tls from "tls";

/**
 * Retrieve detailed SSL certificate information for a domain.
 * @param {string} domain - The target domain to check SSL for.
 * @returns {Promise<Object>} - SSL certificate details.
 */
export async function checkSSL(domain) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(443, domain, { servername: domain }, () => {
            const cert = socket.getPeerCertificate();

            if (!cert || Object.keys(cert).length === 0) {
                reject("No SSL certificate found.");
            }

            resolve({
                domain,
                validFrom: cert.valid_from, // Start date
                validTo: cert.valid_to, // Expiry date
                valid: cert.valid_to ? new Date(cert.valid_to) > new Date() : false, // Is it still valid?

                // Issuer details
                issuer: {
                    organization: cert.issuer.O || "Unknown",
                    commonName: cert.issuer.CN || "Unknown",
                    country: cert.issuer.C || "Unknown",
                    locality: cert.issuer.L || "Unknown",
                    state: cert.issuer.ST || "Unknown",
                },

                // Subject details (Who the cert was issued for)
                subject: {
                    organization: cert.subject.O || "Unknown",
                    commonName: cert.subject.CN || "Unknown",
                    country: cert.subject.C || "Unknown",
                    locality: cert.subject.L || "Unknown",
                    state: cert.subject.ST || "Unknown",
                    alternativeNames: cert.subjectaltname
                        ? cert.subjectaltname.split(", ")
                        : [],
                },

                // Certificate details
                serialNumber: cert.serialNumber,
                fingerprintSHA256: cert.fingerprint256,
                fingerprintSHA1: cert.fingerprint,
                fingerprintMD5: cert.fingerprintMD5 || "Unavailable",

                // Public key info
                publicKey: {
                    algorithm: cert.pubkeyAlgorithm || "Unknown",
                    bitSize: cert.bits || "Unknown",
                },

                // Extensions & Key Usage
                keyUsage: cert.keyUsage || [],
                extensions: cert.extensions || {},

                // Signature Algorithm
                signatureAlgorithm: cert.sigalg || "Unknown",
            });

            socket.end();
        });

        socket.on("error", (err) => {
            reject(`SSL Check Error: ${err.message}`);
        });
    });
}
