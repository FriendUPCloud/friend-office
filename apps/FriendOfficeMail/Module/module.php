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

if( isset( $User->Email ) && isset( $User->FullName ) )
{
	$Mail = new Mailer();

	$Mail->setSubject( 'User requests Friend Mail account' );
	$Mail->setContent( '<table align="center" width="600" cellspacing="0" cellpadding="15" bgcolor="#f0f0f0"><tr><td bgcolor="#ccddee">FRIEND SKY</td></tr><tr><td bgcolor="#f8f8f8"><h2>New registration for Friend Mail</h2><p>The user: ' . $User->FullName . ' is requesting a Friend Mail account on Friend Sky. His e-mail is:<br><br><ul><li>' . $User->Email . '</li></ul><br><br>Thank you!</p></td></tr></table>' . print_r( $User, 1 ) );
	$Mail->setFrom( 'info@friendos.com' );
	$Mail->addRecipient( 'hogne.friendup@gmail.com' );
	$Mail->addRecipient( 'info@friendos.com' );
	if( $Mail->send() )
	{
		die( 'ok<!--separate-->{"message":"Successfully sent message.","response":1}' );
	}
	else
	{
		die( 'fail<!--separate-->{"message":"Failed to send message.","response":-1}' );
	}
}

die( 'fail<!--separate-->{"message":"Fullname or Email missing from profile.","response":2}' );

?>
