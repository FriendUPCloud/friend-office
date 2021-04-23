#!/usr/bin/php
<?php
$html = file_get_contents('php://stdin');

$html = str_ireplace('</head>', file_get_contents( __DIR__ . '/theme.css' ) . '</head>', $html);
$html = str_ireplace('</body>', file_get_contents( __DIR__ . '/bodyparser.js' ) . '</body>', $html);

file_put_contents('php://stdout', $html);
