# Runs all Chat E2E specs (serial suites use workers=1 per project).
$ErrorActionPreference = "Continue"
Set-Location (Join-Path (Join-Path $PSScriptRoot "..") ".." | Resolve-Path)
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:5173"
$env:PLAYWRIGHT_SKIP_WEBSERVER = "1"

$specs = @(
  "test/e2e/test-feats/Chat/chat-agreement-checkout.spec.ts",
  "test/e2e/test-feats/Chat/chat-exit-policies-route-lifecycle.spec.ts",
  "test/e2e/test-feats/Chat/chat-exit-policies.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-completion-agreement-evidence.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-sheet-carriers.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-sheet-edit-system.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-sheet-social.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-sheets.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-cede-pause.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-deliveries-ui.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-delivered-guards.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-evidence.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-multi-sheet.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-pay-live-map.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-telemetry.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-logistics-withdraw-leave.spec.ts",
  "test/e2e/test-feats/Chat/chat-route-link-after-merch-payment.spec.ts"
)

$args = @("playwright", "test") + $specs + @("--workers=1")
Write-Host "[e2e] Running $($specs.Count) Chat spec files..."
& npx @args
exit $LASTEXITCODE
