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
    DATA: () => `DATA\n`,
    DATA_BODY: (
        data,
        subject,
        contentType = "text/plain",
        from,
        to
    ) =>
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
    InputReady: "354",
};

class SmtpClient {
    constructor({
        port,
        server,
        tls,
        login,
        password,
        domain,
        from,
    }) {
        this.port = port;
        this.server = server;
        this.tls = tls;
        this.login = login;
        this.password = password;
        this.domain = domain;
        this.from = from;
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
                            this.socket = socket;
                            resolve(socket);
                        }
                    );
                } else {
                    socket = tls.connect(
                        this.port,
                        this.server,
                        { rejectUnauthorized: false },
                        () => {
                            this.socket = socket;
                            resolve(socket);
                        }
                    );
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    async authorize() {
        await this.connect();
        this.socket.setEncoding("utf-8");

        let current;

        return new Promise((resolve, reject) => {
            const onDataRecieved = (data) => {
                const message = data.toString();
                const { code, description } = retriveMessageInfo(
                    message
                );

                switch (code) {
                    case CODES.ServiceReady:
                        this.socket.write(
                            execFunctions.EHLO(this.domain)
                        );
                        current = COMMANDS.EHLO;
                        break;
                    case CODES.RequestOK:
                        switch (current) {
                            case COMMANDS.EHLO:
                                this.socket.write(
                                    execFunctions.AUTH.LOGIN()
                                );
                                current = COMMANDS.AUTH.LOGIN;
                                break;
                        }
                        break;
                    case CODES.AuthRequest:
                        if (description === "VXNlcm5hbWU6") {
                            this.socket.write(
                                Buffer.from(this.login).toString(
                                    "base64"
                                ) + "\n"
                            );
                        } else if (description === "UGFzc3dvcmQ6") {
                            this.socket.write(
                                Buffer.from(this.password).toString(
                                    "base64"
                                ) + "\n"
                            );
                        }
                        break;
                    case CODES.AuthRequestReject:
                        reject(
                            new Error("Wrong username or password")
                        );
                        break;
                    case CODES.AuthSuccess:
                        resolve({ message: "Auth success" });
                        break;
                    default:
                        break;
                }
            };
            this.socket.on("data", onDataRecieved);
        });
    }

    async sendMail({ mail, to }) {
        await this.authorize();
        let current;

        current = COMMANDS.MAIL_FROM;
        this.socket.write(execFunctions.MAIL_FROM(this.from));

        return new Promise((resolve, reject) => {
            this.socket.on("data", (data) => {
                const message = data.toString();
                const { code } = retriveMessageInfo(message);

                switch (code) {
                    case CODES.ServiceReady:
                        this.socket.write(
                            execFunctions.EHLO(this.domain)
                        );
                        current = COMMANDS.EHLO;
                        break;

                    case CODES.RequestOK:
                        switch (current) {
                            case COMMANDS.MAIL_FROM:
                                this.socket.write(
                                    execFunctions.RCPT_TO(to)
                                );
                                current = COMMANDS.DATA;
                                break;

                            case COMMANDS.DATA:
                                this.socket.write(
                                    execFunctions.DATA()
                                );
                                break;

                            case COMMANDS.QUIT:
                                this.socket.write(
                                    execFunctions.QUIT()
                                );
                                resolve();
                                break;

                            default:
                                break;
                        }
                        break;

                    case CODES.InputReady:
                        const {
                            body,
                            title,
                            contentType = "text/plain",
                        } = mail;
                        this.socket.write(
                            execFunctions.DATA_BODY(
                                body,
                                title,
                                contentType,
                                this.from,
                                to
                            )
                        );
                        current = COMMANDS.QUIT;
                        break;

                    default:
                        break;
                }
            });
        });
    }
}

module.exports = { SmtpClient };
