/**
 * Security configuration for Electron License App
 */

const securityConfig = {
    // Rate limiting settings
    rateLimiting: {
        maxAttempts: 5,
        timeWindow: 5 * 60 * 1000, // 5 minutes
        maxValidationsPerHour: 20
    },
    
    // Cache settings
    cache: {
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
        gracePeriod: 1 * 24 * 60 * 60 * 1000, // 1 day
        maxSize: 10 * 1024 * 1024 // 10MB
    },
    
    // Network settings
    network: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000 // 1 second
    },
    
    // Security headers
    securityHeaders: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:8000;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    
    // Encryption settings
    encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        iterations: 100000,
        keyLength: 32
    },
    
    // Validation settings
    validation: {
        checkInterval: 5 * 60 * 1000, // 5 minutes
        backgroundCheckInterval: 30 * 60 * 1000, // 30 minutes
        offlineGracePeriod: 3 * 24 * 60 * 60 * 1000 // 3 days
    }
};

module.exports = securityConfig;
