const { BrowserWindow } = require("electron");

const createCredentialsWindow = (mainWindow) => {
    const credentialsWindow = new BrowserWindow({
        width: 500,
        height: 300,
        parent: mainWindow,
        title: "Enter your credentials",
    });

    credentialsWindow.removeMenu();

    credentialsWindow.loadFile("./views/credentials/credentials.html");
};

module.exports = { createCredentialsWindow };
