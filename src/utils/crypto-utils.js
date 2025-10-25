const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CryptoUtils {
    // Rate limiting storage
    static validationAttempts = new Map();
    static maxAttempts = 5;
    static timeWindow = 5 * 60 * 1000; // 5 minutes
    
    /**
     * Tạo encryption key từ device ID với PBKDF2 (an toàn hơn)
     */
    static deriveKeyFromDeviceId(deviceId) {
        const salt = crypto.createHash('sha256').update(deviceId).digest();
        return crypto.pbkdf2Sync(deviceId, salt, 100000, 32, 'sha256');
    }
    
    /**
     * Rate limiting cho validation attempts
     */
    static checkRateLimit(deviceId) {
        const now = Date.now();
        const attempts = this.validationAttempts.get(deviceId) || [];
        
        // Remove old attempts outside time window
        const validAttempts = attempts.filter(time => now - time < this.timeWindow);
        
        if (validAttempts.length >= this.maxAttempts) {
            return false; // Rate limited
        }
        
        // Add current attempt
        validAttempts.push(now);
        this.validationAttempts.set(deviceId, validAttempts);
        
        return true;
    }
    
    /**
     * Clear rate limit for device
     */
    static clearRateLimit(deviceId) {
        this.validationAttempts.delete(deviceId);
    }
    
    /**
     * Mã hóa data bằng AES-256-GCM (hiện đại và an toàn hơn)
     */
    static encryptData(data, key) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            // Return format: iv:authTag:encrypted
            return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    /**
     * Giải mã data bằng AES-256-GCM
     */
    static decryptData(encryptedData, key) {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    /**
     * Lưu license cache được mã hóa
     */
    static saveEncryptedCache(data, deviceId, cacheFile) {
        try {
            // Tạo key từ device ID
            const key = CryptoUtils.deriveKeyFromDeviceId(deviceId);
            
            // Mã hóa data
            const dataJson = JSON.stringify(data);
            const encryptedData = CryptoUtils.encryptData(dataJson, key);
            
            // Lưu vào file
            fs.writeFileSync(cacheFile, encryptedData);
            
            return true;
        } catch (error) {
            console.error('Error saving encrypted cache:', error);
            return false;
        }
    }
    
    /**
     * Load và giải mã license cache
     */
    static loadEncryptedCache(deviceId, cacheFile) {
        try {
            // Kiểm tra file cache có tồn tại không
            if (!fs.existsSync(cacheFile)) {
                return null;
            }
            
            // Tạo key từ device ID
            const key = CryptoUtils.deriveKeyFromDeviceId(deviceId);
            
            // Đọc và giải mã data
            const encryptedData = fs.readFileSync(cacheFile, 'utf8');
            const dataJson = CryptoUtils.decryptData(encryptedData, key);
            
            return JSON.parse(dataJson);
        } catch (error) {
            console.error('Error loading encrypted cache:', error);
            return null;
        }
    }
    
    /**
     * Kiểm tra cache có còn valid không
     */
    static isCacheValid(cacheData, gracePeriodDays = 3) {
        try {
            // Kiểm tra cache có các field cần thiết không
            if (!cacheData || !cacheData.last_validation) {
                return false;
            }
            
            // Parse thời gian validation cuối
            const lastValidation = new Date(cacheData.last_validation);
            const now = new Date();
            
            // Kiểm tra có trong grace period không
            const gracePeriod = gracePeriodDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
            return (now - lastValidation) < gracePeriod;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Kiểm tra license có hết hạn không
     */
    static isLicenseExpired(licenseData) {
        try {
            if (!licenseData.expire_date) {
                return false; // Không có ngày hết hạn (perpetual)
            }
            
            const expireDate = new Date(licenseData.expire_date);
            const now = new Date();
            
            return now > expireDate;
        } catch (error) {
            return true; // Nếu không parse được, coi như hết hạn để an toàn
        }
    }
}

module.exports = CryptoUtils;
