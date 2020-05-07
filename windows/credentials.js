const { BrowserWindow, ipcMain } = require("electron");
const store = require("../store");

const createCredentialsWindow = (mainWindow) => {
    const creds = store.get();

    let credentialsWindow = new BrowserWindow({
        width: 500,
        height: 280,
        resizable: false,
        parent: mainWindow,
        title: "Enter your credentials",
        webPreferences: {
            nodeIntegration: true,
        },
        show: false
    });

    credentialsWindow.removeMenu();

    credentialsWindow.loadFile(
        "./views/credentials/credentials.html"
    );

    credentialsWindow.webContents.on("did-finish-load", () => {
        credentialsWindow.webContents.send("retriveCreds", creds);
    });

    ipcMain.on("save", (event, creds) => {
        store.set(creds);
        credentialsWindow.close();
    });

    credentialsWindow.on("close", (event) => {
        credentialsWindow.hide();
        event.preventDefault();
    });

    return credentialsWindow;
};

module.exports = { createCredentialsWindow };
