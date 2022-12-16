const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const port = 8080;
const host = '0.0.0.0';
const f = '/public/';

const con = mysql.createConnection({
    host,
    user: 'root',
    password: '',
    database: 'bookhandler'
});

// Connect to the MySQL database.
con.connect(err => {
    if (err) throw err;
    console.log('Connected to DB.');
});

// Configure Express
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('css'));

// Find user
app.all('/user/:id/:op?', (req, res, next) => {
    con.query('SELECT * FROM users WHERE username=?', req.params.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.user = res[0];
        else req.user = null;

        if (req.user) next();
        else next(new Error('Could not find user ' + req.params.id));
    });
});

// View user page
app.get('/user/:id', (req, res) => {
    res.status(202).sendFile(path.join(__dirname, `${f}user.html`));
    // console.log(req.user);
    // res.status(202).send(req.user.username + ': ' + req.user.firstname + ' ' + req.user.lastname);
});

// Homepage
app.get('/', (req, res) => res.status(202).sendFile(path.join(__dirname, `${f}index.html`)));

app.post('/', (req, response) => {
    console.log(req.body.tes);

    con.query('SELECT * FROM users WHERE username=?', req.body.tes, (err, res) => {
        if (err) throw err;
        console.log(res);
        if (res.length > 0) response.redirect('/user/' + req.body.tes);
    });
});

// Ajax
app.get('/ajax/user', (req, response) => {
    console.log(req.query.id);

    con.query('SELECT * FROM users WHERE username=?', req.query.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.user = res[0];
        else req.user = null;

        if (req.user) response.send(req.user);
    });
});

// Nothing to route.
app.get('*', (req, res) => res.status(404).send('Page not found'));

// Start server
app.listen(port, host, () => {
    console.log(`Listening on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
});








// const client_path = `${__dirname}\\public`;
// app.use(express.static(client_path, {
//     extensions: [ 'html' ]
// }));

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });