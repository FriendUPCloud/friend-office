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
			console.log( 'Here: ', d );
			Application.credentials = d[0].Data;
		}
		else
		{
			Application.credentials = false;
		}
	} );
	
	ge( 'MainFrame' ).style.opacity = 0;
}

function initMainFrame()
{
	//ge( 'MainFrame' ).contentWindow.postMessage( { 'command': 'register_friend' }, '*' );
}

window.addEventListener( 'message', function( msg )
{
	if( msg && !msg.data ) return;
	let message = msg.data;
	if( !message.command ) return;
	
	if( message.command == 'login_with_friend' )
	{
		ge( 'MainFrame' ).style.opacity = 0;
		if( Application.credentials )
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
			}
			f.load();
		}
	}
	else if( message.command == 'register_with_friend' )
	{
		if( !Application.credentials )
		{
			Application.credentials = {
				username: ge( 'loginUser' ).value,
				password: ge( 'loginPass' ).value
			};
		}
		Application.keyData.save( 'FriendOfficeMail', Application.credentials, false, function( e, d )
		{
			if( e == 'ok' )
			{
				//console.log('User creds saved');
				ge( 'MainFrame' ).style.opacity = 1;
				document.body.removeChild( ge( 'Login' ) );
			}
		} );
	}
} );

function executeLogin( u, p )
{
	ge( 'MainFrame' ).contentWindow.postMessage( {
		command: 'login',
		username: u ? u : ge( 'loginUser' ).value,
		password: p ? p : ge( 'loginPass' ).value
	}, '*' );
}



