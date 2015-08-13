angular.module("chatApp", ['luegg.directives'])
    .controller("mainCtrl", function($scope, $rootScope) {
        var socket
        $scope.init = function() {
            $scope.messages = [];
            $scope.curRoom = {};
            $scope.rooms = {};
            $scope.text2chat = "";
            $scope.newRoomName = $scope.genRoomName();
            $scope.userName = $scope.genUserName();
        }
        
        $scope.open = function(){
            if (socket && socket.connected) return;
        	socket = io();
        	socket.on("total-changed", function(num) {
        	    console.log("total-changed", num);
                $scope.totalNum = num;
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
            socket.on("user-join", function(user){
                console.info("new user join in.")
                $scope.messages.push({
                    content: user.name + "进入房间",
                    action: "join"
                })
                $rootScope.$apply();
            })
            socket.on("user-leave", function(user){
                console.info(user.name, "leave.")
                $scope.messages.push({
                    content: user.name + "离开了游戏",
                    action: "leave"
                })
                $rootScope.$apply();
            })
        	socket.on("room-chat", function(msg) {
        	    console.log("room-chat", msg)
        	    $scope.messages.push(msg);
        	    $rootScope.$apply();
        	})
        	socket.on("connect", function() {
        	    console.info("socket connected.");
                $scope.login($scope.userName);
        	});
            socket.on("disconnect", function(){
                console.info("socket disconnected.")
                socket = null;
                $scope.init();
            })
        }
        $scope.login = function(name) {
            if (!socket) return;
            socket.emit("log-in", {
                name: name
            })
            console.log("logined")
        }
        $scope.createRoom = function(name) {
            if (!name || !socket) return;
            socket.emit("create-room", {
                name: name,
                userName: "hostUser"
            }, function(err, id) {
                if (err) {
                    console.log(err);
                    return;
                }
                $scope.newRoomName = ""
                $rootScope.$apply();
            })
        }
        $scope.joinRoom = function(id) {
            if (!socket) return;
            if ($scope.curRoom.name) {
                $scope.leaveRoom(function(){
                    doJoin(); 
                });
            } else {
                doJoin();
            }
            function doJoin (){
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
            
        }
        $scope.leaveRoom = function(cb) {
            if (!$scope.curRoom || !socket) return;
            socket.emit("leave-room", $scope.curRoom.id, function(err) {
                if (err) {
                    console.warn(err);
                    return;
                }
                $scope.curRoom = {};
                $scope.messages = [];
                $rootScope.$apply();
                if (cb) cb();
            })
        }
        $scope.leave = function() {
            if (!socket) return;
            socket.close();
            $scope.init();
        }
        $scope.send = function(text) {
            if (!socket || !text) return;
            socket.emit("room-chat", {
                content: text,
                roomId: $scope.curRoom.id,
                userName: $scope.userName,
                date: new Date()
            })
            $scope.text2chat = ""
        }
        $scope.onEnter = function(e){
            if (e.which === 13 && $scope.text2chat) {
                $scope.send($scope.text2chat);
            }
        }
        $scope.genUserName = function() {
            return "小白" + Math.floor(Math.random() * 1000) + "号";
        }
        $scope.genRoomName = function(){
            return "demo-房间" + Math.floor(Math.random() * 1000) + "号";
        }
        $scope.equals = angular.equals;
        $scope.init();
        $scope.open();
        
    })