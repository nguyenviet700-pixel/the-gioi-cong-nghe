param([string]$Root, [string]$Site, [string]$QuizJson)
# Builds data/catalog.js (real file inventory) and data/quiz-data.js (questions parsed from the teacher's docx).
Add-Type -AssemblyName System.IO.Compression.FileSystem
$ErrorActionPreference = 'Stop'

$titles7 = @(
    'Giới thiệu về trồng trọt',
    'Làm đất trồng cây',
    'Gieo trồng, chăm sóc và phòng trừ sâu, bệnh cho cây trồng',
    'Thu hoạch sản phẩm trồng trọt',
    'Nhân giống vô tính cây trồng',
    'Dự án: Trồng rau an toàn',
    'Giới thiệu về rừng',
    'Trồng, chăm sóc và bảo vệ rừng',
    'Giới thiệu về chăn nuôi',
    'Nuôi dưỡng và chăm sóc vật nuôi',
    'Phòng và trị bệnh cho vật nuôi',
    'Chăn nuôi gà thịt trong nông hộ',
    'Thực hành: Lập kế hoạch nuôi vật nuôi trong gia đình',
    'Giới thiệu về thủy sản',
    'Nuôi cá ao',
    'Thực hành: Lập kế hoạch nuôi cá cảnh'
)
$titles8 = @(
    'Một số tiêu chuẩn trình bày bản vẽ kĩ thuật',
    'Hình chiếu vuông góc',
    'Bản vẽ chi tiết',
    'Bản vẽ lắp',
    'Bản vẽ nhà',
    'Vật liệu cơ khí',
    'Truyền và biến đổi chuyển động',
    'Gia công cơ khí bằng tay',
    'Ngành nghề trong lĩnh vực cơ khí',
    'Dự án: Gia công chi tiết bằng dụng cụ cầm tay',
    'Tai nạn điện',
    'Biện pháp an toàn điện',
    'Sơ cứu người bị tai nạn điện',
    'Khái quát về mạch điện',
    'Cảm biến và mô đun cảm biến',
    'Mạch điện điều khiển sử dụng mô đun cảm biến',
    'Ngành nghề trong lĩnh vực kĩ thuật điện',
    'Giới thiệu về thiết kế kĩ thuật',
    'Các bước cơ bản trong thiết kế kĩ thuật',
    'Dự án: Thiết kế hệ thống tưới cây tự động'
)
$hsgTitles = @{
    1  = 'Kĩ thuật trồng trọt và canh tác bền vững'
    2  = 'Nuôi dưỡng, chăm sóc và phòng, trị bệnh cho vật nuôi'
    3  = 'Kĩ thuật nuôi trồng và quản lý môi trường thủy sản'
    4  = 'Biểu diễn kĩ thuật và bản vẽ kĩ thuật'
    5  = 'Cơ khí và truyền – biến đổi chuyển động'
    6  = 'An toàn điện, sơ cứu tai nạn điện và tiết kiệm điện năng'
    7  = 'Nghề nghiệp trong lĩnh vực kĩ thuật, công nghệ'
    8  = 'Giáo dục kĩ thuật, công nghệ trong hệ thống giáo dục quốc dân'
    9  = 'Thị trường lao động kĩ thuật, công nghệ tại Việt Nam'
    10 = 'Lí thuyết hướng nghiệp và quy trình lựa chọn nghề nghiệp'
}

$shellApp = New-Object -ComObject Shell.Application
$driveIdCache = @{}
$cacheFile = Join-Path $PSScriptRoot 'drive-ids.json'
if (Test-Path $cacheFile) {
    try {
        $loaded = Get-Content -LiteralPath $cacheFile -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($p in $loaded.PSObject.Properties) { $driveIdCache[$p.Name] = $p.Value }
    } catch {}
}

function Get-DriveId($fullPath) {
    $rel = RelPath $fullPath
    if ($driveIdCache.ContainsKey($rel) -and $driveIdCache[$rel]) { return $driveIdCache[$rel] }
    try {
        $dir = Split-Path $fullPath -Parent
        $name = Split-Path $fullPath -Leaf
        $ns = $shellApp.NameSpace($dir)
        if (-not $ns) { return '' }
        $item = $ns.ParseName($name)
        if (-not $item) { return '' }
        $verb = $item.Verbs() | Where-Object { $_.Name -like '*Copy link to clipboard*' -or $_.Name -like '*Sao chép đường liên kết*' } | Select-Object -First 1
        if (-not $verb) { return '' }
        $verb.DoIt()
        Start-Sleep -Milliseconds 160
        $clip = Get-Clipboard -ErrorAction SilentlyContinue
        if ($clip -and $clip -match '(?:id=|/d/)([a-zA-Z0-9_-]+)') {
            $id = $Matches[1]
            $driveIdCache[$rel] = $id
            return $id
        }
    } catch {}
    return ''
}

function RelPath($full) { return $full.Substring($Root.Length).TrimStart('\') -replace '\\', '/' }
function PptxHasText($path) {
    $zip = [IO.Compression.ZipFile]::OpenRead($path)
    try {
        $n = @($zip.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' }).Count
        $e = $zip.GetEntry('ppt/slides/slide1.xml'); $sr = New-Object IO.StreamReader($e.Open(), [Text.Encoding]::UTF8); $x = $sr.ReadToEnd(); $sr.Close()
        $m = [regex]::Matches($x, '<a:t>([^<]+)</a:t>')
        $first = ($m | ForEach-Object { $_.Groups[1].Value }) -join ' '
        return @{ text = ($m.Count -gt 0); slides = $n; first = $first }
    } finally { $zip.Dispose() }
}
function Disp($f) { return ([IO.Path]::GetFileNameWithoutExtension($f.Name) -replace '_', ' ').Trim() }

$lessons = @()
foreach ($g in 7, 8) {
    $titles = if ($g -eq 7) { $titles7 } else { $titles8 }
    $dirs = Get-ChildItem -LiteralPath (Join-Path $Root "CN$g") -Directory | Where-Object { $_.Name -match '(\d+)$' } | Sort-Object { [int]([regex]::Match($_.Name, '(\d+)$').Value) }
    foreach ($d in $dirs) {
        $no = [int]([regex]::Match($d.Name, '(\d+)$').Value)
        $files = Get-ChildItem -LiteralPath $d.FullName -File
        $ppts = @(); foreach ($f in ($files | Where-Object { $_.Extension -eq '.pptx' } | Sort-Object Name)) {
            $info = PptxHasText $f.FullName
            $ppts += [ordered]@{ name = (Disp $f); file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeMB = [math]::Round($f.Length / 1MB, 1); slides = $info.slides; verify = $(if ($info.text) { 'text' } else { 'image' }); slide1 = $(if ($info.text) { $info.first } else { '' }) }
        }
        $vids = @(); foreach ($f in ($files | Where-Object { $_.Extension -eq '.mp4' })) { $vids += [ordered]@{ name = (Disp $f); file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeMB = [math]::Round($f.Length / 1MB, 1) } }
        $docs = @(); foreach ($f in ($files | Where-Object { $_.Extension -in '.docx', '.docm' })) { $docs += [ordered]@{ name = (Disp $f); file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeKB = [math]::Round($f.Length / 1KB) } }
        $lessons += [ordered]@{ grade = $g; no = $no; id = "$g-$no"; title = $titles[$no - 1]; folder = $d.Name; ppt = $ppts; video = $vids; questionDocs = $docs }
    }
}

$refs = @()
$pdfFiles = Get-ChildItem -LiteralPath $Root -File -Filter *.pdf | Sort-Object {
    $g = if ($_.Name -match '(\d)') { [int]$Matches[1] } else { 99 }
    $k = if ($_.Name -match '^SGK') { 1 } elseif ($_.Name -match '^SBT') { 2 } elseif ($_.Name -match '^SGV') { 3 } else { 4 }
    "{0:D2}_{1}_{2}" -f $g, $k, $_.Name
}
foreach ($f in $pdfFiles) {
    $kind = if ($f.Name -match '^SGK') { 'SGK' } elseif ($f.Name -match '^SBT') { 'SBT' } elseif ($f.Name -match '^SGV') { 'SGV' } else { 'Khac' }
    $grade = if ($f.Name -match '\b([6789])\b') { [int]$Matches[1] } else { 8 }
    $kindLabel = switch ($kind) {
        'SGK' { 'Sách giáo khoa' }
        'SBT' { 'Sách bài tập' }
        'SGV' { 'Sách giáo viên' }
        default { 'Tài liệu' }
    }
    $subMod = ''
    if ($f.BaseName -match '-\s*(.+)$') {
        $rawSub = $Matches[1].Trim()
        # Chuẩn hóa chữ hoa/thường cho mô đun lớp 9
        $subMod = switch -Regex ($rawSub) {
            'CHẾ BIẾN THỰC PHẨM' { ' – Mô đun: Chế biến thực phẩm' }
            'ĐỊNH HƯỚNG NGHỀ NGHIỆP' { ' – Định hướng nghề nghiệp' }
            'LẮP ĐẶT MẠNG ĐIỆN TRONG NHÀ' { ' – Mô đun: Lắp đặt mạng điện trong nhà' }
            'TRỒNG CÂY ĂN QUẢ' { ' – Mô đun: Trồng cây ăn quả' }
            default { ' – ' + $rawSub }
        }
    }
    $title = "$kindLabel Công nghệ $grade$subMod (Kết nối tri thức)"
    $refs += [ordered]@{ kind = $kind; kindLabel = $kindLabel; title = $title; file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeMB = [math]::Round($f.Length / 1MB, 1); grade = $grade }
}

$hsg = @(); $hsgDocs = @(); $dupes = @(); $seenHash = @{}
$hdir = Get-ChildItem -LiteralPath $Root -Directory | Where-Object { $_.Name -like 'T*LI*U HSG*' } | Select-Object -First 1
foreach ($f in (Get-ChildItem -LiteralPath $hdir.FullName -File -Filter *.docx | Sort-Object { [int]([regex]::Match($_.Name, 'chuyen-de-(\d+)').Groups[1].Value) }, Name)) {
    $no = [int]([regex]::Match($f.Name, 'chuyen-de-(\d+)').Groups[1].Value)
    $h = (Get-FileHash -LiteralPath $f.FullName).Hash
    if ($seenHash.ContainsKey($h)) { $dupes += [ordered]@{ file = $f.Name; sameAs = $seenHash[$h] }; continue }
    $seenHash[$h] = $f.Name
    $hsg += [ordered]@{ no = $no; title = $hsgTitles[$no]; file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeKB = [math]::Round($f.Length / 1KB) }
}
foreach ($f in (Get-ChildItem -LiteralPath $hdir.FullName -File -Filter *.pdf | Sort-Object Name)) {
    $title = if ($f.Name -match '2026-2027') { 'Công văn định hướng nội dung, cấu trúc thi chọn HSG THCS cấp tỉnh năm học 2026–2027' } else { Disp $f }
    $hsgDocs += [ordered]@{ title = $title; file = $f.Name; path = (RelPath $f.FullName); driveId = (Get-DriveId $f.FullName); sizeKB = [math]::Round($f.Length / 1KB) }
}

try {
    [IO.File]::WriteAllText($cacheFile, ($driveIdCache | ConvertTo-Json -Depth 3), (New-Object Text.UTF8Encoding($false)))
} catch {}

$cat = [ordered]@{
    generated = (Get-Date -Format 'yyyy-MM-dd HH:mm')
    school = [ordered]@{
        name = 'Trường THCS Vĩnh Xuân'
        logo = 'assets/logo-truong.jpg'
        author = 'Thầy Nguyễn Thanh Việt'
        authorRole = 'Giáo viên môn Công nghệ – Trường THCS Vĩnh Xuân'
    }
    lessons = $lessons
    references = $refs
    hsg = $hsg
    hsgDocs = $hsgDocs
    hsgDuplicatesIgnored = $dupes
}

$enc = New-Object Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force (Join-Path $Site 'data') | Out-Null
[IO.File]::WriteAllText((Join-Path $Site 'data\catalog.js'), ('// TỰ ĐỘNG SINH bởi tools/build-catalog.ps1 từ các file thực tế. Không sửa tay.' + "`nwindow.CATALOG = " + ($cat | ConvertTo-Json -Depth 8) + ';'), $enc)

$q = Get-Content -LiteralPath $QuizJson -Raw -Encoding UTF8 | ConvertFrom-Json
$outq = [ordered]@{}
foreach ($p in $q.PSObject.Properties) {
    $e = $p.Value
    $outq[$p.Name] = [ordered]@{ mcq = @($e.mcq); tf = @($e.tf); essay = @($e.essay); mcqGradable = [bool]$e.mcqOk; tfGradable = [bool]$e.tfOk }
}
[IO.File]::WriteAllText((Join-Path $Site 'data\quiz-data.js'), ('// TỰ ĐỘNG SINH từ các file bộ câu hỏi .docx của giáo viên (tools/parse-quiz.ps1). Đáp án lấy từ bảng đáp án trong chính file nguồn.' + "`nwindow.QUIZ_DATA = " + ($outq | ConvertTo-Json -Depth 10) + ';'), $enc)
Write-Host ("lessons={0} refs={1} hsg={2} dupes={3}" -f $lessons.Count, $refs.Count, $hsg.Count, $dupes.Count)
