// models/ArticleDraft.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArticleDraftSchema = new Schema({
    author_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        default: ''
    },
    category: {
        parentKeyword: {
            type: String,
            default: ''
        },
        childKeyword: {
            type: String,
            default: ''
        }
    },
    last_saved: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ArticleDraft', ArticleDraftSchema);
