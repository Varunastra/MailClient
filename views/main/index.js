const { ipcRenderer } = require("electron");
const mail = document.querySelector(".mail");
const writeMail = document.querySelector(".write-mail");
const messageTable = document.getElementById("messages_table");
const outboxTable = document.getElementById("outbox_table");
const inboxBtn = document.querySelector(".inbox");
const outboxBtn = document.querySelector(".outbox");

let isFetching = false;
let inbox = [];
let timerId;
let currentWindow = "inbox";

const startTablesLoad = (interval = 500) => {
    timerId = setInterval(() => {
        document.getElementById("inbox_messages").innerHTML = "";
        inbox.sort((a, b) => b.time.getTime() - a.time.getTime());
        inbox.forEach((mail) =>
            document
                .getElementById("inbox_messages")
                .appendChild(inboxMessageTemplate(mail))
        );
    }, interval);
};

const setWindowDisplay = (name) => {
    messageTable.style.display = "none";
    outboxTable.style.display = "none";
    writeMail.style.display = "none";
    mail.style.display = "none";
    switch (name) {
        case "inbox":
            messageTable.style.display = "table";
            break;
        case "outbox":
            outboxTable.style.display = "table";
            break;
        case "writeMail":
            writeMail.style.display = "flex";
            break;
        case "mail":
            mail.style.display = "flex";
            break;
    }
};

outboxBtn.addEventListener("click", () => {
    setWindowDisplay("outbox");
});

inboxBtn.addEventListener("click", () => {
    setWindowDisplay("inbox");
});

mail.querySelector(".back").addEventListener("click", () => {
    setWindowDisplay(currentWindow);
});

writeMail.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = writeMail.querySelector("#body").value;
    const reciever = writeMail.querySelector("#reciever").value;
    const title = writeMail.querySelector("#title").value;
    ipcRenderer.send("sendMail", { message, title, reciever });
    setWindowDisplay(currentWindow);
});

document.getElementById("creds-btn").addEventListener("click", () => {
    ipcRenderer.send("creds");
});

document.getElementById("fetch-btn").addEventListener("click", () => {
    ipcRenderer.send("fetchMails");
    removeLoading = startTablesLoad();
    document.getElementById("stop-btn").style.display = "flex";
    document.getElementById("fetch-btn").style.display = "none";
});

document.getElementById("stop-btn").addEventListener("click", () => {
    ipcRenderer.send("stopMails");
    clearInterval(timerId);
    document.getElementById("fetch-btn").style.display = "flex";
    document.getElementById("stop-btn").style.display = "none";
});

document
    .getElementById("write-mail-btn")
    .addEventListener("click", () => {
        setWindowDisplay("writeMail");
    });

const formatDate = (date) => {
    const padTimeStart = (time) => (time <= 9 ? "0" + time : time);

    return (
        padTimeStart(date.getDate()) +
        "." +
        padTimeStart(date.getMonth() + 1) +
        "." +
        date.getFullYear() +
        " - " +
        padTimeStart(date.getHours()) +
        ":" +
        padTimeStart(date.getMinutes())
    );
};

const openMail = ({ title, time, sender, reciever, message }) => {
    setWindowDisplay("mail");
    mail.querySelector("#title").innerHTML = title;
    const doc = mail.querySelector("#message").contentWindow.document;
    doc.open();
    doc.write(message);
    doc.close();
    mail.querySelector("#time").innerHTML = formatDate(new Date(time));
    if (sender) {
        mail.querySelector("#sender").innerHTML = sender;
    }
    if (reciever) {
        mail.querySelector("#sender").innerHTML = reciever;
    }
};

const outboxMessageTemplate = ({ title, time, reciever, id }) => {
    const container = document.createElement("tr");
    container.classList.add("message");
    container.addEventListener("click", () => {
        ipcRenderer.send("message", { type: "outbox", id });
        outboxTable.style.display = "none";
        currentWindow = "outbox";
    });

    container.innerHTML = `
    <td class="title">
        <i class="material-icons">mail_outline</i>
        <span class="text">${title}<span>
    </td>
    <td class="date">
        ${formatDate(time)}
    </td>
    <td class="to">
        ${reciever}
    </td>
    `;
    return container;
};

const inboxMessageTemplate = ({ title, time, sender, id }) => {
    const container = document.createElement("tr");
    container.classList.add("message");
    container.addEventListener("click", () => {
        ipcRenderer.send("message", { id, type: "inbox" });
        messageTable.style.display = "none";
        currentWindow = "inbox";
    });
    container.innerHTML = `
        <td class="title">
            <i class="material-icons">mail_outline</i>
            <span class="text">${title}<span>
        </td>
        <td class="date">
            ${formatDate(time)}
        </td>
        <td class="from">
            ${sender}
        </td>
    `;
    return container;
};

ipcRenderer.on("loadInbox", (event, mails) => {
    const inboxMails = mails.map((mail) => ({
        ...mail,
        time: new Date(mail.time),
    }));
    inboxMails.forEach((mail) => {
        document
            .getElementById("inbox_messages")
            .appendChild(inboxMessageTemplate(mail));
    });
    inbox.push(...inboxMails);
});

ipcRenderer.on("loadOutbox", (event, mails) => {
    mails.forEach((mail) => {
        mail.time = new Date(mail.time);
        document
            .getElementById("outbox_messages")
            .appendChild(outboxMessageTemplate(mail));
    });
});

ipcRenderer.on("mail", (event, mail) => {
    try {
        const title = mail.headers.get("subject");
        const time = new Date(mail.headers.get("date"));
        const sender = mail.headers.get("from").text;
        const id = mail.id;
        inbox.push({ title, time, sender, id });
    } catch (e) {}
});

ipcRenderer.on("openMail", (event, mail) => {
    openMail(mail);
});

ipcRenderer.on("clear", () => {
    document.getElementById("outbox_messages").innerHTML = "";
    document.getElementById("inbox_messages").innerHTML = "";
    inbox = [];
});