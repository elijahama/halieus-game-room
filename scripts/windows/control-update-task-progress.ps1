# Operation-scoped task receipts for the isolated Control updater.
# Telemetry never authorizes a deployment or terminal success.
function New-HgrIsolatedTaskProgress {
    param([string]$OperationId)
    $names = @(
        "Fetch canonical main", "Verify published fingerprint", "Install dependencies",
        "Security audit", "Client/server typecheck", "Production build",
        "Platform regressions", "Oracle package preflight", "Final fingerprint",
        "Oracle deployment and verification", "Final receipt"
    )
    $tasks = @()
    for ($i = 0; $i -lt $names.Count; $i++) {
        $tasks += @{ id = $i + 1; label = $names[$i]; state = "queued"; startedAt = $null; finishedAt = $null }
    }
    return @{ schema = 1; operationId = $OperationId; sequence = 0; observedAt = [DateTimeOffset]::UtcNow.ToString("o"); tasks = $tasks }
}
function Update-HgrIsolatedTaskProgress {
    param([hashtable]$Telemetry,[AllowEmptyString()][string]$Line)
    if ($Line -cnotmatch '^\[HGR-TASK v1\] ([A-Za-z0-9_-]{8,80}) ([1-9][0-9]?) (running|passed|failed|skipped)$') { return $false }
    $operation = $Matches[1]; $id = [int]$Matches[2]; $state = $Matches[3]
    if ($operation -cne $Telemetry.operationId -or $id -gt 10) { return $false }
    $task = $Telemetry.tasks[$id - 1]
    if ($id -gt 1 -and @("passed","skipped") -notcontains $Telemetry.tasks[$id - 2].state) { return $false }
    if ($state -eq "skipped") {
        if ($id -lt 3 -or $task.state -ne "queued" -or ($id -gt 3 -and $Telemetry.tasks[$id - 2].state -ne "skipped")) { return $false }
    } elseif ($state -eq "running") {
        if ($task.state -ne "queued" -or ($id -gt 3 -and $Telemetry.tasks[$id - 2].state -eq "skipped")) { return $false }
    } elseif ($task.state -ne "running") { return $false }
    $at = [DateTimeOffset]::UtcNow.ToString("o")
    $task.state = $state
    if ($state -eq "running") { $task.startedAt = $at } else { $task.finishedAt = $at }
    $Telemetry.sequence++
    $Telemetry.observedAt = $at
    return $true
}
function Get-HgrIsolatedTaskPercent {
    param([hashtable]$Telemetry)
    $resolved = @($Telemetry.tasks | Where-Object { $_.state -in @("passed","skipped") }).Count
    return [Math]::Min(99,[int][Math]::Floor(100.0 * $resolved / $Telemetry.tasks.Count))
}
function Get-HgrIsolatedTaskPhase {
    param([hashtable]$Telemetry)
    $passed = @($Telemetry.tasks | Where-Object { $_.state -eq "passed" }).Count
    $skipped = @($Telemetry.tasks | Where-Object { $_.state -eq "skipped" }).Count
    $active = @($Telemetry.tasks | Where-Object { $_.state -eq "running" -or $_.state -eq "failed" } | Select-Object -First 1)
    if ($active.Count -eq 0) { $active = @($Telemetry.tasks | Where-Object { $_.state -eq "queued" } | Select-Object -First 1) }
    $label = if ($active.Count) { $active[0].label } else { "Awaiting final receipt" }
    return "$label ($passed passed, $skipped skipped / $($Telemetry.tasks.Count) tasks)"
}
