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

$Mail->setSubject( 'Testing 123' );
$Mail->setContent( 'Just testing<br>Blablabla' );
$Mail->setFrom( 'ht@friendos.com' );
$Mail->addRecipient( 'hogne.friendup@gmail.com' );
$Mail->addRecipient( 'info@friendos.com' );

die( 'ok<!--separate-->Woohoo!' );

?>
