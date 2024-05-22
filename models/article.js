const mongoose = require('mongoose');
const { Schema } = mongoose;

const articleSchema = new Schema({
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
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
