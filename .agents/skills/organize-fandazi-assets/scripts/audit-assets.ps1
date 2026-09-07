param(
  [string]$RepositoryRoot = ''
)

$ErrorActionPreference = 'Stop'

if (-not $RepositoryRoot) {
  $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
}

$frontendRoot = Join-Path $RepositoryRoot 'frontend'
$sourceRoot = Join-Path $frontendRoot 'src'
if (-not (Test-Path -LiteralPath $sourceRoot)) {
  throw "frontend/src directory not found under $RepositoryRoot"
}

$referencePattern = '/static/[A-Za-z0-9_./-]+\.(png|jpg|jpeg|webp|svg)'
$missing = [System.Collections.Generic.List[object]]::new()
$uiReferences = [System.Collections.Generic.List[object]]::new()

Get-ChildItem -LiteralPath $sourceRoot -Recurse -File |
  Where-Object { $_.Extension -in '.vue', '.ts', '.js', '.json', '.scss', '.css', '.wxml', '.wxss' } |
  ForEach-Object {
    $file = $_
    $content = Get-Content -LiteralPath $file.FullName -Raw

    [regex]::Matches($content, $referencePattern) | ForEach-Object {
      $reference = $_.Value
      $relative = $reference.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      $target = Join-Path $sourceRoot $relative
      if (-not (Test-Path -LiteralPath $target)) {
        $missing.Add([pscustomobject]@{ Source = $file.FullName; Reference = $reference })
      }
    }

    if ($content -match '(?i)(?:\.\./)*ui[/\\]') {
      $uiReferences.Add([pscustomobject]@{ Source = $file.FullName })
    }
  }

if ($missing.Count) {
  Write-Host 'Missing static assets:' -ForegroundColor Red
  $missing | Sort-Object Reference -Unique | Format-Table -AutoSize
}

if ($uiReferences.Count) {
  Write-Host 'Runtime references to ui/ are forbidden:' -ForegroundColor Red
  $uiReferences | Sort-Object Source -Unique | Format-Table -AutoSize
}

if ($missing.Count -or $uiReferences.Count) {
  exit 1
}

Write-Host 'Asset audit passed: all static references exist and src does not reference ui/.' -ForegroundColor Green
