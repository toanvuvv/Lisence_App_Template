const axios = require('axios');
const path = require('path');
const os = require('os');
const DeviceInfo = require('../utils/device-info');
const CryptoUtils = require('../utils/crypto-utils');

class LicenseManager {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl?.replace(/\/$/, '') || '';
        this.secretKey = options.secretKey || '';
        this.cacheDir = options.cacheDir || path.join(os.homedir(), '.license_cache');
        this.cacheFile = path.join(this.cacheDir, 'license_cache.dat');
        
        // Tạo cache directory nếu chưa có
        if (!require('fs').existsSync(this.cacheDir)) {
            require('fs').mkdirSync(this.cacheDir, { recursive: true });
        }
        
        // Tạo device ID
        this.deviceId = DeviceInfo.generateDeviceId(this.secretKey);
        
        // License data
        this.licenseData = null;
        this.activationToken = null;
        this.isActivated = false;
        
        // Load cached license data
        this._loadCachedLicense();
    }
    
    /**
     * Lấy device ID để gửi cho admin
     */
    getDeviceId() {
        return this.deviceId;
    }
    
    /**
     * Lấy thông tin thiết bị
     */
    getDeviceInfo() {
        return DeviceInfo.getDeviceInfo();
    }
    
    /**
     * Kích hoạt license với license key
     */
    async activate(licenseKey) {
        try {
            // Chuẩn bị activation request
            const deviceInfo = this.getDeviceInfo();
            
            const payload = {
                license_key: licenseKey,
                device_id: this.deviceId,
                device_info: deviceInfo
            };
            
            console.log('Activation payload:', JSON.stringify(payload, null, 2));
            console.log('Server URL:', this.serverUrl);
            
            // Gửi activation request
            const response = await axios.post(`${this.serverUrl}/api/activate`, payload);
            
            console.log('Activation response:', response.data);
            
            if (response.data.status === 'success') {
                // Lưu activation data
                this.activationToken = response.data.activation_token;
                this.licenseData = response.data.license_info;
                this.isActivated = true;
                
                // Lưu vào cache
                this._saveLicenseCache();
                
                return true;
            } else {
                console.error('Activation failed:', response.data.message || 'Unknown error');
                return false;
            }
        } catch (error) {
            console.error('Activation error:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            return false;
        }
    }
    
    /**
     * Validate license (heartbeat check)
     */
    async validate(forceOnline = false) {
        try {
            // Kiểm tra cache trước (trừ khi force online)
            if (!forceOnline && this.licenseData) {
                const cacheValid = CryptoUtils.isCacheValid(this.licenseData, 3); // 3 ngày grace period
                if (cacheValid) {
                    // Kiểm tra license có hết hạn local không
                    if (!CryptoUtils.isLicenseExpired(this.licenseData)) {
                        console.log('Using cached license data');
                        
                        // Nếu cache cũ hơn 1 giờ, thử check server trong background
                        const lastValidation = new Date(this.licenseData.last_validation || 0);
                        const now = new Date();
                        const hoursSinceValidation = (now - lastValidation) / (1000 * 60 * 60);
                        
                        if (hoursSinceValidation > 1) {
                            console.log('Cache is old, checking server in background...');
                            this._checkServerInBackground();
                        }
                        
                        return true;
                    } else {
                        console.log('License has expired');
                        return false;
                    }
                }
            }
            
            // Cần validation online
            if (!this.isActivated || !this.activationToken) {
                console.log('License not activated');
                return false;
            }
            
            // Gửi validation request
            const payload = {
                device_id: this.deviceId,
                app_version: '1.0.0' // Có thể customize
            };
            
            const headers = {
                'Authorization': `Bearer ${this.activationToken}`
            };
            
            const response = await axios.post(`${this.serverUrl}/api/validate`, payload, { headers });
            
            if (response.data.status === 'valid') {
                // Cập nhật license data
                this.licenseData = {
                    ...this.licenseData,
                    expire_date: response.data.expire_date,
                    last_validation: new Date().toISOString()
                };
                
                // Lưu updated cache
                this._saveLicenseCache();
                return true;
            } else {
                console.log(`License validation failed: ${response.data.message || 'Unknown error'}`);
                // Clear license data nếu server báo invalid
                this._clearLicenseData();
                // Emit event để main process xử lý
                if (typeof window !== 'undefined' && window.require) {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send('license-revoked');
                }
                return false;
            }
        } catch (error) {
            console.error('Network error during validation:', error.message);
            // Nếu offline và cache valid, cho phép sử dụng
            if (this.licenseData && CryptoUtils.isCacheValid(this.licenseData, 3)) {
                console.log('Using cached license data (offline mode)');
                return true;
            }
            return false;
        }
    }
    
    /**
     * Kiểm tra license có valid không (convenience method)
     */
    async isValid() {
        return await this.validate();
    }
    
    /**
     * Lấy thông tin license
     */
    getLicenseInfo() {
        if (!this.isActivated) {
            return null;
        }
        
        return {
            license_key: this.licenseData?.license_key,
            expire_date: this.licenseData?.expire_date,
            max_devices: this.licenseData?.max_devices || 1,
            type: this.licenseData?.type || 'unknown',
            last_validation: this.licenseData?.last_validation,
            device_id: this.deviceId
        };
    }
    
    /**
     * Deactivate license trên thiết bị này
     */
    async deactivate() {
        try {
            if (!this.isActivated) {
                return true; // Đã deactivate rồi
            }
            
            const response = await axios.post(`${this.serverUrl}/api/deactivate`, {
                device_id: this.deviceId
            });
            
            if (response.data.status === 'success') {
                // Clear local data
                this._clearLicenseData();
                return true;
            } else {
                console.error('Deactivation failed:', response.data.message || 'Unknown error');
                return false;
            }
        } catch (error) {
            console.error('Deactivation error:', error.message);
            return false;
        }
    }
    
    /**
     * Load cached license data
     */
    _loadCachedLicense() {
        try {
            const cachedData = CryptoUtils.loadEncryptedCache(this.deviceId, this.cacheFile);
            if (cachedData && CryptoUtils.isCacheValid(cachedData)) {
                this.licenseData = cachedData;
                this.isActivated = true;
                // Note: activation_token không được cache vì lý do bảo mật
            }
        } catch (error) {
            // Ignore cache loading errors
        }
    }
    
    /**
     * Lưu license data vào encrypted cache
     */
    _saveLicenseCache() {
        if (this.licenseData) {
            CryptoUtils.saveEncryptedCache(this.licenseData, this.deviceId, this.cacheFile);
        }
    }
    
    /**
     * Clear tất cả license data
     */
    _clearLicenseData() {
        this.licenseData = null;
        this.activationToken = null;
        this.isActivated = false;
        
        // Xóa cache file
        try {
            if (require('fs').existsSync(this.cacheFile)) {
                require('fs').unlinkSync(this.cacheFile);
            }
        } catch (error) {
            // Ignore file removal errors
        }
    }
    
    /**
     * Force validation - luôn kiểm tra server
     */
    async forceValidation() {
        console.log('Force validation - checking server...');
        return await this.validate(true);
    }
    
    /**
     * Clear cache và force re-validation
     */
    async clearCacheAndValidate() {
        console.log('Clearing cache and re-validating...');
        this._clearLicenseData();
        return await this.validate(true);
    }
    
    /**
     * Check server trong background (không block UI)
     */
    async _checkServerInBackground() {
        try {
            if (!this.isActivated || !this.activationToken) {
                return;
            }
            
            const payload = {
                device_id: this.deviceId,
                app_version: '1.0.0'
            };
            
            const headers = {
                'Authorization': `Bearer ${this.activationToken}`
            };
            
            const response = await axios.post(`${this.serverUrl}/api/validate`, payload, { headers });
            
            if (response.data.status === 'valid') {
                // Cập nhật cache với thông tin mới
                this.licenseData = {
                    ...this.licenseData,
                    expire_date: response.data.expire_date,
                    last_validation: new Date().toISOString()
                };
                this._saveLicenseCache();
                console.log('Background validation successful');
            } else {
                console.log('Background validation failed - license may be revoked');
                // Clear license data và thông báo user
                this._clearLicenseData();
                // Emit event để main process xử lý
                if (typeof window !== 'undefined' && window.require) {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send('license-revoked');
                }
            }
        } catch (error) {
            console.log('Background validation error:', error.message);
            // Không làm gì khi offline
        }
    }
}

module.exports = LicenseManager;
