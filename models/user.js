// models/user.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    contact_no: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    admin: {
        type: Boolean,
        required: true,
    },
    verified: {
        type: Boolean,
        required: true,
    },
    status: {
        type: Boolean,
        required: true,
    },
    sex: {
        type: String,
        required: false,
    },
    bio: {
        type: String,
        required: false,
    },
    address: {
        address_line_one: {
            type: String,
            required: false,
        },
        addressline_two: {
            type: String,
            required: false,
        },
        country: {
            type: String,
            required: false,
        },
        state: {
            type: String,
            required: false,
        },
        city: {
            type: String,
            required: false,
        },
        zip_code: {
            type: String,
            required: false,
        },
    },
    dob: {
        day: {
            type: Number,
            required: false,
        },
        month: {
            type: Number,
            required: false,
        },
        year: {
            type: Number,
            required: false,
        }
    },
    interests: {
        type: [String],
        required: false,
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
