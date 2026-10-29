<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

final class ApiError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function input(): array
{
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 15 * 1024 * 1024) {
        throw new ApiError(413, 'คำขอมีขนาดใหญ่เกินไป (สูงสุด 15 MB)');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 15 * 1024 * 1024) {
        throw new ApiError(413, 'คำขอมีขนาดใหญ่เกินไป (สูงสุด 15 MB)');
    }
    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new ApiError(400, 'รูปแบบ JSON ไม่ถูกต้อง');
    }
    if (!is_array($data)) {
        throw new ApiError(400, 'ข้อมูลคำขอไม่ถูกต้อง');
    }
    return $data;
}

function requireCsrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
        throw new ApiError(403, 'โทเค็นความปลอดภัยไม่ถูกต้อง กรุณาโหลดหน้าเว็บใหม่');
    }
}

function currentUser(PDO $db): array
{
    $id = $_SESSION['user_id'] ?? 0;
    if (!$id) {
        throw new ApiError(401, 'กรุณาเข้าสู่ระบบใหม่');
    }
    $query = $db->prepare('SELECT id, email, name_prefix, name, member_type, department, phone, profile_image, role, active FROM users WHERE id = ?');
    $query->execute([$id]);
    $user = $query->fetch();
    if (!$user || !(int)$user['active']) {
        session_destroy();
        throw new ApiError(401, 'บัญชีนี้ถูกปิดใช้งานหรือไม่พบในระบบ');
    }
    $user['id'] = (int)$user['id'];
    $user['namePrefix'] = $user['name_prefix'];
    $user['memberType'] = $user['member_type'];
    $user['profileImage'] = $user['profile_image'] ?? '';
    unset($user['active'], $user['name_prefix'], $user['member_type'], $user['profile_image']);
    return $user;
}

function requireRole(array $user, array $roles): void
{
    if (!in_array($user['role'], $roles, true)) {
        throw new ApiError(403, 'บัญชีของคุณไม่มีสิทธิ์ดำเนินการนี้');
    }
}

function jsonResponse(array $user, string $csrf): array
{
    return ['user' => $user, 'csrfToken' => $csrf];
}

function validEmail(string $email): bool
{
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL) && preg_match('/@crru\.ac\.th$/i', $email) === 1;
}

function profileImage(array $body, array $current = [], bool $required = false): string
{
    $image = $body['profileImage'] ?? $current['profile_image'] ?? '';
    if (!is_string($image)) {
        throw new ApiError(422, 'รูปโปรไฟล์ไม่ถูกต้อง');
    }
    if ($image === '') {
        if ($required) {
            throw new ApiError(422, 'กรุณาแนบรูปโปรไฟล์');
        }
        return '';
    }
    if (strlen($image) > 3 * 1024 * 1024 ||
        !preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$#', $image, $matches)) {
        throw new ApiError(422, 'รูปโปรไฟล์ต้องเป็นไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB');
    }
    $contents = base64_decode($matches[2], true);
    if ($contents === false || strlen($contents) > 2 * 1024 * 1024) {
        throw new ApiError(422, 'รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB');
    }
    $imageInfo = @getimagesizefromstring($contents);
    $allowedTypes = [
        'image/jpeg' => 'jpeg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!$imageInfo || !isset($allowedTypes[$imageInfo['mime'] ?? '']) || $allowedTypes[$imageInfo['mime']] !== $matches[1]) {
        throw new ApiError(422, 'ไฟล์รูปโปรไฟล์ไม่ใช่ภาพ JPG, PNG หรือ WebP ที่ถูกต้อง');
    }
    return $image;
}

function accountProfile(array $body, array $current = []): array
{
    foreach (['email', 'namePrefix', 'name', 'memberType', 'department', 'phone', 'profileImage'] as $field) {
        if (array_key_exists($field, $body) && !is_string($body[$field])) {
            throw new ApiError(422, 'ข้อมูลบัญชีไม่ถูกต้อง');
        }
    }
    $email = strtolower(trim((string)($body['email'] ?? $current['email'] ?? '')));
    $namePrefix = trim((string)($body['namePrefix'] ?? $current['namePrefix'] ?? $current['name_prefix'] ?? ''));
    $name = trim(preg_replace('/\s+/u', ' ', (string)($body['name'] ?? $current['name'] ?? '')));
    $memberType = (string)($body['memberType'] ?? $current['memberType'] ?? $current['member_type'] ?? '');
    $department = trim((string)($body['department'] ?? $current['department'] ?? ''));
    $phone = trim((string)($body['phone'] ?? $current['phone'] ?? ''));
    $allowedPrefixes = ['ศาสตราจารย์', 'รองศาสตราจารย์', 'ผู้ช่วยศาสตราจารย์', 'อาจารย์ ดร.', 'อาจารย์', 'นาย', 'นาง', 'นางสาว'];
    $allowedMemberTypes = ['instructor', 'staff', 'student', 'external'];
    if (!validEmail($email)) {
        throw new ApiError(422, 'กรุณาใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @crru.ac.th');
    }
    if (!in_array($namePrefix, $allowedPrefixes, true) || !in_array($memberType, $allowedMemberTypes, true) ||
        $name === '' || mb_strlen($name) > 100 || mb_strlen($department) > 100 || strlen($phone) > 20 ||
        ($phone !== '' && !preg_match('/^[0-9+()\s-]{9,20}$/', $phone))) {
        throw new ApiError(422, 'กรุณาตรวจสอบคำนำหน้า ชื่อ สถานภาพ หน่วยงาน และเบอร์โทรศัพท์');
    }
    return [
        'email' => $email,
        'namePrefix' => $namePrefix,
        'name' => $name,
        'memberType' => $memberType,
        'department' => $department,
        'phone' => $phone,
        'profileImage' => profileImage($body, ['profile_image' => $current['profileImage'] ?? $current['profile_image'] ?? '']),
    ];
}

function objectMap(array $items): array
{
    $mapped = [];
    foreach ($items as $item) {
        if (!is_array($item) || !isset($item['id']) || !is_string($item['id'])) {
            throw new ApiError(400, 'พบข้อมูลรายการที่ไม่มีรหัส');
        }
        if (isset($mapped[$item['id']])) {
            throw new ApiError(400, 'พบรหัสรายการซ้ำ');
        }
        $mapped[$item['id']] = $item;
    }
    return $mapped;
}

function workflowEmailEvents(array $old, array $next): array
{
    $oldBookings = objectMap($old['bookings'] ?? []);
    $newBookings = objectMap($next['bookings'] ?? []);
    $rooms = objectMap($next['rooms'] ?? []);
    $events = [];
    foreach ($newBookings as $id => $booking) {
        $previous = $oldBookings[$id] ?? null;
        if ($previous === null && ($booking['status'] ?? '') === 'pending') {
            $booking['emailEvent'] = 'booking-request';
            $events[] = $booking;
        } elseif ($previous !== null && ($previous['status'] ?? '') === 'pending' && ($booking['status'] ?? '') === 'approved') {
            $booking['emailEvent'] = 'booking-approved';
            $events[] = $booking;
        }
    }
    foreach ($events as &$event) {
        $room = $rooms[$event['roomId'] ?? ''] ?? [];
        $event['roomName'] = (string)($room['name'] ?? 'ไม่ระบุห้อง');
        $event['startDate'] = (string)($event['startDate'] ?? '');
        $event['endDate'] = (string)($event['endDate'] ?? '');
        $event['startTime'] = (string)($event['startTime'] ?? '');
        $event['endTime'] = (string)($event['endTime'] ?? '');
    }
    unset($event);
    return $events;
}

function sendWorkflowEmails(PDO $db, array $events): array
{
    if (!$events) {
        return [];
    }
    $from = getenv('EDUROOM_MAIL_FROM') ?: 'no-reply@crru.ac.th';
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        error_log('EduRoom mail delivery skipped: EDUROOM_MAIL_FROM is not a valid email address.');
        return [['event' => 'configuration', 'failed' => count($events), 'recipients' => 0]];
    }
    $adminEmails = $db->query("SELECT email FROM users WHERE role IN ('admin', 'super_admin') AND active = 1 ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
    $findStaff = $db->prepare("SELECT email FROM users WHERE id = ? AND role = 'staff' AND active = 1");
    $warnings = [];
    foreach ($events as $event) {
        if ($event['emailEvent'] === 'booking-request') {
            $recipients = $adminEmails;
            $subject = 'EduRoom: มีคำร้องขอจองห้องรออนุมัติ';
            $message = 'ขณะนี้ มีการจองห้องเรียน ห้องประชุม ลานกิจกรรม ให้ท่านกลับไปที่ระบบการจองห้องประชุม เพื่ออนุมัติการจองห้อง';
        } else {
            $findStaff->execute([(int)($event['assignedStaffId'] ?? 0)]);
            $staffEmail = $findStaff->fetchColumn();
            $recipients = is_string($staffEmail) ? [$staffEmail] : [];
            $subject = 'EduRoom: มีงานเตรียมห้องประชุมที่ได้รับอนุมัติ';
            $message = 'ขณะนี้ มีการอนุมัติห้องเรียน ห้องประชุม ลานกิจกรรม เรียบร้อยแล้ว ให้ท่านกลับไปที่ระบบการจองห้องประชุม เพื่อเตรียมห้องประชุม';
        }
        $recipients = array_values(array_unique(array_filter($recipients, static fn($email): bool =>
            is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL)
        )));
        if (!$recipients) {
            $warnings[] = ['event' => $event['emailEvent'], 'failed' => 1, 'recipients' => 0];
            error_log('EduRoom workflow email has no active recipient for event ' . $event['emailEvent'] . '.');
            continue;
        }
        $date = $event['startDate'] === $event['endDate']
            ? $event['startDate']
            : $event['startDate'] . ' ถึง ' . $event['endDate'];
        $body = $message . "\r\n\r\n"
            . 'หัวข้อ: ' . (string)($event['title'] ?? '') . "\r\n"
            . 'ห้อง: ' . $event['roomName'] . "\r\n"
            . 'วันที่: ' . $date . "\r\n"
            . 'เวลา: ' . $event['startTime'] . '–' . $event['endTime'] . "\r\n"
            . 'ผู้จอง: ' . (string)($event['user'] ?? '') . "\r\n"
            . 'กรุณาเข้าสู่ระบบที่ ' . appUrl() . "\r\n";
        $headers = [
            'From: EduRoom <' . $from . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        $failed = 0;
        foreach ($recipients as $recipient) {
            $mailWarning = '';
            set_error_handler(static function (int $severity, string $message) use (&$mailWarning): bool {
                if ($severity === E_WARNING) {
                    $mailWarning = $message;
                    return true;
                }
                return false;
            });
            try {
                $sent = mail($recipient, $subject, $body, implode("\r\n", $headers), '-f' . $from);
            } finally {
                restore_error_handler();
            }
            if (!$sent) {
                $failed++;
                error_log('EduRoom workflow email failed for event ' . $event['emailEvent'] . ': ' . ($mailWarning ?: 'mail() returned false.'));
            }
        }
        if ($failed > 0) {
            $warnings[] = ['event' => $event['emailEvent'], 'failed' => $failed, 'recipients' => count($recipients)];
        }
    }
    return $warnings;
}

function appUrl(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $scheme = $https ? 'https' : 'http';
    $host = preg_replace('/[^A-Za-z0-9.:-]/', '', (string)($_SERVER['SERVER_NAME'] ?? 'localhost'));
    $path = str_replace('\\', '/', dirname(dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/bookmain/api/index.php'))));
    return $scheme . '://' . $host . rtrim($path, '/') . '/';
}

function stateRow(PDO $db, bool $lock = false): ?array
{
    $statement = $db->query('SELECT payload, version FROM app_state WHERE id = 1' . ($lock ? ' FOR UPDATE' : ''));
    $row = $statement->fetch();
    if (!$row) {
        return null;
    }
    $metadata = json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
    $rooms = [];
    foreach ($db->query('SELECT room_id, name, room_number, building, capacity, status, description, equipment, visual, image FROM rooms ORDER BY room_id') as $room) {
        $rooms[] = [
            'id' => $room['room_id'],
            'name' => $room['name'],
            'number' => $room['room_number'],
            'building' => $room['building'],
            'capacity' => (int)$room['capacity'],
            'status' => $room['status'],
            'description' => $room['description'],
            'equipment' => json_decode($room['equipment'], true, 512, JSON_THROW_ON_ERROR),
            'visual' => $room['visual'],
            'image' => $room['image'] ?? '',
        ];
    }
    $bookings = [];
    foreach ($db->query('SELECT booking_id, room_id, user_name, user_email, department, title, purpose, attendees, start_date, end_date, start_time, end_time, equipment, note, signature, status, prep_status, approved_by, approved_at, rejection_reason, created_at, details FROM bookings ORDER BY created_at, booking_id') as $booking) {
        $details = json_decode($booking['details'], true, 512, JSON_THROW_ON_ERROR);
        $details['id'] = $booking['booking_id'];
        $details['roomId'] = $booking['room_id'] ?? '';
        $details['user'] = $booking['user_name'];
        $details['email'] = $booking['user_email'];
        $details['department'] = $booking['department'];
        $details['title'] = $booking['title'];
        $details['purpose'] = $booking['purpose'];
        $details['attendees'] = (int)$booking['attendees'];
        $details['startDate'] = (string)$booking['start_date'];
        $details['endDate'] = (string)$booking['end_date'];
        $details['startTime'] = substr((string)$booking['start_time'], 0, 5);
        $details['endTime'] = substr((string)$booking['end_time'], 0, 5);
        $details['equipment'] = json_decode($booking['equipment'], true, 512, JSON_THROW_ON_ERROR);
        $details['note'] = $booking['note'];
        $details['signature'] = $booking['signature'] ?? '';
        $details['status'] = $booking['status'];
        $details['prepStatus'] = $booking['prep_status'];
        $details['createdAt'] = $booking['created_at'];
        foreach (['approvedBy' => 'approved_by', 'approvedAt' => 'approved_at', 'rejectionReason' => 'rejection_reason'] as $key => $column) {
            if ($booking[$column] !== null) {
                $details[$key] = $booking[$column];
            } else {
                unset($details[$key]);
            }
        }
        $bookings[] = $details;
    }
    return [
        'state' => [
            'rooms' => $rooms,
            'bookings' => $bookings,
            'policy' => $metadata['policy'] ?? [],
            'notifications' => $metadata['notifications'] ?? [],
        ],
        'version' => (int)$row['version'],
    ];
}

function persistState(PDO $db, array $old, array $next, bool $insert = false): void
{
    $oldRooms = objectMap($old['rooms'] ?? []);
    $newRooms = objectMap($next['rooms'] ?? []);
    $oldBookings = objectMap($old['bookings'] ?? []);
    $newBookings = objectMap($next['bookings'] ?? []);

    $deleteBooking = $db->prepare('DELETE FROM bookings WHERE booking_id = ?');
    foreach (array_diff(array_keys($oldBookings), array_keys($newBookings)) as $id) {
        $deleteBooking->execute([$id]);
    }
    $deleteRoom = $db->prepare('DELETE FROM rooms WHERE room_id = ?');
    foreach (array_diff(array_keys($oldRooms), array_keys($newRooms)) as $id) {
        $deleteRoom->execute([$id]);
    }

    $upsertRoom = $db->prepare(
        'INSERT INTO rooms (room_id, name, room_number, building, capacity, status, description, equipment, visual, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), room_number=VALUES(room_number), building=VALUES(building),
         capacity=VALUES(capacity), status=VALUES(status), description=VALUES(description),
         equipment=VALUES(equipment), visual=VALUES(visual), image=VALUES(image)'
    );
    foreach ($newRooms as $id => $room) {
        $upsertRoom->execute([
            $id, (string)($room['name'] ?? ''), (string)($room['number'] ?? ''), (string)($room['building'] ?? ''),
            max(0, (int)($room['capacity'] ?? 0)), ($room['status'] ?? '') === 'inactive' ? 'inactive' : 'active',
            (string)($room['description'] ?? ''),
            json_encode(array_values($room['equipment'] ?? []), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            (string)($room['visual'] ?? ''), (string)($room['image'] ?? ''),
        ]);
    }

    $findUser = $db->prepare('SELECT id FROM users WHERE email = ?');
    $upsertBooking = $db->prepare(
        'INSERT INTO bookings (booking_id, room_id, user_id, user_name, user_email, department, title, purpose, attendees,
         start_date, end_date, start_time, end_time, equipment, note, signature, status, prep_status, approved_by,
         approved_at, rejection_reason, created_at, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE room_id=VALUES(room_id), user_id=VALUES(user_id), user_name=VALUES(user_name),
         user_email=VALUES(user_email), department=VALUES(department), title=VALUES(title), purpose=VALUES(purpose),
         attendees=VALUES(attendees), start_date=VALUES(start_date), end_date=VALUES(end_date), start_time=VALUES(start_time),
         end_time=VALUES(end_time), equipment=VALUES(equipment), note=VALUES(note), signature=VALUES(signature),
         status=VALUES(status), prep_status=VALUES(prep_status), approved_by=VALUES(approved_by), approved_at=VALUES(approved_at),
         rejection_reason=VALUES(rejection_reason), created_at=VALUES(created_at), details=VALUES(details)'
    );
    $canonical = ['id', 'roomId', 'user', 'email', 'department', 'title', 'purpose', 'attendees', 'startDate', 'endDate', 'startTime', 'endTime', 'equipment', 'note', 'signature', 'status', 'prepStatus', 'createdAt', 'approvedBy', 'approvedAt', 'rejectionReason'];
    foreach ($newBookings as $id => $booking) {
        $findUser->execute([strtolower((string)($booking['email'] ?? ''))]);
        $ownerId = $findUser->fetchColumn();
        $details = array_diff_key($booking, array_flip($canonical));
        $upsertBooking->execute([
            $id, ($booking['roomId'] ?? '') !== '' ? $booking['roomId'] : null, $ownerId ?: null,
            (string)($booking['user'] ?? ''), strtolower((string)($booking['email'] ?? '')),
            (string)($booking['department'] ?? ''), (string)($booking['title'] ?? ''),
            (string)($booking['purpose'] ?? ''), max(0, (int)($booking['attendees'] ?? 0)),
            $booking['startDate'] ?? '1970-01-01', $booking['endDate'] ?? '1970-01-01',
            substr((string)($booking['startTime'] ?? '00:00'), 0, 5) . ':00',
            substr((string)($booking['endTime'] ?? '00:00'), 0, 5) . ':00',
            json_encode(array_values($booking['equipment'] ?? []), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            (string)($booking['note'] ?? ''), (string)($booking['signature'] ?? ''),
            in_array(($booking['status'] ?? ''), ['pending', 'approved', 'rejected', 'cancelled', 'completed'], true) ? $booking['status'] : 'pending',
            in_array(($booking['prepStatus'] ?? ''), ['waiting', 'accepted', 'preparing', 'completed'], true) ? $booking['prepStatus'] : 'waiting',
            $booking['approvedBy'] ?? null, $booking['approvedAt'] ?? null, $booking['rejectionReason'] ?? null,
            (string)($booking['createdAt'] ?? gmdate(DATE_ATOM)),
            json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ]);
    }

    $metadata = json_encode([
        'policy' => $next['policy'] ?? [],
        'notifications' => $next['notifications'] ?? [],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if ($insert) {
        $db->prepare('INSERT INTO app_state (id, payload, version) VALUES (1, ?, 1)')->execute([$metadata]);
    } else {
        $db->prepare('UPDATE app_state SET payload = ?, version = version + 1 WHERE id = 1')->execute([$metadata]);
    }
}

function visibleState(array $state, array $user): array
{
    unset($state['role']);
    if ($user['role'] === 'user') {
        $state['bookings'] = array_values(array_filter($state['bookings'] ?? [], static fn(array $booking): bool => strcasecmp((string)($booking['email'] ?? ''), $user['email']) === 0));
    } elseif ($user['role'] === 'staff') {
        $state['bookings'] = array_values(array_filter($state['bookings'] ?? [], static fn(array $booking): bool =>
            ($booking['status'] ?? '') === 'approved' && (int)($booking['assignedStaffId'] ?? 0) === $user['id']
        ));
    }
    return $state;
}

function saveState(PDO $db, array $user, array $body): array
{
    $incoming = $body['state'] ?? null;
    if (!is_array($incoming) || !is_array($incoming['rooms'] ?? null) || !is_array($incoming['bookings'] ?? null)) {
        throw new ApiError(400, 'ข้อมูลห้องหรือรายการจองไม่ถูกต้อง');
    }
    if (count($incoming['rooms']) > 500 || count($incoming['bookings']) > 5000) {
        throw new ApiError(413, 'จำนวนข้อมูลเกินขนาดที่รองรับ');
    }
    unset($incoming['role']);
    $db->beginTransaction();
    try {
        $row = stateRow($db, true);
        if ($row && (int)($body['expectedVersion'] ?? -1) !== $row['version']) {
            throw new ApiError(409, 'ข้อมูลถูกแก้ไขจากหน้าต่างอื่นแล้ว กรุณาโหลดหน้าใหม่');
        }
        if (!$row) {
            requireRole($user, ['super_admin']);
            $incoming['role'] = 'user';
            $empty = ['rooms' => [], 'bookings' => [], 'policy' => [], 'notifications' => []];
            persistState($db, $empty, $incoming, true);
            $db->commit();
            return ['version' => 1];
        }
        $old = $row['state'];
        if ($user['role'] === 'super_admin') {
            $next = $incoming;
        } elseif ($user['role'] === 'admin') {
            if (($incoming['policy'] ?? null) !== ($old['policy'] ?? null)) {
                throw new ApiError(403, 'Admin ไม่มีสิทธิ์เปลี่ยนนโยบาย');
            }
            $oldBookings = objectMap($old['bookings'] ?? []);
            $newBookings = objectMap($incoming['bookings']);
            if (array_keys($oldBookings) !== array_keys($newBookings)) {
                throw new ApiError(403, 'Admin ไม่มีสิทธิ์เพิ่มหรือลบรายการจอง');
            }
            foreach ($oldBookings as $id => $booking) {
                $candidate = $newBookings[$id];
                $status = $candidate['status'] ?? '';
                $oldStatus = $booking['status'] ?? '';
                $allowed = $status === $oldStatus || ($oldStatus === 'pending' && in_array($status, ['approved', 'rejected'], true));
                $assignmentChanged = ($candidate['assignedStaffId'] ?? null) !== ($booking['assignedStaffId'] ?? null) ||
                    ($candidate['assignedStaffName'] ?? null) !== ($booking['assignedStaffName'] ?? null);
                $immutable = $candidate;
                foreach (['status', 'approvedBy', 'approvedAt', 'rejectionReason', 'assignedStaffId', 'assignedStaffName'] as $key) {
                    unset($immutable[$key]);
                }
                $original = $booking;
                foreach (['status', 'approvedBy', 'approvedAt', 'rejectionReason', 'assignedStaffId', 'assignedStaffName'] as $key) {
                    unset($original[$key]);
                }
                if (!$allowed || $immutable !== $original || ($assignmentChanged && ($oldStatus !== 'pending' || $status !== 'approved'))) {
                    throw new ApiError(403, 'Admin แก้ไขได้เฉพาะผลการอนุมัติและเหตุผล');
                }
                if ($oldStatus === 'pending' && $status === 'approved') {
                    $assignedStaffId = filter_var($candidate['assignedStaffId'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
                    if ($assignedStaffId === false) {
                        throw new ApiError(422, 'กรุณาเลือกเจ้าหน้าที่ผู้รับงานก่อนอนุมัติ');
                    }
                    $staffQuery = $db->prepare("SELECT name FROM users WHERE id = ? AND role = 'staff' AND active = 1");
                    $staffQuery->execute([(int)$assignedStaffId]);
                    $staffName = $staffQuery->fetchColumn();
                    if (!is_string($staffName) || $staffName === '') {
                        throw new ApiError(422, 'เจ้าหน้าที่ที่เลือกไม่มีสิทธิ์หรือถูกปิดใช้งาน กรุณาเลือกใหม่');
                    }
                    $candidate['assignedStaffId'] = (int)$assignedStaffId;
                    $candidate['assignedStaffName'] = $staffName;
                    $newBookings[$id] = $candidate;
                }
                if ($status === 'rejected' && trim((string)($candidate['rejectionReason'] ?? '')) === '') {
                    throw new ApiError(400, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ');
                }
            }
            $next = $old;
            $next['rooms'] = $incoming['rooms'];
            $next['bookings'] = array_values($newBookings);
            $next['notifications'] = $incoming['notifications'] ?? ($old['notifications'] ?? []);
        } elseif ($user['role'] === 'staff') {
            if (($incoming['rooms'] ?? []) !== ($old['rooms'] ?? []) || ($incoming['policy'] ?? null) !== ($old['policy'] ?? null)) {
                throw new ApiError(403, 'Staff ไม่มีสิทธิ์แก้ไขห้องหรือนโยบาย');
            }
            $oldBookings = objectMap($old['bookings'] ?? []);
            $visibleOld = array_filter($oldBookings, static fn(array $booking): bool =>
                ($booking['status'] ?? '') === 'approved' && (int)($booking['assignedStaffId'] ?? 0) === $user['id']
            );
            $visibleIncoming = objectMap($incoming['bookings']);
            if (array_keys($visibleOld) !== array_keys($visibleIncoming)) {
                throw new ApiError(403, 'Staff ไม่มีสิทธิ์เพิ่มหรือลบรายการจอง');
            }
            $newBookings = $oldBookings;
            foreach ($visibleOld as $id => $booking) {
                $candidate = $visibleIncoming[$id];
                $candidateStatus = $candidate['prepStatus'] ?? '';
                $oldPrep = $booking['prepStatus'] ?? '';
                $allowedTransition = $oldPrep === $candidateStatus ||
                    (($oldPrep === 'waiting' && $candidateStatus === 'accepted') ||
                    ($oldPrep === 'accepted' && $candidateStatus === 'preparing') ||
                    ($oldPrep === 'preparing' && $candidateStatus === 'completed'));
                $candidateWithoutPrep = $candidate;
                $originalWithoutPrep = $booking;
                unset($candidateWithoutPrep['prepStatus'], $originalWithoutPrep['prepStatus']);
                if (!$allowedTransition || $candidateWithoutPrep !== $originalWithoutPrep || (($candidateStatus !== $oldPrep) && ($booking['status'] ?? '') !== 'approved')) {
                    throw new ApiError(403, 'Staff สามารถอัปเดตได้เฉพาะขั้นตอนเตรียมห้องของรายการที่อนุมัติแล้ว');
                }
                $newBookings[$id] = $candidate;
            }
            $next = $old;
            $next['bookings'] = array_values($newBookings);
            $next['notifications'] = $incoming['notifications'] ?? ($old['notifications'] ?? []);
        } else {
            $next = applyUserChanges($old, $incoming, $user);
        }
        unset($next['role']);
        $emailEvents = workflowEmailEvents($old, $next);
        persistState($db, $old, $next);
        $db->commit();
        $emailWarnings = sendWorkflowEmails($db, $emailEvents);
        return ['version' => $row['version'] + 1, 'emailWarnings' => $emailWarnings];
    } finally {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
    }
}

function applyUserChanges(array $old, array $incoming, array $user): array
{
    if (($incoming['rooms'] ?? []) !== ($old['rooms'] ?? []) ||
        ($incoming['policy'] ?? null) !== ($old['policy'] ?? null)) {
        throw new ApiError(403, 'ผู้จองไม่มีสิทธิ์แก้ไขห้องหรือนโยบาย');
    }
    $oldBookings = objectMap($old['bookings'] ?? []);
    $newBookings = objectMap($incoming['bookings']);
    $merged = $oldBookings;
    $policy = $old['policy'] ?? [];
    foreach ($oldBookings as $id => $booking) {
        $owner = strcasecmp((string)($booking['email'] ?? ''), $user['email']) === 0;
        if (!$owner) {
            if (isset($newBookings[$id])) {
                throw new ApiError(403, 'ไม่สามารถเปลี่ยนแปลงรายการของผู้อื่นได้');
            }
            continue;
        }
        if (!isset($newBookings[$id])) {
            $allowedDelete = ($policy['allowDelete'] ?? false) &&
                in_array($booking['status'] ?? '', $policy['deletableStatuses'] ?? [], true);
            if (!$allowedDelete) {
                throw new ApiError(403, 'ไม่สามารถลบรายการนี้ตามนโยบายได้');
            }
            unset($merged[$id]);
            continue;
        }
        $candidate = $newBookings[$id];
        if (($candidate['id'] ?? null) !== $id) {
            throw new ApiError(403, 'ไม่สามารถเปลี่ยนรหัสรายการจองได้');
        }
        $newStatus = $candidate['status'] ?? '';
        $oldStatus = $booking['status'] ?? '';
        $cancel = $newStatus === 'cancelled' && $oldStatus !== 'cancelled' &&
            (            in_array($oldStatus, ['pending', 'approved'], true) &&
            (!empty($policy['allowPastCancel']) || strtotime(($booking['startDate'] ?? '') . ' ' . ($booking['startTime'] ?? '00:00')) >= time()));
        if (!in_array($newStatus, [$oldStatus, 'cancelled'], true) || ($newStatus === 'cancelled' && !$cancel)) {
            throw new ApiError(403, 'ผู้จองเปลี่ยนสถานะรายการไม่ได้');
        }
        $editable = $oldStatus === 'pending'
            ? ['roomId', 'title', 'purpose', 'attendees', 'startDate', 'endDate', 'startTime', 'endTime', 'equipment', 'note', 'signature']
            : [];
        $candidateProtected = $candidate;
        $originalProtected = $booking;
        unset($candidateProtected['status'], $originalProtected['status']);
        foreach ($editable as $field) {
            unset($candidateProtected[$field], $originalProtected[$field]);
        }
        if ($candidateProtected !== $originalProtected) {
            throw new ApiError(403, 'แก้ไขได้เฉพาะรายละเอียดคำขอของตนเองที่รออนุมัติ');
        }
        $bookingChanged = false;
        foreach ($editable as $field) {
            if (($candidate[$field] ?? null) !== ($booking[$field] ?? null)) {
                $bookingChanged = true;
                break;
            }
        }
        if ($oldStatus === 'pending' && $bookingChanged) {
            $cutoffDate = ($policy['editUntil'] ?? 'start') === 'end' ? ($booking['endDate'] ?? '') : ($booking['startDate'] ?? '');
            $cutoffTime = ($policy['editUntil'] ?? 'start') === 'end' ? ($booking['endTime'] ?? '00:00') : ($booking['startTime'] ?? '00:00');
            if (strtotime($cutoffDate . ' ' . $cutoffTime) < time()) {
                throw new ApiError(403, 'หมดเวลาที่กำหนดให้แก้ไขคำขอแล้ว');
            }
        }
        foreach (['user', 'email', 'department', 'status', 'prepStatus', 'approvedBy', 'approvedAt', 'rejectionReason', 'createdAt'] as $field) {
            $candidate[$field] = $booking[$field] ?? null;
            if ($candidate[$field] === null) {
                unset($candidate[$field]);
            }
        }
        if ($cancel) {
            $candidate['status'] = 'cancelled';
        } elseif ($oldStatus === 'pending' && $bookingChanged) {
            validateUserBooking($candidate, $oldBookings, $policy, $old['rooms'] ?? [], $id);
        }
        $merged[$id] = $candidate;
    }
    foreach ($newBookings as $id => $booking) {
        if (isset($oldBookings[$id])) {
            continue;
        }
        if (strcasecmp((string)($booking['email'] ?? ''), $user['email']) !== 0 || ($booking['status'] ?? '') !== 'pending') {
            throw new ApiError(403, 'สร้างรายการจองได้เฉพาะบัญชีของตนเองและสถานะเริ่มต้นเท่านั้น');
        }
        $allowedFields = ['id', 'roomId', 'user', 'email', 'department', 'title', 'purpose', 'attendees', 'startDate', 'endDate', 'startTime', 'endTime', 'equipment', 'note', 'signature', 'status', 'prepStatus', 'createdAt'];
        $booking = array_intersect_key($booking, array_flip($allowedFields));
        $booking['user'] = $user['name'];
        $booking['email'] = $user['email'];
        $booking['department'] = $user['department'];
        $booking['status'] = 'pending';
        $booking['prepStatus'] = 'waiting';
        validateUserBooking($booking, $merged, $policy, $old['rooms'] ?? []);
        $merged[$id] = $booking;
    }
    $next = $old;
    $next['bookings'] = array_values($merged);
    $next['notifications'] = $incoming['notifications'] ?? ($old['notifications'] ?? []);
    return $next;
}

function validateUserBooking(array $booking, array $existingBookings, array $policy, array $roomRecords, string $excludedId = ''): void
{
    $rooms = objectMap($roomRecords);
    $room = $rooms[$booking['roomId'] ?? ''] ?? null;
    if (!$room || ($room['status'] ?? '') !== 'active') {
        throw new ApiError(422, 'เลือกห้องที่เปิดให้บริการ');
    }
    $startDate = (string)($booking['startDate'] ?? '');
    $endDate = (string)($booking['endDate'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        throw new ApiError(422, 'วันที่จองไม่ถูกต้อง');
    }
    [$sy, $sm, $sd] = array_map('intval', explode('-', $startDate));
    [$ey, $em, $ed] = array_map('intval', explode('-', $endDate));
    if (!checkdate($sm, $sd, $sy) || !checkdate($em, $ed, $ey) || $endDate < $startDate) {
        throw new ApiError(422, 'ช่วงวันที่จองไม่ถูกต้อง');
    }
    $today = date('Y-m-d');
    $maxDays = max(1, (int)($policy['maxDaysAhead'] ?? 365));
    if ($startDate < $today || $startDate > date('Y-m-d', strtotime('+' . $maxDays . ' days'))) {
        throw new ApiError(422, 'วันที่จองอยู่นอกช่วงเวลาที่ระบบอนุญาต');
    }
    $startTime = (string)($booking['startTime'] ?? '');
    $endTime = (string)($booking['endTime'] ?? '');
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $startTime) ||
        !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $endTime) || $endTime <= $startTime) {
        throw new ApiError(422, 'ช่วงเวลาจองไม่ถูกต้อง');
    }
    $duration = (strtotime($endTime) - strtotime($startTime)) / 3600;
    if ($duration > max(1, (int)($policy['maxDurationHours'] ?? 24))) {
        throw new ApiError(422, 'ระยะเวลาจองเกินกว่าที่ระบบอนุญาต');
    }
    if ((int)($booking['attendees'] ?? 0) < 1 || (int)$booking['attendees'] > (int)$room['capacity'] || trim((string)($booking['title'] ?? '')) === '') {
        throw new ApiError(422, 'กรุณาตรวจสอบหัวข้อและจำนวนผู้เข้าร่วมตามความจุห้อง');
    }
    if (!empty($policy['requireSignature']) && trim((string)($booking['signature'] ?? '')) === '') {
        throw new ApiError(422, 'กรุณาแนบลายเซ็นก่อนส่งคำขอ');
    }
    foreach ($existingBookings as $existing) {
        if (($existing['id'] ?? '') === $excludedId ||
            ($existing['roomId'] ?? null) !== ($booking['roomId'] ?? null) ||
            in_array($existing['status'] ?? '', ['rejected', 'cancelled', 'completed'], true)) {
            continue;
        }
        if ($startDate <= (string)($existing['endDate'] ?? '') &&
            (string)($existing['startDate'] ?? '') <= $endDate &&
            $startTime < (string)($existing['endTime'] ?? '') &&
            (string)($existing['startTime'] ?? '') < $endTime) {
            throw new ApiError(409, 'ช่วงเวลาจองห้องนี้ชนกับรายการอื่น กรุณาเลือกเวลาใหม่');
        }
    }
}

function migrate(PDO $db, array $user, array $body): array
{
    requireRole($user, ['super_admin']);
    $legacyState = $body['state'] ?? null;
    $accounts = $body['accounts'] ?? [];
    if (!is_array($legacyState) || !is_array($legacyState['rooms'] ?? null) || !is_array($legacyState['bookings'] ?? null) || !is_array($accounts)) {
        throw new ApiError(400, 'ไม่พบข้อมูล localStorage ที่ถูกต้องสำหรับย้ายระบบ');
    }
    $db->beginTransaction();
    try {
        $existing = $db->query('SELECT id FROM migrations WHERE id = 1 FOR UPDATE')->fetch();
        if ($existing) {
            throw new ApiError(409, 'ดำเนินการนำเข้าข้อมูลครั้งเดียวไปแล้ว');
        }
        $legacyState['rooms'] = array_values($legacyState['rooms']);
        $legacyState['bookings'] = array_values($legacyState['bookings']);
        $legacyState['role'] = 'user';
        if (!is_array($legacyState['policy'] ?? null)) {
            $legacyState['policy'] = [];
        }
        if (!is_array($legacyState['notifications'] ?? null)) {
            $legacyState['notifications'] = [];
        }
        $inserted = 0;
        $skipped = 0;
        $insertUser = $db->prepare('INSERT IGNORE INTO users (email, name, department, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, "user")');
        foreach ($accounts as $account) {
            if (!is_array($account)) {
                continue;
            }
            $email = strtolower(trim((string)($account['email'] ?? '')));
            $name = trim((string)($account['name'] ?? ''));
            $password = (string)($account['password'] ?? '');
            if (!validEmail($email) || $name === '' || strlen($name) > 100 || strlen($password) < 8 || strlen($password) > 72) {
                $skipped++;
                continue;
            }
            $insertUser->execute([
                $email,
                $name,
                mb_substr(trim((string)($account['department'] ?? '')), 0, 100),
                substr(trim((string)($account['phone'] ?? '')), 0, 20),
                password_hash($password, PASSWORD_DEFAULT),
            ]);
            $inserted += $insertUser->rowCount();
        }
        if (stateRow($db, true)) {
            throw new ApiError(409, 'พบข้อมูลในฐานข้อมูลแล้ว จึงไม่สามารถนำเข้าทับข้อมูลได้');
        }
        $empty = ['rooms' => [], 'bookings' => [], 'policy' => [], 'notifications' => []];
        persistState($db, $empty, $legacyState, true);
        $db->prepare('INSERT INTO migrations (id, imported_by, imported_users) VALUES (1, ?, ?)')->execute([$user['id'], $inserted]);
        $db->commit();
        return ['importedAccounts' => $inserted, 'skippedAccounts' => $skipped, 'rooms' => count($legacyState['rooms']), 'bookings' => count($legacyState['bookings'])];
    } finally {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
    }
}

try {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_name('eduroom_session');
        session_set_cookie_params([
            'httponly' => true,
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'samesite' => 'Strict',
            'path' => '/bookmain/',
        ]);
        ini_set('session.use_strict_mode', '1');
        session_start();
    }

    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $db = database();

    if ($action === 'session' && $method === 'GET') {
        $user = empty($_SESSION['user_id']) ? null : currentUser($db);
        respond(['user' => $user, 'csrfToken' => $_SESSION['csrf'] ??= bin2hex(random_bytes(32))]);
    }
    if ($action === 'state' && $method === 'GET') {
        $user = currentUser($db);
        $row = stateRow($db);
        respond(['state' => $row ? visibleState($row['state'], $user) : null, 'version' => $row['version'] ?? 0]);
    }
    if ($action === 'migration-status' && $method === 'GET') {
        $user = currentUser($db);
        $done = (bool)$db->query('SELECT id FROM migrations WHERE id = 1')->fetch();
        respond(['completed' => $done]);
    }
    if ($action === 'statistics' && $method === 'GET') {
        $user = currentUser($db);
        requireRole($user, ['super_admin']);
        $reportMonth = $_GET['month'] ?? '';
        if (!is_string($reportMonth) || !preg_match('/^(\d{4})-(\d{2})$/', $reportMonth, $monthParts)) {
            throw new ApiError(422, 'กรุณาระบุเดือนในรูปแบบ YYYY-MM');
        }
        $year = (int)$monthParts[1];
        $month = (int)$monthParts[2];
        if (!checkdate($month, 1, $year)) {
            throw new ApiError(422, 'เดือนที่ระบุไม่ถูกต้อง');
        }
        $memberStats = $db->query(
            "SELECT COUNT(*) AS total,
                COALESCE(SUM(active = 1), 0) AS active,
                COALESCE(SUM(role = 'user'), 0) AS user_count,
                COALESCE(SUM(role = 'admin'), 0) AS admin_count,
                COALESCE(SUM(role = 'staff'), 0) AS staff_count,
                COALESCE(SUM(role = 'super_admin'), 0) AS super_admin_count
             FROM users"
        )->fetch();
        $newMemberQuery = $db->prepare('SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?');
        $newMemberQuery->execute([$reportMonth . '-01', date('Y-m-d', strtotime($reportMonth . '-01 +1 month'))]);
        $memberStats['new_members'] = (int)$newMemberQuery->fetchColumn();
        foreach (['total', 'active', 'user_count', 'admin_count', 'staff_count', 'super_admin_count'] as $key) {
            $memberStats[$key] = (int)$memberStats[$key];
        }
        respond(['month' => $reportMonth, 'members' => $memberStats]);
    }
    if ($action === 'members' && $method === 'GET') {
        $user = currentUser($db);
        requireRole($user, ['super_admin']);
        $members = $db->query('SELECT id, email, name_prefix, name, member_type, department, phone, profile_image, role, active, created_at FROM users ORDER BY created_at DESC, id DESC')->fetchAll();
        foreach ($members as &$member) {
            $member['id'] = (int)$member['id'];
            $member['active'] = (bool)$member['active'];
            $member['namePrefix'] = $member['name_prefix'];
            $member['memberType'] = $member['member_type'];
            $member['profileImage'] = $member['profile_image'] ?? '';
            unset($member['name_prefix'], $member['member_type'], $member['profile_image']);
        }
        unset($member);
        respond(['members' => $members]);
    }
    if ($action === 'staff-members' && $method === 'GET') {
        $user = currentUser($db);
        requireRole($user, ['admin', 'super_admin']);
        $staff = $db->query("SELECT id, name, department FROM users WHERE role = 'staff' AND active = 1 ORDER BY name, id")->fetchAll();
        foreach ($staff as &$member) {
            $member['id'] = (int)$member['id'];
        }
        unset($member);
        respond(['staff' => $staff]);
    }

    if ($method !== 'POST') {
        throw new ApiError(404, 'ไม่พบคำสั่ง API นี้');
    }
    requireCsrf();
    $body = input();

    if ($action === 'login') {
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $query = $db->prepare('SELECT id, email, name_prefix, name, member_type, department, phone, profile_image, password_hash, role FROM users WHERE email = ? AND active = 1');
        $query->execute([$email]);
        $account = $query->fetch();
        if (!$account || !password_verify($password, $account['password_hash'])) {
            throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$account['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        unset($account['password_hash']);
        $account['id'] = (int)$account['id'];
        $account['namePrefix'] = $account['name_prefix'];
        $account['memberType'] = $account['member_type'];
        $account['profileImage'] = $account['profile_image'] ?? '';
        unset($account['name_prefix'], $account['member_type'], $account['profile_image']);
        respond(jsonResponse($account, $_SESSION['csrf']));
    }

    if ($action === 'register') {
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $profile = accountProfile($body);
        if (!validEmail($email) || $profile['email'] !== $email) {
            throw new ApiError(422, 'กรุณาใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @crru.ac.th');
        }
        if ($profile['department'] === '' || !preg_match('/^[0-9+()\s-]{9,20}$/', $profile['phone'])) {
            throw new ApiError(422, 'กรุณาตรวจสอบชื่อ หน่วยงาน และเบอร์โทรศัพท์');
        }
        $profile['profileImage'] = profileImage($body, [], true);
        if (strlen($password) < 8 || strlen($password) > 72) {
            throw new ApiError(422, 'รหัสผ่านต้องมีความยาว 8–72 ไบต์');
        }
        try {
            $insert = $db->prepare('INSERT INTO users (email, name_prefix, name, member_type, department, phone, profile_image, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "user")');
            $insert->execute([
                $profile['email'], $profile['namePrefix'], $profile['name'], $profile['memberType'],
                $profile['department'], $profile['phone'], $profile['profileImage'], password_hash($password, PASSWORD_DEFAULT),
            ]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                throw new ApiError(409, 'อีเมลนี้มีบัญชีในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น');
            }
            throw $error;
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$db->lastInsertId();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        respond(jsonResponse(['id' => $_SESSION['user_id'], ...$profile, 'role' => 'user'], $_SESSION['csrf']), 201);
    }

    if ($action === 'logout') {
        unset($_SESSION['user_id']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        respond(['loggedOut' => true, 'csrfToken' => $_SESSION['csrf']]);
    }

    $user = currentUser($db);
    if ($action === 'member-create') {
        requireRole($user, ['admin', 'super_admin']);
        $profile = accountProfile($body);
        $profile['profileImage'] = profileImage($body, [], true);
        $role = $body['role'] ?? null;
        $password = $body['password'] ?? null;
        $allowedRoles = $user['role'] === 'super_admin'
            ? ['user', 'admin', 'staff', 'super_admin']
            : ['user', 'admin', 'staff'];
        if (!is_string($role) || !in_array($role, $allowedRoles, true)) {
            throw new ApiError(403, 'บัญชีของคุณไม่มีสิทธิ์กำหนดบทบาทนี้');
        }
        if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72) {
            throw new ApiError(422, 'รหัสผ่านต้องมีความยาว 8–72 ไบต์');
        }
        try {
            $insert = $db->prepare('INSERT INTO users (email, name_prefix, name, member_type, department, phone, profile_image, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $insert->execute([
                $profile['email'],
                $profile['namePrefix'],
                $profile['name'],
                $profile['memberType'],
                $profile['department'],
                $profile['phone'],
                $profile['profileImage'],
                password_hash($password, PASSWORD_DEFAULT),
                $role,
            ]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                throw new ApiError(409, 'อีเมลนี้มีบัญชีในระบบแล้ว กรุณาใช้อีเมลอื่น');
            }
            throw $error;
        }
        $member = [
            'id' => (int)$db->lastInsertId(),
            ...$profile,
            'role' => $role,
            'active' => true,
        ];
        $created = $db->prepare('SELECT created_at FROM users WHERE id = ?');
        $created->execute([$member['id']]);
        $member['created_at'] = $created->fetchColumn();
        respond(['member' => $member], 201);
    }
    if ($action === 'profile-update') {
        requireRole($user, ['super_admin']);
        $profile = accountProfile($body, $user);
        $currentPassword = $body['currentPassword'] ?? null;
        $newPassword = $body['newPassword'] ?? '';
        if (!is_string($currentPassword) || $currentPassword === '' || !is_string($newPassword) ||
            ($newPassword !== '' && (strlen($newPassword) < 8 || strlen($newPassword) > 72))) {
            throw new ApiError(422, 'กรุณากรอกรหัสผ่านปัจจุบัน และตรวจสอบรหัสผ่านใหม่ (8–72 ไบต์)');
        }
        $findAccount = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $findAccount->execute([$user['id']]);
        $passwordHash = $findAccount->fetchColumn();
        if (!is_string($passwordHash) || !password_verify($currentPassword, $passwordHash)) {
            throw new ApiError(403, 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }
        $updateSql = 'UPDATE users SET email = ?, name_prefix = ?, name = ?, member_type = ?, department = ?, phone = ?, profile_image = ?';
        $values = [$profile['email'], $profile['namePrefix'], $profile['name'], $profile['memberType'], $profile['department'], $profile['phone'], $profile['profileImage']];
        if ($newPassword !== '') {
            $updateSql .= ', password_hash = ?';
            $values[] = password_hash($newPassword, PASSWORD_DEFAULT);
        }
        $updateSql .= ' WHERE id = ?';
        $values[] = $user['id'];
        $db->beginTransaction();
        try {
            $db->prepare($updateSql)->execute($values);
            $syncBookings = $db->prepare('UPDATE bookings SET user_email = ?, user_name = ?, department = ? WHERE user_id = ? OR (user_id IS NULL AND user_email = ?)');
            $syncBookings->execute([$profile['email'], $profile['namePrefix'] . ' ' . $profile['name'], $profile['department'], $user['id'], $user['email']]);
            $db->commit();
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                throw new ApiError(409, 'อีเมลนี้มีบัญชีในระบบแล้ว กรุณาใช้อีเมลอื่น');
            }
            throw $error;
        } finally {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
        }
        respond(['user' => ['id' => $user['id'], ...$profile, 'role' => 'super_admin']]);
    }
    if ($action === 'member-update') {
        requireRole($user, ['super_admin']);
        $memberId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $role = $body['role'] ?? null;
        $active = $body['active'] ?? null;
        if ($memberId === false || !is_string($role) || !in_array($role, ['user', 'admin', 'staff', 'super_admin'], true) || !is_bool($active)) {
            throw new ApiError(422, 'ข้อมูลบทบาทหรือสถานะสมาชิกไม่ถูกต้อง');
        }
        if ((int)$memberId === $user['id']) {
            throw new ApiError(422, 'ไม่สามารถแก้ไขบัญชีที่กำลังใช้งานอยู่ได้');
        }
        $db->beginTransaction();
        try {
            $lockAdmins = $db->query("SELECT id FROM users WHERE role = 'super_admin' AND active = 1 FOR UPDATE")->fetchAll();
            $findMember = $db->prepare('SELECT id, email, name_prefix, name, member_type, department, phone, profile_image, role, active, created_at FROM users WHERE id = ? FOR UPDATE');
            $findMember->execute([(int)$memberId]);
            $member = $findMember->fetch();
            if (!$member) {
                throw new ApiError(404, 'ไม่พบสมาชิกที่ต้องการแก้ไข');
            }
            $profile = accountProfile($body, $member);
            $newPassword = $body['newPassword'] ?? '';
            if (!is_string($newPassword) || ($newPassword !== '' && (strlen($newPassword) < 8 || strlen($newPassword) > 72))) {
                throw new ApiError(422, 'รหัสผ่านใหม่ต้องมีความยาว 8–72 ไบต์');
            }
            $removingActiveSuperAdmin = $member['role'] === 'super_admin' && (bool)$member['active'] && ($role !== 'super_admin' || !$active);
            if ($removingActiveSuperAdmin && count($lockAdmins) <= 1) {
                throw new ApiError(409, 'ต้องมี Super Admin ที่เปิดใช้งานอย่างน้อยหนึ่งบัญชี');
            }
            $updateSql = 'UPDATE users SET email = ?, name_prefix = ?, name = ?, member_type = ?, department = ?, phone = ?, profile_image = ?, role = ?, active = ?';
            $values = [$profile['email'], $profile['namePrefix'], $profile['name'], $profile['memberType'], $profile['department'], $profile['phone'], $profile['profileImage'], $role, $active ? 1 : 0];
            if ($newPassword !== '') {
                $updateSql .= ', password_hash = ?';
                $values[] = password_hash($newPassword, PASSWORD_DEFAULT);
            }
            $updateSql .= ' WHERE id = ?';
            $values[] = (int)$memberId;
            try {
                $db->prepare($updateSql)->execute($values);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    throw new ApiError(409, 'อีเมลนี้มีบัญชีในระบบแล้ว กรุณาใช้อีเมลอื่น');
                }
                throw $error;
            }
            $syncBookings = $db->prepare('UPDATE bookings SET user_email = ?, user_name = ?, department = ? WHERE user_id = ? OR (user_id IS NULL AND user_email = ?)');
            $syncBookings->execute([$profile['email'], $profile['namePrefix'] . ' ' . $profile['name'], $profile['department'], (int)$memberId, $member['email']]);
            $member = array_merge($member, $profile);
            $member['role'] = $role;
            $member['active'] = $active;
            unset($member['name_prefix'], $member['member_type'], $member['profile_image']);
            $db->commit();
            respond(['member' => $member]);
        } finally {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
        }
    }
    if ($action === 'state') {
        $result = saveState($db, $user, $body);
        respond($result);
    }
    if ($action === 'migrate') {
        respond(migrate($db, $user, $body), 201);
    }
    throw new ApiError(404, 'ไม่พบคำสั่ง API นี้');
} catch (ApiError $error) {
    respond(['error' => $error->getMessage()], $error->status);
} catch (PDOException $error) {
    error_log('EduRoom database error: ' . $error->getMessage());
    respond(['error' => 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า MySQL และ api/schema.sql'], 503);
} catch (JsonException $error) {
    respond(['error' => 'ข้อมูล JSON ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป'], 400);
}
