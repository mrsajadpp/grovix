const mongoose = require('mongoose');
const { Schema } = mongoose;

const codeSchema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    created_time: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: Boolean,
        require: true,
    },
});

const Page = mongoose.model('RecoveryPage', codeSchema);

module.exports = Page;
