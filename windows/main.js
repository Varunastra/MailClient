const { BrowserWindow } = require("electron");

const createMainWindow = () => {
    const window = new BrowserWindow({
        title: "BVMail SMTP/POP Client",
        height: 800,
        width: 1280,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    window.removeMenu();

    window.loadFile("./views/main/index.html");

    return window;
};

module.exports = { createMainWindow };
