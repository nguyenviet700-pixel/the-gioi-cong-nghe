# Sinh nội dung để xem trực tiếp trên web (không cần Office):
#   - slides/<id>/<k>-<NN>.jpg + data/slides.js  : từng slide của PowerPoint (ảnh + chữ trên slide)
#   - data/hsg-content.js                         : nội dung 10 chuyên đề HSG (.docx -> HTML)
# Chạy:  powershell -ExecutionPolicy Bypass -File tools\build-content.ps1
# Tham số: -Only slides | hsg   (mặc định làm cả hai);  -Force để làm lại slide đã có
param([string]$Only = '', [switch]$Force)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

$Site = Split-Path $PSScriptRoot -Parent
$Root = Split-Path $Site -Parent
$utf8 = New-Object Text.UTF8Encoding($false)

function Load-Catalog {
    $t = [IO.File]::ReadAllText((Join-Path $Site 'data\catalog.js'), $utf8)
    $t = $t.Substring($t.IndexOf('window.CATALOG =') + 16).Trim().TrimEnd(';')
    return $t | ConvertFrom-Json
}
function Read-Entry($zip, $name) {
    $e = $zip.GetEntry($name); if (-not $e) { return $null }
    $sr = New-Object IO.StreamReader($e.Open(), [Text.Encoding]::UTF8); $t = $sr.ReadToEnd(); $sr.Close(); return $t
}
function Esc($s) { return [Web.HttpUtility]::HtmlEncode($s) }
function AbsPath($rel) { return Join-Path $Root ($rel -replace '/', '\') }

# ------------------------------------------------------------------ SLIDES
function Save-Jpeg($bytes, $outFile) {
    $ms = New-Object IO.MemoryStream(, $bytes)
    $img = [Drawing.Image]::FromStream($ms)
    try {
        $w = $img.Width; $h = $img.Height; $max = 1280
        if ($w -gt $max) { $h = [int]($h * $max / $w); $w = $max }
        $bmp = New-Object Drawing.Bitmap($w, $h)
        $g = [Drawing.Graphics]::FromImage($bmp)
        $g.Clear([Drawing.Color]::White)
        $g.InterpolationMode = 'HighQualityBicubic'
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $ep = New-Object Drawing.Imaging.EncoderParameters(1)
        $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]78)
        $bmp.Save($outFile, $enc, $ep)
        $bmp.Dispose()
    } finally { $img.Dispose(); $ms.Dispose() }
}

function Build-Slides {
    $cat = Load-Catalog
    $result = [ordered]@{}
    $pptApp = $null
    try {
        $pptApp = New-Object -ComObject PowerPoint.Application
    } catch {
        Write-Warning "PowerPoint COM not available: $($_.Exception.Message)"
    }
    try {
        foreach ($l in $cat.lessons) {
            $decks = @()
            $k = 0
            foreach ($p in $l.ppt) {
                $k++
                $dir = Join-Path $Site ("slides\" + $l.id)
                New-Item -ItemType Directory -Force $dir | Out-Null
                $fullPptPath = AbsPath $p.path
                $pptItem = Get-Item -LiteralPath $fullPptPath
                $firstSlideOut = Join-Path $dir ('{0}-01.jpg' -f $k)
                $needExport = $Force -or -not (Test-Path $firstSlideOut) -or ($pptItem.LastWriteTime -gt (Get-Item -LiteralPath $firstSlideOut).LastWriteTime)
                $pres = $null
                if ($pptApp -and $needExport) {
                    try {
                        $pres = $pptApp.Presentations.Open($fullPptPath, $true, $false, $false)
                    } catch {
                        Write-Warning "Could not open in PowerPoint: $fullPptPath"
                    }
                }
                $zip = [IO.Compression.ZipFile]::OpenRead($fullPptPath)
                $slides = @()
                try {
                    $entries = $zip.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' } | Sort-Object { [int]($_.FullName -replace '\D', '') }
                    foreach ($sl in $entries) {
                        $n = [int]($sl.FullName -replace '\D', '')
                        $x = [xml](Read-Entry $zip $sl.FullName)
                        $ns = New-Object Xml.XmlNamespaceManager($x.NameTable)
                        $ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
                        $ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
                        $paras = @($x.SelectNodes('//a:p', $ns) | ForEach-Object { ($_.SelectNodes('.//a:t', $ns) | ForEach-Object { $_.InnerText }) -join '' } | Where-Object { $_.Trim() })
                        $name = '{0}-{1:D2}.jpg' -f $k, $n
                        $out = Join-Path $dir $name
                        $img = $null
                        if ($pres) {
                            try {
                                $pres.Slides.Item($n).Export($out, 'JPG', 1280, 720)
                                $img = "slides/$($l.id)/$name"
                            } catch {}
                        }
                        if (-not $img -and (Test-Path $out)) {
                            $img = "slides/$($l.id)/$name"
                        }
                        $slides += [ordered]@{ n = $n; img = $img; text = ($paras -join "`n") }
                    }
                } finally {
                    $zip.Dispose()
                    if ($pres) { try { $pres.Close() } catch {} }
                }
                $decks += [ordered]@{ name = $p.name; slides = $slides }
                Write-Host ("{0} deck {1}: {2} slide" -f $l.id, $k, $slides.Count)
            }
            $result[$l.id] = $decks
        }
    } finally {
        if ($pptApp) { try { $pptApp.Quit() } catch {} }
    }
    $json = $result | ConvertTo-Json -Depth 8 -Compress
    [IO.File]::WriteAllText((Join-Path $Site 'data\slides.js'), ("// TỰ ĐỘNG SINH bởi tools/build-content.ps1 từ các file PowerPoint. Không sửa tay.`nwindow.SLIDES = " + $json + ';'), $utf8)
}

# ------------------------------------------------------------------ DOCX -> HTML
function Run-Html($r, $ns) {
    $sb = New-Object Text.StringBuilder
    foreach ($n in $r.SelectNodes('w:t | w:tab | w:br', $ns)) {
        if ($n.LocalName -eq 't') { [void]$sb.Append((Esc $n.InnerText)) }
        elseif ($n.LocalName -eq 'tab') { [void]$sb.Append('&emsp;') }
        else { [void]$sb.Append('<br>') }
    }
    $t = $sb.ToString()
    if ($t -eq '') { return '' }
    $W = $ns.LookupNamespace('w')
    $b = $r.SelectSingleNode('w:rPr/w:b', $ns); $i = $r.SelectSingleNode('w:rPr/w:i', $ns); $u = $r.SelectSingleNode('w:rPr/w:u', $ns)
    if ($b -and $b.GetAttribute('val', $W) -notin '0', 'false') { $t = "<strong>$t</strong>" }
    if ($i -and $i.GetAttribute('val', $W) -notin '0', 'false') { $t = "<em>$t</em>" }
    if ($u -and $u.GetAttribute('val', $W) -ne 'none') { $t = "<u>$t</u>" }
    return $t
}
function Para-Html($p, $ns, [ref]$listOpen) {
    $inner = (($p.SelectNodes('.//w:r', $ns) | ForEach-Object { Run-Html $_ $ns }) -join '')
    $plain = ($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join ''
    if ($plain.Trim() -eq '') { return '' }
    $style = $p.SelectSingleNode('w:pPr/w:pStyle', $ns)
    $sv = if ($style) { $style.GetAttribute('val', $ns.LookupNamespace('w')) } else { '' }
    $isList = $null -ne $p.SelectSingleNode('w:pPr/w:numPr', $ns)
    $out = ''
    if ($isList) {
        if (-not $listOpen.Value) { $out += '<ul>'; $listOpen.Value = $true }
        return $out + "<li>$inner</li>"
    }
    if ($listOpen.Value) { $out += '</ul>'; $listOpen.Value = $false }
    if ($sv -match '^(Heading|Title)\s*(\d)?' -or $sv -match '^Tiêu' -or $plain -match '^(CHUYÊN ĐỀ \d+|[IVX]+\.\s+[A-ZĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])') {
        $lv = if ($plain -match '^CHUYÊN ĐỀ') { 2 } elseif ($plain -match '^[IVX]+\.\s+') { 3 } elseif ($Matches[2]) { [Math]::Min([int]$Matches[2] + 1, 5) } else { 3 }
        return $out + "<h$lv>$plain</h$lv>"
    }
    return $out + "<p>$inner</p>"
}
function Docx-Html($path) {
    $zip = [IO.Compression.ZipFile]::OpenRead($path)
    try {
        $xml = [xml](Read-Entry $zip 'word/document.xml')
        $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
        $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
        $sb = New-Object Text.StringBuilder
        $open = $false
        foreach ($c in $xml.SelectSingleNode('//w:body', $ns).ChildNodes) {
            if ($c.LocalName -eq 'p') { [void]$sb.Append((Para-Html $c $ns ([ref]$open))) }
            elseif ($c.LocalName -eq 'tbl') {
                if ($open) { [void]$sb.Append('</ul>'); $open = $false }
                [void]$sb.Append('<div class="tbl-wrap"><table>')
                $first = $true
                foreach ($tr in $c.SelectNodes('w:tr', $ns)) {
                    [void]$sb.Append('<tr>')
                    foreach ($tc in $tr.SelectNodes('w:tc', $ns)) {
                        $cellOpen = $false
                        $cell = (($tc.SelectNodes('w:p', $ns) | ForEach-Object { Para-Html $_ $ns ([ref]$cellOpen) }) -join '')
                        if ($cellOpen) { $cell += '</ul>' }
                        $tag = if ($first) { 'th' } else { 'td' }
                        [void]$sb.Append("<$tag>$cell</$tag>")
                    }
                    [void]$sb.Append('</tr>'); $first = $false
                }
                [void]$sb.Append('</table></div>')
            }
        }
        if ($open) { [void]$sb.Append('</ul>') }
        return $sb.ToString()
    } finally { $zip.Dispose() }
}

function Build-Hsg {
    $cat = Load-Catalog
    $res = [ordered]@{}
    foreach ($h in $cat.hsg) {
        $res[[string]$h.no] = Docx-Html (AbsPath $h.path)
        Write-Host ("HSG {0}: {1} ký tự" -f $h.no, $res[[string]$h.no].Length)
    }
    [IO.File]::WriteAllText((Join-Path $Site 'data\hsg-content.js'), ("// TỰ ĐỘNG SINH bởi tools/build-content.ps1 từ các file chuyên đề .docx. Không sửa tay.`nwindow.HSG_CONTENT = " + ($res | ConvertTo-Json -Depth 3 -Compress) + ';'), $utf8)
}

if ($Only -eq '' -or $Only -eq 'hsg') { Build-Hsg }
if ($Only -eq '' -or $Only -eq 'slides') { Build-Slides }
Write-Host 'build-content done'
