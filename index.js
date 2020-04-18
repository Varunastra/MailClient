const tls = require("tls");

const socket = tls.connect(465, "smtp.gmail.com", {}, () => {
    console.log('socket connected',
    socket.authorized ? 'authorized' : 'unauthorized');
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