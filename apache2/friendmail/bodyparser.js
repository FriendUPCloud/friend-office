<script type="text/javascript">
	// Fix various elements
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
		if( !friendUpl && uploadDiv )
		{
			let n = document.createElement( 'a' );

			n.className = 'link dotline plus';
			n.innerHTML = 'Add Friend OS file';
			n.id = 'FriendUploader_1';
			n.onclick = function( e ) {
				window.parent.postMessage( { 
					command: 'friend_file_upload',
					targetElement: 'fileupload'
				}, '*' );
				e.stopPropagation();
			};
			
			let s = document.createElement( 'span' );
			s.className = 'attachLink';
			s.appendChild( n );
			
			let destination = uploadDiv.getElementsByTagName( 'span' )[0];
			let destp = destination.parentNode;
			
			destp.insertBefore( s, destination );
		}
		
		// File downloads
		/*let downloa = document.getElementById( 'attachmentActionMenu' );
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
		}*/
	}
	const linkFixConfig = { attributes: true, childList: true, subtree: true };
	const linkFixObserv = new MutationObserver( linkFixer );
	linkFixObserv.observe( document.body, linkFixConfig );
	// Done fixer

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
			case 'attach':
				attachFiles( mes.files, mes.authid, mes.baseurl );
				break;
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
	
	// Attach files
	function attachFiles( files, authid, baseurl )
	{
		let f = document.getElementById( 'fileupload' );
		
		let count = files.length;
		let c = new DataTransfer();
		for( var a = 0; a < files.length; a++ )
		{
			// Loads each file info the fileupload field
			( function( file, auth )
			{
				let r = new XMLHttpRequest();
				r.open( 'get', baseurl + '/system.library/file/read?path=' + file.Path + '&mode=rb&authid=' + auth, true );
				r.responseType = 'arraybuffer';
				r.onreadystatechange = function( st )
				{
					if( r.readyState === XMLHttpRequest.DONE )
					{
						if( r.status === 0 || ( r.status >= 200 && r.status < 400 ) ) 
						{
							if( r.status == 200 )
							{
								count--;
								let b = new File( [ new Blob( [ r.response ] ) ], file.Filename, { type: 'application/octet-stream', lastModified: new Date().getTime() } );
								c.items.add( b );
								
								if( count == 0 )
								{
									// Update files!
									f.files = c.files;
									
									let evt = document.createEvent( 'HTMLEvents' );
									evt.initEvent( 'change', false, true );
									f.dispatchEvent( evt );
								}
							}
							else
							{
								count--;
							}
						}
					}
				}
				r.send( null );
			} )( files[a], authid );
		}
	}
	
</script>
