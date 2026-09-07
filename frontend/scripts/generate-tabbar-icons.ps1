param(
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\src\static\tabbar')
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDir)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

function Write-Icon {
  param([string]$Name, [string]$Color, [string]$Suffix)

  $bitmap = New-Object System.Drawing.Bitmap 81, 81
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($Color)), 6
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  function Draw-RoundedRectangle {
    param($Canvas, $Stroke, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
    $diameter = $Radius * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $shape.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $shape.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $shape.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $shape.CloseFigure()
    $Canvas.DrawPath($Stroke, $shape)
    $shape.Dispose()
  }

  if ($Name -eq 'home') {
    $points = [System.Drawing.PointF[]]@(
      (New-Object System.Drawing.PointF 17, 39),
      (New-Object System.Drawing.PointF 40.5, 17),
      (New-Object System.Drawing.PointF 64, 39)
    )
    $graphics.DrawLines($pen, $points)
    $graphics.DrawLine($pen, 23, 36, 23, 64)
    $graphics.DrawLine($pen, 58, 36, 58, 64)
    $graphics.DrawLine($pen, 23, 64, 58, 64)
    $graphics.DrawLine($pen, 34, 64, 34, 49)
  }
  elseif ($Name -eq 'category') {
    foreach ($x in @(18, 46)) { foreach ($y in @(18, 46)) { Draw-RoundedRectangle $graphics $pen $x $y 17 17 4 } }
  }
  elseif ($Name -eq 'plan') {
    Draw-RoundedRectangle $graphics $pen 18 21 45 43 7
    $graphics.DrawLine($pen, 18, 34, 63, 34)
    $graphics.DrawLine($pen, 29, 15, 29, 27)
    $graphics.DrawLine($pen, 52, 15, 52, 27)
    $graphics.DrawLine($pen, 28, 45, 36, 45)
    $graphics.DrawLine($pen, 45, 45, 53, 45)
    $graphics.DrawLine($pen, 28, 55, 36, 55)
  }
  elseif ($Name -eq 'favorite') {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddBezier(40.5, 64, 11, 45, 14, 19, 30, 19)
    $path.AddBezier(30, 19, 37, 19, 40.5, 26, 40.5, 26)
    $path.AddBezier(40.5, 26, 44, 19, 51, 19, 51, 19)
    $path.AddBezier(67, 19, 70, 45, 40.5, 64, 40.5, 64)
    $graphics.DrawPath($pen, $path)
    $path.Dispose()
  }
  elseif ($Name -eq 'user') {
    $graphics.DrawEllipse($pen, 29, 15, 23, 23)
    $graphics.DrawArc($pen, 19, 39, 43, 33, 190, 160)
  }

  $path = Join-Path $resolvedOutput "$Name$Suffix.png"
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($name in @('home', 'category', 'plan', 'favorite', 'user')) {
  Write-Icon -Name $name -Color '#999999' -Suffix ''
  Write-Icon -Name $name -Color '#FF7A1A' -Suffix '-active'
}

Get-ChildItem -LiteralPath $resolvedOutput -Filter '*.png' | Select-Object Name, Length
