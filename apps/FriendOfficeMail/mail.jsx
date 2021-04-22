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
	let v = new View( {
		title: 'Friend Mail',
		width: 1280,
		height: 800
	} );
	
	v.onClose = function()
	{
		Application.quit();
	}
	
	let f = new File( 'Progdir:Assets/main.html' );
	f.replacements = {
		serverName: 'https://community.sky.computer/'
	};
	f.i18n();
	f.onLoad = function( data )
	{
		v.setContent( data );
	}
	f.load();
}

