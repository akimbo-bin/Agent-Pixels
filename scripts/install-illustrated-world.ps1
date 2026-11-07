param([string]$ReleaseRoot='C:\NebulaWorld')
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
Push-Location $repo
try {
 & node scripts/deploy-illustrated-world.mjs --root $ReleaseRoot
 if($LASTEXITCODE -ne 0){throw 'Release build failed'}
 $node=(Get-Command node).Source
 $taskName='Nebula Illustrated World'
 $action=New-ScheduledTaskAction -Execute $node -Argument ('"'+(Join-Path $ReleaseRoot 'server.mjs')+'" --root "'+$ReleaseRoot+'" --port 8791') -WorkingDirectory $ReleaseRoot
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
 $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Official Nebula illustrated world; loopback-only HTTP served privately through Tailscale.' -Force | Out-Null
 Start-ScheduledTask -TaskName $taskName
 & tailscale serve --bg --https=8443 --yes http://127.0.0.1:8791
 if($LASTEXITCODE -ne 0){throw 'Tailscale setup failed'}
 Write-Host 'Official world installed. Updates: npm run world:deploy'
} finally {Pop-Location}
