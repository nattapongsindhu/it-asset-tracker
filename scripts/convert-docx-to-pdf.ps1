param(
  [Parameter(Mandatory = $true)]
  [string[]]$DocxPaths
)

$word = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  foreach ($docxPath in $DocxPaths) {
    $resolvedDocxPath = (Resolve-Path -LiteralPath $docxPath).Path
    $pdfPath = [System.IO.Path]::ChangeExtension($resolvedDocxPath, '.pdf')
    $document = $null

    try {
      $document = $word.Documents.Open($resolvedDocxPath, $false, $true)
      $document.ExportAsFixedFormat($pdfPath, 17)
      Write-Output "Generated: $pdfPath"
    }
    finally {
      if ($document -ne $null) {
        $document.Close($false) | Out-Null
      }
    }
  }
}
finally {
  if ($word -ne $null) {
    $word.Quit()
  }
}
