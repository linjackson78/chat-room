angular.module("chatApp", [])
    .controller("mainCtrl", function($scope, $rootScope) {
        var socket
        $scope.init = function() {
            $scope.messages = []
            $scope.curRoom = {}
            $scope.rooms = {}
            $scope.newRoomName = "sample-room";
            $scope.text2chat = "hello-world"
            $scope.userName = $scope.genUserName();
        }
        
        $scope.open = function(){
            if (socket && socket.connected) return;
        	socket = io();
        	socket.on("total-changed", function(num) {
        	    console.log("total-changed", num);
        	})
        	socket.on("rooms-changed", function(rooms) {
        	    console.log("rooms-changed", rooms);
        	    $scope.rooms = rooms;
        	    $rootScope.$apply();
        	})
        	socket.on("room-changed", function(room) {
        	    console.log("current room info", room)
        	    $scope.curRoom = room
        	    $rootScope.$apply();
        	})
        	socket.on("room-chat", function(msg) {
        	    console.log("room-chat", msg)
        	    $scope.messages.push(msg);
        	    $rootScope.$apply();
        	})
        	socket.on("connect", function() {
        	    console.info("socket connected.")
        	});
            socket.on("disconnect", function(){
                console.info("socket disconnected.")
            })
        }
        $scope.login = function(name) {
            socket.emit("log-in", {
                name: name
            })
            console.log("logined")
        }
        $scope.createRoom = function(name) {
            socket.emit("create-room", {
                name: name,
                userName: "hostUser"
            }, function(err, id) {
                if (err) {
                    console.log(err);
                    return;
                }
            })
        }
        $scope.joinRoom = function(id) {
            socket.emit("join-room", {
                roomId: id,
                userName: "user1"
            }, function(err) {
                if (err) {
                    console.warn(err);
                    return;
                }
            })
        }
        $scope.leaveRoom = function() {
            if (!$scope.curRoom) return;
            socket.emit("leave-room", $scope.curRoom.id, function(err) {
                if (err) {
                    console.warn(err);
                    return;
                }
                $scope.curRoom = {};
                $rootScope.$apply();
            })
        }
        $scope.leave = function() {
            socket.close();
            $scope.init();
        }
        $scope.send = function(text) {
            socket.emit("room-chat", {
                content: text,
                roomId: $scope.curRoom.id,
                userName: $scope.userName,
                date: new Date()
            })
        }
        $scope.genUserName = function() {
            return "小白" + Math.floor(Math.random() * 1000) + "号";
        }
        $scope.init();
        $scope.open();
    })