class CommandsList {
    constructor() {
        this.list = [];
    }

    push(command) {
        this.list.push(command);
    }

    next() {
        this.current = this.list.shift();
    }

    push_back(command) {
        this.list.unshift(command);
    }
}