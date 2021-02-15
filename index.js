var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var mongoose = require('mongoose');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000

var dbUrl = 'mongodb+srv://admin:admin@dejli.ngyjf.mongodb.net/dejli?retryWrites=true&w=majority';

mongoose.connect(dbUrl , (err) => { 
  console.log('mongodb connected',err);
})

var schema = new mongoose.Schema({ 
  _key : {
    type: String,
    required: true,
    unique: true
  }, 
  people : {
    type: Array,
    required: true,
  } 
});

var DejliRoom = mongoose.model('dejliRooms', schema)

app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader('Access-Control-Allow-Credentials', true);

  next();
})

app.post('/clients', (req, res) => {
  res.send(Object.keys(io.sockets.clients().connected))
})

app.get('/test', (req, res) => res.send({"test": 1}))

app.post('/create', (req, res) => createRoom(req, res))

app.post('/join', (req, res) => joinRoom(req, res))

app.post('/get', (req, res) => getRoom(req, res))

app.post('/spin', (req, res) => spin(req, res))

io.on('connection', socket => {
  console.log(`A user connected with socket id ${socket.id}`)

  socket.broadcast.emit('user-connected', socket.id)

  socket.on('disconnect', () => {
    console.log(`A user disconnected with socket id ${socket.id}`)
    socket.broadcast.emit('user-disconnected', socket.id)
  })

  socket.on('nudge-client', data => {
    socket.broadcast.to(data.to).emit('client-nudged', data)
  })
})

http.listen(PORT, () => {
  console.log('Listening on *:${PORT} ')
})

function createRoom (req, res) {
  name = req.body.name;
  console.log('Create room');
  console.log(name);
  var key = '';
   var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < 4; i++ ) {
      key += characters.charAt(Math.floor(Math.random() * charactersLength));
   }

  var object = {
    '_key': key,
    'people': [name]
  }
  var dejliRoom = new DejliRoom(object);
  dejliRoom.save((err) =>{
    if(err)
      res.sendStatus(500);
    else
      getRoom(req, res, key)
  })
}

function joinRoom (req, res) {
  name = req.body.name;
  key = req.body.key;
  console.log('Join room');
  console.log(name);
  console.log(key);
  DejliRoom.findOneAndUpdate({
    _key: key},
    {$push: {people: name}
  },{new: true}, (err, doc) => {
    if (err) {
      res.json({status: 500, error: err});
    }
    io.emit("someoneJoined", doc.people)
    res.json({status: 200, msg: doc});
  });
  
}

function getRoom (req, res, key) {
  if(typeof key == "undefined"){
    key = req.body.key;
  }
  console.log('Get room');
  console.log(key);
  DejliRoom.findOne(
   {_key: key}
  , (err, doc) => {
    if (err) {
      res.json({status: 500, error: err});
    }
    console.log(doc.people)
    io.emit("getPeople", doc.people)
    res.json({status: 200, msg: doc});
  });
}

function spin(req, res) {
  resultNumber = req.body.resultNumber;
  key = req.body.roomKey;
  console.log(resultNumber)
  var people;
  DejliRoom.findOne({
    _key: key
  },(err, doc) => {
    if (err) {
      res.json({status: 500, error: err});
    }
    DejliRoom.findOneAndUpdate({
      _key: key},
      {$pull: {people: doc.people[resultNumber]}
    },{new: true}, (err, doc) => {
      if (err) {
        res.json({status: 500, error: err});
      }
      io.emit("spinThatWheel", resultNumber)
      res.json({status: 200, msg: 'spinned'});
    });
    console.log(doc.people)
    people = doc.people
  });  
}

