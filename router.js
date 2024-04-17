const express = require('express');
const router = express.Router();
const pgPromise = require('pg-promise');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

const pgp = pgPromise();
const db = pgp('postgres://myuser:0000@localhost:5432/productsdb'); // Replace with your DB connection string

router.use(express.json());

db.connect()
    .then(obj => {
        console.log('Connected to PostgreSQL database');
    })
    .catch(error => {
        console.error('Error connecting to PostgreSQL database:', error);
    });

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save images in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Filename is timestamp-originalfilename
    }
});
const upload = multer({ storage: storage });

// Configure nodemailer with SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', // Change this to your SMTP server hostname
    port: 587, // Change this to your SMTP server port
    secure: false, // Change to true if your SMTP server requires SSL/TLS
    auth: {
        user: 'arthur.walter0@ethereal.email', // Change this to your email address
        pass: 'TmfZEUV14ue1b7MwmK' // Change this to your email password
    },
});

// Function to send registration email with OTP
async function sendRegistrationEmail(userEmail, userName, otp) {
    const mailOptions = {
        from: 'arthur.walter0@ethereal.email',
        to: userEmail,
        subject: 'Registration Confirmation',
        text: `Hello ${userName},\n\nThank you for registering! Your OTP is: ${otp}\n\nBest regards,\nYour App`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Registration email sent successfully.');
    } catch (error) {
        console.error('Error sending registration email:', error);
    }
}

// Register user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Save OTP and user details in database
        const insertQuery = 'INSERT INTO users (username, email, password, otp) VALUES ($1, $2, $3, $4)';
        await db.none(insertQuery, [username, email, password, otp]);

        // Send registration email with OTP
        await sendRegistrationEmail(email, username, otp);

        res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user.' });
    }
});

// Verify OTP and complete registration
router.post('/verify', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Verify OTP
        const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1 AND otp = $2', [email, otp]);

        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // Update user status as verified
        const updateQuery = 'UPDATE users SET verified = true WHERE email = $1';
        await db.none(updateQuery, [email]);

        res.status(200).json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error verifying email.' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        res.status(200).json({ message: 'Login successful.', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Create user
router.post('/user/add', upload.single('image'), async (req, res) => {
    try {
        // Add code to insert user details into database and save image filename
        res.status(201).json({ message: 'User created successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user.' });
    }
});

module.exports = router;
