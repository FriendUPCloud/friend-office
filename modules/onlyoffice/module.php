<?php

/*©lgpl*************************************************************************
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

/* This file is a module meant for use with the Friend Unifying Platform */

global $SqlDatabase, $args, $User, $Logger, $Config;

global $mitradb;
$mitradb = false;

include_once( 'php/friend.php' );
include_once( 'php/classes/file.php' );
include_once( 'php/classes/door.php' );


/* ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## ##--## */
// Get user level // some security here...

if( $level = $SqlDatabase->FetchObject( '
	SELECT g.Name FROM FUserGroup g, FUserToGroup ug 
	WHERE 
		ug.UserID=\'' . intval( $User->ID ) . '\' AND 
		ug.UserGroupID = g.ID AND g.Type = \'Level\'
' ) )
{
	$level = $level->Name;
}
else $level = false;

//$Logger->log( '[FRIENDOFFICE] Module called, datestamp ' . date ( 'Y-m-d H:i:s' ) );
//$Logger->log( '[FRIENDOFFICE] What did we ask?' . print_r( $args, 1 ) );

// -----------------------------------------------------------------------------
if( $args->command )
{
	switch( $args->command )
	{
		
		case 'print_document':
		
			//basic check for valid input
			if( !isset( $args->args->conversiondata )||!isset( $args->args->serviceurl ) ) die( 'fail<!--separate-->{"result":"400","message":"invalid request"}' );
			

			$conversiondata = json_encode($args->args->conversiondata);

			$Logger->log( '[friendoffice] Request string as conversiondaata ' . $conversiondata );
			
			$c = curl_init();
			curl_setopt( $c, CURLOPT_SSL_VERIFYPEER, false               );
			curl_setopt( $c, CURLOPT_SSL_VERIFYHOST, false               );
			curl_setopt( $c, CURLOPT_URL,            $args->args->serviceurl  );
			curl_setopt( $c, CURLOPT_EXPECT_100_TIMEOUT_MS, false );
			curl_setopt( $c, CURLOPT_RETURNTRANSFER, true                );
			curl_setopt( $c, CURLOPT_POSTFIELDS, $conversiondata ); 
			curl_setopt( $c, CURLOPT_HTTPHEADER, array(                                                                          
			    'Content-Type: application/json',                                                                                
			    'Content-Length: ' . strlen($conversiondata) )                                                                       
			); 
			$r = curl_exec( $c );
			curl_close( $c );		
		
			$Logger->log( '[friendoffice] Print answer ' . $r );
			if( strlen( $r ) )
			{	
				//should be a json string.. decode and get the URL to the document
				try
				{
					//read URL from response XML...
					 $xml = simplexml_load_string( $r );
					 if( isset( $xml->FileUrl ) )
					 	die( 'ok<!--separate-->{"conversionresult":"'. rawurlencode( $xml->FileUrl ) .'"}' );
					 else
					 	die( 'fail<!--separate-->{"conversionresult":"'. rawurlencode( $r ) .'"}' );
				}
				catch(Exception $e)
				{
					$Logger->log( '[friendoffice] ERROR - unexpected response from conversion service ' . $r . ' :: ' . $e );

				}
				
				
				die( 'ok<!--separate-->{"result":"0","message":"'. json_encode( $r ) .'"}' );
			}		
			break;
		
		case 'save_document':
		
			//$Logger->log( '[FRIENDOFFICE] ' . date("Y-m-d H:i:s") . ' onlyoffice save_document called ' .  print_r( $args->args,1 ) );
			//basic check for valid input
			if( !isset( $args->args->diskpath )||!isset( $args->args->path ) ) die( 'fail<!--separate-->{"result":"400","message":"invalid request"}' );

			//make sure we dont fiddle around with shadow file pathes			
			$diskpath = getOriginalFilePath( $args->args->diskpath );
			
			//$Logger->log('DISKPATH ' . $diskpath );
			
			$c = curl_init();
			
			curl_setopt( $c, CURLOPT_SSL_VERIFYPEER, false               );
			curl_setopt( $c, CURLOPT_SSL_VERIFYHOST, false               );
			curl_setopt( $c, CURLOPT_URL,            $args->args->path   );
			curl_setopt( $c, CURLOPT_EXPECT_100_TIMEOUT_MS, false        );
			curl_setopt( $c, CURLOPT_RETURNTRANSFER, true                );
			$r = curl_exec( $c );
			curl_close( $c );
						
						
			//$Logger->log( '[FRIENDOFFICE]  We save a document to '. $diskpath . ' and it has bytes ' . strlen( $r ) );
			if( strlen( $r ) )
			{	
				//$Logger->log( '[FRIENDOFFICE] Result of save: ' . $r );
				$f = new File( $diskpath );
				$saveresult = $f->Save( $r );
				//$Logger->log( '[FRIENDOFFICE]  saved a file here line 118 ' .  print_r( $saveresult ));
				if( $saveresult )
				{
					//$Logger->log( '[friendoffice] Really saved from URL '. $args->args->path .' to ' . $diskpath );
					die( 'ok<!--separate-->{"result":"1","message":"Saved","path":"' . $diskpath . '"}' );
				}
				//$Logger->log( '[FRIENDOFFICE] Could not save to ' . $diskpath );
				die( 'fail<!--separate-->{"result":"0","message":"Failed to save document"}' );
			}
			else
			{
				//$Logger->log( '[FRIENDOFFICE] CURL failed!');
			}
			break;
		
		//load file information
		case 'load_document_info':
			if( !isset( $args->args->diskpath ) ) die('fail<!--separate-->{"result":"400","message":"invalid request"}');

			//make sure we dont fiddle around with shadow file pathes			
			$args->args->diskpath = getOriginalFilePath( $args->args->diskpath );

			

			//$Logger->log( '[friendoffice] load_document_info for file '. $args->args->diskpath .' do we have source path? ' . ( $args->args->sourcepath?$args->args->sourcepath:'no') );
			
			$fileok = $f = $fd = false;
			
			//$Logger->log( '[friendoffice] load_document_info 1a');
			
			//check for virtual file stuff
			if( $args->args->sourcepath && strpos($args->args->sourcepath, '::') !== false )
			{
				$tmp = explode('::', $args->args->sourcepath);
				$owner = $tmp[0];
				$path = $tmp[1];
				
				//now we load the owner and try to get his servertoken and then establish a file object with th correct auth context
				$ru = new dbIO('FUser');
				$ru->ID = $owner;
				
				if( $ru->Load() && $ru->ServerToken )
				{
					//$Logger->log( '[FRIENDOFFICE] Owner loaded (' . $owner . ')' );
					$f = new File( $path );
					$f->SetAuthContext( 'servertoken', $ru->ServerToken );
					if( $f->Load( $path ) )
					{
						//$Logger->log( '[friendoffice] File is ok, it loaded.' );
						$p = explode( ':', $path ); $p = reset( $p );
						$fd = new Door( $p . ':', 'servertoken', $ru->ServerToken );
						$fileok = true;
					}
					else
					{
						die('fail<!--separate-->{"message":"virtual file seems corrupt"}');
					}
				}
				else
				{
					die('fail<!--separate-->{"message":"user shared and has no servertoken; something is fishy"}');
				}
				
			}

			if( $f === false )
			{
				$f = new File( $args->args->diskpath );
				$fd = new Door( reset( explode( ':', $args->args->diskpath ) ) . ':' );				
				if( $f->Load() ) 
				{
					$fileok = true;
				}
				else
				{
					$Logger->log( '[FriendOffice] Failed to load data by: ' . $args->args->diskpath );
				}
			}

			if( $fileok && $fd->ID )
			{
				/* we use the FMetaData table for this now. So we dont need artifacts on the file systems themselves. */
				$fileinfo = $f->GetFileInfo();
				
				if( $fileinfo === false )
				{
					$fileinfo = '{}';
				}
				if( $fileinfo )
				{
					die( 'ok<!--separate-->' . $fileinfo );
				}
				die( 'fail<!--separate-->{"fileinfo":"-1"}' );

			}
			$Logger->log( '[friendoffice] not good line 153');
			die( 'fail<!--separate-->{"error":"404"}' );
			break;
			
		//set, add to or release file lock.... a lot like save doc info.... but with additional file copy
		case 'add_user_to_file_lock':
		case 'set_file_lock':
		case 'release_file_lock':
			//$Logger->log( '[friendoffice] Info file update request..' . $args->command . ' :: ' . print_r( $args->args,1  ));
		
			if(!isset( $args->args->diskpath )||!isset( $args->args->fileinfo )) die('fail<!--separate-->{"error":"invalid request"}');

			// Make sure we dont fiddle around with shadow file pathes			
			$args->args->diskpath = getOriginalFilePath( $args->args->diskpath );
			
			$ru = $fileok = $f = $fd = false;
			
			// Check for virtual file stuff
			if( $args->args->sourcepath && strpos($args->args->sourcepath, '::') !== false )
			{
				$tmp = explode('::', $args->args->sourcepath);
				$owner = $tmp[0];
				$path = $tmp[1];
				
				// Now we load the owner and try to get his servertoken and then establish a file object with th correct auth context
				$ru = new dbIO('FUser');
				$ru->ID = $owner;
				if( $ru->Load() && $ru->ServerToken )
				{
					$f = new File( $path );
					$f->SetAuthContext( 'servertoken', $ru->ServerToken );
					
					if( $f->Load( $path ) )
					{
						$fd = new Door( reset( explode( ':', $path ) ) . ':', 'servertoken', $ru->ServerToken);
						$fileok = true;
					}
				}
				else
				{
					$Logger->log( '[FRIENDOFFICE] Could not load user ' . $owner . ' which means $f is false.' );
				}
			}

			// Failed with source path
			if( $f === false )
			{
				$Logger->log( '[FRIENDOFFICE] Failed with source path. Trying to save anyway - could be failure: ' . $args->args->diskpath . '..' );
				$f = new File( $args->args->diskpath );
				$fd = new Door( reset( explode( ':', $args->args->diskpath ) ) . ':' );
				if( $f->Load() ) $fileok = true;
			}
			
			
			if( $fileok && $fd->ID )
			{
				$fileinfo = new stdClass();
				$storedfileinfo = $f->GetFileInfo();
				try
				{
					if($storedfileinfo !== false ) $fileinfo = json_decode( $storedfileinfo );					
					else $Logger->log( '[FRIENDOFFICE] we have no fileinfo?' );

				} 
				catch( Exception $e )
				{
					$Logger->log('[FRIENDOFFICE] Invalid fileinfo is ignored and overwritten..' ); 
				}

				//$Logger->log( '[friendoffice] Stored info' . print_r($fileinfo,1) );

				
				//basic check that we are dealing with a valid info file (not one that has been moved around and has old pathes etc in it...)
				if( strpos( $fileinfo->original_path, $f->path ) === false && !isset( $args->args->fileinfo->addUserToLockOnly )  )
				{
					$fileinfo = new stdClass();	
				}
				
				//check if we have a lock key and if the new locks refers to its correct value
				if( $args->args->fileinfo->lock_document_key != $fileinfo->lock_document_key 
					&& ( 
						( $args->args->previouslock && $args->args->previouslock != $fileinfo->lock_document_key ) 
							|| ( !$args->args->previouslock && $fileinfo->lock_document_key ) 
						)
					)
				{
					//somebody came here before us... dont touch and re-set
					if( !isset($args->args->forcemode)&&$args->args->forcemode=='YES' )
					{
						$Logger->log( '[FRIENDOFFICE] Invalid prev lock ' . $args->args->fileinfo->lock_document_key );
						die('fail<!--separate-->{"error":"INVALID_PREV_LOCK"}' );
					}
				}
					
				if( isset( $args->args->fileinfo->addUserToLockOnly )  )
				{
					//load current list from FS
					if( isset( $fileinfo->active_lock_user ) )
					{
						array_push( $fileinfo->active_lock_user, $args->args->fileinfo->userToAdd );
						$fileinfo->active_lock_user = array_unique( $fileinfo->active_lock_user );
					}
					else
					{
						$fileinfo->active_lock_user = [ $args->args->fileinfo->userToAdd ]; // this shouldnt really happen...
					}

					// Write lock info
					$Logger->log( '[FRIENDOFFICE] Writing lock info: ' . print_r( $f->path, 1 ) );
					$saveresult = writeLockInfo($f->path, $fd->ID, $fileinfo );

					if( $saveresult )
						die( 'ok<!--separate-->' . json_encode( $fileinfo ) );
					else
						die( 'fail<!--separate-->{"error":"500","errormessage":"Could not save to .info file"}' );
				}
				else if( $args->args->fileinfo->user_to_release  )
				{
					//in case we have had more users coming in. we will load the info from the filesystem and just remove the user here...
					if( $fileinfo->active_lock_user )
					{
						$newlist = [];
						$deluser = $args->args->fileinfo->user_to_release;
						for( $i = 0; $i < count( $fileinfo->active_lock_user ); $i++ )
						{
							if( $fileinfo->active_lock_user[ $i ] != $deluser ) array_push( $newlist, $fileinfo->active_lock_user[ $i ] );
						}
						$fileinfo->active_lock_user = $newlist;
						
						if( isset( $fileinfo->active_lock_user_windows->{$deluser}) )
						{
							unset($fileinfo->active_lock_user_windows->{$deluser});
						}
						
						if( count($newlist) == 0 )
						{
							//delete the temp lockfile when all users have left
							$shadowFile = new File( $fileinfo->shadowfile );
							if( $shadowFile->Load() ) $shadowFile->Delete();
							$fileinfo = new stdClass();
						}

						// Save update to file...
						$saveresult = writeLockInfo($f->path, $fd->ID, $fileinfo );
			
						if( $saveresult )
							die( 'ok<!--separate-->' . json_encode( $fileinfo ) );
						else
							die( 'fail<!--separate-->{"error":"500","errormessage":"Could not save fileinfo"}' );
					}

				}
				else
				{
					// save and return update // or error
					$saveresult = writeLockInfo($f->path, $fd->ID, $fileinfo );

					if( $saveresult )
					{
						//$Logger->log( '[friendoffice] We saved our info file!' . json_encode( $args->args->fileinfo ) );
						//lock is set. lets see if we have a key to create a copy of our original file.
						if( isset( $args->args->fileinfo->lock_document_key ) )
						{
							//create shadow copy of original file
							$lockFileName =  getLockCopyFileName( $f->path, $args->args->fileinfo->lock_document_key );
							
							$f3 = new File( $lockFileName );
							if( $ru ) $f3->SetAuthContext('servertoken',$ru->ServerToken);
							
							$saveresult = $f3->Save( $f->GetContent() );
							$Logger->log( '[FRIENDOFFICE] Saved lock info: ' . $f3->path . ' (' . $lockFileName . ')' . print_r( $args->args->fileinfo, 1 ) . 'Result: ' . $saveresult . "\n---\n" );
							
							if( $args->command == 'set_file_lock' && $saveresult )
							{
								//$Logger->log( '[friendoffice] We saved our shadow copy!' . $lockFileName );
								
								//we have made a copy.
								$args->args->fileinfo->shadowcopy = true;
								$args->args->fileinfo->shadowfile = ( $ru && isset($ru->ID) ? $ru->ID . '::' : '' ) . $lockFileName;
								
								//a bit double up here... but for workgroup drive this should not be that big an issue...
								// save and return update // or error
								$saveresult = writeLockInfo($f->path, $fd->ID, $args->args->fileinfo );
								if( !$saveresult ) die( 'fail<!--separate-->{"error":"500","errormessage":"Could not save fileinfo in line 280"}' );
								
								//$Logger->log( '[friendoffice] We saved our info to include the new shadowfile!' . json_encode( $args->args->fileinfo ) );
							}
							else
							{
								$f3->Delete();
							}
						}
						else
						{
							$Logger->log( '[friendoffice] no key ??? ' .  print_r($args->args,1));
							die( 'fail<!--separate-->{"error":"500","errormessage":"Invalid request"}' );
							
						}
						die( 'ok<!--separate-->' . json_encode( $args->args->fileinfo ) );
					}
					else
					{
						$Logger->log( '[friendoffice] Error 500' );
						die( 'fail<!--separate-->{"error":"500","errormessage":"Could not save fileinfo in line 300"}' );
					}
				}

			}
			die( 'fail<!--separate-->{\"error\":\"404\"}' );	
			
			break;
		
		case 'set_user_appview_id':
			if(!isset($args->args->diskpath)||!isset($args->args->username)||!isset($args->args->viewid)) die( 'fail<!--separate-->{\"error\":\"invalid request to set_user_appview_id\"}' );						
				
			$args->args->diskpath = getOriginalFilePath( $args->args->diskpath );

			$ru = $fileok = $f = $fd = false;
			// Check for virtual file stuff
			if( $args->args->sourcepath && strpos($args->args->sourcepath, '::') !== false )
			{
				$tmp = explode('::', $args->args->sourcepath);
				$owner = $tmp[0];
				$path = $tmp[1];
				
				// Now we load the owner and try to get his servertoken and then establish a file object with th correct auth context
				$ru = new dbIO('FUser');
				$ru->ID = $owner;
				if( $ru->Load() && $ru->ServerToken )
				{
					$f = new File( $path );
					$f->SetAuthContext( 'servertoken', $ru->ServerToken );
					
					if( $f->Load( $path ) )
					{
						
						$fd = new Door( reset( explode( ':', $path ) ) . ':', 'servertoken', $ru->ServerToken);
						$fileok = true;
					}
				}
			}
			else
			{
				$f = new File( $args->args->diskpath );
				$fd = new Door( reset( explode( ':', $args->args->diskpath ) ) . ':' );		
				if( $f->Load() ) $fileok = true;
			}

			if( $fileok && $fd->ID )
			{
				$fis = $f->GetFileInfo();
				if( $fis )
				{
					$fileinfo = json_decode( $fis );
					if( !isset($fileinfo->active_lock_user_windows) ) $fileinfo->active_lock_user_windows = new stdClass();
					
					$fileinfo->active_lock_user_windows->{$args->args->username} = $args->args->viewid;
					$saveresult = writeLockInfo($f->path, $fd->ID, $fileinfo );
		
					if( $saveresult )
						die( 'ok<!--separate-->' . json_encode( $fileinfo ) );
					else
						die( 'fail<!--separate-->{"error":"500","errormessage":"Could not save fileinfo with set_user_appview_id"}' );
				}
			}
			else
			{
				$Logger->log( '[friendoffice] set_user_appview_id couldnt load file? !' . $args->args->diskpath );
			}
			die( 'fail<!--separate-->{\"error\":\"invalid request to set_user_appview_id\"}' );							
			break;
		
		// ---------------------------------------------------------------------
		case 'load_settings':
			//non admin users will only get app config
			if( $row = $SqlDatabase->FetchObject( "SELECT * FROM FSetting s WHERE	s.UserID = '-1' AND s.Key = 'onlyoffice' AND s.Type = 'system' ORDER BY s.Key ASC;" ) )
			{
				die( 'ok<!--separate-->' . $row->Data );
			}
			die('ok<!--separate-->[]');		
			break;
			
		default:
			die('fail<!--separate-->No valid command given');

			break;
		
	}
}
else
{
	die('fail<!--separate-->No valid command given');
}


/*
	lock management in function. moved from being file based (.info file) to be in database - reduces artifacts on file systems
	
	despite the lock name is the information here also used to make up for a weak point in onlyoffice
	where collab editing needs to start with the same initial version of a document
	
*/
function readLockInfo($filepath, $fsid, $returntype='obj')
{
	$d = new dbIO( 'FFileInfo' );
	$d->Path = $filepath;
	$d->FilesystemID = $fsid;
	if( $d->Load() )
	{
		return ( $returntype == 'string' ? $d->Data : json_decode($d->Data) );
	}
	$errorstring = '{"fileinfo":"0","message":"FILEINFO_DOESNT_EXIST"}';
	return ( $returntype == 'string' ? $errorstring : json_decode( $errorstring ) );

}

function writeLockInfo($filepath, $fsid, $fileinfo)
{
	global $Logger;
	
	$d = new dbIO( 'FFileInfo' );
	$d->Path = $filepath;
	$d->FilesystemID = $fsid;

	if( !$d->Load() ) $d->DateCreated = date( 'Y-m-d H:i:s' );
	$d->DateModified = date( 'Y-m-d H:i:s' );
	
	$Logger->log( '[FRIENDOFFICE] writing this lock info: ' .  print_r( $fileinfo,1 ));
	
	$d->Data = json_encode( $fileinfo );
	
	if( $d->Save() )
	{
		return true;
	}
	return false;
}
// end of lock file model function

/*
	check if we have a shadow file... make sure we access the correct 
*/
function getOriginalFilePath( $inpath )
{
	$inpath = urldecode( $inpath );
	//check that we dont write to a hidden version lockfile - correct the path if we do get this...
	$filename =  strpos($inpath, '/') > 1 ? end( explode('/', $inpath) ) : end( explode(':', $inpath) );
	if( strpos($filename, '._') == 0 )
	{
		//we are trying to write to a temp version copy here.... no no no no
		$newname = preg_replace('/\._[^_]*_/', '', $filename);
		return str_replace($filename, $newname, $inpath);
	}
	return $inpath;
}

/*
	fixed suffix for the tmp copies for our files when they get locked
*/
function getLockCopyFileName( $filePath, $documentKey )
{
	$filePath = urldecode($filePath);
	//store file in same folder... but add a dot in front of it.
	if( strpos( $filePath, '/' )  )
	{
		$tmp = explode('/', $filePath );
		$tmp[ count( $tmp ) -1 ] = '._' . $documentKey . '_' . $tmp[ count( $tmp ) -1 ];
		return implode('/', $tmp);
	}
	else
	{
		// no folder.. just replace : with a :. :)
		return str_replace(':',':._' . $documentKey . '_', $filePath);
	}
}

?>
