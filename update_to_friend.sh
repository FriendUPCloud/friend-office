appPath="../friendup/build/resources/webclient/apps"
modulePath="../friendup/build/modules"
copymessage="\n##########\nDone. If no copying messages were displayed you need to check your appPath and modulePath values in the shellscript\n"

if [ -d "$appPath" ]; then
	# Control will enter here if $DIRECTORY exists.
	echo "\n\n### Copying applications to FriendUP ---"
	cd apps/Document
	rsync -ravl \
		--exclude '/.git*' \
		. "../../$appPath/Document"
	
	cd ..
	cd ..

	cd apps/Presentation
	rsync -ravl \
		--exclude '/.git*' \
		. "../../$appPath/Presentation"
		
    cd ..
    cd ..

	cd apps/Spreadsheet
	rsync -ravl \
		--exclude '/.git*' \
		. "../../$appPath/Spreadsheet"
		
    cd ..
    cd ..

    copymessage=""

fi

if [ -d "$modulePath" ]; then
	# Control will enter here if $DIRECTORY exists.
	echo "\n\n### Copying module to FriendUP ---"
	cd modules/onlyoffice
	rsync -ravl \
		--exclude '/.git*' \
		. "../../$modulePath/onlyoffice"
		
    cd ..
    cd ..
    copymessage=""

fi
echo "$copymessage \n"
