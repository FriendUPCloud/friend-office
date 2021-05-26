<script type="text/javascript">
	// Fix popup links
	function linkFixer()
	{
		let a = document.getElementsByTagName( 'a' );
		for( var b = 0; b < a.length; b++ )
		{
			if( a[b].getAttribute( 'target' ) == '_blank' )
				a[b].setAttribute( 'target', '' );
		}
		// File uploads
		let uploadDiv = document.getElementById( 'attachment_upload_pnl' );
		let friendUpl = document.getElementById( 'FriendUploader_1' );
		if( uploadDiv && !friendUpl )
		{
			let n = document.createElement( 'a' );
			a.className = 'link dotline plus';
			a.innerHTML = 'Add Friend OS file';
			a.id = 'FriendUploader_1';
			a.onclick = function( e ) {
				window.parent.postMessage( { 
					command: 'friend_file_upload',
					targetElement: 'fileupload'
				}, '*' );
				e.stopPropagation();
			}
			uploadDiv.insertBefore( uploadDiv.getElementsByTagName( 'a' )[0] );
		}
		// File downloads
		let downloa = document.getElementById( 'attachmentActionMenu' );
		let fileUp2 = document.getElementById( 'FriendUploader_2' );
		if( downloa && !fileUp2 )
		{
			let ul = downloa.getElementsByTagName( 'ul' );
			if( !ul ) return;
			ul = ul[0];
			let li = document.createElement( 'li' );
			let bt = null;
			bt.onclick = function( e ){
				
			}
		}
	}
	// TODO: Make an event listener that makes better sense
	window.addEventListener( 'click', function( msg )
	{
		// Just fix popup links!
		setTimeout( linkFixer, 350 );
		setTimeout( linkFixer, 1000 );
	} );

	// Don't yell on unloading!
	window.onbeforeunload = function (){}

	// Call Friend!
	if( window.parent )
	{
		// We need to log in
		if( document.getElementById( 'login' ) )
		{
			window.parent.postMessage( { command: 'login_with_friend' }, '*' );
		}
		// We are logged in
		else
		{
			window.parent.postMessage( { command: 'register_with_friend' }, '*' );
		}
	}

	// Fix links now!
	linkFixer();
	
	// Message reception from Friend OS
	window.addEventListener( 'message', function( msg )
	{
		if( !msg || !msg.data || !msg.data.command ) return;
		
		let mes = msg.data;
		let cmd = mes.command;
		
		switch( cmd )
		{
			case 'register_friend':
				break;
			case 'login':
			{
				if( !document.getElementById( 'login' ) )
				return;
				document.getElementById( 'login' ).value = msg.data.username;
				document.getElementById( 'pwd' ).value = msg.data.password;
				Authorize.Submit();
				break;
			}
			// Receive file data
			case 'filedata':
				// Need a target element
				if( mes.targetElement && document.getElementById( mes.targetElement ) )
				{
					// 1. Convert data to upload
					// 2. Temporarily redirect onload and replace it
						// 2a. Notify user of success/failure
						// 2b. Set onload back to temporary stored event
					// 3. Upload to form
				}
				break;
		}
	} );
</script>
