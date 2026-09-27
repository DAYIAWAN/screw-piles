<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'message' => 'Метод не поддерживается.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$recipient = 'info@mail.ru';

function respond(int $status, bool $ok, string $message)
{
    http_response_code($status);
    echo json_encode([
        'ok' => $ok,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function clean_text($value, int $maxLength = 500): string
{
    $value = is_string($value) ? trim($value) : '';
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    $value = strip_tags($value);

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }

    return substr($value, 0, $maxLength);
}

// Honeypot: normal users never fill this field.
$company = clean_text($_POST['company'] ?? '', 120);
if ($company !== '') {
    respond(200, true, 'Заявка отправлена.');
}

$name = clean_text($_POST['name'] ?? '', 120);
$phone = clean_text($_POST['phone'] ?? '', 60);
$object = clean_text($_POST['object'] ?? '', 120);
$message = clean_text($_POST['message'] ?? '', 1200);
$calculator = clean_text($_POST['calculator'] ?? '', 500);

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if (strlen($phoneDigits) !== 11 || $phoneDigits[0] !== '7') {
    respond(422, false, 'Проверьте номер телефона.');
}

// Lightweight rate limiting per IP: one successful attempt per 25 seconds.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateKey = hash('sha256', $ip . '|screw-piles-form');
$rateFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'lead_' . $rateKey . '.lock';
$now = time();

if (is_file($rateFile)) {
    $lastRequest = (int) @file_get_contents($rateFile);
    if ($lastRequest > 0 && ($now - $lastRequest) < 25) {
        respond(429, false, 'Заявка уже отправлялась. Повторите через несколько секунд.');
    }
}

@file_put_contents($rateFile, (string) $now, LOCK_EX);

$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$host = preg_replace('/[^a-z0-9.\-]/i', '', $host) ?: 'localhost';
$fromDomain = strpos($host, '.') !== false ? $host : 'localhost.localdomain';

$subject = 'Заявка с лендинга: винтовые сваи';
$body = implode("\n", array_filter([
    'Новая заявка с сайта',
    '------------------------------',
    $name !== '' ? 'Имя: ' . $name : null,
    'Телефон: ' . $phone,
    $object !== '' ? 'Объект: ' . $object : null,
    $calculator !== '' ? 'Калькулятор: ' . $calculator : null,
    $message !== '' ? 'Комментарий: ' . $message : null,
    '------------------------------',
    'IP: ' . $ip,
    'Дата: ' . date('Y-m-d H:i:s')
]));

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: Site <no-reply@' . $fromDomain . '>',
    'Reply-To: ' . $recipient,
    'X-Mailer: PHP/' . PHP_VERSION
];

$sent = @mail($recipient, $encodedSubject, $body, implode("\r\n", $headers));

if (!$sent) {
    @unlink($rateFile);
    respond(500, false, 'Сервер не смог отправить письмо. Проверьте почтовую конфигурацию хостинга.');
}

respond(200, true, 'Заявка отправлена. Мы свяжемся с вами после уточнения исходных данных.');
