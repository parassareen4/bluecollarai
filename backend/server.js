const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: "dwdffshqd",
    api_key: "158173115974515",
    api_secret: "5ToDbwGd91ilrDSDYLCcFJaCe6Y"
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://parassareen:parassareen1@cluster0.qnxcu.mongodb.net/legalai';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));



// Simple admin check middleware
const isAdmin = (req, res, next) => {
    const adminKey = req.headers['admin-key'] || req.query.adminKey;
    if (adminKey === process.env.ADMIN_KEY || adminKey === 'adminSecretKey') {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
};

// Chat related variables
let messages = {};

const generateUniqueRoomId = () => {
    return `room-${Math.random().toString(36).substr(2, 9)}`;
};

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (id) => {
    const email = process.env.NOTIFICATION_EMAIL;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'New Client Connected',
        text: `A new client has connected on your GPT with socket ID: ${id}`
    };

    try {
        const info = await mailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.log('Error sending email:', error);
    }
};



// Socket.io Events
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    setImmediate(() => {
        sendEmail(socket.id);
    });

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room ${roomId}`);
        socket.broadcast.emit('userJoined', { roomId });
        io.emit('userJoined', { roomId });
    });

    socket.on("createRoom", (callback) => {
        const newRoomId = generateUniqueRoomId();
        callback(newRoomId);
    });

    socket.on('getMessages', (roomId) => {
        const roomMessages = messages[roomId] || [];
        socket.emit('chatHistory', roomMessages);
    });

    socket.on('question', async (data) => {
        const { roomId, msg, image } = data;
        messages[roomId] = messages[roomId] || [];
        
        let imageUrl = null;
        if (image) {
            try {
                const uploadResult = await cloudinary.uploader.upload(image, {
                    folder: 'chat_images',
                });
                imageUrl = uploadResult.secure_url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }
        
        const newMessage = { role: 'asker', message: msg, image: imageUrl };
        messages[roomId].push(newMessage);
        
        // Send to room participants
        io.to(roomId).emit('question', newMessage);
        io.to(roomId).emit('chatHistory', messages[roomId]);
        
        // Send to admin dashboard (global event with different name)
        io.emit('adminQuestion', { roomId, msg, image: imageUrl });
        
        // Send updated rooms list to all clients
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        io.emit('roomsList', roomsList);
    });

    socket.on('response', async (data) => {
        const { roomId, msg, image } = data;
        messages[roomId] = messages[roomId] || [];
        
        let imageUrl = null;
        if (image) {
            try {
                const uploadResult = await cloudinary.uploader.upload(image, {
                    folder: 'chat_images',
                });
                imageUrl = uploadResult.secure_url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
            }
        }
        
        const newMessage = { role: 'responder', message: msg, image: imageUrl };
        messages[roomId].push(newMessage);
        
        // Send to room participants
        io.to(roomId).emit('response', newMessage);
        io.to(roomId).emit('chatHistory', messages[roomId]);
        
        // Send to admin dashboard (global event with different name)
        io.emit('adminResponse', { roomId, msg, image: imageUrl });
        
        // Send updated rooms list to all clients
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        io.emit('roomsList', roomsList);
    });

    socket.on("typing", ({ roomId }) => {
        socket.to(roomId).emit("typing");
    });
      
    socket.on("stopTyping", ({ roomId }) => {
        socket.to(roomId).emit("stopTyping");
    });

    socket.on('deleteRoom', (roomId) => {
        console.log(`Received deleteRoom event for room: ${roomId}`);
        if (messages[roomId]) {
            console.log(`Deleting room from server: ${roomId}`);
            io.to(roomId).emit('roomDeleted', { roomId });
            io.emit('roomDeleted', { roomId }); // Also send globally for admin dashboard
            delete messages[roomId];
            
            // Send updated rooms list to all clients
            const roomsList = Object.keys(messages).map((roomId) => ({
                id: roomId,
                latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
            }));
            io.emit('roomsList', roomsList);
        } else {
            console.log(`Room not found: ${roomId}`);
        }
    });

    socket.on('getRooms', () => {
        const roomsList = Object.keys(messages).map((roomId) => ({
            id: roomId,
            latestMessage: messages[roomId][messages[roomId].length - 1]?.message || 'No messages yet'
        }));
        console.log('Sending rooms list:', roomsList);
        io.emit('roomsList', roomsList);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});