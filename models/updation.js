const mongoose = require('mongoose');
const { Schema } = mongoose;

const updationSchema = new Schema({
  article_id: {
    type: mongoose.Types.ObjectId,
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
    parentKeyword: {
      type: String,
      required: true,
    },
    childKeyword: {
      type: String,
      required: true,
    }
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
  updated_at: {
    type: String,
    default: Date.now,
  },
  custom: {
    type: String,
    required: false,
  },
  endpoint: {
    type: String,
    required: true,
  },
  new_thumb: {
    type: String,
    required: false,
  },
});

const Updation = mongoose.model('Updation', updationSchema);

module.exports = Updation;
