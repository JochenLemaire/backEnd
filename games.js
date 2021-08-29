const connection = require('./connection');

const get = async () =>
    await new Promise((resolve, reject) => {
        connection.query(
            "SELECT * FROM games",
            (err, res) => {
                return err || res.length === 0
                    ? reject({ error: "Cannot retrieve games" })
                    : resolve(res);
            }
        );
    });

const getById = async (id) =>
    await new Promise((resolve, reject) => {
        connection.query(
            "SELECT * FROM games WHERE id = ? LIMIT 1",
            [id],
            (err, game) => {
                if (err) {
                    return reject({ error: `Cannot store gamee: ${err.message}` });
                } else if (game.length === 0) {
                    return reject();
                }
                return resolve(game[0])
            }
        );
    });

const getCreator = async (id) =>
    await new Promise((resolve, reject) => {
        connection.query(
            "SELECT created_by FROM games WHERE id = ? LIMIT 1",
            [id],
            (err, games) => {
                if (err) {
                    return reject();
                } else if (games.length === 0) {
                    return reject();
                }
                return resolve(games[0].created_by)
            }
        );
    });

const create = async ({ name, description, image = null }, userId) =>
    await new Promise((resolve, reject) => {
        connection.query(
            "INSERT INTO games VALUES (NULL, ?, ?, ?, ?)",
            [name, description, image, userId],
            (err, game) => {
                if (err || game.length === 0) {
                    console.log(err);
                    return reject({ error: `Cannot store game: ${err.message}` });
                }
                return resolve(game.insertId);
            }
        );
    });

const update = async (
    { name, description, image },
    gameId) =>
    await new Promise((resolve, reject) => {
        connection.query(
            "UPDATE games SET name = ?, description = ?, image = ? WHERE id = ?",
            [name, description, preparationTime, image, gameId],
            (err, res) => {
                return err || res.length === 0
                    ? reject({ error: `Cannot update game: ${err.message}` })
                    : resolve(res);
            }
        );
    });


const destroy = async (gameId) =>
    await new Promise((resolve, reject) => {
        connection.query(
            "DELETE FROM games WHERE id = ?",
            [gameId],
            (err, res) => {
                return err || res.affectedRows === 0 ? reject() : resolve(res);
            }
        );
    });



module.exports = { get, getById, create, update, destroy, getCreator };