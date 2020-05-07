const knex = require("knex");
const path = require("path");

async function newKnex() {
    const knexConnection = knex({
        client: "sqlite3",
        connection: {
            filename: path.join(process.cwd(), "database.sqlite"),
        },
        useNullAsDefault: true,
    });

    const isInboxCreated = await knexConnection.schema.hasTable("inbox");
    if (!isInboxCreated) {
        await knexConnection.schema.createTable("inbox", (table) => {
            table.string("id").primary();
            table.string("title");
            table.string("message");
            table.string("sender");
            table.dateTime("time");
        });
    }

    const isOutboxCreated = await knexConnection.schema.hasTable("outbox");
    if (!isOutboxCreated) {
        await knexConnection.schema.createTable("outbox", (table) => {
            table.increments();
            table.string("title");
            table.string("message");
            table.string("reciever");
            table.dateTime("time");
        });
    }

    return knexConnection;
}

module.exports = newKnex;
