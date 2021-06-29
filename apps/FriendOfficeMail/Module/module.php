<?php
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

global $SqlDatabase, $User, $Config;

require_once( 'php/classes/mailserver.php' );

// Load server config
$s = new dbIO( 'FSetting' );
$s->Type = 'friendmail';
$s->UserID = '-1';
$s->Key = 'serveradmin';
if( $s->Load() )
{
	// Extract recipients
	$recipients = array();
	if( $sdata = json_decode( $s->Data ) )
	{
		$recipients = explode( ',', $sdata->emails );
	}
	
	if( trim( $User->Email ) && trim( $User->FullName ) )
	{
		if( count( $recipients ) >= 1 )
		{
			$Mail = new Mailer();

			$Mail->setSubject( 'User requests Friend Mail account' );
			$Mail->setContent( '<table align="center" width="600" cellspacing="0" cellpadding="15" bgcolor="#f0f0f0"><tr><td bgcolor="#ccddee">FRIEND SKY</td></tr><tr><td bgcolor="#f8f8f8"><h2>New registration for Friend Mail</h2><p>The user: ' . $User->FullName . ' is requesting a Friend Mail account on Friend Sky. The legal entity\'s e-mail is:<br><br><ul><li>' . $User->Email . '</li></ul><br><br>Thank you!</p></td></tr></table>' );
			$Mail->setFrom( 'info@friendos.com' );
			foreach( $recipients as $re )
			{
				$Mail->addRecipient( trim( $re ) );
			}
			if( $Mail->send() )
			{
				$d = new dbIO( 'FSetting' );
				$d->UserID = $User->ID;
				$d->Type = 'system';
				$d->Key = 'friendmailrequest';
				$d->Data = '{"status":"requested","date":"' . date( 'Y-m-d H:i:s' ) . '"}';
				if( $d->Save() )
				{
					die( 'ok<!--separate-->{"message":"Successfully sent message.","response":1}' );
				}
			}
			else
			{
				die( 'fail<!--separate-->{"message":"Failed to send message.","response":-1}' );
			}
		}
		die( 'fail<!--separate-->{"message":"Missing registration recipients.","response":3}' );
	}

	die( 'fail<!--separate-->{"message":"Fullname or Email missing from profile.","response":2}' );
}
die( 'fail<!--separate-->{"message":"Admin emails not set up.","response":4}' );

?>
