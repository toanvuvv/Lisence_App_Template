const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // License management
    getDeviceId: () => ipcRenderer.invoke('get-device-id'),
    activateLicense: (licenseKey) => ipcRenderer.invoke('activate-license', licenseKey),
    validateLicense: () => ipcRenderer.invoke('validate-license'),
    getLicenseInfo: () => ipcRenderer.invoke('get-license-info'),
    deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
    forceValidateLicense: () => ipcRenderer.invoke('force-validate-license'),
    clearCacheAndValidate: () => ipcRenderer.invoke('clear-cache-and-validate'),
    
    // Event listeners
    onShowLicenseForm: (callback) => ipcRenderer.on('show-license-form', callback),
    onLicenseInvalid: (callback) => ipcRenderer.on('license-invalid', callback),
    onLicenseRevoked: (callback) => ipcRenderer.on('license-revoked', callback),
    
    // App control
    exitApp: () => ipcRenderer.send('exit-app'),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Security: Prevent the renderer from accessing Node.js APIs
window.addEventListener('DOMContentLoaded', () => {
    // Remove any potential access to Node.js APIs
    delete window.require;
    delete window.exports;
    delete window.module;
});
