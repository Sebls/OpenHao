"""Character geometry from MuPDF (and optional macOS Vision OCR); no inferred division of word or line boxes."""
import sys, json, hashlib, pathlib, os, math, platform, subprocess, tempfile
import pymupdf as fitz

def dump(p, v):
    pathlib.Path(p).write_text(json.dumps(v, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

_SWIFT_VISION_SCRIPT = r"""
import Foundation
import ImageIO
import Vision

struct ClusterOut: Codable {
    let text: String
    let rect: [Double]?
}

struct LineOut: Codable {
    let half: Int
    let text: String
    let rect: [Double]
    let clusters: [ClusterOut]
}

struct VisionOutput: Codable {
    let lines: [LineOut]
}

func fail(_ msg: String) -> Never {
    fputs(msg + "\n", stderr)
    exit(1)
}

func isCJK(_ scalar: Unicode.Scalar) -> Bool {
    let v = scalar.value
    return (v >= 0x4E00 && v <= 0x9FFF)
        || (v >= 0x3400 && v <= 0x4DBF)
        || (v >= 0x20000 && v <= 0x2A6DF)
        || (v >= 0x2A700 && v <= 0x2CEAF)
        || (v >= 0x2CEB0 && v <= 0x2EBEF)
        || (v >= 0x30000 && v <= 0x323AF)
        || (v >= 0xF900 && v <= 0xFAFF)
        || (v >= 0x2E80 && v <= 0x2EFF)
        || (v >= 0x2F00 && v <= 0x2FDF)
        || (v >= 0x31C0 && v <= 0x31EF)
        || (v >= 0x3000 && v <= 0x303F)
}

func iou(_ a: CGRect, _ b: CGRect) -> Double {
    let inter = a.intersection(b)
    if inter.isNull || inter.isEmpty { return 0.0 }
    let interArea = Double(inter.width * inter.height)
    let unionArea = Double(a.width * a.height) + Double(b.width * b.height) - interArea
    return unionArea > 0.0 ? interArea / unionArea : 0.0
}

guard CommandLine.arguments.count >= 5 else {
    fail("Usage: swift - <imagePath> <splitSpread:0|1> <mode:dual|single> <langsJson>")
}

let imagePath = CommandLine.arguments[1]
let splitSpread = CommandLine.arguments[2] == "1"
let mode = CommandLine.arguments[3]
guard let langsData = CommandLine.arguments[4].data(using: .utf8),
      let langsObj = try? JSONSerialization.jsonObject(with: langsData) as? [String: [String]],
      let zhLangs = langsObj["zh"], !zhLangs.isEmpty else {
    fail("Invalid language configuration JSON")
}
let frLangs = langsObj["fr"] ?? []

let imageURL = URL(fileURLWithPath: imagePath)
guard let imgSource = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
      let cgImage = CGImageSourceCreateImageAtIndex(imgSource, 0, nil) else {
    fail("Failed to load rendered page image at \(imagePath)")
}

let imgW = cgImage.width
let imgH = cgImage.height
guard imgW > 0, imgH > 0 else {
    fail("Rendered page image has zero dimensions")
}

struct CropSpec {
    let half: Int
    let cropX: Int
    let cropW: Int
    let image: CGImage
}

var crops: [CropSpec] = []
if splitSpread && imgW >= 2 {
    let leftW = imgW / 2
    let rightW = imgW - leftW
    guard let leftImg = cgImage.cropping(to: CGRect(x: 0, y: 0, width: leftW, height: imgH)),
          let rightImg = cgImage.cropping(to: CGRect(x: leftW, y: 0, width: rightW, height: imgH)) else {
        fail("Failed to crop 2-up spread image")
    }
    crops.append(CropSpec(half: 0, cropX: 0, cropW: leftW, image: leftImg))
    crops.append(CropSpec(half: 1, cropX: leftW, cropW: rightW, image: rightImg))
} else {
    crops.append(CropSpec(half: 0, cropX: 0, cropW: imgW, image: cgImage))
}

func makeRequest(_ languages: [String]) -> VNRecognizeTextRequest {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    req.automaticallyDetectsLanguage = false
    req.recognitionLanguages = languages
    return req
}

func remapBox(_ box: CGRect, cropX: Int, cropW: Int, imgW: Int) -> [Double] {
    let x = (Double(cropX) + Double(box.origin.x) * Double(cropW)) / Double(imgW)
    let y = Double(box.origin.y)
    let w = Double(box.size.width) * Double(cropW) / Double(imgW)
    let h = Double(box.size.height)
    return [x, y, w, h]
}

var allLines: [LineOut] = []

for crop in crops {
    let zhReq = makeRequest(zhLangs)
    var requests: [VNRequest] = [zhReq]
    var frReq: VNRecognizeTextRequest? = nil
    if mode == "dual" && !frLangs.isEmpty {
        let req = makeRequest(frLangs)
        frReq = req
        requests.append(req)
    }
    let handler = VNImageRequestHandler(cgImage: crop.image, options: [:])
    do {
        try handler.perform(requests)
    } catch {
        fail("Vision OCR failed: \(error.localizedDescription)")
    }

    let zhResults = zhReq.results ?? []
    let frResults = frReq?.results ?? []

    for zhObs in zhResults {
        guard let zhCand = zhObs.topCandidates(1).first, !zhCand.string.isEmpty else {
            continue
        }
        var chosenObs = zhObs
        var chosenCand = zhCand
        if mode == "dual", !frResults.isEmpty, !zhCand.string.unicodeScalars.contains(where: isCJK) {
            var bestIoU = 0.0
            var bestObs: VNRecognizedTextObservation? = nil
            var bestCand: VNRecognizedText? = nil
            for frObs in frResults {
                guard let frCand = frObs.topCandidates(1).first, !frCand.string.isEmpty else { continue }
                let score = iou(zhObs.boundingBox, frObs.boundingBox)
                if score > bestIoU {
                    bestIoU = score
                    bestObs = frObs
                    bestCand = frCand
                }
            }
            if bestIoU >= 0.65, let bObs = bestObs, let bCand = bestCand {
                chosenObs = bObs
                chosenCand = bCand
            }
        }

        let raw = chosenCand.string
        var clusters: [ClusterOut] = []
        var idx = raw.startIndex
        while idx < raw.endIndex {
            let next = raw.index(after: idx)
            let nfc = String(raw[idx..<next]).precomposedStringWithCanonicalMapping
            let box = (try? chosenCand.boundingBox(for: idx..<next))?.boundingBox
            var rectOut: [Double]? = nil
            if let b = box,
               b.origin.x.isFinite, b.origin.y.isFinite,
               b.size.width.isFinite, b.size.height.isFinite,
               b.size.width > 0.0, b.size.height > 0.0 {
                rectOut = remapBox(b, cropX: crop.cropX, cropW: crop.cropW, imgW: imgW)
            }
            if !nfc.isEmpty {
                clusters.append(ClusterOut(text: nfc, rect: rectOut))
            }
            idx = next
        }
        guard !clusters.isEmpty else { continue }
        let lineRect = remapBox(chosenObs.boundingBox, cropX: crop.cropX, cropW: crop.cropW, imgW: imgW)
        allLines.append(LineOut(half: crop.half, text: clusters.map { $0.text }.joined(), rect: lineRect, clusters: clusters))
    }
}

let encoder = JSONEncoder()
guard let jsonData = try? encoder.encode(VisionOutput(lines: allLines)),
      let jsonString = String(data: jsonData, encoding: .utf8) else {
    fail("Failed to encode Vision OCR JSON output")
}
print(jsonString)
"""

def _resolve_vision_langs():
    override = os.environ.get('CHINOIS_VISION_LANGS')
    if override is not None:
        langs = [t.strip() for t in override.split(',') if t.strip()]
        if not langs:
            print('CHINOIS_VISION_LANGS is set but contains no valid BCP-47 language tags.', file=sys.stderr)
            sys.exit(1)
        return 'single', langs, [], langs
    zh_langs = ['zh-Hans', 'fr-FR', 'en-US']
    fr_langs = ['fr-FR', 'zh-Hans', 'en-US']
    return 'dual', zh_langs, fr_langs, zh_langs

def _clamp_top_left_rect(raw_rect):
    if not raw_rect or len(raw_rect) != 4:
        return None
    vx, vy, vw, vh = raw_rect
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (vx, vy, vw, vh)):
        return None
    if vw <= 0.0 or vh <= 0.0:
        return None
    x0 = max(0.0, min(1.0, float(vx)))
    y0 = max(0.0, min(1.0, 1.0 - float(vy + vh)))
    x1 = max(0.0, min(1.0, float(vx + vw)))
    y1 = max(0.0, min(1.0, 1.0 - float(vy)))
    w = x1 - x0
    h = y1 - y0
    if w <= 0.0 or h <= 0.0:
        return None
    return [x0, y0, w, h]

def _union_rects(rects):
    x0 = min(r[0] for r in rects)
    y0 = min(r[1] for r in rects)
    x1 = max(r[0] + r[2] for r in rects)
    y1 = max(r[1] + r[3] for r in rects)
    return [x0, y0, max(1e-6, x1 - x0), max(1e-6, y1 - y0)]

def _synthesize_space_rect(clusters, idx, line_rect):
    prev_idx = None
    for p in range(idx - 1, -1, -1):
        if clusters[p]['rect'] is not None:
            prev_idx = p
            break
    next_idx = None
    for q in range(idx + 1, len(clusters)):
        if clusters[q]['rect'] is not None:
            next_idx = q
            break
    run_start = (prev_idx + 1) if prev_idx is not None else 0
    run_end = next_idx if next_idx is not None else len(clusters)
    k = idx - run_start
    count = max(1, run_end - run_start)
    sliver = 1e-4

    prev_rect = clusters[prev_idx]['rect'] if prev_idx is not None else None
    next_rect = clusters[next_idx]['rect'] if next_idx is not None else None

    if prev_rect is not None and next_rect is not None:
        px, py, pw, ph = prev_rect
        nx, ny, nw, nh = next_rect
        px1, py1 = px + pw, py + ph
        nx1, ny1 = nx + nw, ny + nh
        if nx > px1:
            step = (nx - px1) / count
            sx0 = max(0.0, min(1.0 - sliver, px1 + k * step))
            sy0 = max(0.0, min(1.0 - sliver, min(py, ny)))
            sw = max(min(step, 1.0 - sx0), 0.0)
            sh = max(min(max(py1, ny1) - sy0, 1.0 - sy0), 0.0)
            if sw > 0.0 and sh > 0.0:
                return [sx0, sy0, sw, sh]
        elif ny > py1:
            step = (ny - py1) / count
            sx0 = max(0.0, min(1.0 - sliver, min(px, nx)))
            sy0 = max(0.0, min(1.0 - sliver, py1 + k * step))
            sw = max(min(max(px1, nx1) - sx0, 1.0 - sx0), 0.0)
            sh = max(min(step, 1.0 - sy0), 0.0)
            if sw > 0.0 and sh > 0.0:
                return [sx0, sy0, sw, sh]
        sx0 = max(0.0, min(px1, 1.0 - sliver))
        sy0 = max(0.0, min(py, 1.0 - sliver))
        sh = max(sliver, min(1.0 - sy0, ph))
        return [sx0, sy0, sliver, sh]
    if prev_rect is not None:
        px, py, pw, ph = prev_rect
        sx0 = max(0.0, min(px + pw, 1.0 - sliver))
        sy0 = max(0.0, min(py, 1.0 - sliver))
        sh = max(sliver, min(1.0 - sy0, ph))
        return [sx0, sy0, sliver, sh]
    if next_rect is not None:
        nx, ny, nw, nh = next_rect
        sx0 = max(0.0, min(nx - sliver, 1.0 - sliver))
        sy0 = max(0.0, min(ny, 1.0 - sliver))
        sh = max(sliver, min(1.0 - sy0, nh))
        return [sx0, sy0, sliver, sh]
    lx, ly, lw, lh = line_rect
    sx0 = max(0.0, min(lx, 1.0 - sliver))
    sy0 = max(0.0, min(ly, 1.0 - sliver))
    sh = max(sliver, min(1.0 - sy0, lh))
    return [sx0, sy0, sliver, sh]

def _smart_sort_lines(half_lines):
    bands = []
    for line in sorted(half_lines, key=lambda l: (l['rect'][1] + 0.5 * l['rect'][3], l['rect'][0])):
        lx, ly, lw, lh = line['rect']
        if bands:
            can_merge = True
            for b in bands[-1]:
                bx, by, bw, bh = b['rect']
                v_overlap = min(ly + lh, by + bh) - max(ly, by)
                h_overlap = min(lx + lw, bx + bw) - max(lx, bx)
                if v_overlap < 0.35 * min(lh, bh) or h_overlap > 0.005:
                    can_merge = False
                    break
            if can_merge:
                bands[-1].append(line)
                continue
        bands.append([line])
    ordered = []
    for band in bands:
        band.sort(key=lambda l: l['rect'][0])
        ordered.extend(band)
    return ordered

def _can_merge_into_block(prev_line, curr_line):
    if prev_line['half'] != curr_line['half']:
        return False
    px, py, pw, ph = prev_line['rect']
    cx, cy, cw, ch = curr_line['rect']
    v_gap = cy - (py + ph)
    if v_gap < -0.25 * min(ph, ch) or v_gap > 1.5 * max(ph, ch):
        return False
    h_overlap = min(px + pw, cx + cw) - max(px, cx)
    if not (h_overlap > 0.0 or abs(cx - px) <= 0.05):
        return False
    if (cx + cw) - px > max(pw, cw) + 0.15:
        return False
    return True

def _assemble_vision_layout(vision_data, pw, ph, raw_to_rotated, reported_langs):
    prepared_by_half = {0: [], 1: []}
    for raw_line in vision_data.get('lines', []):
        clusters = []
        for c in raw_line.get('clusters', []):
            ch_text = c.get('text', '')
            if not ch_text:
                continue
            clusters.append({'text': ch_text, 'rect': _clamp_top_left_rect(c.get('rect'))})
        while clusters and clusters[0]['text'].strip() == '':
            clusters.pop(0)
        while clusters and clusters[-1]['text'].strip() == '':
            clusters.pop()
        if not clusters:
            continue
        line_rect = _clamp_top_left_rect(raw_line.get('rect'))
        if line_rect is None:
            valid_rects = [c['rect'] for c in clusters if c['rect'] is not None]
            if not valid_rects:
                continue
            line_rect = _union_rects(valid_rects)
        half = 1 if raw_line.get('half') == 1 else 0
        prepared_by_half[half].append({'half': half, 'rect': line_rect, 'clusters': clusters})

    ordered_lines = _smart_sort_lines(prepared_by_half[0]) + _smart_sort_lines(prepared_by_half[1])
    grouped_blocks = []
    for line in ordered_lines:
        if grouped_blocks and _can_merge_into_block(grouped_blocks[-1][-1], line):
            grouped_blocks[-1].append(line)
        else:
            grouped_blocks.append([line])

    text = ''
    chars = []
    lines = []
    blocks = []
    issues = []

    for block_lines in grouped_blocks:
        if text:
            text += '\n\n'
        bid = f'b{len(blocks)+1:04}'
        bs = len(text)
        for line in block_lines:
            if len(text) > bs:
                text += '\n'
            lid = f'l{len(lines)+1:04}'
            ls = len(text)
            clusters = line['clusters']
            line_rect = line['rect']
            for idx, c in enumerate(clusters):
                ch_text = c['text']
                start = len(text)
                text += ch_text
                end = len(text)
                ch_rect = c['rect']
                if ch_rect is None:
                    if ch_text.strip() == '':
                        ch_rect = _synthesize_space_rect(clusters, idx, line_rect)
                    else:
                        issues.append({
                            'severity': 'warning',
                            'reason': f'Vision OCR omitted missing/zero bounding box for glyph {ch_text!r} on {lid} at offset {start}..{end}.',
                        })
                        continue
                chars.append({
                    'id': f'c{len(chars)+1:05}',
                    'start': start,
                    'end': end,
                    'exactText': ch_text,
                    'lineId': lid,
                    'blockId': bid,
                    'rect': ch_rect,
                    'rawBox': [ch_rect[0]*pw, ch_rect[1]*ph, (ch_rect[0]+ch_rect[2])*pw, (ch_rect[1]+ch_rect[3])*ph],
                    'method': 'ocr',
                    'reviewStatus': 'needs-review',
                })
            lines.append({
                'id': lid,
                'blockId': bid,
                'start': ls,
                'end': len(text),
                'exactText': text[ls:],
                'rect': line_rect,
                'role': 'unclassified',
            })
        blocks.append({
            'id': bid,
            'start': bs,
            'end': len(text),
            'exactText': text[bs:],
            'rect': _union_rects([l['rect'] for l in block_lines]),
        })

    if not chars:
        issues.append({
            'severity': 'warning',
            'reason': 'No OCR characters found. Use local OCR or reviewed manual transcription before preparing learning content.',
        })

    transform = {
        'origin': 'visible-crop-top-left',
        'source': 'vision-300dpi',
        'rawToRotated': list(raw_to_rotated),
        'normalization': [pw, ph],
    }
    extractor = {
        'name': 'PyMuPDF+Vision',
        'version': f'{fitz.VersionBind};macOS-{platform.mac_ver()[0]}',
        'engine': 'vision',
        'languages': reported_langs,
    }
    return text, chars, lines, blocks, issues, transform, extractor

def _extract_vision(p):
    if sys.platform != 'darwin':
        print('CHINOIS_OCR_ENGINE=vision is only supported on macOS (darwin).', file=sys.stderr)
        sys.exit(1)
    if not (os.path.isfile('/usr/bin/swift') and os.access('/usr/bin/swift', os.X_OK)):
        print('CHINOIS_OCR_ENGINE=vision requires executable /usr/bin/swift.', file=sys.stderr)
        sys.exit(1)

    mode, zh_langs, fr_langs, reported_langs = _resolve_vision_langs()
    split_spread = (p.rect.width >= 900.0) or (p.rect.width > p.rect.height * 1.25)

    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = pathlib.Path(tmpdir) / 'page.png'
        p.get_pixmap(dpi=300).save(str(img_path))
        langs_json = json.dumps({'zh': zh_langs, 'fr': fr_langs})
        cmd = ['/usr/bin/swift', '-', str(img_path), '1' if split_spread else '0', mode, langs_json]
        try:
            proc = subprocess.run(
                cmd,
                input=_SWIFT_VISION_SCRIPT,
                text=True,
                capture_output=True,
                timeout=180,
                encoding='utf-8',
            )
        except subprocess.TimeoutExpired:
            print('macOS Vision OCR timed out after 180s.', file=sys.stderr)
            sys.exit(1)

    if proc.returncode != 0:
        err = proc.stderr.strip() or f'Swift Vision OCR exited with status {proc.returncode}'
        print(err, file=sys.stderr)
        sys.exit(1)

    try:
        vision_data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        print(f'Failed to parse Vision OCR JSON output: {exc}', file=sys.stderr)
        sys.exit(1)

    return _assemble_vision_layout(
        vision_data,
        p.rect.width,
        p.rect.height,
        p.rotation_matrix,
        reported_langs,
    )

op, source = sys.argv[1:3]
doc = fitz.open(source)
if op == 'inspect':
    print(json.dumps({'title':doc.metadata.get('title'), 'pageCount':len(doc), 'tool':fitz.VersionBind,
      'pages':[{'pageNumber':i+1,'width':p.rect.width,'height':p.rect.height,'mediaBox':list(p.mediabox),'cropBox':list(p.cropbox),'rotation':p.rotation} for i,p in enumerate(doc)]}))
else:
    number, dest, document_id, revision = int(sys.argv[3]), pathlib.Path(sys.argv[4]), sys.argv[5], int(sys.argv[6])
    method='ocr' if len(sys.argv)>7 and sys.argv[7]=='ocr' else 'embedded'
    engine_raw = os.environ.get('CHINOIS_OCR_ENGINE')
    engine = (engine_raw.strip().lower() if engine_raw is not None else 'tesseract') or 'tesseract'
    if method == 'ocr' and engine not in ('tesseract', 'vision'):
        print(f"Unsupported CHINOIS_OCR_ENGINE: {engine_raw!r}. Expected 'tesseract' or 'vision'.", file=sys.stderr)
        sys.exit(1)
    dest.mkdir(parents=True, exist_ok=True)
    p=doc[number-1]; text=''; chars=[]; lines=[]; blocks=[]
    if method == 'ocr' and engine == 'vision':
        text, chars, lines, blocks, issues, transform, extractor = _extract_vision(p)
    else:
        # Text extraction uses unrotated crop-relative coordinates; transform to visible rotated crop.
        def rect(box):
            r=fitz.Rect(box)*p.rotation_matrix
            return [r.x0/p.rect.width,r.y0/p.rect.height,r.width/p.rect.width,r.height/p.rect.height]
        tp=p.get_textpage_ocr(language=os.environ.get('CHINOIS_OCR_LANG','chi_sim+eng'),dpi=300,full=True) if method=='ocr' else None
        raw=p.get_text('rawdict',sort=True,textpage=tp)
        for block in raw['blocks']:
            if block['type'] != 0: continue
            if text: text+='\n\n'
            bid=f'b{len(blocks)+1:04}'; bs=len(text)
            for line in block['lines']:
                if len(text)>bs: text+='\n'
                lid=f'l{len(lines)+1:04}'; ls=len(text)
                for span in line['spans']:
                    for c in span['chars']:
                        start=len(text); text+=c['c']
                        chars.append({'id':f'c{len(chars)+1:05}','start':start,'end':len(text),'exactText':c['c'],'lineId':lid,'blockId':bid,'rect':rect(c['bbox']),'rawBox':list(c['bbox']),'method':method,'reviewStatus':'needs-review'})
                lines.append({'id':lid,'blockId':bid,'start':ls,'end':len(text),'exactText':text[ls:],'rect':rect(line['bbox']),'role':'unclassified'})
            blocks.append({'id':bid,'start':bs,'end':len(text),'exactText':text[bs:],'rect':rect(block['bbox'])})
        issues = ([] if chars else [{'severity':'warning','reason':'No embedded characters found. Use local OCR or reviewed manual transcription before preparing learning content.'}])
        transform = {'origin':'visible-crop-top-left','rawToRotated':list(p.rotation_matrix),'normalization':[p.rect.width,p.rect.height]}
        extractor = {'name':'PyMuPDF','version':fitz.VersionBind}
    (dest/'text.txt').write_text(text,encoding='utf-8')
    base={'documentId':document_id,'pageId':f'p{number:04}','extractionRevision':revision}
    dump(dest/'layout.json',base|{'textSha256':hashlib.sha256(text.encode()).hexdigest(),'offsetUnit':'unicode-code-point','pageNumber':number,'width':p.rect.width,'height':p.rect.height,'mediaBox':list(p.mediabox),'cropBox':list(p.cropbox),'rotation':p.rotation,'transform':transform,'transcriptRange':[0,len(text)],'synthesizedWhitespace':'LF between lines; two LF between blocks','characters':chars,'lines':lines,'blocks':blocks,'issues':issues,'extractionMethod':method,'extractor':extractor})
    p.get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(dest/'source.png')
    for name in ['entries','annotations','questions']:
        dump(dest/(name+'.json'),base|{name:[]})
    dump(dest/'review.json',base|{'sourceVisualReview':False,'linguisticReview':False,'reviewer':'','issues':[],'coverage':{},'checks':[]})
    print(json.dumps({'page':number,'characters':len(chars),'path':str(dest)}))
