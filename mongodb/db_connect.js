const mongoose = require('mongoose');
const config = require('../config/config');
const MONGODB_URI = config.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    writeConcern: {
        w: 1
    }
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
});


const userSchema = new mongoose.Schema(
    
    {
    
    chatId: {
        type: String,
        index: true,  
    },

    userName: {
        type: String
    }
});

const agentSchema = new mongoose.Schema(
    {
    
        chatId: {
            type: String,
            index: true,  
        },
    
        userName: {
            type: String
        },
    
        tier: {
            type: Number,
        },
    
        agentType: {
            type: String,
        },

        available: {
            type: Boolean
        },

        banned: {
            type: Boolean
        },
    
        agents: { type: Array }
    }

);

const vendorSchema = new mongoose.Schema(
    
    {
    
    chatId: {
        type: String,
        index: true,  
    },

    userName: {
        type: String
    },

    businessName: {
        type: String
    },

    banned: {
        type: Boolean
    },

    vendors: { type: Array }

});

const chatLogSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    logs: { type: Array, required: true }
});

const User = mongoose.model('user', userSchema);
const Agent = mongoose.model('agent', agentSchema);
const Vendor = mongoose.model('vendor', vendorSchema);
const ChatLog = mongoose.model('chatLog', chatLogSchema);

process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

module.exports = { User, Agent, Vendor, ChatLog }