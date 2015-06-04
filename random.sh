#!/bin/bash
# Created by Ben Okopnik on Wed Jul 16 18:04:33 EDT 2008

########    User settings     ############
MAXDIRS=5
MAXDEPTH=2
MAXFILES=10
MAXSIZE=1000
######## End of user settings ############

# How deep in the file system are we now?
TOP=`pwd|tr -cd '/'|wc -c`

delete_if() {
    file=$1
    probability=$2
    p=`expr $RANDOM % $probability`
    if [ $p == 0 ]; then
        echo "Deleting $file"
        rm -rf $file
    fi
}

populate() {
	cd $1
	curdir=$PWD

	files=$(($RANDOM*$MAXFILES/32767))
	for n in `seq $files`
	do
		f=`mktemp f.XXXXXX`
		size=$(($RANDOM*$MAXSIZE/32767))
		head -c $size /dev/urandom > $f
    delete_if $f 4;
	done

	depth=`pwd|tr -cd '/'|wc -c`
	if [ $(($depth-$TOP)) -ge $MAXDEPTH ]
	then
		return
	fi

	unset dirlist
	dirs=$(($RANDOM*$MAXDIRS/32767))
	for n in `seq $dirs`
	do
		d=`mktemp -d d.XXXXXX`
		dirlist="$dirlist${dirlist:+ }$PWD/$d"
    delete_if $d 4
	done

  sleep 3;
  for file in `ls $1`
  do
    delete_if $file 4
  done

	for dir in $dirlist
	do
    if [ -d $dir ]; then
		  populate "$dir"
    fi
	done
}

populate $1
