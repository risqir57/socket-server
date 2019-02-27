const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
    'nik': String,
    'user': String,
    'message': String,
    'partner':String,
    'room':String,
    'created': Date,
    'sent': Date
})

module.exports = mongoose.model('message', MessageSchema);