/**
 * Security test script for Electron License App
 */

const CryptoUtils = require('./crypto-utils');
const DeviceInfo = require('./device-info');

console.log('🔒 Running Security Tests...\n');

// Test 1: Encryption/Decryption
console.log('Test 1: Encryption/Decryption');
try {
    const testData = 'Test license data';
    const deviceId = 'test-device-id';
    const key = CryptoUtils.deriveKeyFromDeviceId(deviceId);
    
    const encrypted = CryptoUtils.encryptData(testData, key);
    const decrypted = CryptoUtils.decryptData(encrypted, key);
    
    if (decrypted === testData) {
        console.log('✅ Encryption/Decryption: PASS');
    } else {
        console.log('❌ Encryption/Decryption: FAIL');
    }
} catch (error) {
    console.log('❌ Encryption/Decryption: ERROR -', error.message);
}

// Test 2: Rate Limiting
console.log('\nTest 2: Rate Limiting');
try {
    const deviceId = 'test-device-2';
    
    // Test normal usage
    for (let i = 0; i < 3; i++) {
        const allowed = CryptoUtils.checkRateLimit(deviceId);
        if (!allowed) {
            console.log('❌ Rate Limiting: FAIL - Should allow 3 attempts');
            break;
        }
    }
    
    // Test rate limiting
    for (let i = 0; i < 3; i++) {
        const allowed = CryptoUtils.checkRateLimit(deviceId);
        if (!allowed) {
            console.log('✅ Rate Limiting: PASS - Correctly blocked after limit');
            break;
        }
    }
    
    // Clear and test again
    CryptoUtils.clearRateLimit(deviceId);
    const allowed = CryptoUtils.checkRateLimit(deviceId);
    if (allowed) {
        console.log('✅ Rate Limiting: PASS - Cleared correctly');
    } else {
        console.log('❌ Rate Limiting: FAIL - Clear not working');
    }
} catch (error) {
    console.log('❌ Rate Limiting: ERROR -', error.message);
}

// Test 3: Device ID Generation
console.log('\nTest 3: Device ID Generation');
try {
    const secretKey = 'test-secret-key';
    const deviceId1 = DeviceInfo.generateDeviceId(secretKey);
    const deviceId2 = DeviceInfo.generateDeviceId(secretKey);
    
    if (deviceId1 === deviceId2 && deviceId1.length === 64) {
        console.log('✅ Device ID Generation: PASS');
    } else {
        console.log('❌ Device ID Generation: FAIL');
    }
} catch (error) {
    console.log('❌ Device ID Generation: ERROR -', error.message);
}

// Test 4: Cache Validation
console.log('\nTest 4: Cache Validation');
try {
    const validCache = {
        last_validation: new Date().toISOString()
    };
    
    const expiredCache = {
        last_validation: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
    };
    
    const validResult = CryptoUtils.isCacheValid(validCache, 3);
    const expiredResult = CryptoUtils.isCacheValid(expiredCache, 3);
    
    if (validResult && !expiredResult) {
        console.log('✅ Cache Validation: PASS');
    } else {
        console.log('❌ Cache Validation: FAIL');
    }
} catch (error) {
    console.log('❌ Cache Validation: ERROR -', error.message);
}

console.log('\n🔒 Security Tests Completed!');
