const tls = require("tls");
const net = require("net");
const { CommandsList } = require("./CommandsList");

const COMMANDS = {
    HELO: "HELO",
    EHLO: "EHLO",
    AUTH: { PLAIN: "AUTH PLAIN", LOGIN: "AUTH LOGIN" },
    MAIL_FROM: "MAIL FROM",
    RCPT_TO: "RCPT TO",
    DATA: "DATA"
}

const execFunctions = {
    [COMMANDS.EHLO]: (domain) => `${commands.EHLO} ${domain}\r\n`,
    HELO: (domain) => `${commands.HELO} ${domain}\r\n`,
    AUTH: {
        LOGIN: () => `${commands.AUTH.LOGIN} \r\n`,
        PLAIN: () => `${commands.AUTH.LOGIN} \r\n`
    },
    MAIL_TO: (sender) => `MAIL FROM: ${sender}\r\n`,
    RCPT_TO: (recipient) => `RCPT TO ${recipient}\r\n`,
    DATA: (data, subject, contentType = "text/plain") =>
        `From: 
        To:
        Subject: ${subject}
        Mime-Version: 1.0
        Content-Type: ${contentType}; charset=us-ascii
        
        ${data}
        .`,
    QUIT: () => `QUIT`
};

// const order = [];

const codes = {
    ServiceReady: "220",
    RequestOK: "250"
}

// const socket = tls.connect(465, "smtp.gmail.com", { rejectUnauthorized: false }, () => {
//     console.log('Socket connected');
// process.stdin.pipe(socket);
// process.stdin.resume();
// });

class MailClient {

    constructor({ port, server, tls }) {
        this.port = port;
        this.server = server;
        this.tls = tls;
        //this.commandsList = new CommandsList();
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                let socket;
                if (!this.tls) {
                    socket = net.connect(this.port, this.server, () => {
                        resolve(socket);
                    });
                }
                else {
                    socket = tls.connect(this.port, this.server, { rejectUnauthorized: false }, () => {
                        resolve(socket);
                    });
                }
            }
            catch (e) {
                reject(e);
            }
        });
    }

    async sendMail({ domain, user, mail }) {
        const socket = await this.connect();
        socket.setEncoding("utf-8");
        let current;

        socket.on("data", (data) => {
            const message = data.toString();
            const [code, server] = message.split(" ");
            console.log(message);

            switch (code) {
                case codes.ServiceReady:
                    socket.write(execFunctions.EHLO(domain));
                    current = commands.EHLO;
                    break;

                case codes.RequestOK:
                    switch (current) {
                        case commands.EHLO:
                            socket.write(execFunctions.AUTH.LOGIN());
                            current = commands.AUTH.LOGIN;
                            break;
                        
                        case commands.AUTH.LOGIN:
                            socket.write();

                        default: break;
                    }
                    break;

                default: break;
            }
        });
    }
}

// socket.setEncoding("utf-8");

// socket.on("data", (data) => {
//     console.log(data);
// });

// socket.on("end", () => {
//     console.log("Ended");
// });

const client = new MailClient({ server: "smtp.gmail.com", port: 465, tls: true });
client.sendMail({ domain: "localhost", user: "borov", mail: "dyadyavaleras@gmail.com" });