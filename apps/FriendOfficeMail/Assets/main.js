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

Application.run = function( msg )
{
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
	else if( message.command == 'register_with_friend' )
	{
		ge( 'MainFrame' ).style.opacity = 1;
		document.body.removeChild( ge( 'Login' ) );
	}
} );

function executeLogin()
{
	ge( 'MainFrame' ).contentWindow.postMessage( {
		command: 'login',
		username: ge( 'loginUser' ).value,
		password: ge( 'loginPass' ).value
	}, '*' );
}



