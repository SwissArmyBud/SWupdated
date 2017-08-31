# Automatic SWupdate Runner

## Overview
This software collection is meant to be used to trigger the update of embedded systems. It uses a udev rule to call a shell script when a new drive (USB) is inserted, and writes the event information to a Unix socket. The final piece of software is a Node.js server listening on the same socket, and uses the provided information to initiate an update process with SWupdate.

## Requirements
1. Node.js runtime installed
2. udev based system service
3. SWupdate binary installed

## Using
1. The udev rule must be added to the udev rules.d directory.
2. The shell script must be named/located as desired by the udev rule.
3. The node process must be running in order for the updates to fire.

## Process.
1. The udev service notices a new drive and fires the shell script.
2. The shell script passes all of it's information to the node script.
3. The node script:
    1. Checks the action/name and determines if an update may be available.
    2. Adds all appropriate drives/partitions to a drive list.
    3. Mounts all entries (one by one) in the drive list, and scans their base directory.
    4. Fetches any files from the scanned directory that match an update pattern.
    5. Updates are run (one by one) from the device, using SWupdate and its handlers.
        - The devices is restarted if any updates have been applied.