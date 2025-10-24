const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

class DeviceInfo {
    /**
     * Lấy MAC address của network interface chính
     */
    static getMacAddress() {
        try {
            const networkInterfaces = os.networkInterfaces();
            
            // Tìm interface không phải internal
            for (const [name, interfaces] of Object.entries(networkInterfaces)) {
                for (const iface of interfaces) {
                    if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                        return iface.mac;
                    }
                }
            }
            
            return '00:00:00:00:00:00';
        } catch (error) {
            return '00:00:00:00:00:00';
        }
    }
    
    /**
     * Lấy CPU ID
     */
    static getCpuId() {
        try {
            if (process.platform === 'win32') {
                // Windows - lấy CPU ID từ WMI
                const result = execSync('wmic cpu get ProcessorId /value', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                const lines = result.split('\n');
                for (const line of lines) {
                    if (line.includes('ProcessorId') && line.includes('=')) {
                        return line.split('=')[1].trim();
                    }
                }
            } else if (process.platform === 'linux') {
                // Linux - lấy CPU ID từ /proc/cpuinfo
                try {
                    const fs = require('fs');
                    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                    const lines = cpuinfo.split('\n');
                    for (const line of lines) {
                        if (line.includes('Serial') && line.includes(':')) {
                            return line.split(':')[1].trim();
                        }
                    }
                } catch (error) {
                    // Fallback
                }
            } else if (process.platform === 'darwin') {
                // macOS - lấy CPU info
                const result = execSync('sysctl -n machdep.cpu.brand_string', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                return result.trim();
            }
        } catch (error) {
            // Fallback
        }
        
        return os.cpus()[0]?.model || 'unknown';
    }
    
    /**
     * Lấy disk serial number
     */
    static getDiskSerial() {
        try {
            if (process.platform === 'win32') {
                // Windows - lấy disk serial từ WMI
                const result = execSync('wmic diskdrive get SerialNumber /value', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                const lines = result.split('\n');
                for (const line of lines) {
                    if (line.includes('SerialNumber') && line.includes('=')) {
                        const serial = line.split('=')[1].trim();
                        if (serial && serial !== 'None') {
                            return serial;
                        }
                    }
                }
            } else if (process.platform === 'linux') {
                // Linux - lấy disk serial từ /dev/disk/by-id/
                try {
                    const result = execSync('ls -la /dev/disk/by-id/', { 
                        encoding: 'utf8', 
                        timeout: 10000 
                    });
                    const lines = result.split('\n');
                    for (const line of lines) {
                        if (line.includes('ata-') && !line.includes('part')) {
                            const parts = line.trim().split(/\s+/);
                            return parts[parts.length - 1];
                        }
                    }
                } catch (error) {
                    // Fallback
                }
            } else if (process.platform === 'darwin') {
                // macOS - lấy disk serial
                const result = execSync('system_profiler SPStorageDataType', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                const lines = result.split('\n');
                for (const line of lines) {
                    if (line.includes('Serial Number') && line.includes(':')) {
                        return line.split(':')[1].trim();
                    }
                }
            }
        } catch (error) {
            // Fallback
        }
        
        // Fallback - sử dụng total memory làm disk identifier
        return os.totalmem().toString();
    }
    
    /**
     * Lấy motherboard serial number
     */
    static getMotherboardSerial() {
        try {
            if (process.platform === 'win32') {
                // Windows - lấy motherboard serial từ WMI
                const result = execSync('wmic baseboard get SerialNumber /value', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                const lines = result.split('\n');
                for (const line of lines) {
                    if (line.includes('SerialNumber') && line.includes('=')) {
                        const serial = line.split('=')[1].trim();
                        if (serial && serial !== 'None') {
                            return serial;
                        }
                    }
                }
            } else if (process.platform === 'linux') {
                // Linux - lấy motherboard serial từ DMI
                try {
                    const fs = require('fs');
                    const boardSerial = fs.readFileSync('/sys/class/dmi/id/board_serial', 'utf8');
                    return boardSerial.trim();
                } catch (error) {
                    // Fallback
                }
            } else if (process.platform === 'darwin') {
                // macOS - lấy motherboard serial
                const result = execSync('system_profiler SPHardwareDataType', { 
                    encoding: 'utf8', 
                    timeout: 10000 
                });
                const lines = result.split('\n');
                for (const line of lines) {
                    if (line.includes('Serial Number') && line.includes(':')) {
                        return line.split(':')[1].trim();
                    }
                }
            }
        } catch (error) {
            // Fallback
        }
        
        return 'unknown';
    }
    
    /**
     * Tạo Device ID duy nhất từ thông tin phần cứng
     */
    static generateDeviceId(secretKey) {
        // Thu thập thông tin phần cứng
        const macAddress = DeviceInfo.getMacAddress();
        const cpuId = DeviceInfo.getCpuId();
        const diskSerial = DeviceInfo.getDiskSerial();
        const motherboardSerial = DeviceInfo.getMotherboardSerial();
        
        // Kết hợp thông tin phần cứng
        const hwInfo = `${macAddress}:${cpuId}:${diskSerial}:${motherboardSerial}`;
        
        // Tạo HMAC-SHA256 hash
        const deviceId = crypto.createHmac('sha256', secretKey).update(hwInfo).digest('hex');
        
        return deviceId;
    }
    
    /**
     * Lấy thông tin thiết bị cho activation
     */
    static getDeviceInfo() {
        return {
            hostname: os.hostname(),
            os: `${os.type()} ${os.release()}`,
            architecture: os.arch(),
            platform: os.platform(),
            nodeVersion: process.version,
            cpuCount: os.cpus().length,
            memoryTotal: os.totalmem(),
            uptime: os.uptime(),
            macAddress: DeviceInfo.getMacAddress(),
            cpuId: DeviceInfo.getCpuId(),
            diskSerial: DeviceInfo.getDiskSerial(),
            motherboardSerial: DeviceInfo.getMotherboardSerial()
        };
    }
}

module.exports = DeviceInfo;
