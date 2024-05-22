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
        type: Number,
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
        type: String,
        required: true,
    },
    address: {
        address_line_one: {
            type: String,
            required: true,
        },
        addressline_two: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        zip_code: {
            type: String,
            required: true,
        },
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
