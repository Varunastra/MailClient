const tls = require("tls");
const net = require("net");

const COMMANDS = {
    HELO: "HELO",
    EHLO: "EHLO",
    AUTH: { PLAIN: "AUTH PLAIN", LOGIN: "AUTH LOGIN" },
    MAIL_FROM: "MAIL FROM",
    RCPT_TO: "RCPT TO",
    DATA: "DATA",
};

const execFunctions = {
    [COMMANDS.EHLO]: (domain) => `${COMMANDS.EHLO} ${domain}\n`,
    [COMMANDS.HELO]: (domain) => `${COMMANDS.HELO} ${domain}\n`,
    AUTH: {
        LOGIN: () => `${COMMANDS.AUTH.LOGIN} \n`,
        PLAIN: () => `${COMMANDS.AUTH.PLAIN} \n`,
    },
    MAIL_FROM: (sender) => `MAIL FROM: <${sender}>\n`,
    RCPT_TO: (recipient) => `RCPT TO: <${recipient}>\n`,
    DATA: ()  => `DATA\n`,
    DATA_BODY: (data, subject, contentType = "text/plain", from, to) =>
        `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMime-Version: 1.0\r\nContent-Type: ${contentType}\r\n${data}\r\n.\r\n`,
    QUIT: () => `QUIT\r\n`,
};

const retriveMessageInfo = (message) => {
    const lines = message.split("\n");
    const [code, description] = lines[0].split(/-| /);
    return { code: code.trim(), description: description.trim() };
};

const CODES = {
    ServiceReady: "220",
    RequestOK: "250",
    AuthRequest: "334",
    AuthRequestReject: "535",
    AuthSuccess: "235",
    InputReady: "354"
};

class SmtpClient {
    constructor({ port, server, tls, login, password }) {
        this.port = port;
        this.server = server;
        this.tls = tls;
        this.login = login;
        this.password = password;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                let socket;
                if (!this.tls) {
                    socket = net.connect(
                        this.port,
                        this.server,
                        () => {
                            resolve(socket);
                        }
                    );
                } else {
                    socket = tls.connect(
                        this.port,
                        this.server,
                        { rejectUnauthorized: false },
                        () => {
                            resolve(socket);
                        }
                    );
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    async sendMail({ domain, mail, from, to }) {
        const socket = await this.connect();
        socket.setEncoding("utf-8");
        let current;

        socket.on("data", (data) => {
            const message = data.toString();
            const { code, description } = retriveMessageInfo(message);
            console.log(message);

            switch (code) {
                case CODES.ServiceReady:
                    socket.write(execFunctions.EHLO(domain));
                    current = COMMANDS.EHLO;
                    break;

                case CODES.RequestOK:
                    switch (current) {
                        case COMMANDS.EHLO:
                            socket.write(execFunctions.AUTH.LOGIN());
                            current = COMMANDS.AUTH.LOGIN;
                            break;
                        
                        case COMMANDS.MAIL_FROM:
                            socket.write(execFunctions.RCPT_TO(to));
                            current = COMMANDS.DATA;
                            break;

                        case COMMANDS.DATA:
                            socket.write(execFunctions.DATA());
                            break;

                        case COMMANDS.QUIT:
                            socket.write(execFunctions.QUIT());
                            break;

                        default:
                            break;
                    } 
                    break;

                case CODES.AuthRequest:
                    if (description === "VXNlcm5hbWU6") {
                        socket.write(
                            Buffer.from(this.login).toString("base64") + "\n"
                        );
                    }
                    else if (description === "UGFzc3dvcmQ6") {
                        socket.write(
                            Buffer.from(this.password).toString("base64") + "\n"
                        );
                    }
                    break;

                case CODES.InputReady:
                    const { body, title, contentType = "text/plain" } = mail;
                    socket.write(execFunctions.DATA_BODY(body, title, contentType, from, to));
                    current = COMMANDS.QUIT;
                    break;

                case CODES.AuthSuccess:
                    socket.write(execFunctions.MAIL_FROM(from));
                    current = COMMANDS.MAIL_FROM;
                    break;

                default:
                    break;
            }
        });
    }
}

const client = new SmtpClient({
    server: "smtp.gmail.com",
    port: 465,
    tls: true,
    login: "dyadyavaleras",
    password: "Vaal36484"
});
client.sendMail({
    domain: "gmail.com",
    from: "dyadyavaleras@gmail.com",
    to: "dyadyavaleras@gmail.com",
    mail: { body: "Roflan zdarova", title: "Simple message" }
});
