const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
require('dotenv').config();
const games = require('./games');
const users = require('./users');
const auth0 = require('./auth0');
const cors = require('cors');


const options = {
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    credentials: true,
}

const { PORT = 5000 } = process.env;

const checkJwt = jwt({
    //Signing key providen
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    }),
    //Audience & issuer validaten
    audience: `${process.env.AUTH0_AUDIENCE}`,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,

    algorithms: ["RS256"],
});

app.use(express.json());

app.use((req, res, next) => {
    res.format({
        "application/json": () => next(),
        default: () => res.status(406).end(),
    });
});


app.param("gameId", (req, res, next, id) => {
    req.id = id;
    next();
});

app.param("userId", (req, res, next, id) => {
    req.userId = id;
    next();
});

/*ROOT*/

app.options("/", cors({ ...options, methods: "OPTIONS, GET" }));

app.get('/', cors(options), (req, res) => { res.send("backend for software security") });

app.all("/", (req, res) => {
    res.set("Allow", "GET, OPTIONS");
    res.status(405).end();
})

/*MIDDLEWARE*/
const getById = (req, res, next) => {
    if (req.user) {
        users.getId(req.user).then((user_id) => {
            req.caller_id = user_id;
            next();
        }).catch(err => res.status(400).end());
    } else {
        res.status(403).end();
    }
};

const isOwner = (req, res, next) => {
    if (req.userId && req.userId == req.caller_id) {
        next();
    } else if (req.id) {
        games
            .getCreator(req.id)
            .then((owner_id) => {
                if (owner_id === req.caller_id) {
                    next();
                } else {
                    res.status(403).end();
                }
            })
            .catch((err) => res.status(404).end());
    } else {
        res.status(403).end();
    }
};

const isOwnerOrAdmin = (req, res, next) => {
    users.isAdmin(req.caller_id).then((isAdmin) => {
        if (!isAdmin) {
            games
                .getCreator(req.id)
                .then((owner_id) => {
                    if (owner_id === req.caller_id) {
                        next();
                    } else {
                        res.status(403).end();
                    }
                })
                .catch(() => res.status(404).end());
        } else {
            next();
        }
    }).catch(err => res.status(400).end());

};

const isAdmin = (req, res, next) => {
    req.isAdmin = true;
    users.isAdmin(req.caller_id).then((isAdmin) => {
        req.isAdmin = isAdmin;
        next();
    });
};


/*GAMES*/

app.options("/games", cors({ ...options, methods: "GET, POST, OPTIONS" }));

app.get('/games', cors(options), (req, res) => {
    games.get().then(result => res.send(result)).catch(err => res.status(404).end());
})

app.post("/games", cors({ ...options, exposedHeaders: "Location" }), checkJwt, getById, isAdmin, (req, res) => {
    if (!req.isAdmin) {
        games.create(req.body, req.caller_id).then((gameId) => res.status(201).location(`/games/${gameId}`).send())
            .catch((err) => res.status(400).end())
    } else {
        res.status(403).end();
    }
})

app.all("/games", (req, res) => {
    res.set("Allow", "GET, POST, OPTIONS");
    res.status(405).end();
})

app.options("/games/:gameId", cors({ ...options, methods: "GET, PUT, DELETE, OPTIONS" }));


app.get('/games/:gameId', cors(options), (req, res) => {
    games.getById(req.id).then(result => res.send(result)).catch(err => res.status(404).end());
})

app.put("/games/:gameId", cors(options), checkJwt, getById, isOwner, (req, res) => {
    games.update(req.body, req.id).then((result) => res.status(200).end())
        .catch((err) => res.status(404).end())
})

app.delete("/games/:gameId", checkJwt, cors(options), getById, isOwnerOrAdmin, (req, res) => {
    games.destroy(req.id).then((result) => res.end()).catch((err) => res.status(400).end());
})

app.all("/games/:gameId", (req, res) => {
    res.set("Allow", "GET, PUT, OPTIONS, DELETE");
    res.status(405).end();
})

/*USERS*/

app.options("/user", cors({ ...options, methods: "GET, OPTIONS" }));


app.get('/user', cors(options), checkJwt, (req, res) => {
    users.getById(undefined, req.user).then(result => res.send(result)).catch(err => res.status(404).end());
})

app.all("/user", (req, res) => {
    res.set("Allow", "GET, OPTIONS");
    res.status(405).end();
})

app.options("/getUserData", cors({ ...options, methods: "GET, OPTIONS" }));


app.get('/getUserData', cors(options), checkJwt, (req, res) => {
    users.getById(undefined, req.user)
        .then(result => auth0.getUser(req.user)
            .then(authRes => res.send({ ...result, authData: authRes }))
            .catch(authErr => res.send(result)))
        .catch(err => res.status(404).end());
})

app.all("/getUserData", (req, res) => {
    res.set("Allow", "GET, OPTIONS");
    res.status(405).end();
})

app.options("/users", cors({ ...options, methods: "OPTIONS, POST" }));


app.post('/users', cors(options), checkJwt, (req, res) => {
    users.create(req.user)
        .then(result => res.status(201).location(`/users/${res}`).send())
        .catch(err => res.status(400).end());
})

app.all("/users", (req, res) => {
    res.set("Allow", "POST, OPTIONS");
    res.status(405).end();
})

app.options("/users/:userId", cors({ ...options, methods: "OPTIONS, DELETE" }));


app.delete('/users/:userId', cors(options), checkJwt, getById, isOwner, (req, res) => {
    users.destroy(req.caller_id)
        .then(result => {
            auth0.deleteUser(req.user).then(res => res.send()).catch(err => res.end());
        })
        .catch(err => res.status(400).end());
})

app.all("/users/:userId", (req, res) => {
    res.set("Allow", "DELETE, OPTIONS");
    res.status(405).end();
})


app.listen(PORT, () => console.log(`Server started on port ${PORT}`));