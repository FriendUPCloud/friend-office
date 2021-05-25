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
		
		// Fix upload
		let uploadDiv = document.getElementById( 'attachment_upload_pnl' );
		let friendUpl = document.getElementById( 'FriendUploader_1' );
		if( uploadDiv && !friendUpl )
		{
			console.log( 'Checking it out.' );
			let n = document.createElement( 'a' );
			n.className = 'link dotline plus';
			n.innerHTML = 'Add Friend OS file';
			n.id = 'FriendUploader_1';
			n.onclick = function( e ){
				window.parent.postMessage( { command: 'friend_file_upload' }, '*' );
				e.stopPropagation();
			};
			let s = document.createElement( 'span' );
			s.className = 'attachLink';
			s.appendChild( n );
			
			let destination = uploadDiv.getElementsByTagName( 'span' )[0];
			let destp = destination.parentNode;
			
			destp.insertBefore( s, destination );
		}
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
				
				break;
		}
	} );
</script>
