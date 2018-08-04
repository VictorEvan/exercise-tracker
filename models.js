const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// log of exercise for each user
const logSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: String, default: new Date()}
});

// user schema containing log schema (parent-child)
const userSchema = new Schema({
  _id: {type: String, required: true},
  username: {type: String, required: true},
  log: [logSchema] // child
});

userSchema.pre('save', function(next){
  console.log('pre-save sort');
  this.log.sort((a,b)=>{
    return Date.parse(b.date) - Date.parse(a.date);
  });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports.User = User;