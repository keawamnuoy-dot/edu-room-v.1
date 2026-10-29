param(
    [string]$XamppRoot = 'C:\xampp'
)

$ErrorActionPreference = 'Stop'

function Set-IniValue {
    param(
        [string]$Content,
        [string]$Section,
        [string]$Key,
        [string]$Value
    )

    $escapedSection = [regex]::Escape($Section)
    $sectionMatch = [regex]::Match($Content, "(?ms)^\[$escapedSection\][^\r\n]*(?:\r?\n)(.*?)(?=^\[|\z)")
    if (-not $sectionMatch.Success) {
        throw "Missing section [$Section] in the configuration file."
    }

    $sectionContent = $sectionMatch.Groups[1].Value
    $escapedKey = [regex]::Escape($Key)
    $linePattern = "(?m)^\s*;?\s*$escapedKey\s*=.*$"
    $newLine = "$Key = $Value"
    if ([regex]::IsMatch($sectionContent, $linePattern)) {
        $sectionContent = [regex]::Replace($sectionContent, $linePattern, $newLine, 1)
    } else {
        $sectionContent = $sectionContent.TrimEnd("`r", "`n") + "`r`n$newLine`r`n"
    }

    return $Content.Substring(0, $sectionMatch.Groups[1].Index) +
        $sectionContent +
        $Content.Substring($sectionMatch.Groups[1].Index + $sectionMatch.Groups[1].Length)
}

function Read-RequiredValue {
    param([string]$Prompt)
    $value = (Read-Host $Prompt).Trim()
    if ([string]::IsNullOrWhiteSpace($value) -or $value.Contains("`r") -or $value.Contains("`n")) {
        throw "A required configuration value is missing or invalid."
    }
    return $value
}

$phpIni = Join-Path $XamppRoot 'php\php.ini'
$sendmailIni = Join-Path $XamppRoot 'sendmail\sendmail.ini'
$sendmailExe = Join-Path $XamppRoot 'sendmail\sendmail.exe'
foreach ($path in @($phpIni, $sendmailIni, $sendmailExe)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required XAMPP file not found: $path"
    }
}

$smtpHost = Read-RequiredValue 'SMTP server hostname (for example smtp.example.ac.th):'
if ($smtpHost -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$' -or $smtpHost.Contains('..')) {
    throw 'SMTP server must be a hostname or IPv4 address, not a user email address.'
}

$portInput = Read-RequiredValue 'SMTP port (587 for STARTTLS or 465 for SSL/TLS):'
$port = 0
if (-not [int]::TryParse($portInput, [ref]$port) -or $port -notin @(465, 587)) {
    throw 'Use port 587 (STARTTLS) or 465 (SSL/TLS).'
}

$smtpUser = Read-RequiredValue 'SMTP username:'
$sender = Read-RequiredValue 'Authorized sender email address:'
if ($sender -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw 'Sender email address is invalid.'
}

$securePassword = Read-Host 'SMTP password / app password (input is hidden)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $smtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $securePassword.Dispose()
}
if ([string]::IsNullOrWhiteSpace($smtpPassword) -or $smtpPassword.Contains("`r") -or $smtpPassword.Contains("`n")) {
    throw 'SMTP password is empty or invalid.'
}

Write-Host ''
Write-Host "SMTP server: $smtpHost`:$port"
Write-Host "Username: $smtpUser"
Write-Host "Sender: $sender"
Write-Warning 'sendmail.ini stores the SMTP password as plaintext. Restrict access to this file.'
$confirmation = Read-Host 'Apply these SMTP settings to XAMPP? Type YES to continue'
if ($confirmation -cne 'YES') {
    $smtpPassword = $null
    Write-Host 'Cancelled. No configuration files were changed.'
    exit 0
}

$phpContent = Get-Content -LiteralPath $phpIni -Raw -Encoding Default
$sendmailContent = Get-Content -LiteralPath $sendmailIni -Raw -Encoding Default
$sslMode = if ($port -eq 587) { 'tls' } else { 'ssl' }
$sendmailPath = Join-Path $XamppRoot 'sendmail\sendmail.exe'
$sendmailConfigValue = '"\"' + $sendmailPath + '\" -t"'

$phpContent = Set-IniValue $phpContent 'mail function' 'sendmail_path' $sendmailConfigValue
$phpContent = Set-IniValue $phpContent 'mail function' 'sendmail_from' $sender
$phpContent = Set-IniValue $phpContent 'mail function' 'env[EDUROOM_MAIL_FROM]' $sender
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'smtp_server' $smtpHost
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'smtp_port' ([string]$port)
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'smtp_ssl' $sslMode
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'auth_username' $smtpUser
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'auth_password' $smtpPassword
$sendmailContent = Set-IniValue $sendmailContent 'sendmail' 'force_sender' $sender

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$phpBackup = "$phpIni.backup-$timestamp"
$sendmailBackup = "$sendmailIni.backup-$timestamp"
$phpTemp = "$phpIni.tmp-$timestamp"
$sendmailTemp = "$sendmailIni.tmp-$timestamp"
Copy-Item -LiteralPath $phpIni -Destination $phpBackup
Copy-Item -LiteralPath $sendmailIni -Destination $sendmailBackup

try {
    Set-Content -LiteralPath $phpTemp -Value $phpContent -Encoding Default -NoNewline
    Set-Content -LiteralPath $sendmailTemp -Value $sendmailContent -Encoding Default -NoNewline
    Copy-Item -LiteralPath $phpTemp -Destination $phpIni -Force
    Copy-Item -LiteralPath $sendmailTemp -Destination $sendmailIni -Force
} catch {
    $writeError = $_
    $restoreErrors = @()
    try {
        Copy-Item -LiteralPath $phpBackup -Destination $phpIni -Force
    } catch {
        $restoreErrors += "php.ini: $($_.Exception.Message)"
    }
    try {
        Copy-Item -LiteralPath $sendmailBackup -Destination $sendmailIni -Force
    } catch {
        $restoreErrors += "sendmail.ini: $($_.Exception.Message)"
    }
    Remove-Item -LiteralPath $phpTemp, $sendmailTemp -Force -ErrorAction SilentlyContinue
    $smtpPassword = $null
    if ($restoreErrors.Count -gt 0) {
        throw "SMTP configuration failed and rollback was incomplete. Backups: $phpBackup, $sendmailBackup. Error: $($writeError.Exception.Message) Rollback error: $($restoreErrors -join '; ')"
    }
    throw "SMTP configuration failed; original files were restored from backups. Error: $($writeError.Exception.Message)"
}
try {
    Remove-Item -LiteralPath $phpTemp, $sendmailTemp -Force -ErrorAction Stop
} catch {
    throw "SMTP settings were applied, but temporary files could not be removed: $phpTemp, $sendmailTemp. Remove them manually. Error: $($_.Exception.Message)"
}
$smtpPassword = $null

Write-Host ''
Write-Host 'XAMPP mail settings were updated. Restart Apache before testing.'
Write-Host 'Send a test email from EduRoom and inspect C:\xampp\sendmail\error.log if delivery fails.'
Write-Host "Original configuration backups: $phpBackup and $sendmailBackup"
