<?php

class Invite {

	private $sendAttempts = 0; 
	private $rateLimit = 5; 
	protected static $valid_carriers = array('verizon', 'att');

	const ERRNUM_MISSING_PARAMS = -1; 
	const ERRNUM_INVALID_PHONE = -2; 
	const ERRNUM_INVALID_CARRIER = -3; 
	const ERRNUM_RATE_LIMIT = -4; 
	const ERRNUM_DELIVERY_FAILED = -5; 

	public function __construct() {
		$this->loadSession(); 
	}

	public function __destruct() {
		$this->saveSession(); 
	}

	public static function validate($fieldType, $value) {
		switch ($fieldType) {
			case 'phone': 
				if (!is_numeric($value) || strlen($value) !== 10)
					throw new Exception('', self::ERRNUM_INVALID_PHONE); 
			break;	
			case 'carrier':
				if (!in_array($value, self::$valid_carriers))
					throw new Exception('', self::ERRNUM_INVALID_CARRIER);
		}
	}

	private function rateLimitExceeded() {
		if ($this->sendAttempts < $this->rateLimit) {
			++$this->sendAttempts;
			return false; 
		}
		return true; 
	}

	private function saveSession() {
		foreach ($this as $key => $value)
			$_SESSION[$key] = $value; 
	}

	private function loadSession() {
		foreach ($this as $key => $value) {
			if (isset($_SESSION[$key])) $this->$key = $_SESSION[$key]; 
		}
	}

	protected static function getMobileEmail($phone, $carrier) {
		$email = $phone . '@'; 
		switch ($carrier) {
			case 'att': $email.= 'txt.att.net'; break;
			case 'tmobile': $email.='tmomail.net'; break;
			case 'sprint': $email.='messaging.sprintpcs.com'; break;
			case 'verizon': $email.='vtext.com'; break;
		}
		return $email; 
	}

	private function send($phone, $carrier) {
		$to = self::getMobileEmail($phone, $carrier);
		$message = "You're invited to MapStreak! www.mapstreak.com/?invite";
		mail($to, '', $message);

		/** 
		* @todo Determine if the mail() function actually succeeded...
		*/ 
		return true; 
	}

	public function trySend($phone, $carrier) {
		self::validate('phone', $phone); 
		self::validate('carrier', $carrier);

		if ($this->rateLimitExceeded()) {
			throw new Exception('', self::ERRNUM_RATE_LIMIT); 
		}

		if ($this->send($phone, $carrier)) {
			return true;
		}
		return false;
	}
}
?>
