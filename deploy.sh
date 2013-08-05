#!/bin/sh

scp *.js *.json root@$1:/opt/opxi2
#scp -r initscripts root@$1:/opt/opxi2
#scp -r node_modules root@$1:/opt/opxi2