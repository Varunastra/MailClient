const { StateMachine } = require("javascript-state-machine");

const fsm = new StateMachine({
    init: "AUTH",
    transitions: [
        { name: "authorize", from: "AUTH", to: "MESSAGE" },
        { name: "setRecipient", from: "MESSAGE", to: "SET_REPICIENT" },
        { name: "setFrom", from: "" }
    ]
});

module.exports = { fsm };