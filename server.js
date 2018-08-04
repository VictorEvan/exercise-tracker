const express = require('express')
const app = express()
const bodyParser = require('body-parser')
// for creating a unique ID
const crypto = require('crypto');

const cors = require('cors')

const mongoose = require('mongoose')

const { User } = require('./models');

mongoose.connect(process.env.MLAB_URI, {useMongoClient: true} || 'mongodb://localhost/exercise-track' )

const db = mongoose.connection;

// db.once("open", function(){
//   User.remove({}).exec();
//   console.log('db connection successful, db cleared');
// });

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// create new user
app.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  // check if username exists
  User
    .findOne({username: username})
    .exec(function(err, data){
      // if data exists, tell the user
      if (data) {
        console.log(`${data.username} already exists`);
        res.json({
          error: `${username} already exists`
        });
      // if data doesn't exist, create a user
      } else {
        console.log(`data does not exist, creating`);
        const newID = crypto.createHmac('sha256', username).digest('hex');
        const newUser = new User({
          _id: newID,
          username: username
        });
        newUser.save(function(err, data){
          if (err) console.error('err', err);
          res.json({
            username: data.username, 
            _id: data._id.slice(0, 9)
          });
        });
      }
    });
});

// add exercise log to existing user

app.post('/api/exercise/add', (req, res, next) => {
  const { userId, description, duration } = req.body;
  let date, newLog;
  if (req.body.date) {
    date = new Date(req.body.date);
    newLog = { description, duration, date };
  } else {
    newLog = { description, duration }
  }
  const promise = User
    .findOne({"_id": {$regex: '^' + userId}})
    .exec();
  promise.then(function(foundUser){
    if (!foundUser) return res.json({error: 'user does not exist'});
    foundUser.log = foundUser.log.concat([newLog]); // $pushAll deprecated- use $set instead
    foundUser.save(function(err, data) {
      if (err) console.error(err);
      res.json({
        username: data.username,
        description: newLog.description,
        duration: newLog. duration,
        _id: data._id,
        date: date ? new Date(date).toDateString() : new Date().toDateString()
      });
    });
  });
});

// get exercise log
app.get('/api/exercise/log', (req, res) => {
  const {userId, from, to, limit} = req.query;
  if (!userId) res.json({error: 'userId required'});
  User.findOne({"_id": {$regex: '^' + userId}})
    .exec(function(err,doc) {
      if (!doc) return res.json({error: 'user not found'});
      if (err) return console.error(err);
      let logResponse = doc.log;
      if (from) {
        logResponse = logResponse.filter(log => Date.parse(from) < Date.parse(log.date) );
      }
      if (to) {
        logResponse = logResponse.filter(log => Date.parse(to) > Date.parse(log.date) );
      }
      if (limit) logResponse = logResponse.slice(0, limit);
      doc.log = logResponse;
      res.json(doc);
    });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
