const tls = require("tls");
const { EventEmitter } = require("events");
const { simpleParser } = require("mailparser");

const STATUS = {
    ok: "+OK",
    error: "-ERR",
};

class PopClient extends EventEmitter {
    constructor({ port, server, tls, login, password }) {
        super();
        this.port = port;
        this.server = server;
        this.tls = tls;
        this.login = login;
        this.password = password;
        this.messagesIds = [];
        this.difference = [];
        this.messages = [];
        this.messagesIndex = 1;
        this.current = "USER";
    }

    stop() {
        try {
            this.socket.destroy();
        } catch (e) {}
    }

    writeCommand(command) {
        this.socket.write(`${command}\r\n`);
    }

    parseList(chunks) {
        const lines = chunks.split("\r\n");
        lines.splice(0, 1);
        this.messagesIds = lines.map((line) => {
            const [index, id] = line.split(" ");
            return { index, id };
        });
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

    isEndOfMessage = (message) => {
        return !!message
            .split("\r\n")
            .filter((line) => line.includes(".") && line.length === 1)
            .length;
    };

    evalDifference = (set1, set2) => {
        return [...set1].filter((x) => !set2.has(x.id));
    };

    retriveNextMessage() {
        this.current = "READ_MESSAGE";
        const { index } = this.difference[this.messagesIndex++];
        if (this.messagesIndex <= this.difference.length) {
            this.writeCommand(`RETR ${index}`);
        } else {
            this.socket.destroy();
        }
    }

    async getMails(existingIds = []) {
        await this.connect();
        this.current = "USER";
        this.socket.setEncoding("utf-8");
        let chunks = "";

        this.socket.on("data", (data) => {
            const message = data.toString();
            console.log(data);

            switch (this.current) {
                case "USER":
                    this.writeCommand(`USER ${this.login}`);
                    this.current = "PASSWORD";
                    break;
                case "PASSWORD":
                    this.writeCommand(`PASS ${this.password}`);
                    this.current = "UIDL";
                    break;
                case "LIST":
                    this.writeCommand(`LIST`);
                    this.current = "UIDL";
                    break;
                case "UIDL":
                    this.writeCommand(`UIDL`);
                    this.current = "PARSE_LIST";
                    break;
                case "PARSE_LIST":
                    chunks += message;
                    if (this.isEndOfMessage(message)) {
                        this.parseList(chunks);
                        this.difference = this.evalDifference(
                            new Set(this.messagesIds),
                            new Set(existingIds)
                        );
                        console.log(this.difference);
                        chunks = "";
                        this.retriveNextMessage();
                    }
                    break;
                case "READ_MESSAGE":
                    chunks += message;
                    if (this.isEndOfMessage(message)) {
                        simpleParser(chunks)
                            .then((parsed) => {
                                parsed.id = this.difference[
                                    this.messagesIndex
                                ].id;
                                this.emit("message", parsed);
                                chunks = "";
                                this.retriveNextMessage();
                            })
                            .catch((e) => this.emit("error", e));
                    }
                    break;
                default:
                    break;
            }
        });
    }
}

module.exports = { PopClient };
