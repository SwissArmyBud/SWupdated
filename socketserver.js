const net = require('net');
const fs = require('fs');
const { spawnSync } = require('child_process');

var UNIXSOCKET = "/tmp/udev.auto.update.socket";
var DESTDIR = "/tmp/socketmountpoint/";
var mountingPool = [];
var updateList = [];
var pattern = ".ald.swu";
var scanCounter = 1;

var devicePoolMounter = () => {
	if(mountingPool.length === 0){
		message = "Scanning.";
		for(var i=0; i<5; i++){
			let char = " ";
			if(i<scanCounter){
				char = ".";
			}
			message += char;
		}
		process.stdout.write(message + "\r");
		if(scanCounter<5){
			scanCounter += 1;
		}
		else{
			scanCounter = 0;
		}
	}
	else{
		console.log();
		console.log("Pool Mounter:");
		console.log("----- Size: " + mountingPool.length);
		for(device in mountingPool){
			console.log("#");
			console.log("--- Dev: " + device);
			console.log("--- Name: " + mountingPool[device]);
			mountDaemon(mountingPool[device]);
			console.log("--- Finished with:" + mountingPool.splice(mountingPool.indexOf(device), 1));
			console.log();
		}
	}
	setTimeout(devicePoolMounter, 1000);
}
fs.unlink(UNIXSOCKET, (err) => {
	const server = net.createServer((con) => {
		con.on('data', (data) => {
			console.log();
			console.log("Media Event:");
			console.log(data.toString());
			socketHandler(data);
		});
	});
	server.on('error', (err) => {
	  throw err;
	});
	server.listen(UNIXSOCKET, () => {
		console.log();
		console.log("Socket is bound!");
	});
});

var socketHandler = (data) => {
	var eventText = data.toString().split(" ");
	console.log("Socket handler:");
	console.log("--- Task: " + eventText[0]);
	eventText[1] = eventText[1].substring(0,eventText[1].length-1);
	console.log("--- Part: " + eventText[1]);
	if(eventText[1].length > 3){
		if(eventText[0] === "add"){
			console.log("--scheduling--");
			mountingPool.push(eventText[1]);
			console.log();
			return;
		}
	}
	console.log("--pass--");
	console.log();
}

var mountDaemon = (device) => {
	console.log("--> Sync daemon spawned for: " + device);
	spawnSync('umount', [DESTDIR]);
	spawnSync('rm', ["-rf", DESTDIR]);
	spawnSync('mkdir', [DESTDIR]);
	spawnSync('mount', ["/dev/" + device, DESTDIR]);
	// Grab the directory listing of DESTDIR now that it is mounted
	var fileList = spawnSync("ls", [DESTDIR]);
	// Split the file list into an array
	fileList = fileList.output.toString()
	fileList = fileList.substring(1,fileList.length-2).split("\n");
	console.log("File list:");
	for(file in fileList){
		console.log("- " + fileList[file]);
		// Push the file into the results if it matches our pattern
		if(fileList[file].substr(-1 * pattern.length)===pattern){
			updateList.push(fileList[file]);
		}
	}
	console.log();
	
	// If we have updates - run them in alpha/num order
	if (updateList.length > 0) {
		updateList.sort();
		console.log("----- Found updates:");
		for(entry in updateList){
			console.log("--- SWupdate:")
			console.log("--- " + updateList[entry]);
			spawnSync('cp', [DESTDIR + updateList[entry], "/"]);
			let swupdate = spawnSync('swupdate', ["-i", "/" + updateList[entry]]);
			console.log("-- OUT: ");
			swupdate = swupdate.output.toString();
			console.log(swupdate.substring(1,fileList.length-2));
		}
		setTimeout(() => {spawnSync('shutdown', ["-r", "now"]);}, 3000);
	}
	else {
		console.log("----- No updates found!");
		console.log();
		spawnSync('umount', [DESTDIR]);
	}
}

setTimeout(devicePoolMounter, 1000);
