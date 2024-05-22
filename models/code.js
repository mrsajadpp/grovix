const mongoose = require('mongoose');
const { Schema } = mongoose;

const codeSchema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    verification_code: {
        type: Number,
        required: true,
    },
    created_time: {
        type: Date,
        default: Date.now,
    },
});

const Code = mongoose.model('Code', codeSchema);

module.exports = Code;
