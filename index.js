const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
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
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'changeThisInProduction'
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('css'));

// Find user
app.all('/user/:id/:op?', (req, res, next) => {
    con.query('SELECT * FROM users WHERE username=?', req.params.id, (err, res) => {
        if (err) throw err;
        
        if (res.length > 0) req.user = res[0];
        else req.user = null;

        console.log(req.user);

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

// Edit user page
app.get('/user/:id/edit', (req, res) => {
    if (req.session.username != req.params.id) return res.redirect('/user/' + req.params.id);
    res.status(202).sendFile(path.join(__dirname, `${f}edit.html`));
});

// Homepage
app.get('/', (req, res) => res.status(202).sendFile(path.join(__dirname, `${f}index.html`)));

// Signin
app.post('/signin', (req, res) => {
    console.log(req.body.username);
    console.log(req.body.pass);

    con.query('SELECT * FROM users WHERE username=? AND password=?', [req.body.username, req.body.password], (err, result) => {
        if (err) throw err;
        if (!result.length) return res.redirect('/');
        req.session.username = req.body.username;
        res.redirect(`/user/${req.body.username}/`);
    });
});

// Signup
app.post('/signup', (req, response) => {
    con.query('SELECT * FROM users WHERE username=?', req.body.username, (err, res) => {
        if (err) throw err;

        req.session.errors = {};
        let error = false;
        
        if (res.length) error = req.session.errors.alreadyExists = true;

        if (req.body.password !== req.body.repassword) error = req.session.errors.passDoNotMatch = true;
        
        if (error) return response.redirect('/');

        con.query('INSERT INTO users (username, password) VALUES (?,?)', [req.body.username, req.body.password], (err, result) => {
            if (err) throw err;
            // req.session.response = `User: ${req.body.username} was created successfully.`;
            req.session.username = req.body.username;
            response.redirect(`/user/${req.body.username}/`);
        });
    });
});

// Update Firstname
app.post('/updatefirstname', (req, res) => {
    con.query('UPDATE users SET firstname=? WHERE username=?', [req.body.firstname, req.session.username], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Update Lastname
app.post('/updatelastname', (req, res) => {
    con.query('UPDATE users SET lastname=? WHERE username=?', [req.body.lastname, req.session.username], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Signout
app.get('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Ajax
app.get('/ajax/signerrors', (req, res) => {
    res.send(req.session);
});

app.get('/ajax/signedin', (req, res) => {
    res.send(req.session.username);
});
app.get('/ajax/user', (req, response) => {
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