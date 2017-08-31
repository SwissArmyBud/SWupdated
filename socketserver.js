const net = require('net');
const fs = require('fs');
const { spawnSync } = require('child_process');

var UNIXSOCKET = "/tmp/udev.auto.update.socket";
var DESTDIR = "/tmp/tempmountpoint/";

var pattern = ".swu";

var mountingPool = [];
var updateList = [];

var mountScheduler = null;
var updateRequired = false;

var devicePoolMounter = () => {
	if(mountingPool.length !== 0){
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
		if(updateRequired){
			// If we processed updates, schedule a restart when finished
			console.log();
			console.log(" ---> SCHEDULING SYSTEM RESTART <---");
			console.log();
			setTimeout(() => {spawnSync('shutdown', ["-r", "now"]);}, 3000);
		}
	}
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
	// Clean the hanging newline from our input string
	eventText[1] = eventText[1].substring(0,eventText[1].length-1);
	console.log("--- Part: " + eventText[1]);
	// Check if the action was a drive or a partition (parts have 4 chars, ex. sda1)
	if(eventText[1].length > 3){
		if(eventText[0] === "add"){
			console.log("--scheduling--");
			console.log();
			// Add the partition to our pool of available devices and schedule a scan
			mountingPool.push(eventText[1]);
			if(mountingPool !== null){
				clearTimeout(mountScheduler);
			}
			mountScheduler = setTimeout(devicePoolMounter, 2000);
			return;
		}
	}
	console.log("--pass--");
	console.log();
}

var mountDaemon = (device) => {
	console.log("--> Sync daemon spawned for: " + device);
	// Ensure no one else is using our DESTDIR
	spawnSync('umount', [DESTDIR]);
	// Ensure our DESTDIR is empty
	spawnSync('rm', ["-rf", DESTDIR]);
	// Ensure our DESTDIR exists
	spawnSync('mkdir', [DESTDIR]);
	// Ensure our partition is mounted to our DESTDIR
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
	
	// If the partition contains updates, run them
	if (updateList.length > 0) {
		// Run them in alpha/num order
		updateList.sort();
		console.log("----- Found updates:");
		for(entry in updateList){
			console.log("--- SWupdate:")
			console.log("--- " + updateList[entry]);
			// Kick SWupdate to process the update file
			let swupdate = spawnSync('swupdate', ["-i", DESTDIR + updateList[entry]]);
			console.log("-- OUT: ");
			swupdate = swupdate.output.toString();
			console.log(swupdate.substring(1,updateList.length-2));
		}
		updateRequired = true;
	}
	else {
		console.log("----- No updates found!");
		console.log();
		spawnSync('umount', [DESTDIR]);
	}
}
