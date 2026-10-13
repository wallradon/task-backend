require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./modules/user');

app.use(express.json());
app.use(cors());

require('./db');

const Task = require('./modules/Task');
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;

// API to register a user
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Hash the password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            username: username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(400).json({ message: 'User already exists or invalid information', error: err.message });
    }
});

// API to login and create a JWT token
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find the user in the database
        const user = await User.findOne({ username: username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 2. Check if the password matches the stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Incorrect password' });

        // 3. Create a JWT token
        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ message: 'Login successful!', token: token });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    // 1. Get token from the Authorization header
    const authHeader = req.headers['authorization'];

    // 2. Get the token after Bearer
    const token = authHeader && authHeader.split(' ')[1];

    // 3. If there is no token, reject the request
    if (!token) return res.status(401).json({ message: 'No token provided' });

    // 4. Verify token with secret key
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        // 5. If token is invalid, reject the request
        if (err) return res.status(403).json({ message: 'Token is invalid or expired' });

        // 6. Save user data to req.user
        req.user = decoded;
        next();
    });
};

app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'System error', error: err.message });
    }
});

app.post('/tasks', async (req, res) => {
    try {
        const newTask = new Task({
            title: req.body.title,
            priority: req.body.priority
        });
        await newTask.save();
        res.status(201).json({ message: 'Task saved successfully', task: newTask });
    } catch (err) {
        res.status(400).json({ message: 'Incorrect information', error: err.message });
    }
});

app.put('/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.completed = !task.completed;

        // Save the updated task to the database
        await task.save();

        res.json({ message: 'Task status updated successfully', task: task });
    } catch (err) {
        res.status(500).json({ message: 'Invalid ID or server error' });
    }
});

app.delete('/tasks/:id', verifyToken, async (req, res) => {
    try {
        // Find and delete the task by ID
        const deletedTask = await Task.findByIdAndDelete(req.params.id);

        if (!deletedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Invalid ID or server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});