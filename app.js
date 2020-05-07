const { app, ipcMain, dialog, Notification } = require("electron");
const { createCredentialsWindow } = require("./windows/credentials");
const { createMainWindow } = require("./windows/main");
const { PopClient } = require("./utils/pop");
const { SmtpClient } = require("./utils/smtp");
const initKnex = require("./utils/knex");
const store = require("./store");

app.allowRendererProcessReuse = true;

app.on("ready", async () => {
    let mainWindow = createMainWindow();
    let credsWindow = createCredentialsWindow();
    const knex = await initKnex();

    const [user, domain] = store.get("email").split("@");
    const password = store.get("password");

    const popClient = new PopClient({
        port: store.get("pop.port"),
        server: store.get("pop.server"),
        tls: store.get("pop.tls"),
        login: user,
        password: password,
    });

    const smtpClient = new SmtpClient({
        server: store.get("smtp.server"),
        port: store.get("smtp.port"),
        domain: domain,
        tls: store.get("smtp.tls"),
        login: user,
        password: password,
        from: store.get("email"),
    });

    store.onDidAnyChange(async (newValue, oldValue) => {
        const [user, domain] = store.get("email").split("@");
        const password = store.get("password");

        await knex("inbox").truncate();
        await knex("outbox").truncate();
        mainWindow.webContents.send("clear");

        popClient.port = store.get("pop.port");
        popClient.server = store.get("pop.server");
        popClient.tls = store.get("pop.tls");
        popClient.login = user;
        popClient.password = password;

        smtpClient.server = store.get("smtp.server");
        smtpClient.port = store.get("smtp.port");
        smtpClient.domain = domain;
        smtpClient.tls = store.get("smtp.tls");
        smtpClient.login = user;
        smtpClient.password = password;
        smtpClient.from = store.get("email");
    });

    const inbox = await knex("inbox")
        .select()
        .orderBy("time", "desc");
    const outbox = await knex("outbox").select();

    mainWindow.webContents.on("did-finish-load", async () => {
        mainWindow.webContents.send("loadInbox", inbox);
        mainWindow.webContents.send("loadOutbox", outbox);
    });

    ipcMain.on("creds", () => {
        credsWindow.show();
    });

    ipcMain.on("fetchMails", async () => {
        try {
            const mailIds = await knex("inbox").pluck("id");
            await popClient.getMails(mailIds);
        } catch (e) {
            dialog.showErrorBox("POP3 Server Error", e.message);
        }
    });

    ipcMain.on("stopMails", () => {
        popClient.stop();
    });

    ipcMain.on("message", async (event, { id, type }) => {
        let message;
        if (type === "inbox") {
            message = await knex("inbox").where("id", id).first();
        } else {
            message = await knex("outbox").where("id", id).first();
        }
        mainWindow.webContents.send("openMail", message);
    });

    ipcMain.on("sendMail", async (event, mail) => {
        const { reciever, message, title } = mail;
        await knex("outbox").insert({ ...mail, time: Date.now() });
        try {
            await smtpClient.sendMail({
                to: reciever,
                mail: { body: message, title },
            });
            const outbox = await knex("outbox").select();
            const notification = new Notification({
                title: "Message sent",
                body: `You message to ${reciever} successfully sent`
            });
            notification.show();
            mainWindow.webContents.send("loadOutbox", outbox);
        } catch (e) {
            dialog.showErrorBox("SMTP Server Error", e.message);
        }
    });

    popClient.on("message", async (message) => {
        try {
            await knex("inbox").insert({
                id: message.id,
                title: message.headers.get("subject"),
                message: message.html,
                time: message.headers.get("date"),
                sender: message.headers.get("from").text,
            });
            mainWindow.webContents.send("mail", message);
        } catch (e) {}
    });

    mainWindow.on("close", () => {
        credsWindow.close();
        app.quit();
    });
});
