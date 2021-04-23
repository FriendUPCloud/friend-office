<script>
	// Fix popup links
	function linkFixer()
	{
		let a = document.getElementsByTagName( 'a' );
		for( var b = 0; b < a.length; b++ )
		{
			if( a[b].getAttribute( 'target' ) == '_blank' )
				a[b].setAttribute( 'target', '' );
		}
	}
	window.addEventListener( 'click', function( msg )
	{
		// Just fix popup links!
		setTimeout( linkFixer, 350 );
		setTimeout( linkFixer, 1000 );
	} );
	window.addEventListener( 'message', function( msg )
	{
		console.log( 'Hello thingie!', msg );
		if( msg && msg.data && msg.data.command && msg.data.command == 'register_friend' )
		{
			console.log( 'Test' );
			//console.log( 'We got it!', msg.source );
			//msg.source.postMessage( { command: 'response', response: 'received!' }, '*' );
		}
		if( msg && msg.data && msg.data.command && msg.data.command == 'login' )
		{
			if( !document.getElementById( 'login' ) )
				return;
			document.getElementById( 'login' ).value = msg.data.username;
			document.getElementById( 'pwd' ).value = msg.data.password;
			Authorize.Submit();
		}
		
	} );

	// Don't yell on unloading!
	window.onbeforeunload = function () {
	}

	// Call Friend!
	if( window.parent )
	{
		if( document.getElementById( 'login' ) )
		{
			window.parent.postMessage( { command: 'login_with_friend' }, '*' );
		}
		else
		{
			window.parent.postMessage( { command: 'register_with_friend' }, '*' );
		}
	}

	// Fix links now!
	linkFixer();
	console.log( 'Hello' );


</script>
