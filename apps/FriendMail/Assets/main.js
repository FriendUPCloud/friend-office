/*©apache***********************************************************************
*                                                                              *
* Friend Unifying Platform                                                     *
* ------------------------                                                     *
*                                                                              *
* Copyright 2014-2017 Friend Software Labs AS, all rights reserved.            *
* Hillevaagsveien 14, 4016 Stavanger, Norway                                   *
* Tel.: (+47) 40 72 96 56                                                      *
* Mail: info@friendos.com                                                      *
*                                                                              *
*****************************************************************************©*/

Application.credentials = false;

// Login retries
let retries = 3;
let applicationCredsLoaded = false;

Application.run = function( msg )
{
	this.intr = setInterval( function()
	{
		if( retries-- == 0 )
		{
			Application.displayConnectionError();
			return clearInterval( Application.intr );
		}
		Application.keyData.get( function( e, d )
		{
			// Completed - no need to poll....
			clearInterval( Application.intr );
			
			// OK! Cool
			if( e == 'ok' && d && d[0].Data )
			{
				Application.credentials = d[0].Data;
			}
			// Failed
			else
			{
				Application.credentials = false;
			}
			applicationCredsLoaded = true;
		} );
	}, 800 );
	
	ge( 'MainFrame' ).style.opacity = 0;
}

// Show an alert and quit
Application.displayConnectionError = function()
{
	Alert( 'Could not connect to server', 'Friend Mail cannot access its authentication database and will quit.' );
	
	setTimeout( function()
	{
		Application.quit();
	}, 3000 );
}

window.addEventListener( 'message', function( msg )
{
	if( msg && !msg.data ) return;
	let message = msg.data;
	if( !message.command ) return;
	
	function loginForm()
	{
		if( !applicationCredsLoaded )
		{
			return setTimeout( function(){ loginForm(); }, 100 );
		}
		ge( 'MainFrame' ).style.opacity = 0;
		if( Application.credentials && Application.credentials.username )
		{
			executeLogin( Application.credentials.username, Application.credentials.password );
		}
		else
		{
			let s = new Module( 'system' );
			s.onExecuted = function( rc, rd )
			{
				if( rc == 'ok' )
				{
					let d = ge( 'Login' );
					if( !d ) 
					{
						d = document.createElement( 'div' );
						d.id = 'Login';
						document.body.appendChild( d );
					}
					let f = new File( 'Progdir:Assets/login.html' );
					f.onLoad = function( data )
					{
						d.innerHTML = data;
						document.body.classList.add( 'LoginShow' );
					}
					f.load();
				}
				else
				{
					let d = ge( 'Login' );
					if( !d )
					{
						d = document.createElement( 'div' );
						d.id = 'Login';
						document.body.appendChild( d );
					}
					let f = new File( 'Progdir:Assets/request_account.html' );
					f.onLoad = function( data )
					{
						d.innerHTML = data;
						document.body.classList.add( 'LoginShow' );
					}
					f.load();
				}
			}
			s.execute( 'getsetting', { 'setting': 'friendmailrequest' } );
		}
	}
	
	// Different Friend commands
	if( message.command == 'login_with_friend' )
	{
		loginForm();
	}
	else if( message.command == 'ping' )
	{
		let m = { command: 'pong' };
		ge( 'MainFrame' ).contentWindow.postMessage( m, '*' );
	}
	// Just relogin
	else if( message.command == 'relogin' )
	{
		setTimeout( function(){ 
			executeLogin( window.credentials.username, window.credentials.password );
		}, 1000 );
	}
	// Handle attachments
	else if( message.command == 'friend_file_upload' )
	{
		new Filedialog( {
			title: 'Select file for attachment',
			multiSelect: true,
			path: 'Home:',
			type: 'load',
			rememberPath: true,
			triggerFunction: function( data )
			{
				if( data.length )
				{
					let m = {
						command: 'attach',
						authid: Application.authId,
						baseurl: document.location.origin,
						files: data
					};
					ge( 'MainFrame' ).contentWindow.postMessage( m, '*' );
				}
			}
		} );
	}
	else if( message.command == 'notify' )
	{
		Notify( { title: message.title, text: message.message } );
	}
	// Saving a single attachment
	else if( message.command == 'friend_file_download' )
	{
		new Filedialog( {
			title: 'Download attachment',
			path: 'Home:',
			multiSelect: false,
			type: 'save',
			rememberPath: true,
			triggerFunction: function( data )
			{
				if( data )
				{
					ge( 'MainFrame' ).contentWindow.postMessage( {
						command: 'storefile',
						authid: Application.authId,
						baseurl: document.location.origin,
						file: message.source,
						filename: message.filename,
						path: data
					}, '*' );
				}
			}
		} );
	}
	else if( message.command == 'register_with_friend' )
	{
		// If we haven't checked login - we need to log out!
		if( !Application.loginCheck )
		{
			executeLogout();
			Application.loginCheck = true;
			return loginForm();
		}
		if( !Application.credentials )
		{
			if( !ge( 'loginUser' ) )
			{
				return loginForm();
			}
			else
			{
				Application.credentials = {
					username: ge( 'loginUser' ).value,
					password: ge( 'loginPass' ).value
				};
			}
		}
		Application.keyData.save( 'FriendMail', Application.credentials, false, function( e, d )
		{
			if( e == 'ok' )
			{
				if( ge( 'Login' ) )
				{
					document.body.removeChild( ge( 'Login' ) );
				}
				document.body.classList.remove( 'Loading' );
				ge( 'MainFrame' ).style.opacity = 1;
				
				// Update menu items
				Application.sendMessage( { command: 'setitems' } );
			}
			else
			{
				// Who goes there?
			}
		} );
	}
} );

function executeLogout()
{
	ge( 'MainFrame' ).contentWindow.postMessage( {
		command: 'logout'
	} );
}

function executeLogin( u, p )
{
	document.body.classList.add( 'Loading' );
	window.credentials = {
		username: u ? u : ge( 'loginUser' ).value,
		password: p ? p : ge( 'loginPass' ).value
	};	
	ge( 'MainFrame' ).contentWindow.postMessage( {
		command: 'login',
		username: window.credentials.username,
		password: window.credentials.password
	}, '*' );
}

let hasApplied = false;
function executeApply()
{
	if( !hasApplied )
	{
		let m = new Module( 'system' );
		m.onExecuted = function( e, d )
		{
			if( e != 'ok' )
			{
				let j = JSON.parse( d );
				if( j.response == 2 )
				{
					Alert( 'Error in profile', 'Your user profile is missing full name or email. Please correct this before applying.' );
				}
				return;
			}
			// Tell user how wonderful it is
			else
			{
				document.body.classList.add( 'Loading' );
				let f = new File( 'Progdir:Assets/email_verification.html' );
				f.onLoad = function( data )
				{
					ge( 'Login' ).innerHTML = data;
					setTimeout( function()
					{
						document.body.classList.remove( 'Loading' );
					}, 250 );
				}
				f.load();
			}
		}
		m.execute( 'appmodule', { 
			appName: 'FriendMail',
			command: 'signup'
		} );
		hasApplied = true;
		ge( 'hasApplied' ).classList.add( 'disabled' );
		ge( 'hasApplied' ).setAttribute( 'disabled', 'disabled' );
	}
}


