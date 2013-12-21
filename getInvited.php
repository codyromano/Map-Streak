<?php
session_start(); 
require 'lib/Invite.class.php';

$response = array(
	'message' => null, 
	'code' => null
);

try {

	if (!isset($_POST['phone']) || !isset($_POST['carrier']))
		throw new Exception('Missing parameters', Invite::ERRNUM_MISSING_PARAMS);

	$phone = (int) $_POST['phone']; 
	$carrier = (string) $_POST['carrier']; 

	$invite = new Invite;
	if ($invite->trySend($phone, $carrier)) {
		$response['code'] = 1; 
		$response['message'] = 'Invite sent!';
	} else {
		$response['code'] = Invite::ERRNUM_DELIVERY_FAILED;
		$response['message'] = 'Invite delivery failed.';
	}

} catch (Exception $e) {
	$response['message'] = $e->getMessage();
	$response['code'] = $e->getCode();
}

exit(json_encode($response)); 
?>
