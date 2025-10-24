const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CryptoUtils {
    /**
     * Tạo encryption key từ device ID
     */
    static deriveKeyFromDeviceId(deviceId) {
        return crypto.createHash('sha256').update(deviceId).digest();
    }
    
    /**
     * Mã hóa data bằng AES-256
     */
    static encryptData(data, key) {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    
    /**
     * Giải mã data bằng AES-256
     */
    static decryptData(encryptedData, key) {
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
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
