var express = require("express")
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');

app.use("/static", express.static('static'));
app.use("/vendor", express.static("node_modules"));

http.listen(3000, function() {
    console.log('listening on *:3000');
});

var roomManager = {}

function Room(name) {
    this.name = name;
    this.id = uuid.v4();
    this.createDate = new Date();
    this.num = 0;
    this.member = {}

    roomManager[this.id] = this;
    io.emit("rooms-changed", roomManager);
}

Room.prototype.addClient = function(client) {
    this.member[client.id] = client.personInfo;
    this.num++;
    io.sockets.in(this.id).emit("room-changed", this);
}

Room.prototype.removeClient = function(client) {
    delete this.member[client.id];
    this.num--;
    if (!this.num) {
        this.destroy();
        return;
    }
    io.sockets.in(this.id).emit("room-changed", this)
}

Room.prototype.destroy = function() {
	console.log("room destroyed")
	console.log(roomManager)
    delete roomManager[this.id];
    console.log(roomManager)
    io.emit("rooms-changed", roomManager);
    console.log("end")
}

var totalClient = 0;

function Client(socket) {
    var self = this;
    self.id = socket.id;
    self.socket = socket;
    self.curRoomId = null;
    self.info = {
    	name: "new commer # " + self.id,
    }
    totalClient++;
    io.emit("total-changed", totalClient);
    socket.on("disconnect", function(){
    	self.leave();
    });
    socket.on("log-in", function(personInfo) {
        if (!personInfo.name) personInfo.name = "new commer # " + self.id;
        self.personInfo = personInfo;
    })
    socket.on("join-room", function(info, cb) {
        console.log("on join-room: ", info)
        if (!info || !info.roomId) {
            cb("Invalid params");
            return;
        }
        if (!roomManager[info.roomId]) {
            cb("room not exist");
            return;
        }
        if (self.curRoomId === info.roomId) {
        	cb("room already joint.");
        	return;
        }
        self.joinRoom(roomManager[info.roomId], cb)
    });
    socket.on("create-room", function(info, cb) {
        console.log("on create-room")
        if (!info || !info.name) {
            if (cb) cb("Invalid params");
            return;
        }
        if (self.curRoomId) {
        	if (cb) cb("already in room. Get out first.");
        	return;
        }
        var newRoom = new Room(info.name)
        self.joinRoom(newRoom, function(err) {
            if (err) {
                newRoom.destroy();
                if (cb) cb.apply(null, arguments);
            }
        })
    })
    socket.on("leave-room", function(roomId, cb){
    	if (!roomManager[roomId]) {
    		cb("room not exist");
    		return;
    	}
    	self.leaveRoom(roomManager[roomId], cb)
    })
    socket.on("room-chat", function(data, cb) {
        console.log("room-chat")
        if (!data || (!data.roomId && !self.curRoomId)) return;
        io.sockets.in(data.roomId || self.curRoomId).emit("room-chat", data);
        if (cb) cb();
    });
}

Client.prototype.leave = function() {
	console.log("on disconnected!")
    if (this.curRoomId) {
    	roomManager[this.curRoomId].removeClient(this);
    }
    totalClient--;
    io.emit("total-changed", totalClient);
}

Client.prototype.joinRoom = function(room, cb) {
    var self = this;
    if (self.curRoomId) {
        roomManager[self.curRoomId].removeClient(self);
        self.socket.leave(self.curRoomId, cb);
    }
    self.socket.join(room.id, function(err) {
        if (err) {
            if (cb) cb(err)
            return;
        }
        self.curRoomId = room.id;
        room.addClient(self);
        cb(null);
    })
}

Client.prototype.leaveRoom = function(room, cb) {
	var self = this;
	self.socket.leave(room.id, function(err){
		if (err) {
		    if (cb) cb(err)
		    return;
		}
		roomManager[room.id].removeClient(self);
		self.curRoomId = null;
		cb(null)
	})
}

io.on('connection', function(socket) {
    client = new Client(socket);
    socket.emit("rooms-changed", roomManager)
});