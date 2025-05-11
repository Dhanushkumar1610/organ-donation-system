const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Connect to local MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Rootpass@123', // Replace with your actual MySQL root password
    database: 'organ_donation',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.log('Cannot connect to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Middleware to check if user is logged in as admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login.html?error=Please login as admin');
};

// Middleware to check if user is logged in as doctor
const checkDoctor = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'doctor') {
        return next();
    }
    res.redirect('/doctor-login.html?error=Please login as doctor');
};

// Middleware to check if user is logged in (any role)
const checkUser = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login.html?error=Please login to access this page');
};

// Handle form submission for donor registration
app.post('/api/donors', (req, res) => {
    const { name, age, blood_type, organ, contact } = req.body;
    const query = 'INSERT INTO donors (name, age, blood_type, organ, contact) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [name, age, blood_type, organ, contact], (err) => {
        if (err) {
            console.log('Error saving donor:', err);
            res.redirect('/user.html?error=Error saving donor');
            return;
        }
        res.redirect('/user.html?success=Donor registered successfully');
    });
});

// Route to get all donors with search functionality
app.get('/api/donors', (req, res) => {
    const search = req.query.search || '';
    const query = 'SELECT * FROM donors WHERE name LIKE ? OR organ LIKE ?';
    const searchParam = `%${search}%`;
    db.query(query, [searchParam, searchParam], (err, results) => {
        if (err) {
            console.log('Error fetching donors:', err);
            res.status(500).json({ error: 'Error fetching donors' });
            return;
        }
        res.json(results);
    });
});

// Handle user registration
app.post('/register-user', (req, res) => {
    const { username, password } = req.body;
    const query = 'INSERT INTO users (username, password, role) VALUES (?, ?, "user")';
    db.query(query, [username, password], (err) => {
        if (err) {
            console.log('Error registering user:', err);
            res.redirect('/register-user.html?error=Username already exists');
            return;
        }
        res.redirect('/register-user.html?success=User registered successfully');
    });
});

// Handle login for users (admin or user)
app.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?';
    db.query(query, [username, password, role], (err, results) => {
        if (err) {
            console.log('Error during login:', err);
            res.status(500).send('Error during login');
            return;
        }
        if (results.length > 0) {
            req.session.user = { username: username, role: role };
            if (role === 'admin') {
                res.redirect('/admin.html');
            } else if (role === 'user') {
                res.redirect('/user.html?success=Logged in successfully');
            }
        } else {
            res.redirect('/login.html?error=Invalid username, password, or role');
        }
    });
});

// Handle login for doctors
app.post('/doctor-login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ? AND role = "doctor"';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.log('Error during doctor login:', err);
            res.status(500).send('Error during login');
            return;
        }
        if (results.length > 0) {
            req.session.user = { username: username, role: 'doctor' };
            res.redirect('/doctor.html');
        } else {
            res.redirect('/doctor-login.html?error=Invalid username or password');
        }
    });
});

// Route to get logged-in user info
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Protect admin page
app.get('/admin.html', checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Protect doctor page
app.get('/doctor.html', checkDoctor, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doctor.html'));
});

// Protect user page
app.get('/user.html', checkUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html?success=Logged out successfully');
});

// Default route
app.get('/', (req, res) => {
    res.redirect('/register.html');
});

// Start the server locally
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
