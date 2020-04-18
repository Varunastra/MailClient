const tls = require("tls");

const socket = tls.connect(995, "pop.gmail.com", { rejectUnauthorized: false }, () => {
    console.log('Socket connected');
    process.stdin.pipe(socket);
    process.stdin.resume();
});

socket.setEncoding("utf-8");

socket.on("data", (data) => {
    console.log(data);
});

socket.on("end", () => {
    console.log("Ended");
});