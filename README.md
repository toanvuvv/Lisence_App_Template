# Electron License App

Ứng dụng Electron với tính năng xác thực license tích hợp.

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình server URL và secret key
Chỉnh sửa file `src/main.js`:
```javascript
const licenseManager = new LicenseManager({
    serverUrl: 'http://localhost:8000', // Thay đổi URL server của bạn
    secretKey: 'your-secret-key-here' // Thay đổi secret key
});
```

### 3. Chạy ứng dụng
```bash
npm start
```

## 📋 Tính năng

- **Device Fingerprinting**: Tạo Device ID duy nhất từ thông tin phần cứng
- **License Activation**: Kích hoạt license với license key
- **Offline Mode**: Hoạt động offline với cache được mã hóa
- **Auto Validation**: Kiểm tra license định kỳ mỗi 30 phút
- **Secure Cache**: Cache license được mã hóa với device ID

## 🔧 Cấu trúc thư mục

```
electron-license-app/
├── src/
│   ├── main.js              # Main process
│   ├── utils/
│   │   ├── device-info.js   # Device fingerprinting
│   │   └── crypto-utils.js  # Encryption utilities
│   └── renderer/
│       ├── index.html       # UI
│       ├── app.js           # Renderer process
│       └── license.js       # License management
├── package.json
└── README.md
```

## 🛡️ Bảo mật

1. **Secret Key**: Thay đổi secret key trong production
2. **HTTPS**: Sử dụng HTTPS cho tất cả communication
3. **Device ID**: Không expose device ID trong logs
4. **Cache**: Cache được mã hóa với device ID
5. **Validation**: Kiểm tra license định kỳ

## 📱 Workflow

1. **App khởi động** → Kiểm tra license
2. **License không valid** → Hiển thị form nhập license
3. **Nhập license key** → Kích hoạt license
4. **License valid** → Hiển thị app content
5. **Validation định kỳ** → Kiểm tra license mỗi 30 phút

## 🔧 Build cho Production

```bash
npm run build
```

## 🐛 Troubleshooting

### Common Issues:
1. **Device ID không khớp**: Kiểm tra secret key
2. **Activation failed**: Kiểm tra license key format
3. **Network error**: Implement offline mode
4. **Cache corruption**: Clear cache và reactivate

### Debug Commands:
```bash
# Kiểm tra device ID
node -e "const DeviceInfo = require('./src/utils/device-info'); console.log(DeviceInfo.generateDeviceId('your-secret-key'));"

# Kiểm tra cache
ls -la ~/.license_cache/
```

## 📝 Lưu ý

- Thay đổi `serverUrl` và `secretKey` trong code để match với server của bạn
- Đảm bảo license server đang chạy và có thể truy cập
- Test kỹ tính năng offline mode
