param(
  [switch]$SkipBuild,
  [string]$RepositoryRoot = ''
)

$ErrorActionPreference = 'Stop'

if (-not $RepositoryRoot) {
  $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
}

$frontendRoot = Join-Path $RepositoryRoot 'frontend'
$sourceRoot = Join-Path $frontendRoot 'src'
$pagesFile = Join-Path $sourceRoot 'pages.json'
if (-not (Test-Path -LiteralPath $pagesFile)) {
  throw "frontend/src/pages.json not found under $RepositoryRoot"
}

Push-Location $frontendRoot
try {
  Write-Host '[1/7] TypeScript' -ForegroundColor Cyan
  & npm.cmd run type-check
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host '[2/7] Static assets and ui/ isolation' -ForegroundColor Cyan
  & (Join-Path $RepositoryRoot '.agents/skills/organize-fandazi-assets/scripts/audit-assets.ps1') -RepositoryRoot $RepositoryRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host '[3/7] Route targets' -ForegroundColor Cyan
  $pages = (Get-Content -LiteralPath $pagesFile -Raw -Encoding UTF8 | ConvertFrom-Json).pages.path
  $registered = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $pages | ForEach-Object { [void]$registered.Add("/$_") }
  $routePattern = '/pages/[A-Za-z0-9_./-]+'
  $unknownRoutes = [System.Collections.Generic.List[object]]::new()

  Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
    Where-Object { $_.Extension -in '.vue', '.ts', '.js' } |
    ForEach-Object {
      $file = $_
      $content = Get-Content -LiteralPath $file.FullName -Raw
      [regex]::Matches($content, $routePattern) | ForEach-Object {
        $route = $_.Value.TrimEnd('/')
        if (-not $registered.Contains($route)) {
          $unknownRoutes.Add([pscustomobject]@{ Source = $file.FullName; Route = $route })
        }
      }
    }

  if ($unknownRoutes.Count) {
    $unknownRoutes | Sort-Object Route -Unique | Format-Table -AutoSize
    throw 'Unregistered navigation route found.'
  }

  Write-Host '[4/7] UI invariants' -ForegroundColor Cyan
  $legacyCapsule = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
    Where-Object { $_.Extension -in '.vue', '.scss', '.css', '.wxss' } |
    Select-String -Pattern 'margin-right:\s*178rpx'
  if ($legacyCapsule) {
    $legacyCapsule | Format-Table Path, LineNumber, Line -AutoSize
    throw 'Legacy fixed capsule spacing found.'
  }

  $smallFonts = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
    Where-Object { $_.Extension -in '.vue', '.scss', '.css', '.wxss' } |
    Select-String -Pattern 'font-size:\s*(?:[0-9]|1[0-9]|2[0-3])rpx'
  if ($smallFonts) {
    $smallFonts | Format-Table Path, LineNumber, Line -AutoSize
    throw 'Font size below 24rpx found.'
  }

  Write-Host '[5/7] Git diff whitespace' -ForegroundColor Cyan
  & git diff --check
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if (-not $SkipBuild) {
    Write-Host '[6/7] WeChat build' -ForegroundColor Cyan
    & npm.cmd run build:mp-weixin
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host '[7/7] Build output' -ForegroundColor Cyan
    $output = Join-Path $frontendRoot 'dist/build/mp-weixin'
    if (-not (Test-Path -LiteralPath $output)) {
      throw 'Expected frontend/dist/build/mp-weixin output was not created.'
    }
  }
  else {
    Write-Host '[6-7/7] Build skipped by request.' -ForegroundColor Yellow
  }

  Write-Host 'Fandazi miniapp verification passed.' -ForegroundColor Green
}
finally {
  Pop-Location
}
