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
	ge( 'MainFrame' ).contentWindow.postMessage( { 'command': 'register_friend' }, '*' );
}

window.addEventListener( 'message', function( msg )
{
	console.log( 'Friend received a message!', msg );
} );



