const { app, ipcMain } = require("electron");
const { createCredentialsWindow } = require("./windows/credentials");
const { createMainWindow } = require("./windows/main");
const { PopClient } = require("./utils/pop");
const path = require("path");
const knex = require("knex");

const knexConnection = knex({
    client: "sqlite3",
    connection: {
        filename: path.join(__dirname, "database.sqlite"),
    },
    useNullAsDefault: true,
});

app.allowRendererProcessReuse = true;

app.on("ready", async () => {
    const mainWindow = createMainWindow();

    const popClient = new PopClient({
        port: 995,
        server: "pop.gmail.com",
        tls: true,
        login: "dyadyavaleras",
        password: "Vaal36484",
    });

    await knexConnection.schema.createTableIfNotExists(
        "inbox",
        (table) => {
            table.string("id").primary();
            table.string("title");
            table.string("message");
            table.string("sender");
            table.dateTime("time");
        }
    );

    const mails = await knexConnection("inbox").select();

    mainWindow.webContents.on("did-finish-load", async () => {
        mainWindow.webContents.send("loadInbox", mails);
    });

    ipcMain.on("creds", () => {
        createCredentialsWindow(mainWindow);
    });

    ipcMain.on("fetchMails", async () => {
        const mailIds = await knexConnection("inbox").pluck("id");
        popClient.getMails(mailIds);
    });

    ipcMain.on("stopMails", () => {
        popClient.stop();
    });

    popClient.on("message", async (message) => {
        await knexConnection("inbox").insert({
            id: message.id,
            title: message.headers.get("subject"),
            message: message.html,
            time: message.headers.get("date"),
            sender: message.headers.get("from").text,
        });
        mainWindow.webContents.send("mail", message);
    });
});
