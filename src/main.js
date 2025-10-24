const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const LicenseManager = require('./renderer/license');

// Khởi tạo License Manager
const licenseManager = new LicenseManager({
    serverUrl: 'http://127.0.0.1:8000', // Thay đổi URL server của bạn
    secretKey: 'Vuductoan02' // Thay đổi secret key
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    mainWindow.loadFile('src/renderer/index.html');
    
    // Mở DevTools trong development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

// Kiểm tra license khi app khởi động
async function checkLicenseOnStartup() {
    console.log('Checking license on startup...');
    const isValid = await licenseManager.validate(false); // Sử dụng cache trước
    
    if (!isValid) {
        console.log('License invalid, showing form...');
        // Không hiển thị dialog, để renderer process xử lý
        mainWindow.webContents.send('show-license-form');
    } else {
        console.log('License is valid, starting application...');
        
        // Check server trong background để đảm bảo license vẫn active
        setTimeout(async () => {
            console.log('Checking server for license status...');
            const serverValid = await licenseManager.validate(true);
            if (!serverValid) {
                console.log('License revoked on server, showing form...');
                mainWindow.webContents.send('show-license-form');
            }
        }, 2000); // Check sau 2 giây
    }
}

// Hiển thị dialog nhập license
function showLicenseDialog() {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'License Required',
        message: 'Please enter your license key to continue.',
        detail: `Device ID: ${licenseManager.getDeviceId()}\n\nSend this Device ID to your administrator to get a license key.`,
        buttons: ['Enter License Key', 'Exit'],
        defaultId: 0
    }).then((result) => {
        if (result.response === 0) {
            // Hiển thị form nhập license
            mainWindow.webContents.send('show-license-form');
        } else {
            app.quit();
        }
    });
}

// IPC handlers
ipcMain.handle('get-device-id', () => {
    return licenseManager.getDeviceId();
});

ipcMain.handle('activate-license', async (event, licenseKey) => {
    const success = await licenseManager.activate(licenseKey);
    return success;
});

ipcMain.handle('validate-license', async () => {
    const isValid = await licenseManager.validate();
    return isValid;
});

ipcMain.handle('get-license-info', () => {
    return licenseManager.getLicenseInfo();
});

ipcMain.handle('deactivate-license', async () => {
    const success = await licenseManager.deactivate();
    return success;
});

ipcMain.handle('force-validate-license', async () => {
    const isValid = await licenseManager.forceValidation();
    return isValid;
});

ipcMain.handle('clear-cache-and-validate', async () => {
    const isValid = await licenseManager.clearCacheAndValidate();
    return isValid;
});

// App event handlers
app.whenReady().then(() => {
    createWindow();
    
    // Kiểm tra license sau khi window được tạo
    setTimeout(checkLicenseOnStartup, 1000);
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Kiểm tra license định kỳ (mỗi 30 phút)
setInterval(async () => {
    const isValid = await licenseManager.validate(true); // Force online check
    if (!isValid) {
        // License không valid, hiển thị warning
        mainWindow.webContents.send('license-invalid');
    }
}, 30 * 60 * 1000); // 30 phút

// Kiểm tra license định kỳ (mỗi 5 phút) - check nhẹ hơn
setInterval(async () => {
    try {
        await licenseManager.validate(true); // Force online check
    } catch (error) {
        // Ignore network errors
    }
}, 5 * 60 * 1000); // 5 phút

// Xử lý khi license bị revoke
ipcMain.on('license-revoked', () => {
    console.log('License has been revoked, closing application...');
    dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'License Revoked',
        message: 'Your license has been revoked by the administrator.',
        detail: 'The application will now close.',
        buttons: ['OK']
    }).then(() => {
        app.quit();
    });
});

// Xử lý exit app
ipcMain.on('exit-app', () => {
    app.quit();
});
