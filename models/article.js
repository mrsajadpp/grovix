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
    impressions: {
        type: Number,
        default: 0,
    },
    country_views: {
        type: Map,
        of: Number,
        default: {},
    },
    endpoint: {
        type: String,
        required: true,
    },
    updated_at: {
        type: String,
        default: Date.now,
    },
    custom: {
        type: String,
        required: false,
    },
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
