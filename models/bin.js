const mongoose = require('mongoose');
const { Schema } = mongoose;

const articleSchema = new Schema({
    _id: {
        type: String,
        required: true,
    },
    author_id: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    created_time: {
        type: String,
        default: Date.now,
    },
    views: {
        type: Number,
        required: true,
    },
    endpoint: {
        type: String,
        require: true,
    },
    updated_at: {
        type: String,
        default: Date.now,
    }
});

const ArticleBin = mongoose.model('ArticleBin', articleSchema);

module.exports = ArticleBin;
