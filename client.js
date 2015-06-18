var WebSocket = require('ws');
var play = require('play');
var request = require('request');
var self = this

var OmegaupEndpoint = "omegaup.com"
var ContestAlias = process.argv[4]
var SocketKeepaliveTimeout = 30000
var ConnectRetryTimeout = 5000
var Username =  process.argv[2]
var Pass	=  process.argv[3]  
var UseSSL = true

function startWebSocket(retryFn) {
	self.ws = new WebSocket((UseSSL ? 'wss://' :  'ws://') + OmegaupEndpoint + '/api/contest/events/' + ContestAlias, "com.omegaup.events", {
		headers: {
			'Cookie': self.authCookie
		}
	});

	self.ws.on('open', function open() {
	  console.log("Connected to websocket w00t!");
	  play.sound('./sounds/start.wav');

	  // Set Keepalives
	  //
	  self.socket_keepalive = setInterval((function(socket) {
	  	return function() {
	  		console.log("Sending PING..");
	  		socket.send("ping");
	  	};
	  })(self.ws), SocketKeepaliveTimeout);
	});

	self.ws.on('message', function(data, flags) {
	  console.log("OMG A message!");
	  console.log(data);

	  var d = JSON.parse(data)

	  // Play sounds
	  //
	  switch (d.message) {
	  	case "/run/update/":  	
	  		play.sound('./sounds/' + d.run.verdict + '.wav');
	  		break;
	  	case "/clarification/update/":
	  		play.sound('./sounds/clarification.wav');
	  		break;
	  }
	  
	});

	self.ws.on('error', function(error) {
	  console.log("D: error!");
	  console.log(error);
	  play.sound('./sounds/gameover.wav');

	  retryFn();
	});

	self.ws.on('close', function(error) {
	  console.log(":( Connection Closed.");
	  console.log(error);
	  play.sound('./sounds/gameover.wav');

	  retryFn();

	});
}

function getAuthToken(callback, retryFn) {
	// Get auth token
	//
	console.log("YEY! Starting. Getting omegaUp auth token for " + Username)
	request.post((UseSSL ? 'https://' :  'http://') + OmegaupEndpoint + '/api/user/login', {
			form: {
				usernameOrEmail: Username,
				password: Pass
			}
		}, 
		function(error, response, body) {		
			if (!error && response.statusCode == 200) {
				console.log(body)
				var b = JSON.parse(body)
				self.authCookie = 'ouat=' + b.auth_token
				callback()
			}
			else {
				console.log("X_X Epic fail");
				console.log(error);
				console.log("/house.jpg");
				play.sound('./sounds/gameover.wav');

				retryFn();
			}
		} 
	);
}

function cleanupAndRetry() {

	  // Cleanup
	  //
	  clearInterval(self.socket_keepalive);
	  self.ws = null;

	  // Retry
	  //
	  console.log(":O Retrying connection.");	  
	  setTimeout(
	  	function() { 
	  		getAuthToken(startWebSocket, cleanupAndRetry) 
	  	}, ConnectRetryTimeout)

}

getAuthToken(startWebSocket, cleanupAndRetry);


