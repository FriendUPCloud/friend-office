(function(window, undefined){

    /*FRIEND PLUGIN */
    var bCloseAfterSave = false;
    var bInit = false;
    var oImage = false;
	var imageButton = false;
	var imageInserts = [];
	var isProcessingInsert = false;
	var friendPluginHasInitialised = false;
	
	function setInit()
	{
		friendPluginHasInitialised = true;

	}

	function setBackgroundsave()
	{

		//the below thingy might stop working, so we interval autosave in our own apps and use this here to abort the intervall while the user is typing.
		parent.document.body.addEventListener('keydown',function(evt){
			if( parent && parent.parent )
			{
				parent.parent.postMessage('{"command":"keydown"}','*');
			}
		});

		function callback(mutationList, observer) {
		  mutationList.forEach((mutation) => {
		    switch(mutation.type) {
		      case 'childList':
		        /* One or more children have been added to and/or removed
		           from the tree; see mutation.addedNodes and
		           mutation.removedNodes */
		        if( mutation.addedNodes && mutation.addedNodes[0] && mutation.addedNodes[0].data )
		        {
			    	if( mutation.addedNodes[0].data == 'All changes saved' )
			    	{
						if( parent && parent.parent )
						{
							parent.parent.postMessage('{"command":"background_save"}','*');
						}
			    	}    
		        }
		        //console.log('we got new text to show in that status.... ', mutation.addedNodes[0].data );
		        //console.log('new stuff childList');
		        break;
		      case 'attributes':
		        /* An attribute value changed on the element in
		           mutation.target; the attribute name is in
		           mutation.attributeName and its previous value is in
		           mutation.oldValue */
		        break;
		    }
		  });
		}

		/* 
		 Insert our Friend message listener 
		*/ 
		var targetNode = parent.document.querySelector("#label-action");
		if( !targetNode ) targetNode = parent.document.querySelector("#status-label-action");
		
		var observerOptions = {
		  childList: true,
		  attributes: true,
		  subtree: true //Omit or set to false to observe only changes to the parent node.
		}
		
		
		if( targetNode)
		{
			var observer = new MutationObserver(callback);
			observer.observe(targetNode, observerOptions);
		}
			
	}

	/*
		set printing to be handled server side.
	*/
	function setPrintServerSide()
	{
		var pb = parent.document.getElementById( "id-toolbar-btn-print" );
		if( pb )
		{
			var npb = pb.cloneNode(true);
			pb.parentNode.replaceChild(npb, pb);
			npb.addEventListener('click', printFileToServer );			
		}
		
		pb = parent.document.getElementById( "slot-btn-dt-print" );
		if( pb )
		{
			npb = pb.cloneNode(true);
			pb.parentNode.replaceChild(npb, pb);
			npb.addEventListener('click', printFileToServer );			
		}
		
	}

	/*
		check our print button
	*/
	function checkPrintButton()
	{
		if( friendPluginHasInitialised ) return;
		parent.parent.postMessage('{"command":"check_printsettings"}','*');
		return;
	
	
		var pb = parent.document.getElementById( "id-toolbar-btn-print" );
		//console.log('we check the print button...',pb,(typeof pb.disabled) );
		
		if(  pb && pb.disabled )
		{
			pb.disabled = false;
			pb.addEventListener('click', printFileToServer );
		}
		
		
		
	}

	function fixImageInsert()
	{
		if( friendPluginHasInitialised ) return;

		if( parent.document.getElementById( "tlbtn-insertimage" ) ) fixImageButton( parent.document.getElementById( "tlbtn-insertimage" ) );
		if( parent.document.getElementById( "id-toolbar-btn-insertimage" ) ) fixImageButton( parent.document.getElementById( "id-toolbar-btn-insertimage" ) );

		//pptx... we have several...
		if( parent.document.getElementById( "tlbtn-insertimage-0" ) ) fixImageButton(  parent.document.getElementById( "tlbtn-insertimage-0" ) );
		if( parent.document.getElementById( "tlbtn-insertimage-1" ) ) fixImageButton(  parent.document.getElementById( "tlbtn-insertimage-1" ) );
	} 

	function fixImageButton( buttonToFix )
	{
		if( !buttonToFix ) return;
		
		if( buttonToFix.getElementsByClassName('caret') ) buttonToFix.getElementsByClassName('caret')[0].style.display = 'none';

		//we want to rule this button
		buttonToFix.getElementsByTagName('button')[0].addEventListener('click', openFriendImageDialog );
		if( imageButton == false ) imageButton = buttonToFix;
	}

	/*
		Overwrite save button and make it use our function
	*/
	function fixSaveButton()
	{
		if( friendPluginHasInitialised ) return;

		var nsb = parent.document.getElementById( "slot-btn-dt-save" );
		if( nsb )
		{
			var npb = nsb.cloneNode(true);
			nsb.parentNode.replaceChild(npb, nsb);
			npb.addEventListener('click', saveFriendDocument );	
			console.log('new save button replaced by friend listening one');
		}

		var sb = parent.document.getElementById( "slot-btn-save" );
		if( sb )
		{
			var sbstring = sb.innerHTML; 
			if( sb ) sb.innerHTML = '';
			if( sb ) sb.innerHTML = sbstring;			
		}
		if( parent.document.getElementById('id-toolbar-btn-save') ) parent.document.getElementById('id-toolbar-btn-save').addEventListener('click', saveFriendDocument );
	}


	/*
		receive message sent from workspace
	*/
	function receiveMessage(event)
	{
		//console.log('We got a message back!', event);
		
		//event will come with data as a string. check if we can get valid json out of it and see if it is meant for our plugin :)
		if( event && event.data )
		{
			var msg = false;
			try
			{
				msg = JSON.parse( event.data )
			}			
			catch(e)
			{
				return;
			}

			if( msg.command )
			{
				switch( msg.command )
				{
					// Clear cursor autograbbing!
					/*case 'blur':
						var elementBuf = [ 'id_viewer_overlay' ];
						for( let c = 0; c < elementBuf.length; c++ )
						{
							var ele = document.getElementById( elementBuf[ c ] );
							// If we find the right target element, make sure to clear cursor by clicking in the top corner
							if( ele )
							{
								// This only works in Presentation!
								// TODO: Find identifier for presentation..
								if( window.applicationName && window.applicationName == 'Presentation' )
								{
									var evt = new MouseEvent( "mousedown", { clientX: 0, clientY: 0, bubbles: true } )
									ele.dispatchEvent( evt );
								}
								// TODO: Find a way for Document, Spreadsheet
								window.blur();
								return;
							}
						}
						break;*/
						
					case 'insert_image_from_url':
						if( msg.image_url && msg.image_url != '' )
						{
							imageInserts.push( msg.image_url )
							processImageInsertQueue();
							
						}
						break;

					case 'insert_page_break':
						insertPageBreak();
						break;
					
					case 'setserversideprint':
						console.log('setting print to server side! in OO plugin!');
						setPrintServerSide();
						break;
					
					case 'align_left':
					case 'align_center':
					case 'align_right':
					case 'align_just':
						alignText( msg.command );
						break;

					case 'add_slide':
						addSlide();
						break;					

					case 'add_worksheet':
						addWorksheet();
						break;
						
					case 'background_save':
						if( parent && parent.editor && typeof parent.editor.asc_Save == 'function' )
						{
							console.log( 'asc_Save called...');
							
							var targetNode = parent.document.querySelector("#label-action");
							if( !targetNode ) targetNode = parent.document.querySelector("#status-label-action");
							if( targetNode ) targetNode.style.visibility = 'visible';
							
							parent.editor.asc_Save();
						}					
						break;
					
					default:
						console.log('unknow command sent: ' + msg.command + " :: " + msg);
						break;
				}
			}
			
		}
	}
	
	/*
		process our image insert queue...
	*/
	function processImageInsertQueue()
	{
	
		if( !isProcessingInsert && imageButton && imageInserts.length > 0 )
		{
			isProcessingInsert = true;
			
			var imageURL = imageInserts.shift();

			console.log( 'inserting an image now...:' + imageURL );

			imageButton.getElementsByTagName('ul')[0].getElementsByTagName('li')[1].click();
			insertImagePath(imageURL );			
		}
	}
	
	/*
		insert an image into the editor. argument is path to the image. function is usually be called
		from workspace via message interface and gives URL to an image selected in the file dialog
	*/
	function insertImagePath( ipath )
	{
		if( parent.document.getElementById('id-dlg-url') )
		{
			parent.document.getElementById('id-dlg-url').getElementsByTagName('input')[0].value = ipath;
			parent.document.getElementById('id-dlg-url').getElementsByTagName('input')[0].focus();
			window.setTimeout( closeImageModal, 600 );
		}
		else
		{
			window.setTimeout('insertImagePath("'+ ipath +'")', 250);
		}
	}

	/*
		helper function to close tyhe modal dialog as it sometimes hangs...
	*/
	function closeImageModal()
	{
		if( parent.document.getElementsByClassName("modal-dlg")[0] )
		{
			parent.document.getElementsByClassName("modal-dlg")[0].getElementsByClassName("primary")[0].click();
			setTimeout( closeImageModal, 250);
		}
		else
		{
			//assume our image insert is done.
			isProcessingInsert = false;
			if( imageInserts.length > 0 )
			{
				/* this does NOT work... dont know why really. code is taken from photoeditor plugin... */
				var paraScript = insertParagraph();
				console.log('insert paragraph and next image...',paraScript);
				
				window.Asc.plugin.executeCommand("command", paraScript ); 
				window.setTimeout( processImageInsertQueue, 500 );
			}
			
		}

	}

	/*
		function that injects some custom CSS into the editor.
		to begin with we hide the modal dialog
	*/
	function addFriendCustomStyles()
	{
		if( friendPluginHasInitialised ) return;

		var tabToHide = parent.document.querySelectorAll('[data-tab="file"]');
		if( tabToHide && tabToHide[0] )
		{
			tabToHide[0].parentNode.style.display = 'none';
		}


		tabToHide = parent.document.querySelectorAll('[data-tab="review"]');
		if( tabToHide && tabToHide[0] )
		{
			tabToHide[0].parentNode.style.display = 'none';
		}


		var targetNode = parent.document.querySelector("#label-action");
		if( !targetNode ) targetNode = parent.document.querySelector("#status-label-action");
		
		if( targetNode ) targetNode.style.visibility = 'hidden';


		return;		
		
		var css = '.modals-mask, .modal-dlg { opacity:1 !important; }',
		    head = parent.document.head || parent.document.getElementsByTagName('head')[0],
		    style = parent.document.createElement('style');
		
		style.type = 'text/css';
		if (style.styleSheet){
		  // This is required for IE8 and below.
		  style.styleSheet.cssText = css;
		} else {
		  style.appendChild(document.createTextNode(css));
		}
		console.log('show the modals!');
		head.appendChild(style);
	}


	/*
		check the parent window for key inputs... we only interfere for save actions ctrl +s for now... and do our stuff there
	*/
	function checkKeyinput( keyevent )
	{
		var thekey = keyevent.which ? keyevent.which : keyevent.keyCode;
		var thetarget = keyevent.target ? keyevent.target : keyevent.srcElement;


		//console.log('we received a key event! key/target',thekey,thetarget);	
		//console.log('whole key event comes here.',keyevent);
	}

	/*
		insert a page break..
	*/	
	function insertPageBreak()
	{
		var bigButton = parent.document.getElementsByClassName('btn-pagebreak')[0];
		if( bigButton && bigButton.getElementsByTagName('li') && bigButton.getElementsByTagName('li')[0] )
		{
			bigButton.getElementsByTagName('li')[0].click();
		}
		else if( bigButton )
		{
			bigButton.click();
		}
	}
	
	/*
		add a slide to our presnetation...
	*/
	function addSlide()
	{
		var slideButton = parent.document.getElementsByClassName('btn-addslide')[0];
		if( slideButton ) slideButton.click();		
	}

	/*
		add a worksheet to our spreadsheet...
	*/
	function addWorksheet()
	{
		var sButton = parent.document.getElementById('status-btn-addtab');
		if( sButton ) sButton.click();		
	}
	
	/*
		align text
	*/
	function alignText( alignment )
	{
		switch( alignment )
		{
			case 'align_right':
				parent.document.getElementsByClassName('btn-align-right')[0].click();
				break;
			case 'align_center':
				parent.document.getElementsByClassName('btn-align-center')[0].click();
				break;
			case 'align_just':
				parent.document.getElementsByClassName('btn-align-just')[0].click();
				break;
			case 'align_left':
			default:
				parent.document.getElementsByClassName('btn-align-left')[0].click();
				break;
		}
		
	}


	window.parent.addEventListener("keydown", checkKeyinput, false);
	window.parent.addEventListener("message", receiveMessage, false);
	window.addEventListener("message", receiveMessage, false);

    window.Asc.plugin.init = function(sHtml){
		
		addFriendCustomStyles();
		
		fixImageInsert();
		fixSaveButton();
		checkPrintButton();
		setBackgroundsave();
		setInit();
		
    };

    window.Asc.plugin.button = function(id){
        if (id == 0){
            if(bInit){
                bCloseAfterSave = true;
                oFeatherEditor.save();
            }
            else{
                this.executeCommand("close", "");
            }
        }
        else{
            this.executeCommand("close", "");
        }
    };
    
    
    function openFriendImageDialog(e)
    {
	    
	    // this actually works....
	    if( parent && parent.parent ) parent.parent.postMessage('{"command":"insert_image"}','*');
	    
	    e.preventDefault();
	    e.stopPropagation();
	    return false;
    }
    
    function printFileToServer(e)
    {
	    // this actually works....
	    if( parent && parent.parent ) parent.parent.postMessage('{"command":"print_to_server"}','*');
	    
	    e.preventDefault();
	    e.stopPropagation();
	    return false;
    }
    
    function saveFriendDocument(e)
    {
   	    e.preventDefault();
   	    e.stopPropagation();

   	    if( parent && parent.parent ) parent.parent.postMessage('{"command":"save"}','*');

   	    return false;
    }

    function insertParagraph(){
        var sScript = '';
        switch (window.Asc.plugin.info.editorType) {
            case 'word': {
                sScript += 'var oDocument = Api.GetDocument();';
                sScript += '\nvar oParagraph, oRun, arrInsertResult = [], oImage;';
                sScript += '\noParagraph = Api.CreateParagraph();';
                sScript += '\noParagraph.AddText("break it here!");';
                sScript += '\narrInsertResult.push(oParagraph);';
                sScript += '\noDocument.InsertContent(arrInsertResult);';
                break;
            }
            case 'cell':{
                /*sScript += 'var oWorksheet = Api.GetActiveSheet();';
                var nEmuWidth = ((width / 96) * 914400 + 0.5) >> 0;
                var nEmuHeight = ((height / 96) * 914400 + 0.5) >> 0;
                sScript += '\n oWorksheet.ReplaceCurrentImage(\'' + sUrl + '\', ' + nEmuWidth + ', ' + nEmuHeight + ');';
                break;*/
            }
            case 'slide':{
                /*sScript += 'var oPresentation = Api.GetPresentation();';
                var nEmuWidth = ((width / 96) * 914400 + 0.5) >> 0;
                var nEmuHeight = ((height / 96) * 914400 + 0.5) >> 0;
                sScript += '\n oPresentation.ReplaceCurrentImage(\'' + sUrl + '\', ' + nEmuWidth + ', ' + nEmuHeight + ');';
                break;*/
            }
        }
        return sScript;
    };    
	
    function createScript(sUrl, width, height){
        var sScript = '';
        switch (window.Asc.plugin.info.editorType) {
            case 'word': {
                sScript += 'var oDocument = Api.GetDocument();';
                sScript += '\nvar oParagraph, oRun, arrInsertResult = [], oImage;';
                sScript += '\noParagraph = Api.CreateParagraph();';
                sScript += '\narrInsertResult.push(oParagraph);';
                var nEmuWidth = ((width / 96) * 914400 + 0.5) >> 0;
                var nEmuHeight = ((height / 96) * 914400 + 0.5) >> 0;
                sScript += '\n oImage = Api.CreateImage(\'' + sUrl + '\', ' + nEmuWidth + ', ' + nEmuHeight + ');';
                sScript += '\noParagraph.AddDrawing(oImage);';
                sScript += '\noDocument.InsertContent(arrInsertResult);';
                break;
            }
            case 'cell':{
                sScript += 'var oWorksheet = Api.GetActiveSheet();';
                var nEmuWidth = ((width / 96) * 914400 + 0.5) >> 0;
                var nEmuHeight = ((height / 96) * 914400 + 0.5) >> 0;
                sScript += '\n oWorksheet.ReplaceCurrentImage(\'' + sUrl + '\', ' + nEmuWidth + ', ' + nEmuHeight + ');';
                break;
            }
            case 'slide':{
                sScript += 'var oPresentation = Api.GetPresentation();';
                var nEmuWidth = ((width / 96) * 914400 + 0.5) >> 0;
                var nEmuHeight = ((height / 96) * 914400 + 0.5) >> 0;
                sScript += '\n oPresentation.ReplaceCurrentImage(\'' + sUrl + '\', ' + nEmuWidth + ', ' + nEmuHeight + ');';
                break;
            }
        }
        return sScript;
    };
    
})(window, undefined);
