Application.documentPath = false;
Application.documentKey = false;
Application.friendHost = false;
Application.fileName = 'Untitled.docx';
Application.currentVersion = 1;
Application.newFile = false;
Application.changeStateCount = 0; // Track amount of change states
Application.documentReady = false;
Application.documentInfo = false;
Application.printServerSide = false;
Application.documentURL = false;
Application.documentIsPrinting = false;
Application.documentChanged = false;
Application.apiCheckCounter = 0;

Application.run = function()
{
	Application.sendMessage({'command':'setviewid','viewid':Application.viewId});
};

Application.receiveMessage = function( msg )
{
	if( !msg.command ) return;
		
	switch( msg.command )
	{
		case 'workspace-notify':
			if( msg.state )
			{
				if( msg.state == 'offline' )
				{
					window.blur();
					Application.showOverlay( i18n( 'i18n_you_are_offline' ), i18n( 'i18n_you_are_offline_desc' ) );
				}
				else if( msg.state == 'online' )
				{
					Application.hideOverlay();
				}
			}
			break;
			
		case 'drop':
			this.sendMessage( {
				command: 'open_new',
				path: msg.data[ 0 ].Path
			});
			break;
		
		case 'setprint':
			if(msg.target == 'server') Application.printServerSide = true;
			break;

		case 'setpath':
			Application.documentPath = msg.path;
			break;

		case 'setinfo':
			Application.documentInfo = msg.info;
			break;

		case 'setkey':
			Application.documentKey = msg.key;
			break;

		case 'setinterface':
			Application.api_interface = msg.api;
			break;

		case 'seteditmode':
			if( msg.mode == 'view' )
			{
				Application.editMode = 'view';
			}
			else if( msg.mode == 'opencopy' )
			{
				Application.editMode = 'view';
				Application.editCopy = true;
			}
			break;


		case 'sethost':
			Application.friendHost = msg.host;
			break;						

		case 'save':
			if( !this.documentPath || this.documentPath.indexOf( ':' ) <= 0 )
			{
				return this.sendMessage( { command: 'save_as' } );
			}
				
			if( msg.quit_after_save )Application.quit_after_save = true;

			if( this.pDocEditor )
			{
				this.pDocEditor.downloadAs();
				Application.resetBackgroundSaveTimeout( true );
			}	
			break;

		// Force reload document!
		case 'reload_document':
			Application.triggerReconnectDocument();
			break;

		case 'open_save_as':
			//send this up the tree... but only if we are on a new document that needs a proper path... otherwise just ignore this as the server will handle it between them :)
			if( Application.documentPath.indexOf(":") == -1 ) Application.sendMessage({"command":"save_as"});
			break;

		case 'file_saved':
		{
			let fn;
			if( Application.documentInfo && Application.documentInfo.original_name )
			{
				fn = Application.documentInfo.original_name
			}
			else
			{
				fn = Application.documentPath.indexOf(":") != -1 ? Application.documentPath.split( ':' )[1] : '';
				if( fn && fn.indexOf( '/' ) > 0 ) fn = fn.split( '/' ).pop();
			}
			Application.sendMessage( {	command: 'saveresponse', response: 'success',	filename: fn, savemode: Application.saveMode } );
			Application.saveMode = false;
		}
		break;
		case 'background_save':
			if( Application.documentPath && Application.documentPath.indexOf( ':' ) > 0 )
			{
				Application.saveMode = 'background';
				Application.resetBackgroundSaveTimeout( true );
				Application.backgroundSave();
			}
			break;

		case 'save_as':
			if( this.pDocEditor )
			{
				Application.saveMode = 'saveas';
				if( msg.newpath ) Application.saveAsPath = msg.newpath;
				if( msg.newkey ) Application.saveAsKey = msg.newkey;
				this.pDocEditor.downloadAs();
			}	
			break;
		

		case 'setfilename':
			// This is just a new file
			if( msg.newfile )
			{
				Application.newFile = true;
			}
			Application.fileName = msg.filename;		
			break;

		case 'loaddoc':
		    console.log( 'loaddoc: Trying to load document.' );
			Application.loadDocument();
			break;

		case 'insert_image':
			if( Application.documentReady ) Application.loadImage();
			break;						

		// BG-1442 - implement download message --------------------------------
		case 'download_as':
			console.log( 'Unused event data: ', msg.eventData );
			if( Application.pDocEditor )
				Application.pDocEditor.onDownloadAs();
			else console.log( 'Nothing could be done.' );
			break;
		// BG-1442 - done implement download message ---------------------------

		case 'check_printsettings':
			if( Application.printServerSide ) Application.setPrintingServerSide()	
			break;

		case 'print_to_server':
			Application.printFileServerSide();
			break;

		case 'insert_page_break': 
			if( Application.documentReady ) Application.insertPageBreak();
			break;	
			
		case 'align_left':
		case 'align_center':
		case 'align_right':
		case 'align_just':
			if( Application.documentReady ) Application.alignText( msg.command );
			break;

		case 'keydown':
			Application.resetBackgroundSaveTimeout();
			break;

		case 'delay_autosave':
			Application.resetBackgroundSaveTimeout( true );
			break;

		case '':
		default:
			console.log( 'Uncaught message: ', msg );
			break;
		
	}
};

// reset our bg save timer... ------------------------
Application.resetBackgroundSaveTimeout = function( donttriggernewone )
{
	if( Application.backgroundSaveTimeout ) clearTimeout( Application.backgroundSaveTimeout );

	if( donttriggernewone ) return;
	if( Application.documentPath && Application.documentPath.indexOf( ':' ) > 0 )
	{
		Application.backgroundSaveTimeout = setTimeout(function(){
			console.log('we got to our manual bg save... ');
			Application.saveMode = 'background';
			Application.backgroundSave();
		}, 3000);
	}
}

// Overlays that can block the user of doing operations ------------------------
Application.showOverlay = function( title, description )
{
	// Steal focus
	let inp = document.createElement( 'input' );
	inp.style.position = 'absolute';
	inp.style.opacity = 0;
	document.body.appendChild( inp );
	setTimeout( function(){ inp.focus(); }, 25 );
	setTimeout( function(){ document.body.removeChild( inp ); }, 250 );
	// Set read only
	if( window.editor )
		window.editor.asc_setViewMode( true )
	
	let self = this;
	if( !this.viewoverlay )
	{
		let d = document.createElement( 'div' );
		d.className = 'DocumentOverlay';
		document.body.appendChild( d );
		this.viewoverlay = d;
	}
	this.viewoverlay.innerHTML = '<div><h2>' + title + '</h2><p>' + description + '</p></div>';
	setTimeout( function(){ if( self.viewoverlay && self.viewoverlay.classList ){ self.viewoverlay.classList.add( 'Showing' ); } }, 5 );
}

Application.hideOverlay = function( title, description )
{
	// Set read/write
	if( window.editor )
		window.editor.asc_setViewMode( false );
	
	// Remove overlay
	let self = this;
	if( this.viewoverlay )
	{
		this.viewoverlay.classList.remove( 'Showing' );
		let s = this.viewoverlay;
		this.viewoverlay = null;
		setTimeout( function(){ document.body.removeChild( s ); }, 250 );
	}
}
// End overlays ----------------------------------------------------------------

// Online / offline handling
document.body.onoffline = function()
{
	Application.receiveMessage( { command: 'workspace-notify', state: 'offline' } );
}


Application.setPrintingServerSide = function()
{
	let editor = false;
	let ooi  = document.getElementById("oocontainer");
	if( ooi ) editor = ooi.getElementsByTagName('iframe')[0].contentWindow;
	if( editor ) editor.postMessage('{"command":"setserversideprint"}','*');

}

Application.alignText = function( direction )
{
	let editor = false;
	let ooi  = document.getElementById("oocontainer");

	if( ooi ) editor = ooi.getElementsByTagName('iframe')[0].contentWindow;
	else console.log('we dont have an element with ID oocontainer ?????');

	if( editor)
	{
		editor.postMessage('{"command":"'+ direction +'"}','*');
	}
};

Application.insertPageBreak = function()
{
	let editor = false;
	let ooi  = document.getElementById("oocontainer");

	if( ooi ) editor = ooi.getElementsByTagName('iframe')[0].contentWindow;
	else console.log('we dont have an element with ID oocontainer ?????');
	
	if( editor)
	{
		editor.postMessage('{"command":"insert_page_break"}','*');
	}
};

Application.backgroundSave = function()
{
	//tell collaborators to not save at the same time as us
	Application.sendMessage({'command':'init_autosave_delay'});
	setTimeout(function(){

		let editor = false;
		let ooi  = document.getElementById("oocontainer");
	
		if( ooi ) editor = ooi.getElementsByTagName('iframe')[0].contentWindow;
		if( editor)
		{
			editor.postMessage('{"command":"background_save"}','*');
		}		
	},250);
}

Application.loadImage = function()
{

	let editor = false;
	let ooi  = document.getElementById("oocontainer");

	if( ooi ) editor = ooi.getElementsByTagName('iframe')[0].contentWindow;
	else console.log('we dont have an element with ID oocontainer ?????');
	
	if( editor)
	{
		Application.ooEditor = editor;

		// Open a load file dialog and return selected files
		let description = {
			suffix: [ 'png','jpg','jpeg','gif' ], // same as 10 lines below !!!
			triggerFunction: function( items )
			{
				console.log( "These files and directories were selected 1a:", items );
				
				if( items && items.length > 0 )
				{
					//console.log('go through our items here...')
					//we do file extensio based parsing for now... and insert all files we deem valid :)
					let ext = '';
					let valid_extensions = [ 'png','jpg','jpeg','gif' ];
					for(let i = 0; i < items.length; i++)
					{
						ext = (items[i].Filename.match(/\.([^.]*?)(?=\?|#|$)/) || [])[1];
						
						if( valid_extensions.indexOf ( ext.toLowerCase() ) != -1 )
						{
							
							//URL here follow same schema as loadDocument method uses for loading a document into the editor							
							let imageURL = Application.friendHost + "/fileaccess/getfile/"+ encodeURIComponent( items[i].Path ) +"/user/" + Application.username  + '/' + Application.authId + '/' + Application.viewId;
							editor.postMessage('{"command":"insert_image_from_url","image_url":"'+ imageURL +'"}','*');

							//we only insert one image at a time...
							break;
						}
					}					
				}
				else
				{
					Notify( { title: i18n('i18n_no_files_selected'), text: i18n('i18n_no_image_to_insert') } );
				}				

				
			},
			path: "Mountlist:",
			type: "load",
			title: i18n('i18n_insert_image'),
			rememberPath: true,
			filename: "",
			multiSelect: false,
			mainView: Application.viewId
		}
		// Open the file dialog view window
		let d = new Filedialog( description );
		
	}
	else console.log('we dont have an the editor?');

}

Application.triggerReconnectDocument = function()
{
	Confirm(i18n('i18n_reload_document'),i18n('i18n_reload_document_confirm'),function( result )
	{
		// Confirmed!
		if( result && result.data && result.data == true )
		{
			//ok == we want to save and then quit
			Application.reconnectDocument()
		}
		else if( result && result.data && result.data == "-1" )
		{
			//.. dont do anything here...
		}
	}, i18n('i18n_reload_document'),i18n('i18n_cancel') );
}

// BG-1442 - Try to reconnect to document --------------------------------------
Application.reconnectDocument = function( cbk )
{
	if( typeof( DocsAPI ) == 'undefined' )
	{
	    if( cbk ) return ckb( false, 'API not ready' );
	    return;
	}

	if( Application.documentURL && Application.pConfig )
	{
		Application.pConfig.document.key = md5( ( new Date() ).getTime() + ( Math.random() * 999999 ) + '' ).toString();
		Application.pDocEditor.destroyEditor();
		Application.pDocEditor = new DocsAPI.DocEditor( "ooinner", Application.pConfig );
	    if( cbk ) return cbk( true, 'Setting up document' );
	    return;
	}
	if( cbk ) return ckb( false, 'Unrecoverable' );
}
// End BG-1442 -----------------------------------------------------------------

Application.loadDocument = function()
{
	if( typeof( DocsAPI ) == 'undefined' )
	{
		console.log( 'The API is not ready.' );
		Application.apiCheckCounter++;
		if( Application.apiCheckCounter < 100 )	return setTimeout( 'Application.loadDocument()', 100 );
		Notify( { title: i18n('i18n_error'), text: i18n('i18n_invalid_configuration') } );
		Application.quit();
	}
	
	let ext = Application.fileName.split( '.' ).pop();

	Application.documentURL = Application.friendHost + "/fileaccess/getfile/"+ encodeURIComponent( Application.documentPath ) +"/user/" + Application.username + '/' + Application.authId + '/' + Application.viewId;
	
	console.log( 'Final clown url! -> ' + Application.documentURL );

	let pconfig = {
	    "document": {
	        "fileType": "docx",
	        "key": Application.documentKey,
	        "title": Application.fileName,
	        "url": Application.documentURL
	    },
	    "documentType": "text",
	    "type": ( window.isMobile || window.isTablet ) ? 'mobile' : 'desktop',
	    "editorConfig": {
	        "mode": ( Application.editMode ?  Application.editMode : 'edit'),
	        "createUrl": Application.friendHost + "/fileaccess/callback/newfile/" + encodeURIComponent( Application.documentPath ) + "/user/" + Application.username + '/' + Application.authId + '/' + Application.viewId,
	        "callbackUrl": Application.friendHost + "/fileaccess/callback/file/" + encodeURIComponent( Application.documentPath ) +"/user/" + Application.username + '/' + Application.authId + '/' + Application.viewId, 
	        "user":{
	    		"name":Application.fullName, // Change in Hydrogen3 from .username
	    		"id":Application.username
	        },
			 "customization":{
        		   "forcesave": true,
				   "chat": false,
		            "commentAuthorOnly": false,
		            "compactToolbar": false,	        
		            "customer": {
		                "address": "Stavanger, Norway",
		                "info": "Friend | The Internet OS",
		                "logo": Application.filePath + 'logobig.png',
		                "mail": "info@friendos.com",
		                "name": "Friend Software",
		                "www": "friendos.com"
		            },
			        "logo":
			        {
			            "image": Application.filePath + 'oologo.png',
			            "imageEmbedded": Application.filePath + 'logobig.png',
			            "url": "https://friendos.com"
		        	},
                 },
		 "plugins": {
                     "autostart": [ "asc.{AA2BB87B-9F03-4160-8411-3AB4A5C71C39}" ],
                     "pluginsData": [ "../../../../sdkjs-plugins/friend/config.json" ]
                 }
	    },
	    "events":{
	    	"onError": Application.onError,
	    	"onWarning": Application.onWarning,
	    	"onDownloadAs": Application.onDownloadAs,
	    	"onCollaborativeChanges": Application.onCollaborativeChanges,
	    	"onDocumentStateChange": Application.onStateChange,
	    	"onOutdatedVersion": Application.onOutdatedVersion,
	    	"onRequestHistory": Application.onRequestHistory,
	    	"onAppReady":function() { Application.editorEvent( 'APP_READY'); },
	    	"onDocumentReady":function() {
	    		Application.editorEvent('DOCUMENT_READY')
	    	},
	    	"onRequestHistory": Application.onDocumentHistory
	    }
	};

	this.pDocEditor = new DocsAPI.DocEditor( "ooinner", pconfig );
	this.pConfig = pconfig;

	// Watch this file!
	AddFilesystemEvent( Application.documentPath, 'filesystem-change', function( msg )
	{
		if( Application.documentReady )
		{
			if( msg.path == Application.documentPath )
			{
				let fn = msg.path.split( ':' )[1];
				if( fn.indexOf( '/' ) > 0 )
					fn = fn.split( '/' ).pop();
			}
		}
	} );

};

Application.onCollaborativeChanges = function(evt)
{
	console.log( 'Doc history: ', evt );
};


Application.onDocumentHistory = function(evt)
{
	console.log( 'Doc history: ', evt );
};

// When we get a notification that our document is outdated!
Application.onOutdatedVersion = function( evt )
{
    // Check if we have a document
    Application.reconnectDocument( function( result, message )
    {
        if( result )
        {

        }
        else
        {
            if( Application.documentPath.indexOf( ':' ) > 0 )
            {
                    console.log( 'Trying to reload by document path: ' + Application.documentPath );
                    Application.sendMessage( {
                            command: 'replace_view',
                            path: Application.documentPath
                    } );
            }
            // Probably an unsaved document... probably should just load a fresh instance
            else
            {
                    console.log( 'Nothing to do with a fresh document...' );
            }
        }
    } );
    // End BG-1442 -------------------------------------------------------------
}

Application.onRequestHistory = function( evt )
{
	console.log( 'Request history: ', evt );
};

// Parse errors here
Application.onError = function( evt )
{
	console.log( 'Error: ', evt );
}

// Parse warnings here
Application.onWarning = function( evt )
{
	console.log( 'Warning: ', evt );
	if(evt.data && evt.data.warningCode && evt.data.warningCode == -331)
	{
		Application.sendMessage({'command':'save'});
		//console.log('open save as dialog here!');
	}

	evt.stopPropagation();
	return false;
}

// When the state of the application changes - for example, you have edited
Application.onStateChange = function( evt )
{
	if( evt.data )
	{
		Application.documentChanged = true;
		Application.changeStateCount++;
	
		Application.sendMessage( {
			command: 'statechange',
			state: 'edited',
			filename: Application.documentPath
		} );
	}
}



// When downloading as, check response
Application.onDownloadAs = function( evt )
{
	let dpath = Application.documentPath;

	if( Application.saveMode == 'saveas' )
	{
		dpath = Application.saveAsPath;
	}
	
	// Make sure the document is correct file extension
	if( dpath.indexOf( '.docx' ) <= 0 )
		dpath += '.docx';
	
	let m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		if( e == 'ok' )
		{
			let fn;
			if( Application.saveAsPath )
			{
				fn = Application.saveAsPath.indexOf(":") != -1 ? Application.saveAsPath.split( ':' )[1] : '';
				if( fn && fn.indexOf( '/' ) > 0 ) fn = fn.split( '/' ).pop();
			}
			else if( Application.documentInfo && Application.documentInfo.original_name )
			{
				fn = Application.documentInfo.original_name
			}
			else
			{
				fn = Application.documentPath.indexOf(":") != -1 ? Application.documentPath.split( ':' )[1] : '';
				if( fn && fn.indexOf( '/' ) > 0 ) fn = fn.split( '/' ).pop();
			}	
			
			Notify( { title: i18n('i18n_document'), text: i18n('i18n_document_was_saved_prefix') + ' ' + fn + ' ' + i18n('i18n_document_was_saved_suffix') } );
			Application.documentChanged = false;
			
			if( Application.quit_after_save ) { Application.sendMessage( { command: 'quit_app' } ); }

			if( Application.print_after_save ) Application.printFileServerSide();
			Application.print_after_save = false;
			
			if( Application.saveMode == 'saveas' )
			{
				Application.setDocumentPath( dpath );
			}
			else
			{
				Application.sendMessage( {
					command: 'saveresponse',
					response: 'success',
					filename: dpath
				} );
			}
		}
		else
		{
			Notify( { title: i18n('i18n_error_saving'), text: i18n('i18n_error_saving_text') } );
		}
		Application.saveMode = false;
	}
	m.execute( 'save_document', { path: evt.data, diskpath: dpath } );
}

// On save_as
Application.onRequestSaveAs = function( evt ) {
	console.log(evt);
}

/*
	Lets print our app to a daemon on the server. 
	
	First we call the conversion service, then we print the resulting PDF	
*/
Application.printFileServerSide = function()
{
	//there are some pre-requisites that need to be met before we can print server side :)
	if( Application.documentIsPrinting )
	{
		Notify({'title':i18n('i18n_already_printing'),'text':i18n('i18n_already_printing_text')});
		return;
	}
	else if ( Application.documentPath == 'newdocument' )
	{
		//we need to save to be able to print server side.
		Notify({'title':i18n('i18n_print_savefirst'),'text':i18n('i18n_print_savefirst_text')});
		return;
	} else if ( Application.documentChanged )
	{
		Application.print_after_save = true;
		if( Application.pDocEditor ) Application.pDocEditor.downloadAs();
		return;
	}

	// here we should have a saved document ready to be printed - tell the server to get it done.
	let tmp = Application.api_interface.split('/');
	let conversionServiceURL = tmp[0] + "//" + tmp[2] + '/ConvertService.ashx'; // [1] is empty due to the // in the URL
	
	let cdata = {
	    "async": false,
	    "filetype": "docx",
	    "key": Application.userId + '_print_' + new Date().getTime(),//Application.documentKey,
	    "outputtype": "pdf",
	    "title": Application.documentInfo.original_name ? Application.documentInfo.original_name : 'New document',
	    "url": Application.documentURL
	}
	
	let m = new Module( 'onlyoffice' );
	m.onExecuted = function( e, d )
	{
		if( e == 'ok' )
		{
			printFilePath = '';
			try
			{
				let tmp = JSON.parse( d );
				printFilePath = decodeURIComponent( tmp.conversionresult );
				console.log('Printing this file: ' + printFilePath );
			}
			catch(e)
			{
				Notify( { title: i18n('i18n_error_printing'), text: i18n('i18n_error_printing_text') + e + ' :' + d } );

				return;
			}
			
			if( !printFilePath )
			{
				Notify( { title: i18n('i18n_error_printing'), text: i18n('i18n_error_printing_text') +' :' + d } );
				return;
			}
			
			let print = new Printdialog( {
				file: printFilePath
			}, printCallBack );
			
			function printCallBack( result )
			{
				console.log( result );
				Notify( { title: i18n('i18n_printed'), text: i18n('i18n_printed_text') + ' :' + d } );
			}
		}
		else
		{
			Notify( { title: i18n('i18n_error_printing'), text: i18n('i18n_error_printing_text') + ' :' + d } );
		}
		Application.documentIsPrinting = false;
	}
	m.execute( 'print_document', { 'conversiondata': cdata, 'serviceurl':conversionServiceURL } );	
	Notify( { title: i18n('i18n_printing'), text: i18n('i18n_printing_text') } );
	Application.documentIsPrinting = true;	
};


// Sets a new document path
Application.setDocumentPath = function( p )
{
	//reset everything that needs reset and re-init our editor.
	Application.sendMessage( { command: 'replace_view', path: p, 'close_current': true } );
}

/*
	create an automated path for our copy 
*/
Application.createAutoCopyPath = function()
{
	let dp = Application.documentPath;
	let tmp;
	
	let filename = dp.split( ':' )[1];
	filename = filename.split( '/' ).pop().split( '.' );
	tmp = filename.pop(); 
	filename = filename.join( '.' );

	tmp = new Date();
	newname = filename + ' ' + Application.username + ' ' + tmp.toLocaleString().replace(/\D/g,'');
	
	return dp.replace(filename,newname);
}

Application.createAutoCopyKey = function()
{
	let tmp = new Date();
	let thekey = 'COPYKEY_' + tmp.toLocaleString().replace(/\D/g,'') + '_' + Application.username;
	return thekey.substr(0,20);
}

/*
	
*/
Application.editorEvent = function( evt )
{
	if( evt == 'DOCUMENT_READY' )
	{
		if( Application.editCopy )
		{
			//edit copy here!
			Application.saveMode = 'saveas';
			Application.saveAsPath = Application.createAutoCopyPath();
			Application.saveAsKey = Application.createAutoCopyKey();
			
			console.log('Create a copy here!' + Application.saveAsPath + ' : ' + Application.saveAsKey);
			this.pDocEditor.downloadAs();	

			//ge('oocontainer').style.visibility = 'visible';	

			
			//if( msg.newpath ) Application.saveAsPath = msg.newpath;
			//if( msg.newkey ) Application.saveAsKey = msg.newkey;
			//this.pDocEditor.downloadAs();				
		}
		else
		{
			ge('oocontainer').style.visibility = 'visible';	
		}
	}
	else if( evt == 'APP_READY' && !Application.editCopy )
	{
		Application.documentReady = true;
		ge('oocontainer').style.visibility = 'visible';
	}
	console.log( 'EDITOREVENT', evt );
};

