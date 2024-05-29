const mongoose = require('mongoose');
const { Schema } = mongoose;

const updationSchema = new Schema({
  article_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  author_id: {
    type: mongoose.Types.ObjectId,
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
  body: {
    type: String,
    required: true,
  },
  created_time: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'pending', // pending, approved, rejected
  }
});

const Updation = mongoose.model('Updation', updationSchema);

module.exports = Updation;