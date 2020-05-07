const { ipcRenderer } = require("electron");

document
    .querySelector(".credentials-form")
    .addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const smtp = {
            server: document.getElementById("smtp-server").value,
            port: document.getElementById("smtp-port").value,
            tls: document.getElementById("smtp-ssl").checked
        };
        const pop = {
            server: document.getElementById("pop-server").value,
            port: document.getElementById("pop-port").value,
            tls: document.getElementById("pop-ssl").checked
        }
        ipcRenderer.send("save", { email, password, smtp, pop });
    });

ipcRenderer.on("retriveCreds", (event, creds) => {
    const { smtp, pop, email, password } = creds;
    document.getElementById("email").value = email;
    document.getElementById("password").value = password;
    document.getElementById("smtp-port").value = smtp.port;
    document.getElementById("smtp-server").value = smtp.server;
    document.getElementById("smtp-ssl").value = smtp.ssl;
    document.getElementById("pop-port").value = pop.port;
    document.getElementById("pop-server").value = pop.server;
    document.getElementById("pop-ssl").value = pop.ssl;
});