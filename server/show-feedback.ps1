Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FeedbackDirectory = Join-Path $ProjectRoot "data\feedback"
$FeedbackStore = Join-Path $FeedbackDirectory "feedback.json"
$LegacyFeedback = Join-Path $ProjectRoot "data\feedback.ndjson"

if (Test-Path $FeedbackStore) {
    $Document = Get-Content $FeedbackStore -Raw | ConvertFrom-Json
    $Entries = @($Document.entries)
}
elseif (Test-Path $LegacyFeedback) {
    $Entries = Get-Content $LegacyFeedback | Where-Object { $_.Trim().Length -gt 0 } | ForEach-Object { $_ | ConvertFrom-Json }
}
else {
    Write-Host "No feedback has been submitted yet."
    exit 0
}

$Entries | Sort-Object submittedAt -Descending | Select-Object -First 50 | Format-List submittedAt,status,source,category,gameName,submitterDisplayName,playerName,roomCode,details,ownerReply,appVersion,pageUrl
