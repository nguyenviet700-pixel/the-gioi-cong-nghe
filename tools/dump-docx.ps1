param([string]$Root, [string]$Out)
# Dump DOCX (body order; table rows as "T| c1 || c2 || ...") to plain text. Clean text, no formatting markers.
Add-Type -AssemblyName System.IO.Compression.FileSystem
New-Item -ItemType Directory -Force $Out | Out-Null
$W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function PText($p, $ns) {
    $sb = New-Object Text.StringBuilder
    foreach ($n in $p.SelectNodes('.//w:t | .//w:tab | .//w:br', $ns)) {
        if ($n.LocalName -eq 't') { [void]$sb.Append($n.InnerText) }
        elseif ($n.LocalName -eq 'tab') { [void]$sb.Append(' ') }
        else { [void]$sb.Append("`n") }
    }
    return $sb.ToString()
}

Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object { $_.Extension -in '.docx', '.docm' -and $_.FullName -notmatch '\\technology-world\\' } | ForEach-Object {
    $rel = ($_.FullName.Substring($Root.Length).TrimStart('\') -replace '\.docm$', '.docx') -replace '[\\/]', '__'
    $zip = [IO.Compression.ZipFile]::OpenRead($_.FullName)
    try {
        $e = $zip.GetEntry('word/document.xml')
        $sr = New-Object IO.StreamReader($e.Open(), [Text.Encoding]::UTF8); $xml = [xml]$sr.ReadToEnd(); $sr.Close()
        $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable); $ns.AddNamespace('w', $W)
        $lines = New-Object Collections.Generic.List[string]
        foreach ($c in $xml.SelectSingleNode('//w:body', $ns).ChildNodes) {
            if ($c.LocalName -eq 'p') {
                foreach ($part in (PText $c $ns) -split "`n") { if ($part.Trim()) { $lines.Add($part.Trim()) } }
            } elseif ($c.LocalName -eq 'tbl') {
                foreach ($tr in $c.SelectNodes('w:tr', $ns)) {
                    $cells = @()
                    foreach ($tc in $tr.SelectNodes('w:tc', $ns)) {
                        $cells += ((@($tc.SelectNodes('.//w:p', $ns) | ForEach-Object { (PText $_ $ns).Trim() } | Where-Object { $_ })) -join ' / ')
                    }
                    $lines.Add('T| ' + ($cells -join ' || '))
                }
            }
        }
        [IO.File]::WriteAllLines((Join-Path $Out ($rel + '.txt')), $lines.ToArray(), (New-Object Text.UTF8Encoding($false)))
    } finally { $zip.Dispose() }
}
Write-Host "dump-docx done"
