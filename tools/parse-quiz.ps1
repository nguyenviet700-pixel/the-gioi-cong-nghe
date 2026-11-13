param([string]$Dump, [string]$OutJson, [string]$Report)
# Parse "bo cau hoi" (question set) docs dumped by dump-docx.ps1.
# Only questions whose answer key was found AND cross-validated are emitted as gradable.
$ErrorActionPreference = 'Stop'
$rxMcqHead = '(?i)TRẮC NGHIỆM.*(NHIỀU LỰA CHỌN|NHIỀU PHƯƠNG ÁN|4 LỰA CHỌN|TỰ CHỌN|TỰ DO|MULTIPLE)|(NHIỀU LỰA CHỌN|NHIỀU PHƯƠNG ÁN|4 LỰA CHỌN).*TRẮC NGHIỆM|CÂU HỎI TRẮC NGHIỆM 4 LỰA CH'
$rxTfHead = '(?i)TRẮC NGHIỆM.*ĐÚNG.*SAI'
$rxEssHead = '(?i)TỰ LUẬN'
$rxAnsHead = '(?i)ĐÁP ÁN|HƯỚNG DẪN CHẤM'
$rxQ1 = '^Câu\s*\d+(?!\d)'

function IsHeadAt($L, $i, $rx, $needQ) {
    $s = $L[$i]; if ($s.StartsWith('T|')) { return $false }
    if ($s.Length -gt 140) { return $false }
    if ($s -notmatch $rx) { return $false }
    if ($s -match $rxAnsHead) { return $false }
    if (-not $needQ) { return $true }
    for ($k = $i + 1; $k -le [Math]::Min($i + 6, $L.Count - 1); $k++) { if ($L[$k] -match $rxQ1) { return $true } }
    return $false
}

function CleanQ([string]$t) {
    $t = $t.Trim()
    $tag = '(?i)Nhận biết|Thông hiểu|Vận dụng|Mức độ|YCCĐ|điểm|^NB$|^TH$|^VD$|^NB\b|^TH\b|^VD\b'
    for ($k = 0; $k -lt 4; $k++) {
        $t = [regex]::Replace($t, '^[:\.\s]+', '')
        $m = [regex]::Match($t, '^\[([^\]]*)\]')
        if ($m.Success) { $t = $t.Substring($m.Length); continue }
        $m = [regex]::Match($t, '^\(([^\)]*)\)')
        if ($m.Success -and $m.Groups[1].Value -match $tag) { $t = $t.Substring($m.Length); continue }
        break
    }
    $t = [regex]::Replace($t, '^(Nội dung|Đề bài)\s*:\s*', '')
    return $t.Trim()
}

function Split-Questions($lines) {
    $qs = @(); $cur = $null
    foreach ($s in $lines) {
        if ($s.StartsWith('T|')) { continue }
        $m = [regex]::Match($s, '^Câu\s*(\d+)(?!\d)\s*(.*)$')
        if ($m.Success) {
            if ($cur) { $qs += , $cur }
            $cur = @{ n = [int]$m.Groups[1].Value; head = $m.Groups[2].Value; body = New-Object Collections.Generic.List[string] }
        } elseif ($cur) { $cur.body.Add($s) }
    }
    if ($cur) { $qs += , $cur }
    return , $qs
}

function Parse-Mcq($q) {
    $text = New-Object Collections.Generic.List[string]
    $opts = @{}
    $first = CleanQ $q.head
    if ($first) { $text.Add($first) }
    $lastOpt = $null
    foreach ($s in $q.body) {
        $m = [regex]::Match($s, '^([A-D])\s*[\.\)]\s*(.+)$')
        if ($m.Success -and -not $opts.ContainsKey($m.Groups[1].Value)) {
            $rest = $m.Groups[2].Value
            if ($m.Groups[1].Value -eq 'A' -and $rest -cmatch '\s[B-D][\.\)]\s') {
                $parts = [regex]::Split($s, '\s+(?=[A-D]\s*[\.\)]\s)')
                foreach ($p in $parts) { $mm = [regex]::Match($p, '^([A-D])\s*[\.\)]\s*(.+)$'); if ($mm.Success) { $opts[$mm.Groups[1].Value] = $mm.Groups[2].Value.Trim(); $lastOpt = $mm.Groups[1].Value } }
            } else { $opts[$m.Groups[1].Value] = $rest.Trim(); $lastOpt = $m.Groups[1].Value }
        } elseif ($opts.Count -eq 0) { $text.Add($s) }
        else { $opts[$lastOpt] = $opts[$lastOpt] + ' ' + $s }
    }
    return @{ n = $q.n; text = (($text -join ' ').Trim()); opts = $opts }
}

function Parse-Tf($q) {
    $text = New-Object Collections.Generic.List[string]; $items = @{}; $inline = @{}
    $first = CleanQ $q.head
    if ($first) { $text.Add($first) }
    $last = $null
    foreach ($s in $q.body) {
        $m = [regex]::Match($s, '^([a-d])\s*\)\s*(.+)$')
        if ($m.Success) {
            $t = $m.Groups[2].Value.Trim(); $k = $m.Groups[1].Value
            $im = [regex]::Match($t, '\s*\[(Đúng|Sai)\]\s*$')
            if ($im.Success) { $inline[$k] = ($im.Groups[1].Value -eq 'Đúng'); $t = $t.Substring(0, $im.Index).Trim() }
            $items[$k] = $t; $last = $k
        } elseif ($items.Count -eq 0) { $text.Add($s) }
        else { $items[$last] = $items[$last] + ' ' + $s }
    }
    return @{ n = $q.n; text = (($text -join ' ').Trim()); items = $items; inline = $inline }
}

function Get-McqKey($L, $from, $count) {
    $maps = @()
    $cells = { param($row) ($row.Substring(2) -split '\s*\|\|\s*' | ForEach-Object { $_.Trim() }) }
    for ($i = $from; $i -lt $L.Count; $i++) {
        $s = $L[$i]
        # S6: several "n.X" / "Câu n: X" entries on one line or table row
        $ms = [regex]::Matches($s, '(?:^|[\s\|])(?:Câu\s*|C)?(\d+)\s*[\.\-:]\s*([A-D])(?![\p{L}\d])')
        if ($ms.Count -ge 3) {
            $m6 = @{}; foreach ($x in $ms) { $m6[[int]$x.Groups[1].Value] = $x.Groups[2].Value }
            $maps += , @{ how = 'S6'; map = $m6; row = $i }
        }
        if ($s.StartsWith('T|')) {
            $c = @(& $cells $s)
            # S1: header row of numbers + next row letters
            $nums = @($c | Where-Object { $_ -match '^(?:Câu|C)?\s*\d+$' })
            if ($nums.Count -ge 3 -and $nums.Count -ge ($c.Count - 1) -and $i + 1 -lt $L.Count -and $L[$i + 1].StartsWith('T|')) {
                $c2 = @(& $cells $L[$i + 1])
                $lets = @($c2 | Where-Object { $_ -cmatch '^[A-D]$' })
                if ($lets.Count -eq $nums.Count) {
                    $m = @{}; for ($k = 0; $k -lt $nums.Count; $k++) { $m[[int]($nums[$k] -replace '\D', '')] = $lets[$k] }
                    $maps += , @{ how = 'S1'; map = $m }
                }
            }
            # S2: every cell "Câu n: X"
            $m = @{}
            foreach ($x in $c) { $mm = [regex]::Match($x, '^(?:Câu|C)\s*(\d+)\s*[:\.\-–]\s*([A-D])(?![\p{L}])'); if ($mm.Success) { $m[[int]$mm.Groups[1].Value] = $mm.Groups[2].Value } }
            if ($m.Count -gt 0) { $maps += , @{ how = 'S2'; map = $m; row = $i } }
            # S3 vertical: first cell number, second cell starts with letter
            if ($c.Count -ge 2 -and $c[0] -match '^(?:Câu|C)?\s*(\d+)$' -and $c[1] -cmatch '^([A-D])(?![\p{L}])') {
                $maps += , @{ how = 'S3'; map = @{ ([int]($c[0] -replace '\D', '')) = $c[1].Substring(0, 1) }; row = $i }
            }
        } else {
            $m5 = [regex]::Match($s, '^(\d+)\s*[\.\-:]\s*([A-D])(?![\p{L}])')
            if ($m5.Success) { $n5 = [int]$m5.Groups[1].Value; if ($n5 -le $count) { $maps += , @{ how = 'S5'; map = @{ $n5 = $m5.Groups[2].Value }; row = $i; first = $true } } }
            $mm = [regex]::Match($s, '^[•\-\*]?\s*(?:Câu|C)\s*(\d+)\s*[:\.\-–]\s*(?:Đáp án\s*:?\s*)?([A-D])(?![\p{L}])')
            if ($mm.Success) { $maps += , @{ how = 'S4'; map = @{ ([int]$mm.Groups[1].Value) = $mm.Groups[2].Value }; row = $i } }
        }
    }
    $byHow = @{}
    foreach ($m in $maps) {
        if (-not $byHow.ContainsKey($m.how)) { $byHow[$m.how] = @{ map = @{}; conflict = $false } }
        foreach ($k in $m.map.Keys) {
            if ($byHow[$m.how].map.ContainsKey($k)) { if ($m.how -ne 'S5' -and $byHow[$m.how].map[$k] -ne $m.map[$k]) { $byHow[$m.how].conflict = $true }; if ($m.how -eq 'S5') { continue } }
            $byHow[$m.how].map[$k] = $m.map[$k]
        }
    }
    return $byHow
}

function Get-TfKey($L, $from) {
    $res = @{}
    $script:conf = $false
    $tfw = '(?:(?i:Đúng|Sai)|Đ|S)(?![\p{L}])'
    $isT = { param($v) $v -match '^(?i:Đúng)|^Đ(?![\p{L}])' }
    $setv = {
        param($n, $k, $v)
        if (-not $res.ContainsKey($n)) { $res[$n] = @{} }
        if ($res[$n].ContainsKey($k) -and $res[$n][$k] -ne $v) { $script:conf = $true }
        $res[$n][$k] = $v
    }
    $cur = $null; $colQs = $null
    for ($i = $from; $i -lt $L.Count; $i++) {
        $s = $L[$i]
        if ($s.StartsWith('T|')) {
            $c = @($s.Substring(2) -split '\s*\|\|\s*' | ForEach-Object { $_.Trim() })
            $hq = @($c | Where-Object { $_ -match '^Câu\s*\d+' })
            if ($hq.Count -ge 2) { $colQs = @($c | ForEach-Object { if ($_ -match '^Câu\s*(\d+)') { [int]$Matches[1] } else { $null } }); continue }
            if ($colQs -and $c.Count -ge 2 -and $c[0] -match '^(?:Ý\s*)?([a-d])\s*\)?$') {
                $k = $Matches[1]
                for ($j = 1; $j -lt $c.Count -and $j -lt $colQs.Count; $j++) { if ($colQs[$j] -ne $null -and $c[$j] -cmatch ('^' + $tfw)) { & $setv $colQs[$j] $k (& $isT $c[$j]) } }
                continue
            }
            if ($c.Count -ge 2 -and $c[0] -match '^(?:Câu|C)\s*(\d+)\b' -and $c[1] -cmatch '^a\s*-\s*(?:Đ|S)(?![\p{L}]),\s*b\s*-\s*(?:Đ|S)(?![\p{L}]),\s*c\s*-\s*(?:Đ|S)(?![\p{L}]),\s*d\s*-\s*(?:Đ|S)(?![\p{L}])$') {
                $n = [int]([regex]::Match($c[0], '\d+').Value)
                foreach ($im in [regex]::Matches($c[1], '([a-d])\s*-\s*(Đ|S)')) { & $setv $n $im.Groups[1].Value ($im.Groups[2].Value -ceq 'Đ') }
                continue
            }
            if ($c.Count -ge 5 -and $c[0] -match '^(?:Câu|C)\s*(\d+)\b') {
                $n = [int]$Matches[1]
                $vals = @($c[1..4] | ForEach-Object { [regex]::Replace($_, '^(?:Ý\s*|Lựa chọn\s*)?[a-d]\s*[\)\.:]\s*', '') })
                if (@($vals | Where-Object { $_ -cmatch ('^' + $tfw) }).Count -eq 4) {
                    for ($k = 0; $k -lt 4; $k++) { & $setv $n ([string][char](97 + $k)) (& $isT $vals[$k]) }
                }
            }
            continue
        }
        $colQs = $null
        $m = [regex]::Match($s, '^[•\-\*]?\s*Câu\s*(\d+)(?!\d)\s*[:\.]?(.*)$')
        if ($m.Success) { $cur = [int]$m.Groups[1].Value; $rest = $m.Groups[2].Value } else { $rest = $s }
        if ($cur -ne $null) {
            foreach ($im in [regex]::Matches($rest, '(?:^|\s)([a-d])\s*\)\s*(' + $tfw + ')')) {
                & $setv $cur $im.Groups[1].Value (& $isT $im.Groups[2].Value)
            }
        }
    }
    return @{ map = $res; conflict = $script:conf }
}

$out = [ordered]@{}
$rep = New-Object Collections.Generic.List[string]
Get-ChildItem $Dump -Filter *.txt | Where-Object { $_.Name -match '^CN[78]__B.I \d+__' -and $_.Name -match 'docx' } | ForEach-Object {
    $mm = [regex]::Match($_.Name, '^CN(\d)__B.I (\d+)__')
    $key = "$($mm.Groups[1].Value)-$($mm.Groups[2].Value)"
    $L = @(Get-Content -LiteralPath $_.FullName -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $entry = [ordered]@{ mcq = @(); tf = @(); essay = @(); mcqOk = $false; tfOk = $false; notes = @() }
    $mcqI = -1; $tfI = -1; $essI = -1
    for ($i = 0; $i -lt $L.Count; $i++) {
        if ($mcqI -lt 0 -and (IsHeadAt $L $i $rxMcqHead $true)) { $mcqI = $i; continue }
        if ($tfI -lt 0 -and $mcqI -ge 0 -and $i -gt $mcqI -and (IsHeadAt $L $i $rxTfHead $true)) { $tfI = $i; continue }
        if ($essI -lt 0 -and $tfI -ge 0 -and $i -gt $tfI -and (IsHeadAt $L $i $rxEssHead $true)) { $essI = $i; continue }
    }
    $endAll = $L.Count
    for ($i = [Math]::Max($essI, [Math]::Max($tfI, $mcqI)) + 1; $i -lt $L.Count; $i++) {
        if ($L[$i].StartsWith('T|') -or $L[$i].Length -ge 140) { continue }
        if ($L[$i] -match '(?i)^(?:[IVX]+\.|PHẦN)\s*(MA TRẬN|BẢNG ĐẶC TẢ)') { $endAll = $i; break }
        if ($L[$i] -match $rxAnsHead -and $L[$i] -match '(?i)^(?:[IVX]+\.|PHẦN|\d\.)?\s*(PHẦN\s*[A-Z0-9IV]+[\.:]?\s*)?(ĐÁP ÁN|HƯỚNG DẪN CHẤM)') {
            # Chỉ bỏ qua khi là dòng "Hướng dẫn chấm:" viết thường nằm xen kẽ ngay dưới từng câu Tự luận (vẫn còn Câu tiếp theo phía dưới)
            if ($L[$i] -cmatch '^Hướng dẫn chấm\s*:') {
                $hasMoreQ = $false
                for ($k = $i + 1; $k -le [Math]::Min($i + 15, $L.Count - 1); $k++) {
                    if ($L[$k] -match $rxQ1) { $hasMoreQ = $true; break }
                }
                if ($hasMoreQ) { continue }
            }
            $endAll = $i; break
        }
    }
    if ($mcqI -lt 0) { $entry.notes += 'Không nhận diện được phần trắc nghiệm nhiều lựa chọn' }
    if ($tfI -lt 0) { $entry.notes += 'Không nhận diện được phần Đúng/Sai' }
    $ends = @($tfI, $essI, $endAll) | Where-Object { $_ -gt $mcqI }
    $mcqEnd = ($ends | Measure-Object -Minimum).Minimum
    # --- MCQ
    if ($mcqI -ge 0) {
        $qs = Split-Questions $L[($mcqI + 1)..($mcqEnd - 1)]
        $parsed = @($qs | ForEach-Object { Parse-Mcq $_ })
        $good = ($parsed.Count -gt 0) -and (@($parsed | Where-Object { $_.opts.Count -ne 4 -or -not $_.text }).Count -eq 0)
        $nums = @($parsed | ForEach-Object { $_.n }); $seq = ($nums -join ',') -eq ((1..$parsed.Count) -join ',')
        if (-not $good) { $entry.notes += "MCQ: cấu trúc câu hỏi không chuẩn ($($parsed.Count) câu)" }
        elseif (-not $seq) { $entry.notes += 'MCQ: đánh số câu không liên tục' }
        else {
            $byHow = Get-McqKey $L $mcqEnd ($parsed | ForEach-Object { $_.n } | Measure-Object -Maximum).Maximum
            $full = @{}
            foreach ($h in $byHow.Keys) {
                $b = $byHow[$h]
                if ($b.conflict) { $entry.notes += "MCQ: khoá đáp án mâu thuẫn trong cách $h"; continue }
                $ok = $true; foreach ($p in $parsed) { if (-not $b.map.ContainsKey($p.n)) { $ok = $false } }
                if ($ok -and $b.map.Count -eq $parsed.Count) { $full[$h] = $b.map }
            }
            if ($full.Count -eq 0) { $entry.notes += 'MCQ: không tìm thấy bảng đáp án đầy đủ' }
            else {
                $ref = $null; $agree = $true
                foreach ($h in $full.Keys) { if (-not $ref) { $ref = $full[$h] } else { foreach ($k in $ref.Keys) { if ($ref[$k] -ne $full[$h][$k]) { $agree = $false } } } }
                if (-not $agree) { $entry.notes += 'MCQ: các nguồn đáp án không khớp nhau' }
                else {
                    $list = @()
                    foreach ($p in $parsed) {
                        $list += [ordered]@{ q = $p.text; options = @($p.opts['A'], $p.opts['B'], $p.opts['C'], $p.opts['D']); answer = @('A', 'B', 'C', 'D').IndexOf($ref[$p.n]) }
                    }
                    $entry.mcq = $list; $entry.mcqOk = $true
                    $entry.notes += "MCQ: $($list.Count) câu, khoá từ " + (($full.Keys | Sort-Object) -join '+')
                }
            }
        }
    }
    # --- TF
    if ($tfI -ge 0) {
        $tfEnd = @($essI, $endAll) | Where-Object { $_ -gt $tfI } | Measure-Object -Minimum | Select-Object -ExpandProperty Minimum
        $qs = Split-Questions $L[($tfI + 1)..($tfEnd - 1)]
        $parsed = @($qs | ForEach-Object { Parse-Tf $_ })
        $good = ($parsed.Count -gt 0) -and (@($parsed | Where-Object { $_.items.Count -ne 4 -or -not $_.text }).Count -eq 0)
        if (-not $good) { $entry.notes += "ĐS: cấu trúc câu hỏi không chuẩn ($($parsed.Count) câu)" }
        else {
            $k = Get-TfKey $L $tfEnd
            $inl = @(); foreach ($p in $parsed) { if ($p.inline.Count -eq 4) { $inl += $p.n } }
            $ok = -not $k.conflict
            foreach ($p in $parsed) {
                if (-not $k.map.ContainsKey($p.n) -or $k.map[$p.n].Count -ne 4) { $ok = $false }
                elseif ($p.inline.Count -eq 4) { foreach ($x in 'a', 'b', 'c', 'd') { if ($p.inline[$x] -ne $k.map[$p.n][$x]) { $ok = $false; $entry.notes += "ĐS: câu $($p.n) ý $x lệch giữa nhãn [Đúng/Sai] và bảng đáp án" } } }
            }
            if ($k.conflict) { $entry.notes += 'ĐS: khoá mâu thuẫn' }
            if (-not $ok) { if ($entry.notes -notmatch 'ĐS:') { $entry.notes += 'ĐS: không tìm thấy khoá đầy đủ' } }
            else {
                $list = @()
                foreach ($p in $parsed) {
                    $its = @(); foreach ($x in 'a', 'b', 'c', 'd') { $its += [ordered]@{ t = $p.items[$x]; answer = [bool]$k.map[$p.n][$x] } }
                    $list += [ordered]@{ q = $p.text; items = $its }
                }
                $entry.tf = $list; $entry.tfOk = $true
                $entry.notes += "ĐS: $($list.Count) câu"
            }
        }
    }
    # --- Essay (display only)
    if ($essI -ge 0) {
        $qs = Split-Questions $L[($essI + 1)..($endAll - 1)]
        $entry.essay = @($qs | ForEach-Object {
            $qLines = @()
            foreach ($bl in $_.body) {
                if ($bl -match '(?i)^(ĐÁP ÁN|HƯỚNG DẪN CHẤM)\s*:') { break }
                $qLines += $bl
            }
            $t = ((CleanQ $_.head) + ' ' + ($qLines -join ' ')).Trim()
            [ordered]@{ q = $t }
        })
    }
    $out[$key] = $entry
    $rep.Add(("{0}: mcq={1}({2}) tf={3}({4}) essay={5} | {6}" -f $key, $entry.mcq.Count, $entry.mcqOk, $entry.tf.Count, $entry.tfOk, $entry.essay.Count, ($entry.notes -join '; ')))
}
[IO.File]::WriteAllText($OutJson, ($out | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllLines($Report, [string[]]$rep, (New-Object Text.UTF8Encoding($false)))
Write-Host 'parsed' $out.Count
