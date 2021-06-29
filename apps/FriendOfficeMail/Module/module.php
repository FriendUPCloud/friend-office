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

$Mail = new Mailer();

$Mail->setSubject( 'User requests Friend Mail account' );
$Mail->setContent( 'The user: ' . $User->Fullname . ' is requesting a Friend Mail account on Friend Sky. His e-mail is:<br><li>' . $User->Email . '</li><br>Thank you!' );
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

?>
