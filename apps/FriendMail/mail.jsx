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
	this.setApplicationName( 'Friend Mail' );

	// Open the mail window
	let v = new View( {
		title: 'Friend Mail',
		width: 1280,
		height: 800
	} );
	
	// Setup static menu items
	v.setMenuItems( [
		{
			name: 'File',
			items: [
				{
					name: 'About',
					command: 'about'
				},
				{
					name: 'Quit',
					command: 'quit'
				}
			]
		}
	] );
	
	v.onClose = function()
	{
		Application.quit();
	}
	
	this.mainView = v;
	
	// Set the main template
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

let abw = null;
Application.receiveMessage = function( msg )
{
	if( msg.command == 'setitems' )
	{
		this.mainView.setMenuItems( [
			{
				name: 'File',
				items: [
					{
						name: 'Quit',
						command: 'quit'
					}
				]
			}/*,
			{
				name: 'Navigation',
				items: [
					{
						name: 'Inbox',
						command: 'mail_inbox'
					},
					{
						name: 'Drafts',
						command: 'mail_draft'
					},
					{
						name: 'Sent',
						command: 'mail_sent'
					},
					{
						name: 'Trash',
						command: 'mail_trash'
					}
				]
			}*/
		] );
	}
	else if( msg.command == 'about' )
	{
		if( abw ) return abw.activate();
		abw = new View( {
			title: 'About Friend Mail',
			width: 500,
			height: 500
		} );
		let f = new File( 'Progdir:Assets/about.html' );
		f.onLoad = function( data )
		{
			abw.setContent( data );
		}
		f.load();
		abw.onClose = function()
		{
			abw = null;
		}
	}
}

