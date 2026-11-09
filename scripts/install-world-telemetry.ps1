param([string]$TelemetryRoot='C:\NebulaWorld')
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force $TelemetryRoot | Out-Null
Copy-Item (Join-Path $repo 'scripts/publish-world-telemetry.mjs') (Join-Path $TelemetryRoot 'publish-world-telemetry.mjs') -Force
New-Item -ItemType Directory -Force (Join-Path $TelemetryRoot 'live') | Out-Null
Copy-Item (Join-Path $repo 'scripts/live/*') (Join-Path $TelemetryRoot 'live') -Recurse -Force
if(!(Test-Path (Join-Path $TelemetryRoot 'live.config.json'))){Copy-Item (Join-Path $repo 'ops/world-live.config.json') (Join-Path $TelemetryRoot 'live.config.json')}
$node=(Get-Command node).Source
$consoleHost=Join-Path $env:WINDIR 'System32/conhost.exe'
$action=New-ScheduledTaskAction -Execute $consoleHost -Argument ('--headless "'+$node+'" "'+(Join-Path $TelemetryRoot 'publish-world-telemetry.mjs')+'"') -WorkingDirectory $TelemetryRoot
$trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Nebula World Workstation Telemetry' -Action $action -Trigger $trigger -Settings $settings -Description 'Publish read-only Training and GPU observations to the official CT125 campus.' -Force | Out-Null
& $node (Join-Path $TelemetryRoot 'publish-world-telemetry.mjs')
if($LASTEXITCODE -ne 0){throw 'Initial workstation telemetry publish failed'}
