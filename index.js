const express = require('express')
const bodyParser = require('body-parser')
const socket = require('socket.io')
const cors = require('cors')
const keys = require('./config/keys')
const message = require('./model/message')
const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: 'localhost', 
    database:'laravel57',
    user:'root', 
    password: 'root',
    connectionLimit: 5
});
async function saveMessage(user_id, message) {
  let conn;
  try {
	conn = await pool.getConnection();
	// const rows = await conn.query("SELECT 1 as val");
	// console.log(rows); //[ {val: 1}, meta: ... ]
	const res = await conn.query("INSERT INTO messages (user_id,text) value (?, ?)", [user_id, message]);
	console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }

  } catch (err) {
	throw err;
  } finally {
	if (conn) return conn.end();
  }
}

const app = new express()
let users = {};
let public_room = "public_room"

app.use(bodyParser.json())
app.use(cors())

app.get('/', function (req, res) {
    // res.render('index.html');
    // res.send('Hello World!');
    res.sendFile(__dirname + '/index.html');
});
var server = app.listen(5000, () => {
    console.log("Howdy, I am running at PORT 5000")
})

let io = socket(server);

io.on("connection", function (socket) {
    console.log("Socket Connection Established with ID :" + socket.id)
    console.log('a user connected');
    // socket.broadcast.emit('user connected', socket.id);
    // socket.join(public_room);

    socket.on('disconnect', function () {
        
        console.log('user disconnected');
    });
    socket.on('i_signout', function (username) {
        if (username in users) {
            // then, delete it
            delete users[socket.id];
        }
        socket.broadcast.emit('someone_left', users);
    });

    socket.on('i_sign', function (payload) {
        users[payload.username] = {
            'socket_id': socket.id,
            'username': payload.username,
        }
        var response = { 'members': users, 'username': payload.username };
        socket.broadcast.emit('someoneJoined', response);
        socket.emit('iJoined', response);
    });

    socket.on('update_socket', function (payload) {
        users[payload.username] = {
            'socket_id': socket.id,
            'username': payload.username,
        }
    });

    socket.on('getMembers', function () {
        // console.log('sending member list:');
        // console.log(users);
        socket.emit('refreshMemberList', users);
    });

    socket.on("i_chat", async function (chat) {
        chat.sent = new Date()
        await saveMessage(chat.user_id, chat.message)
        
        if (chat.room==0){
            socket.broadcast.emit('newPublicMessage', chat);
            // io.emit('newPublicMessage', response);
        }
        else{
            if (chat.room in users) {
                // console.log('response: ' + response);
                console.log("chat.room:" + chat.room);
                console.log("users:" + users);
                
                io.sockets.sockets[users[chat.room].socket_id].emit('newPrivateMessage', chat);
            }
            else{
                console.log(chat.room+' is not found in members');
                console.log(users);
            }
        }
        // socket.emit('successSendingMessage', response);
    })

    socket.on('error', (error) => {
        console.log('error: ' + error);
    });

    socket.on('getChatList', async function(payload){
        console.log("getChatList");
        console.log(payload);
        let result = []
        if(payload.type == 'partner'){
            result = await message.find({ $or: [{ nik: payload.nik, room: payload.room }, { nik: payload.room, room: payload.nik}] });
        }
        else if(payload.type == 'room'){
            result = await message.find({ room: payload.room});
        }

        // console.log(result);
        socket.emit('viewChatList', result);
    })
    
})

app.get('/chat', async (req, res) => {
    let result = await message.find()
    res.send(result);
})

// connection.end();


