const { ipcRenderer } = require("electron");
let isFetchingMails = false;

document.getElementById("creds-btn").addEventListener("click", () => {
    ipcRenderer.send("creds");
});

document.getElementById("fetch-btn").addEventListener("click", () => {
    ipcRenderer.send("fetchMails");
});

document.getElementById("stop-btn").addEventListener("click", () => {
    ipcRenderer.send("stopMails");
});

const formatDate = (date) => {
    return (
        date.getDate() +
        "." +
        date.getMonth() +
        "." +
        date.getFullYear()
    );
};

const inboxMessageTemplate = ({ title, time, sender }) => `
    <tr class="message">
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
    </tr>
`;

ipcRenderer.on("loadInbox", (event, mails) => {
    document.getElementById("messages").innerHTML = mails
        .map((mail) => {
            mail.time = new Date(mail.time);
            return inboxMessageTemplate(mail);
        })
        .join("");
});

ipcRenderer.on("mail", (event, mail) => {
    const title = mail.headers.get("subject");
    const time = mail.headers.get("date");
    const sender = mail.headers.get("from").text;
    document.getElementById(
        "messages"
    ).innerHTML += inboxMessageTemplate({ title, time, sender });
});
