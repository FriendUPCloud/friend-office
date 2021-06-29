/*©agpl*************************************************************************
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

Application.run = function( msg )
{
	Application.keyData.get( function( e, d )
	{
		if( e == 'ok' && d && d[0].Data )
		{
			Application.credentials = d[0].Data;
		}
		else
		{
			Application.credentials = false;
		}
	} );
	
	ge( 'MainFrame' ).style.opacity = 0;
}

window.addEventListener( 'message', function( msg )
{
	if( msg && !msg.data ) return;
	let message = msg.data;
	if( !message.command ) return;
	
	function loginForm()
	{
		ge( 'MainFrame' ).style.opacity = 0;
		if( Application.credentials && Application.credentials.username )
		{
			executeLogin( Application.credentials.username, Application.credentials.password );
		}
		else
		{	
			let d = ge( 'Login' );
			if( !d ) d = document.createElement( 'div' );
			d.id = 'Login';
			let f = new File( 'Progdir:Assets/login.html' );
			f.onLoad = function( data )
			{
				d.innerHTML = data;
				document.body.appendChild( d );
				document.body.classList.add( 'LoginShow' );
			}
			f.load();
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
	else if( message.command == 'friend_file_download' )
	{
		new Filedialog( {
			title: 'Download attachment',
			path: 'Home:',
			multiSelect: false,
			type: 'path',
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
		Application.keyData.save( 'FriendOfficeMail', Application.credentials, false, function( e, d )
		{
			if( e == 'ok' )
			{
				if( ge( 'Login' ) )
				{
					document.body.removeChild( ge( 'Login' ) );
				}
				document.body.classList.remove( 'Loading' );
				ge( 'MainFrame' ).style.opacity = 1;
			}
			else
			{
			}
		} );
	}
} );

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
			appName: 'FriendOfficeMail',
			command: 'signup'
		} );
		hasApplied = true;
		ge( 'hasApplied' ).classList.add( 'disabled' );
		ge( 'hasApplied' ).setAttribute( 'disabled', 'disabled' );
	}
}


