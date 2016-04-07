# vmfs-http-sync
This is a nodejs client/server application, that transfers filesystem events over the http protocol.

## Why?
Have you ever wanted to use a virtual machine or a container for your development environment? Have you ever had problems with sharing directories and network file systems? Have you ever waited for a page to load 20 seconds instead of 1 just because you are using virtual machine share directory? Thats because lots of software is working much better on a local filesystem instead of network or virtual machine sharing. Some brief examples are rails WEBrick server used in lots of development environments and node watch utility used for filechange notifications.

## How?
The client utilizes the great [chokidar library](https://github.com/paulmillr/chokidar), for normalizing filesystem events on a different operation systems and sends them to the server, which moves the change to the local copy of the filesystem. Be informed that transfered events don't have changed data, so the server needs access to the actual changed files through file sharing service or network filesystem mount point.

## Getting started
We don't have npm module yet. It is in my TODO list, but for now you will have to clone this repository and install it from the code. 
First you need to install the module on both server and client machines using:
```
git clone https://github.com/elsix/vmfs-http-sync.git
cd vmfs-http-sync/ && npm install
```
Or installing it globally with ```sudo npm install -g``` on both client and server machines.

After that you need to start the server with something like:
```
vmfs-http-sync server --server 0.0.0.0 --port 50080 --sharedDir /mnt/hgfs/repos --destDir /home/myuser/repos_local/ --logLevel info
```

and start the client with something like:
```
vmfs-http-sync watcher --server <server-address> --port 50080 --sharedDir $HOME/repos --logLevel info
```
And after a few seconds you must have a perfectly syncronized local copy of your ```$HOME/repos``` into ```/home/myuser/repos_local/``` on your remote server. 

## Usage
TODO
Detailed help

## Licence
vmfs-http-sync is licensed under the
[MIT License](https://github.com/elsix/vmfs-http-sync/blob/master/LICENSE).
