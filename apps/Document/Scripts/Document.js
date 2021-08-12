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

// Some important globals
Application.documentView = false;
Application.validFiles = [ 'docx' ];
Application.isFirstInRow = false;
Application.api_interface = '';
Application.currentFile = false;
Application.currentFilename = '';
Application.previousFileLock = false;
Application.queuedFile = false;
Application.otherInstanceCount = 0;
Application.documentChecked = false;
Application.printServerSide = false;
Application.friendDomain = false;
Application.retries = 0;

/* SAS stuff */
Application.fconn = false;
Application.sas = null;
Application.sasid = null;
Application.isHost = false;
Application.notEditing = true;
Application.userAddedToFileLock = false;
Application.documentPath = false;


/*
	OnlyOffice Based Word processor
*/

Application.run = function( msg )
{
	Application.setApplicationName( i18n( 'i18n_document' ) );
	Application.openMessagePort( Application.appInterface );

	Application.menuItems = [
		{
			name: i18n( 'i18n_file' ),
			items: [
				{ name: i18n( 'i18n_about' ), cmomand: 'about' },
				{ name: i18n( 'i18n_newfile' ), command: 'new' },
				{ name: i18n( 'i18n_openfile' ), command: 'open' },
				{ name: i18n( 'i18n_save' ), command: 'save' },
				{ name: i18n( 'i18n_save_as' ), command: 'save_as' },
				//{ name: i18n( 'i18n_save_as_pdf' ), command : 'save_as_pdf' },
				//{ name: i18n( 'i18n_reload_document' ), command: 'reload_document' },
				{ name: i18n( 'i18n_quit' ), command: 'ask_quit' }
			]
		},
		{
			name: i18n( 'i18n_insert' ),
			items: [
				{ name: i18n( 'i18n_insert_image' ), command : 'insert_image' },
				{ name: i18n( 'i18n_page_break' ), command : 'insert_page_break' }
			]
		},
		{
			name: i18n( 'i18n_format' ),
			items: [
				{ name: i18n( 'i18n_text' ),
					items: [
						{ name: i18n( 'i18n_alignleft' ), command : 'align_left' },
						{ name: i18n( 'i18n_aligncenter' ), command : 'align_center' },
						{ name: i18n( 'i18n_alignright' ), command : 'align_right' },
						{ name: i18n( 'i18n_alignjust' ), command : 'align_just' }
					]
				}
			]
		},
		{
			name: i18n( 'i18n_help' ),
			items: [
				{ name: i18n( 'i18n_show_document_information' ), command : 'show_doc_info' }
			]
		}
	];
	
	Application.editOnlyMenuItems = [
		{
			name: i18n( 'i18n_file' ),
			items: [
				{ name: i18n( 'i18n_quit' ), command : 'quit' }
			]
		}
	];
	
	
	if( msg.command == 'register' && msg.domain ) Application.friendDomain = msg.domain;

	if( typeof msg.args == 'object' && msg.args.document_to_open )
	{
		Application.documentPath = Application.queuedFile = msg.args.document_to_open;
		if( msg.args.retries ) Application.retries = msg.args.retries;
		Application.checkDocumentInstances();
	}

	// TODO: Support odt and doc
	else if( msg && msg.args && msg.args.indexOf( '.docx' ) > 0 )
	{
		Application.documentPath = Application.queuedFile = msg.args;
		Application.checkDocumentInstances();
	}
	else
	{
		Application.isFirstInRow = true;
		Application.documentChecked = true; // we have a new document here...
	}

	if( Application.username ) Application.loadSettings();
	else { Notify({'title':i18n('i18n_error'),'text':i18n('i18n_500')}); Application.quit(); }
}; // end of app.run


Application.checkDocumentInstances = function( path )
{
	Application.getApplicationsByName('Document', function( rs ){
		
		if( rs.data && rs.data.length > 0 )
		{
			Application.otherInstanceCount = rs.data.length;
			Application.sendApplicationMessage( 'Document', { 'command':'revealdocumentpath' }, function( cdprs ) {
				//nothing to do
			} );
		}
		else
		{
			Application.documentChecked = true;	
			//console.log('we are all alone...');
		}
	});	
};

/*
	Messaging interface
*/
Application.receiveMessage = function( msg )
{
	if( !msg ) return;

	if( msg.message )
	{
		switch( msg.message.command )
		{

			case 'setwindowactive':
				if( msg.message.path == Application.documentPath )
				{
					if( Application.mainView ) Application.mainView.activate();
				}
				break;
			case 'showdocumentpath':
				if( msg.message.path == Application.documentPath )
				{
					Application.sendApplicationMessage( 'Document', { 'command':'setwindowactive','path': Application.documentPath }, function( cdprs ){
						Application.quit();
					} );
				}
				else
				{
					Application.otherInstanceCount--;

					//if we have received answers from all other open windows, we can finally open our view :)
					if( Application.otherInstanceCount < 0 )
					{
						Application.documentChecked = true;
						Application.createView( Application.documentPath );
					}
				}
				break;

			case 'revealdocumentpath':
				if( Application.documentChecked )
				{
					Application.sendApplicationMessage( ( msg.source ? msg.source : 'Document'  ), { 'command':'showdocumentpath','path': Application.documentPath }, function( cdprs ){
						//nothing more to do
					} );
				}
				break;

			default:
				console.log('got some message',msg);
				break;

		}
	}

	if( !msg.command ) return;

	switch( msg.command )
	{
		case 'ask_quit':
			this.checkState();
			break;
		case 'setviewid':
			if( msg.viewid  ) Application.setUserViewID( msg.viewid );
			break;
			
		case 'init_autosave_delay':
			Application.sas.send( {type:'delay-autosave',data:{'host':Application.userId} } );
			break;

		case 'statechange':
			Application.editState = msg.state;
			if( msg.state == 'edited' )
			{
				if( msg.filename ) Application.currentFilename = msg.filename;
				if( Application.currentFilename.indexOf( ':' ) < 0 )
					Application.currentFilename = i18n('i18n_newfile');
				this.documentView.setFlag( 'title', '* ' + (Application.fileInfo && Application.fileInfo.original_name ? Application.fileInfo.original_name : msg.filename ) );
			}
			break;

		case 'new':
			Application.sendMessage( {
				type: 'system',
				method: 'system',
				command: 'executeapplication',
				executable: 'Document',
			} );
			break;

		case 'open':
			Application.loadFile();
			break;

		case 'open_new':
			//check if its a valid document for us to open and if yes, open in new window
			Application.openFile( msg.path, ( msg.close_current ? msg.close_current : false ) );
			break;


		case 'replace_view':
			// Close sas if it's there
			if( Application.sas )
			{
				Application.sas.close();
				delete Application.sas;
				Application.sas = null;
			}
			Application.documentPath = msg.path;
			Application.notEditing = Application.replaceView = true;
			Application.loadFile( msg.path );
			break;


		case 'show_doc_info':
			Application.showDocumentInformation();
			break;

		case 'menu_quit':
			Application.quit();
			break;

		case 'saveresponse':
			if( msg.response == 'success' )
			{
				// On success update the filename
				Application.currentFilename = msg.filename;
				Application.documentView.setFlag( 'title', (Application.fileInfo && Application.fileInfo.original_name ? Application.fileInfo.original_name : msg.filename ) );
				Application.editState = false;
				
				Application.sas.send( {type:'file-saved',data:Application.fileInfo } );
			}
			break;

		case 'save':
			Application.saveFile();
			break;

		case 'save_as':
			var currentPath = Application.currentFilename;
			if( currentPath )
			{
				if( currentPath.indexOf( '/' ) > 0 )
				{
					var p = currentPath.split( '/' );
					p.pop();
					currentPath = p.join( '/' ) + '/';
				}
				else if( currentPath.indexOf( ':' ) > 0 )
				{
					var q = currentPath.split( ':' );
					q.pop();
					currentPath = q.join( ':' ) + ':';
				}
				else
				{
					//not a valid file....
					currentPath = false;
				}
			}

			var flags = {

				path: currentPath,
				type: 'save',
				mainView: Application.documentView,
				rememberPath: true,
				title: i18n( 'i18n_save_as' ),
				filename: ( Application.currentFile && Application.currentFile.fileItem && Application.currentFile.fileItem.Filename ? Application.currentFile.fileItem.Filename : i18n('i18n_newfile') + '.' + Application.validFiles[0] ),
				suffix: Application.validFiles,
				triggerFunction: function( path )
				{
					if( path )
					{
						for(i = 0; i < Application.validFiles.length; i++)
						{
							if( path.indexOf('.' + Application.validFiles[ i ]) > 1 )
							{
								Application.saveFileAs( path );
								return;
							}
						}
					}

					Notify({'title':i18n('i18n_error'),'text':i18n('i18n_nofileselected')});

				}
			}

			// Open the file dialog view window
			var f =  new Filedialog( flags );
			break;

		case 'save_as_pdf':
			Application.saveAsPDF();
			break;

		case 'drop':
			console.log( 'We dropped something!', msg );
			break;

		case 'quit_app':
			Application.releaseFileLockAndQuit();
			break;

		default:
			Application.documentView.sendMessage( msg );
			break;
	}
}; // end of receiveMessage


/*
	result of opening messaging port...
*/
Application.appInterface = function( result )
{
	if( result && result.data && result.callback )
		Application.appInterfaceCallBack = result.callback;
};

/*
	on Quit - we should release a file lock if we hold it!
*/
Application.onQuit = function()
{

	if( Application.sas ) Application.sas.close();
	if( Application.notEditing || Application.documentChecked == false || Application.ignoreFileLock ) return true;

	/* release file lock if we "own" it... */
	if( Application.fileInfo && Application.fileInfo.active_file_lock )
	{
		//console.log('release lock for ' + Application.fileItem.Path, );
		Application.fileInfo.user_to_release = Application.username;

		var mr = new Module( 'onlyoffice' );
		mr.onExecuted = function( e, d )
		{
			//console.log('lock should have been removed...',e,d);
		}
		mr.execute( 'release_file_lock', { "diskpath" : Application.fileItem.Path, "fileinfo" : Application.fileInfo, "sourcepath":(Application.fileItem.SourcePath?Application.fileItem.SourcePath:false) } );

	}
	return false;
};

Application.releaseFileLockAndQuit = function()
{
	if( Application.fileInfo && Application.fileInfo.active_file_lock )
	{
		//console.log('release lock for ' + Application.fileItem.Path, );
		Application.fileInfo.user_to_release = Application.username;

		var mr = new Module( 'onlyoffice' );
		mr.onExecuted = function( e, d )
		{
			Application.quit();
		}
		mr.execute( 'release_file_lock', { "diskpath" : Application.fileItem.Path, "fileinfo" : Application.fileInfo, "sourcepath":(Application.fileItem.SourcePath?Application.fileItem.SourcePath:false) } );
	}
	else
	{
		Application.quit();
	}
}

Application.saveAsPDF = function()
{
	//we have a file that is saved on the server
	if( Application.fileInfo && Application.fileInfo.active_file_lock )
	{
		var m = new Module( 'onlyoffice' );
		m.onExecuted = function( e, d )
		{
			console.log('save_as_pdf came back',e,d);
		}
		m.execute( 'save_as_pdf', { "diskpath" : Application.fileItem.Path, "fileinfo" : Application.fileInfo } );
	}
	else
	{
		Notify({'title':i18n('i18n_document'),'text':i18n('i18n_pdf_please_save_first') });

	}
}


Application.openFile = function( filePath, closeCurrentApp = false )
{

	for(i = 0; i < Application.validFiles.length; i++)
	{
		if( filePath.indexOf('.' + Application.validFiles[ i ]) > 1 )
		{
			//check if its a valid document for us to open and if yes, open in new window
			Application.sendMessage( {
				type: 'system',
				method: 'system',
				command: 'executeapplication',
				executable: 'Document',
				args: filePath
			} );
			Notify({'title':i18n('i18n_document'),'text':i18n('i18n_opening') + ' ' + filePath});
			if( closeCurrentApp ) { Application.editState = 'AVOID_THE_POPUP :)'; Application.quit() };
			return;
		}
	}
	Notify({'title':i18n('i18n_document'),'text':i18n('i18n_invalid_filetype')});

}

// Create a new file
Application.newFile = function()
{
	Application.checkAndOpenFile( false );
}

Application.loadFile = function( file )
{
	// We have a file
	if( file )
	{
		Application.checkAndOpenFile( file );
		return;
	}

	// Open a load file dialog and return selected files
	var description = {
		multiSelect: false,
		path: 'Mountlist:',
		type: 'load',
		title: i18n( 'i18n_openfile' ),
		filename: '',
		rememberPath: true,
		mainView: Application.documentView,
		suffix: Application.validFiles,
		triggerFunction: function( items )
		{
			//check if one file was selected or several or none or what
			if( items )
			{
				if( Application.currentFile )
				{
					Application.sendMessage( {
						type: 'system',
						method: 'system',
						command: 'executeapplication',
						executable: 'Document',
						args: items[ 0 ].Path
					} );

					// Don't quit if we have no new file..
					Application.quit();
					return;
				}
			}
			else
			{
				Notify({'title':i18n('i18n_error'),'text':i18n('i18n_nofileselected')});
			}
		}
	}
	// Open the file dialog view window
	new Filedialog( description );
}

// Save a file
Application.saveFile = function()
{
	Application.documentView.sendMessage( { command: 'save' } );
}

// Save a file with a new filename
Application.saveFileAs = function( newpath )
{
	var newkey = Application.createFileKey( false );
	Application.documentView.sendMessage( { command: 'save_as', newpath: newpath, newkey: newkey } );
}

/*
	Check if all neccessary settings are available
*/
Application.loadSettings = function()
{
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		if( e == 'ok' )
		{
			var tmp;
			try
			{
				tmp = JSON.parse( d );
			}
			catch(e) { Application.displayError( i18n('i18n_invalid_configuration') ); Application.quit(); }
			if( !tmp.api_interface ) { Application.displayError( i18n('i18n_invalid_configuration') ); Application.quit(); }

			Application.api_interface = tmp.api_interface;

			if( tmp.print_serverside && tmp.print_serverside.toLowerCase() == 'true' ) Application.printServerSide = true;


			// open view only if we are all clear to own the path we are planning to open...
			if( Application.documentChecked && Application.friendDomain )
			{
				Application.createView( Application.queuedFile );
			}
			else if( Application.documentChecked )
			{
				Application.displayError( i18n('i18n_invalid_configuration') );
				Application.quit();
			}
		}
		else
		{
			Application.displayError( i18n('i18n_invalid_configuration') );
			Application.quit();
		}
	}
	m.execute( 'load_settings' );
};

Application.createView = function( fileToOpen )
{

	if( !Application.documentView )
	{
		// Make a new window with some flags
		var v = new View( {
			title: i18n( 'i18n_document' ),
			width: 1280,
			height: 1024,
			invisible: (fileToOpen ? false : true ) //show loading thingy when opening files
		} );
		Application.documentView = v;

		v.setMenuItems( Application.menuItems );
		v.setContent('');
		if( fileToOpen ) v.setFlag( 'loadinganimation', true );

		// On closing the window, quit.
		v.onClose = function()
		{
			return Application.checkState();
		}

		if( !fileToOpen )
		{
			Application.newFile();
		}
		else
		{
			Application.queuedFile = false;
			Application.loadFile( fileToOpen );
		}
	}
}

Application.checkState = function()
{
	if( Application.editState == 'edited' && Application.documentPath === false )
	{
		Confirm(i18n('i18n_unsaved_changes'),i18n('i18n_really_quit'),function( result )
		{
			// Confirmed!
			if( result && result.data && result.data == true )
			{
				//ok == we want to save and then quit
				Application.documentView.sendMessage({'command':'save','quit_after_save':true});
			}
			else if( result && result.data && result.data == "-1" )
			{
				//.. dont do anything here...
			}
			else
			{
				Application.editState = false;
				Application.quit();

			}
		}, i18n('i18n_save'),i18n('i18n_dontsave'),i18n('i18n_cancel'), -1 );
		return false;
	}
	else if( Application.editState == 'edited' )
	{
		Application.documentView.sendMessage({'command':'save','quit_after_save':true});
		return false;

	}
	else
	{
		Application.quit();

	}
}
/*
	get info about file form filesystem... needed to be able to generate file key for coediting on workgroup drives
*/
Application.checkAndOpenFile = function( fileItem )
{
	//we open new file... no more actions needed
	if( !fileItem ) { Application.loadFileIntoEditor( false ); return; }

	// File item is just a path
	if( typeof( fileItem ) == 'string' && fileItem.indexOf( ':' ) > 0 )
	{
		var tmp = fileItem;
		var filename;
		if( tmp.indexOf( ':' ) )
		{
			filename = tmp.split( ':' )[1];
			if( filename.indexOf( '/' ) )
			{
				filename = filename.split( '/' );
				filename = filename.pop();
			}
		}
		if( !filename.length )
			return;

		fileItem = {
			Path: tmp,
			Filename: filename
		};
	}

	//save it into application property
	Application.fileItem = fileItem;

	var l = new Library( 'system.library' );
	l.onExecuted = function( e, d )
	{
		if(e == 'ok')
		{
			var efi = false;
			try
			{
				efi = JSON.parse(d);
				// check if this is a file on a virtual file system aka shared drive / which really resides somewhere else 
				// and needs to have a unified info file for the different access points
				if( efi && efi.ExternPath && efi.Owner )
				{
					fileItem.Path = efi.Path;
					fileItem.SourcePath = efi.Owner + '::' + efi.ExternPath;
					fileItem.FSID = efi.fsid;
				}
				else if( efi && efi.fsid )
				{
					fileItem.FSID = efi.fsid;
					if( efi.DateModified ) fileItem.DateModified = efi.DateModified;
				}
			}
			catch(e)
			{
				//nothing to do in this case here...
			}
		}
		Application.fileItem = fileItem;
		Application.checkFileLock( fileItem );
	}
	l.execute( 'file/info', {
		path: fileItem.Path,
		details: true
	} );
}

Application.checkFileLock = function( fileItem )
{
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		if( e == 'ok' )
		{
			var fileinfo = false;
			try
			{
				fileinfo = JSON.parse( d );
				
				if( fileinfo.fileinfo == 0 && fileinfo.message == 'FILEINFO_DOESNT_EXIST' && !fileinfo.lock_document_key )
				{
					Application.fileInfo = {};				
				}
				else
				{
					Application.fileInfo = Object.assign({}, fileinfo);					
				
					Application.previousFileLock = ( fileinfo.lock_document_key ? fileinfo.lock_document_key : false );
	
					//check if we are joining an active document that has been saved before we joined....
					if( fileinfo.active_file_lock && fileinfo.lock_document_key && fileinfo.lock_document_key != Application.createFileKey( Application.fileItem ) )
					{
						//check if we can join the coediting session
						if( fileinfo.shadowcopy && fileinfo.shadowfile )
						{
							Application.checkDocumentSession( fileinfo.sasid );
							return;
						}
						else
						{
							Application.tryAgain('file lock not in sync');		
							return;
						}
					}
					// we are joining a kindof fresh coediting session....
					else if( fileinfo.active_file_lock && fileinfo.lock_document_key )
					{
						Application.checkDocumentSession( fileinfo.sasid );
						return;
					}				
				}
			}
			catch (e )
			{
				fileinfo = {};
			}

			// we should only get below this line if no file lock has been found -------------------------------
			Application.lockFileForEditing( fileItem, fileinfo );
		}
		else
		{
			Application.tryAgain('load_document_info failed' + d );
		}
	}
	m.execute( 'load_document_info', {"diskpath" : fileItem.Path, "sourcepath":(fileItem.SourcePath?fileItem.SourcePath:false) } );
}

/*
	lock file for editing - important for co-editing purposes
*/
Application.lockFileForEditing = function( fileItem, fileinfo )
{
	let executelock = true;
	let editstatus = 'OPEN';
	
	fileItem.fileKey = fileinfo.lock_document_key = Application.createFileKey( Application.fileItem );
	Application.fileItem = fileItem;

	// check if there is ongoing editing and we are not part of it
	if( Application.fileInfo && Application.fileInfo.active_lock_user && Application.fileInfo.active_lock_user.length > 0 )
	{
		editstatus = 'LOCKED';
		for(i=0;i< Application.fileInfo.active_lock_user.length; i++ )
		{
			if( Application.fileInfo.active_lock_user[i] ==  Application.username )
			{
				editstatus = Application.fileInfo.active_lock_user.length > 1 ? 'COLLIDING_SESSION' : 'OPEN';
			}
		}
	}
	
	//we ignored  editstatus == 'COLLIDING_SESSION' || editstatus == 'LOCKED') )
	// and do not Application.askforOverride();
	Application.executeFileLock(fileItem, fileinfo);
};

/*
	give user choice to do stuff when a file is locked by others and not too old
*/
Application.fileisLocked = function()
{
	if( !Application.notEditing ) return;

	var msgtext = i18n('i18n_document_seems_being_edited_prefix') + ' ' + Application.fileInfo.active_lock_user.join(', ') + i18n('i18n_document_seems_being_edited_suffix');
	
	Confirm(i18n('i18n_document_seems_being_edited_title'),msgtext,function( result )
	{
		// Confirmed!
		if( result && result.data && result.data == true )
		{
			//ok == open a copy!

			Application.loadFileIntoEditor( Application.fileItem, Application.fileInfo, 'opencopy' );
			executelock = false;
		}
		else if( result && result.data && result.data == "-1" )
		{
			// open read only here
			Application.loadFileIntoEditor( Application.fileItem, Application.fileInfo, 'view' );
			Application.documentView.setMenuItems( Application.editOnlyMenuItems );
			executelock = false;
		}
		else
		{
			//just abort the mission
			Application.quit();				
		}
	}, i18n('i18n_editcopy'),i18n('i18n_cancel'),i18n('i18n_view_last_saved_version'), -1 );
	return;
}

/*
	give user choice to do stuff when a file is locked by others and not too old
*/
Application.askforOverride = function(fileItem, fileinfo)
{
	if( !Application.notEditing ) return;

	var msgtext = i18n('i18n_document_seems_being_edited_prefix') + ' ' + Application.fileInfo.active_lock_user.join(', ') + i18n('i18n_document_seems_being_edited_suffix_override');
	
	Confirm(i18n('i18n_document_seems_being_edited_title'),msgtext,function( result )
	{
		// Confirmed!
		if( result && result.data && result.data == true )
		{
			//ok == override current editing session
			Application.executeFileLock( Application.fileItem, Application.fileInfo, true);
		}
		else if( result && result.data && result.data == "-1" )
		{
			// open read only here
			Application.loadFileIntoEditor( Application.fileItem, Application.fileInfo, 'view' );
			Application.documentView.setMenuItems( Application.editOnlyMenuItems );
			Application.ignoreFileLock = true;
		}
		else
		{
			//just abort the mission
			Application.quit();				
		}
	}, i18n('i18n_override_session'),i18n('i18n_cancel'),i18n('i18n_view_last_saved_version'), -1 );
	return;
}

Application.executeFileLock = function( fileItem, fileinfo, forcemode = false )
{	
	fileinfo.original_name = fileItem.Filename;
	fileinfo.original_path = fileItem.SourcePath ? fileItem.SourcePath : fileItem.Path; // if its a virtual FS, we need to go to the source.
	fileinfo.active_file_lock = true;
	fileinfo.active_lock_user = [ Application.username ];
	fileinfo.active_lock_user_windows = {};
	
	if( Application.mainViewID ) fileinfo.active_lock_user_windows[ Application.username ] = Application.mainViewID;
	if( Application.sasid ) fileinfo.sasid = Application.sasid;

	Application.fileInfo = fileinfo;
	Application.isHost = true;
	
	if( Application.sas == null )
		Application.checkDocumentSession();
	else
		Application.lockCreateInfoFile( fileItem, fileinfo, forcemode );
}

Application.lockCreateInfoFile = function( fileItem, fileinfo, forcemode = false )
{
	if(fileinfo.message == 'FILEINFO_DOESNT_EXIST') delete fileinfo.message;
	if(fileinfo.fileinfo == 0) delete fileinfo.fileinfo;

	//set lock and open....
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		//console.log('file lock set?', d);
		if( e == 'ok' )
		{
			Application.loadFileIntoEditor( fileItem, fileinfo );
			setTimeout( Application.revalidateFileLock, 3000 );
		}
		else
		{
			Application.tryAgain('set_file_lock failed: ' + e + ' / ' + d );
		}
	}
	m.execute( 'set_file_lock', {"diskpath" : fileItem.Path, "fileinfo" : fileinfo, "sourcepath":(fileItem.SourcePath?fileItem.SourcePath:false), "previouslock": Application.previousFileLock, "forcemode":(forcemode?'YES':'NO') } );	
}

Application.setUserViewID = function( docViewID )
{
	if( Application.fileInfo && !Application.fileInfo.original_path ) return;
	
	//set lock and open....
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		//console.log('file lock set?', d);
		if( e == 'ok' )
		{
			console.log('view id set' + d);
		}
		else
		{
			console.log('could not set viewid' + d);
		}
	}
	m.execute( 'set_user_appview_id', {
		'username':   Application.username, 
		'viewid':     docViewID, 
		'diskpath':   Application.fileInfo ? Application.fileInfo.original_path : '', 
		'sourcepath': ( Application.fileItem && Application.fileItem.SourcePath ? Application.fileItem.SourcePath : false )
	} );
}

/*
	double check our file lock in case several people went in at the about exact same time 
	and more then the allowed one got through.
*/
Application.revalidateFileLock = function()
{
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		if( e == 'ok' )
		{
			var fileinfo = false;
			try
			{
				fileinfo = JSON.parse( d );
				if( !( fileinfo.lock_document_key && Application.fileInfo.lock_document_key == fileinfo.lock_document_key ) )
				{
					// this might happen if somebody sneaked into the lock file after we tried to set our lock... we will just join that other 
					// users session...			
					Notify({'title':i18n('i18n_could_not_lock_file'),'text':i18n('18in_lockfile_error') });
					Application.tryAgain('file lock got out of sync');
				}
			}
			catch (e )
			{
				Notify({'title':i18n('i18n_could_not_lock_file'),'text':i18n('18in_lockfile_error') });
				Application.quit();
			}
		}
		else
		{
			Application.tryAgain('revalidate failed');
		}
	}
	m.execute( 'load_document_info', {"diskpath" : Application.documentPath, "sourcepath":(Application.fileItem.SourcePath?Application.fileItem.SourcePath:false) } );
};

/*
	try again...somehow our initial doc opening doesnt work.
*/
Application.tryAgain = function(errmsg)
{
	if( errmsg ) console.log(errmsg);
	var nextTryPath = Application.documentPath;
	var quitme = Application.quit;
	var wrap = function()
	{
		//Notify( {'title':i18n('i18n_error'),'text':i18n('i18n_unexpected_error_retrying')} );
		Application.quit();
	}

	if( Application.retries > 1 )
	{
		//Notify( {'title':i18n('i18n_error'),'text':i18n('i18n_unexpected_error_retrying')} ); 
		Application.quit();
	}
	Application.retries++;

	// same lines as for replace view....
    if( Application.sas )
    {
        Application.sas.close();
        delete Application.sas;
        Application.sas = null;
    }
    
	Application.documentPath = msg.path;
	Application.notEditing = Application.replaceView = true;
	Application.loadFile( Application.documentPath );
}

/*
	load a file into the editor...
*/
Application.loadFileIntoEditor = function( fileItem, fileInfo, mode )
{
	if( !Application.notEditing ) return;
	Application.notEditing = false;

	// Called with false, meaning, new file!
	if( !fileItem )
	{
		var f = new File( 'Progdir:Templates/Document.html' );
		f.onLoad = function( data )
		{
			// Add the file and set the new file
			Application.currentFile = { fileItem: false };
			Application.documentView.setFlag( 'title', 'New document' );


			var fileKey = Application.createFileKey(false);
			Application.documentView.setContent( data, function()
			{
				if( Application.printServerSide ) Application.documentView.sendMessage( { 'command': 'setprint', 'target': 'server' } );

				Application.documentView.sendMessage( { 'command': 'setpath', 'path': 'newdocument' } );
				Application.documentView.sendMessage( { 'command': 'setkey', 'key': fileKey } );
				Application.documentView.sendMessage( { 'command': 'sethost', 'host':  Application.friendDomain } );
				Application.documentView.sendMessage( { 'command': 'setfilename', 'filename': 'New_document.docx', 'newfile': true } );
				Application.documentView.sendMessage( { 'command': 'setinterface', 'api': Application.api_interface } );
				Application.documentView.sendMessage( { 'command': 'loaddoc' } );

				// Register this filename for now
				Application.currentFilename = 'New_document.docx';

				// Make a new window with some flags
				Application.documentView.setFlag( 'invisible', false );
			} );
		}
		f.replacements = {
			'onlyoffice_api_interface': Application.api_interface
		};
		f.i18n();
		f.load();

		return;
	}


	if( !fileItem.Filename || !fileItem.Path )
	{
		Notify( {'title': i18n( 'i18n_error' ), 'text': i18n( 'i18n_nofile_selected' ) } );
		return false;
	}
	var ext = fileItem.Filename.split( '.' ).pop();

	if( Application.validFiles.indexOf( ext ) > -1 )
	{
		// Add the file and set the new file
		Application.currentFile = { fileItem: fileItem };
		Application.currentFilename = fileItem.Path;

		// Load a file from the same dir as the jsx file is located
		var f = new File( 'Progdir:Templates/Document.html' );
		f.onLoad = function( data )
		{

			// Set it as window content
			Application.documentView.setContent( data, function()
			{
				if( Application.printServerSide ) Application.documentView.sendMessage( { 'command': 'setprint', 'target': 'server' } );

				var documentKey = ( fileItem.fileKey );
				Application.documentView.sendMessage( { 'command' : 'setpath', 'path': fileItem.SourcePath ? fileItem.SourcePath : fileItem.Path} );
				Application.documentView.sendMessage( { 'command' : 'setkey', 'key': documentKey } );
				Application.documentView.sendMessage( { 'command' : 'sethost', 'host':  Application.friendDomain } );
				Application.documentView.sendMessage( { 'command' : 'setfilename', 'filename': fileItem.Filename } )
				Application.documentView.sendMessage( { 'command' : 'setinfo', 'info': fileInfo } );

				if( mode ) Application.documentView.sendMessage( { 'command' : 'seteditmode', 'mode': mode } );

				Application.documentView.sendMessage( { 'command' : 'loaddoc' } );


				// Make a new window with some flags
				Application.documentView.setFlag( 'invisible', false );
				Application.documentView.setFlag( 'title', ( fileInfo && fileInfo.original_name ? fileInfo.original_name : fileItem.Path ) );
			} );

		}
		f.replacements = {
			'onlyoffice_api_interface': Application.api_interface
		};
		f.i18n();
		f.load();
	}
	else
	{
		Application.displayError( i18n('i18n_invalid_filetype'), true );
		if( Application.isFirstInRow )
		{
			Application.loadFile();
		}
	}

};

/*
	Create a unique key for this file
*/
Application.createFileKey = function( fileItem )
{
	var str = '';
	if( !fileItem )
	{
		str = 'newdoc' + Application.userId + ( new Date().getTime() ) + Math.random();
	}
	else
	{
		str = (fileItem.DateModified ? fileItem.DateModified + '-' : '' + new Date().getTime() )  + fileItem.Path ;
	}

	var hash = 5381;
	for( var a = 0; a < str.length; a++ )
	{
		hash += ( ( str.charCodeAt( a ) * a ) << 8 );
	}
    var out = 'fd' + (fileItem.FSID ? fileItem.FSID + '-' : Application.userId + '-' ) + ( Application.sasid ? '' + Application.sasid : 'NOSAS' ) + hash.toString( 12 );
    return out.substring(0, 19);
};

/*
	add current user to documents file info used for coediting sessions
*/
Application.addUserToFileLock = function( fileItem, currentInfo )
{
	if( Application.userAddedToFileLock ) return;
	Application.userAddedToFileLock = true; // a bit presumptios... but we avoid doing this too often :)

	//set lock and open....
	var m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		//console.log('user added to file lock?',e, d);
		if( e == 'ok' )
		{
			// we are in. open it.
			Notify({'title':i18n('i18n_joining_coediting'),'text':i18n('i18n_joining_coediting_desc') + ' ' + Application.fileInfo.active_lock_user[0] });

			Application.fileItem.Path =  Application.fileInfo.shadowfile;
			Application.fileItem.fileKey =  Application.fileInfo.lock_document_key;

			Application.loadFileIntoEditor( Application.fileItem, Application.fileInfo );
		}
		else
		{
			//SOMETHING BAD HAPPENED!
			Notify({'title':i18n('i18n_error'),'text':i18n('i18n_could_not_join') });
			Application.userAddedToFileLock = false;

			Application.retryServerInfo();
		}
	}

	var newinfo = {};
	newinfo.addUserToLockOnly = true;
	newinfo.lock_document_key = currentInfo.lock_document_key;
	newinfo.userToAdd = Application.username;

	m.execute( 'add_user_to_file_lock', {"diskpath" : fileItem.Path, "sourcepath":(fileItem.SourcePath?fileItem.SourcePath:false), "fileinfo" : newinfo } );
}

/*
	Display a window with information about the current document
*/
Application.showDocumentInformation = function()
{
	if( Application.infoView && typeof Application.infoView.focus == 'function' )
	{
		Application.infoView.focus();
	}
	else
	{
		// Make a new window with some flags
		Application.infoView = new View( {
			title: i18n( 'i18n_document' ),
			width: 280,
			height: 280,
			invisible: false
		} );

		var s = '';
		var prop = false;
		if( Application.fileItem )
		{
			s += '<h3>Document information:</h3><ul>';
			for( prop in Application.fileItem )
			{
				s +=  '<li><i>'+ prop +'</i>:<br />'+ Application.fileItem[ prop ] +'</li>';
			}
			s+= '</ul>';
		}
		else
		{
			s += '<h3>New document. No information available.</h3>';
		}


		if( Application.fileInfo )
		{
			s += '<h3>Additional metadata:</h3><ul>';
			for( prop in Application.fileInfo )
			{
				s +=  '<li><i>'+ prop +'</i>:<br />'+ Application.fileInfo[ prop ] +'</li>';
			}
			s+= '</ul>';
		}

		// Load a file from the same dir as the jsx file is located
		var f = new File( 'Progdir:Templates/DocumentInfo.html' );
		f.onLoad = function( data )
		{
			// Set it as window content
			Application.infoView.setContent( data, function()
			{
				//console.log('infoView here???');
			} );
		}
		f.replacements = {
			'docinfo': s
		};
		f.i18n();
		f.load();

		// On closing the window, quit.
		Application.infoView.onClose = function()
		{
			Application.infoView = false;
		}
	}
}

/*
	Display an error message. and quit
*/
Application.displayError = function(errmsg,dontQuit)
{
	Notify({'title':i18n('i18n_error'),'text':errmsg});
	if( dontQuit !== true ) Application.quit();
}

/* SAS functions to connect users coeiting a document... SAS session key is the document key we use :) */
// ### === # ### === # ### === # ### === # ### === # ### === # ### === # ### === #
Application.checkDocumentSession = function( sasID = null )
{
	if( Application.sas !== null )
	{
		console.log('SAS already initialised!');
		return;
	}
	
	console.log('init SAS ID',sasID, Application.isHost );
	var conf = {
		sasid   : sasID,
		onevent : Application.socketMessage 
	};
	
	//if we are the host, initialise an open session
	if( !sasID ) conf.sessiontype = "open";
	
	if( sasID ) Application.sasid = sasID;
	Application.sas = new SAS( conf, Application.sasidReady );
	//console.log('SAS instantiated.',conf);
}


// ### === # ### === # ### === # ### === # ### === # ### === # ### === # ### === #
Application.sasidReady = function( result )
{
	//console.log('sasid Ready...',result);
	if( Application.sasBackup ) clearTimeout( Application.sasBackup );
	if( result.response == 'success' )
	{
		// seems we joined a session, continue as planned.
		Application.bindClientEvents();
		//do a double check for the host.
		Application.sas.send( {type:'check',data:Application.fileInfo } );
		Application.sasBackup = setTimeout( Application.noPositiveSASResponse, 3000 );
		Application.startSASKeepAlive();
	}
	else if( result.code && result.code == "45" && !Application.forceSASID )
	{
		//fallback; host is gone - check if anybody else is still on and take over if nobody is there.
		if( Application.sas )
		{
			
			Application.sas.close();
			delete Application.sas;
			Application.sas = null;
		}
		
		Application.checkDocumentSession();
	}
	else if( result.SASID )
	{
		// we are not host, but ended on our own session... see for other users and compare them to our lock list.
		// we promote oourselves to "host" and set our new session to be the current SAS for this document
		Application.isHost = true;
		Application.bindHostEvents();
		
		// we establish ourselves as master editor for the files
		Application.sasid = Application.fileInfo.sasid = result.SASID;
		Application.lockFileForEditing( Application.fileItem, Application.fileInfo );
		Application.startSASKeepAlive();
		
	}
	else
	{
		console.log('some unhandled sasidReady result', JSON.stringify( result ), 'Reinitializing sas' );
		Application.reInitSas();
	}	
};

/**
	create a fallback for SAS telling us we have participants in a session, but nobody actually greeting us.
	we are alone, we take over this file.
*/
Application.noPositiveSASResponse = function()
{
	if( Application.sas )
	{
		Application.sas.close();
		delete Application.sas;
		Application.sas = null;
	}

	Application.checkDocumentSession();
}

// ### === # ### === # ### === # ### === # ### === # ### === # ### === # ### === #
Application.sasClosed = function( evt )
{
	console.log('sasClosed!', evt);
}

Application.socketMessage = function( sm )
{
	//console.log('got a socket message for us...',sm);
	if( sm && sm.data && sm.data.type )
	{
		switch( sm.data.type )
		{
			case 'file-saved':
				Application.handleSaSSaved( sm );
				break;
		}
	}
}

// ### === # ### === # ### === # ### === # ### === # ### === # ### === # ### === #
Application.bindHostEvents = function()
{
	Application.sas.on( 'sasid-close', Application.sasClosed );
	Application.sas.on( 'check', Application.handleSasHostEvent );
	Application.sas.on( 'file-saved', Application.handleSaSSaved );
	Application.sas.on( 'delay-autosave', Application.delayAutoSave );

}

// ### === # ### === # ### === # ### === # ### === # ### === # ### === # ### === #
Application.bindClientEvents = function()
{
	Application.sas.on( 'sasid-close', Application.sasClosed );
	Application.sas.on( 'check', Application.handleSasClientEvent );
	Application.sas.on( 'file-saved', Application.handleSaSSaved );
	Application.sas.on( 'delay-autosave', Application.delayAutoSave );
}

Application.startSASKeepAlive = function()
{
	if( Application.saskeepalivetimeout ) clearInterval( Application.saskeepalivetimeout );
	Application.saskeepalivetimeout = setInterval( Application.sasKeepAlive, 10000 );
}

Application.sasKeepAlive = function()
{
	if( Application.checksas )
	{
		delete Application.checksas;
		Application.checksas = null;
	};
	
	var conf = {
		sasid   : Application.sasid,
		onevent : Application.socketMessage 
	};

	Application.checksas = new SAS( conf, Application.sasKeepAliveCheck );
}
Application.sasKeepAliveCheck = function( result )
{
	//console.log( 'sasKeepAliveCheck ', JSON.stringify( result ) );
	if( result.response == 'success' )
	{
		// our sas id is known to the server... great. kill the fallback and try again later
		delete Application.checksas;
		Application.checksas = null;
		
	}
	else if( result.code && result.code == "45" )
	{
		clearInterval( Application.saskeepalivetimeout );
		Application.reInitSAS();
	}
	else if( result.SASID )
	{
		console.log('what to do here... sasKeepAliveCheck result.SASID ');
	}
	else
	{
		console.log('what to do here... sasKeepAliveCheck else ');
	}
}

Application.reInitSAS = function()
{
	var conf = {
		sasid   : Application.sasid,
		onevent : Application.socketMessage,
		sessiontype : "open",
		forceid : true
	};
	
	//if we are the host, initialise an open session
	delete Application.sas;
	Application.sas = null;
	
	Application.forceSASID = true;
	Application.sas = new SAS( conf, innerCB );
	function innerCB(rs) { Application.sasidReady(rs); }

}

Application.checkForOthers = function()
{
	if( Application.sas === null ) return;

	if( Application.isHost )
		Application.sas.send( {type:'check',data:{'hostishere':true} } );
	else
		Application.sas.send( {type:'check',data:{'anotherclient':true} } );

}

Application.handleSaSSaved = function( dataset )
{
	Application.documentView.setFlag( 'title', (Application.fileInfo && Application.fileInfo.original_name ? Application.fileInfo.original_name : '' ) );
	Application.editState = false;
}

Application.delayAutoSave = function( dataset )
{
	console.log('delayAutoSave called', JSON.stringify(dataset));
	Application.documentView.sendMessage({'command':'delay_autosave'});
}

Application.handleSasHostEvent = function( event, identity )
{
	if( Application.sasBackup ) { clearTimeout( Application.sasBackup ); Application.sasBackup = false; }
	if( event.hostishere || event.anotherclient )
	{
		if( Application.notEditing ) Application.addUserToFileLock( Application.fileItem, Application.fileInfo );
	}
	else if( event.keepalive )
	{
		console.log('sas kept alive...');
	}
	else
	{
		// feed back to SAS
		Application.sas.send( {type:'check',data:{'hostishere':true } } );
	}
}

Application.handleSasClientEvent = function( event, identity )
{
	if( Application.sasBackup ) { clearTimeout( Application.sasBackup ); Application.sasBackup = false; }
	Application.handleSasHostEvent( event, identity )
}
