const express = require('express');
const querystring = require('querystring');
const port = process.env.PORT || 3000;
const app = express();
const mongoose = require('mongoose');

const DB_USER = 'admin';
const DB_PASSWORD = 'password1';
const DB_URI = 'ds147451.mlab.com:47451';
const DB_NAME = 'kenzie_klack';

// List of all messages
let messages = [];

// Track last active times for each sender
let users = {};

mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_URI}/${DB_NAME}`);

app.use(express.static('./public'));
app.use(express.json());

// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
  var nameA = a.name.toUpperCase(); // ignore upper and lowercase
  var nameB = b.name.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  // names must be equal
  return 0;
}

app.get('/messages', (request, response) => {
  // get the current time
  const now = Date.now();

  // consider users active if they have connected (GET or POST) in last 15 seconds
  const requireActiveSince = now - 15 * 1000;

  // create a new list of users with a flag indicating whether they have been active recently
  usersSimple = Object.keys(users).map(x => ({ name: x, active: users[x] > requireActiveSince }));

  // sort the list of users alphabetically by name
  usersSimple.sort(userSortFn);
  usersSimple.filter(a => a.name !== request.query.for);

  // update the requesting user's last access time
  users[request.query.for] = now;

  // send the latest 40 messages and the full user list, annotated with active flags
  response.send({ messages: messages.slice(-40), users: usersSimple });
});
const messageSchema = mongoose.Schema({
  sender: String,
  message: String,
  timestamp: Number,
});
const Message = mongoose.model('Message', messageSchema);
app.post('/messages', (request, response) => {
  console.log('hit it');
  // add a timestamp to each incoming message.
  const timestamp = Date.now();
  request.body.timestamp = timestamp;

  // append the new message to the message list
  messages.push(request.body);

  // update the posting user's last access timestamp (so we know they are active)
  users[request.body.sender] = timestamp;

  const newMessage = new Message({
    sender: request.body.sender,
    message: request.body.message,
    timestamp: request.body.timestamp,
  });
  newMessage.save(function(err) {
    if (err) return handleError(err);
    console.log('saved');
  });

  // Send back the successful response.
  response.status(201);
  response.send(request.body);
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
