<script type="text/javascript">
	window.Friend = window.Friend ? window.Friend : {};
	
	// Check Friend OS
	document.body.style.display = 'none';
	window.pingTime = ( new Date() ).getTime();
	window.parent.postMessage( { 
		command: 'ping'
	}, '*' );
	window.pingTimeo = setTimeout( function()
	{
		document.body.innerHTML = '<div style="padding: 20px"><h1>Transferring you</h1><p>You are not being transferred to your login page.</p></div>';
		document.body.style.display = '';
		let p = document.createElement( 'iframe' );
		p.src = '/Auth.aspx?t=logout';
		p.style.visibility = 'hidden';
		p.style.pointerEvents = 'none';
		document.body.appendChild( p );
		
		// Redirect
		setTimeout( function()
		{
			let base = document.location.origin.split( '//' );
			let domain = base[1].split( '.' );
			document.location.href = base[0] + '//' + domain[1] + '.' + domain[2];
		}, 150 );
	}, 150 );
	// Done checking
	
	// Fix various elements
	function linkFixer()
	{
		// Fix links
		let a = document.getElementsByTagName( 'a' );
		for( let b = 0; b < a.length; b++ )
		{
			// TODO: Make exceptions in some cases
			if( a[b].getAttribute( 'target' ) == '_blank' )
				a[b].setAttribute( 'target', '' );
		}
		
		// Fix div buttons
		let ent = document.getElementsByClassName( 'entity-menu' );
		for( let b = 0; b < ent.length; b++ )
		{
			if( !ent[b].mouseup )
			{
				ent[b].mouseup = true;
				ent[b].addEventListener( 'mouseup', function( e )
				{
					window.Friend.currentEntityMenu = ent[b];
					window.Friend.currentEntityData = this.getAttribute( 'data_id' );
				} );
			}
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
		
		// Make sure that attachment menus are registered with active state
		
		
		// Add custom menu
		if( !document.getElementById( 'downloadToFriend' ) )
		{
			if( document.getElementById( 'attachmentActionMenu' ) )
			{
				let ul = document.getElementById( 'attachmentActionMenu' ).getElementsByTagName( 'ul' );
				if( ul && ul.length )
				{
					let m = document.createElement( 'li' );
					m.id = 'downloadToFriend';
					let a = document.createElement( 'a' );
					a.className = 'dropdown-item with-icon download';
					a.innerHTML = 'Download to Friend storage';
					m.appendChild( a );
					ul[0].insertBefore( m, ul[0].getElementsByTagName( 'li' )[0] );
					a.onclick = function()
					{
						// Find corresponding file
						if( window.Friend.currentEntityData )
						{
							let eda = window.Friend.currentEntityData;
							let link = null; let filename = null;
							let g = document.getElementsByClassName( 'with-entity-menu' );
							for( let c = 0; c < g.length; c++ )
							{
								let compeda = g[c].getAttribute( 'data_id' );
								if( compeda && compeda == eda )
								{
									let as = g[c].getElementsByTagName( 'a' );
									for( let a = 0; a < as.length; a++ )
									{
										let down = as[a].getAttribute( 'download' );
										let titl = as[a].getAttribute( 'title' );
										if( down || titl )
										{
											filename = down ? down : titl;
											link = as[a].href.split( 'viewdocument.' ).join( 'download.' );
											break;
										}
									}
									break;
								}
							}
						
							if( link != null )
							{
								window.parent.postMessage( { 
									command: 'friend_file_download',
									filename: filename,
									source: link
								}, '*' );
							}
						}
					}
				}
			}
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
			case 'pong':
				if( window.pingTimeo )
				{
					clearTimeout( window.pingTimeo );
					window.pingTimeo = null;
				}
				document.body.style.display = '';
				break;
			case 'attach':
				if( document.getElementById( 'fileupload' ) )
				{
					attachFiles( mes.files, mes.authid, mes.baseurl, document.getElementById( 'fileupload' ) );
				}
				break;
			case 'register_friend':
				break;
			case 'storefile':
				let x = new XMLHttpRequest();
				x.open( 'get', mes.file, true );
				x.responseType = 'arraybuffer';
				x.onload = function()
				{
					let f = new FormData();
					let blob = new Blob( [ this.response ], { type: 'application/octet-stream' } );
					f.append( 'data', blob, "" );
					
					let x2 = new XMLHttpRequest();
					x2.open( 'POST', mes.baseurl + '/system.library/file/upload/?path=' + mes.path + mes.filename + '&authid=' + mes.authid, true );
					x2.onload = function()
					{
						window.parent.postMessage( { command: 'notify', title: 'Data transfer', message: 'Attachment stored successfully.' }, '*' );
					}
					x2.send( f );
				}
				x.send( null );
				break;
			case 'login':
			{
				if( !document.getElementById( 'login' ) )
				{
					window.parent.postMessage( { command: 'relogin' }, '*' );
					document.location.href = '/Auth.aspx?t=logout';
					return;
				}
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
	function attachFiles( files, authid, baseurl, fileelement )
	{
		let f = fileelement;
		
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
	
	// Mobile specific javascript functionality
	if( document.body.classList.contains( 'mobile' ) )
	{
		window.Friend.mobileMode = true;
	}
	if( window.Friend.mobileMode )
	{
		if( !window.Friend.mobileButtons )
		{
			let b = document.createElement( 'div' );
			window.Friend.mobileButtons = b;
			b.innerHTML = '\
				<div class="mobile-buttons"><a class="email" href="javascript:void(0)">New e-mail</a></div>\
			';
			let cont = document.querySelector( '.studio-top-panel.mainPageLayout' );
			if( cont )
			{
				cont.appendChild( b );
				let as = cont.getElementsByTagName( 'a' );
				for( let b = 0; b < as.length; b++ )
				{
					if( as[b].className == 'email' )
					{
						as[b].onclick = function()
						{
							document.getElementById( 'createNewMailBtn' ).click();
						}
					}
				}
			}
		}
	}
	
</script>
