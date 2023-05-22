const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const path = require('path');
const app = express();

const port = 8080;
const host = '0.0.0.0';
const f = '/public/';

const bookingCheckRate = 10;    // The rate at which the server checks for bookings elapsing past their due-week (in seconds).

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

app.get('/library/', (req, res) => {
    res.status(202).sendFile(path.join(__dirname, `${f}library.html`));
});

app.get('/book/:id', (req, res) => {
    res.status(202).sendFile(path.join(__dirname, `${f}book.html`));
});

app.get('/book/:id/borrow', (req, res) => {
    // if (!req.session.username) return;  // Error no session.
    res.status(202).sendFile(path.join(__dirname, `${f}booking.html`));
});

app.get('/entry/', (req, res) => {
    res.status(202).sendFile(path.join(__dirname, `${f}entry.html`));
});

app.get('/users/', (req, res) => {
    res.status(202).sendFile(path.join(__dirname, `${f}users.html`));
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
        req.session.userid = result[0].id;
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
            response.redirect(`/user/${req.body.username}`);
        });
    });
});

// Update Firstname
app.post('/updatefirstname', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    con.query('UPDATE users SET firstname=? WHERE username=?', [req.body.firstname, req.session.username], (err, result) => {
        if (err) throw err;
        res.redirect(`/user/${req.session.username}`);
    });
});

// Update Lastname
app.post('/updatelastname', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    con.query('UPDATE users SET lastname=? WHERE username=?', [req.body.lastname, req.session.username], (err, result) => {
        if (err) throw err;
        res.redirect(`/user/${req.session.username}`);
    });
});

// Create new author
app.post('/author', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    con.query('INSERT INTO authors (name) VALUES (?)', req.body.name, (err, result) => {
        if (err) throw err;
        return; // Success
    });
});

// Delete author
app.post('/deleteauthor', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    console.log(req.body);
    con.query('DELETE FROM authors WHERE name=?', req.body.name, (err, result) => {
        if (err) throw err;
        return; // Success
    });
});

// Create new entry
app.post('/entry', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    con.query('SELECT * FROM authors WHERE name=?', req.body.author, (err, result) => {
        if (err) throw err;
        if (!result) return res.redirect('/entry');    // No author found.
        con.query('INSERT INTO books (authorid, title, copies) VALUES (?,?,?)', [result[0].id, req.body.title, req.body.copies], (err, bookResult) => {
            if (err) throw err;
            return res.redirect(`/book/${bookResult.insertId}/`); // Success
        });
    })
});

app.post('/book/:id', (req, res) => {
    if (!req.session.username) return;  // Error no session.

    con.query('INSERT INTO bookings (userid, bookid, copies, borrowed, due, annotation) VALUES (?,?,?,?,?,?)', [req.session.userid, req.params.id, req.body.copies, req.body.startweek, req.body.dueweek, req.body.annotation], (err, result) => {
        if (err) throw err;
        return res.redirect(`/user/${req.session.username}`); // Success
    });
});

// Get an array of all authors
app.get('/authors', (req, res) => {
    con.query('SELECT * FROM authors', (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Get an array of all borrow entires for a specific book with bookid
app.get('/ajax/bookings', (req, response) => {
    con.query('SELECT * FROM bookings WHERE bookid=?', req.query.id, (err, res) => {
        if (err) throw err;
        
        if (res.length > 0) req.bookings = res;
        else req.bookings = null;
        
        response.send(req.bookings);
    });
});

// Get an array of all borrow entires for a specific book with username
app.get('/ajax/userbookings', (req, response) => {
    con.query('SELECT * FROM users WHERE username=?', req.query.id, (err, res) => {
        if (err) throw err;

        con.query('SELECT * FROM bookings WHERE userid=?', res[0].id, (err, res) => {
            if (err) throw err;
            
            if (res.length > 0) req.bookings = res;
            else req.bookings = null;
            
            response.send(req.bookings);
        });
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
// Get user by username
app.get('/ajax/user', (req, response) => {
    con.query('SELECT * FROM users WHERE username=?', req.query.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.user = res[0];
        else req.user = null;

        if (req.user) response.send(req.user);
    });
});
// Get user by id of user
app.get('/ajax/userid', (req, response) => {
    con.query('SELECT * FROM users WHERE id=?', req.query.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.user = res[0];
        else req.user = null;

        if (req.user) response.send(req.user);
    });
});
// Gets all users as an array
app.get('/ajax/users', (req, response) => {
    con.query('SELECT * FROM users', (err, res) => {
        if (err) throw err;
        
        if (res.length > 0) req.users = res;
        else req.users = null;
        
        response.send(req.users);
    });
});
app.get('/ajax/book', (req, response) => {
    con.query('SELECT * FROM books WHERE id=?', req.query.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.book = res[0];
        else req.book = null;

        if (req.book) response.send(req.book);
    });
});
// Gets all books as an array
app.get('/ajax/books', (req, response) => {
    con.query('SELECT * FROM books', (err, res) => {
        if (err) throw err;
        
        if (res.length > 0) req.books = res;
        else req.books = null;
        
        response.send(req.books);
    });
});

app.get('/ajax/author', (req, response) => {
    con.query('SELECT * FROM authors WHERE id=?', req.query.id, (err, res) => {
        if (err) throw err;

        if (res.length > 0) req.author = res[0];
        else req.author = null;

        if (req.author) response.send(req.author);
    });
});

// Nothing to route.
app.get('*', (req, res) => res.status(404).send(`Page not found. Return <a href="/">Home</a>?`));

// Start server
app.listen(port, host, () => {
    console.log(`Listening on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);

    // Start checking process for bookings to be automatically removed when the due week gets passed.
    setInterval(() => {
        // Get the current week using the ISO 8601 week number standard
        const currentWeek = getWeek(new Date());    // Pass in a Date object which corresponds to this iteration

        // Go through all bookings and check if the week has passed and if so remove the entry from the database
        con.query('SELECT * FROM bookings', (err, res) => {
            if (err) throw err;
            if (!res) return;

            for (let i = 0; i < res.length; i++) {
                const week = res[i].due.split('W')[1];  // The due-week
                
                if (week < currentWeek) {
                    con.query('DELETE FROM bookings WHERE id=?', res[0].id, (err, response) => {
                        if (err) throw err;

                        console.log(`The booking of ${res[0].bookid} was removed from the user: ${res[0].userid}`);
                    });
                }
            }
        });
    }, bookingCheckRate * 1000);    // In seconds
});



/***
 * ISO 8601 week number
*/
function getWeek(date) {
    const newYear = new Date(date.getFullYear(), 0, 1);
    let day = newYear.getDay() - 1;
    day = (day >= 0 ? day : day + 7);
    const daynum = Math.floor((date.getTime() - newYear.getTime() - (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
    if (day < 4) {
        const weeknum = Math.floor((daynum + day - 1) / 7) + 1;
        if (weeknum > 52) {
            const nYear = new Date(date.getFullYear() + 1, 0, 1);
            let nday = nYear.getDay() - 1;
            nday = nday >= 0 ? nday : nday + 7;

            return nday < 4 ? 1 : 53;
        }

        return weeknum;
    }
    else return Math.floor((daynum + day - 1) / 7);
}