"""Character geometry from MuPDF; no inferred division of word or line boxes."""
import sys, json, hashlib, pathlib, os
import pymupdf as fitz

def dump(p, v):
    pathlib.Path(p).write_text(json.dumps(v, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

op, source = sys.argv[1:3]
doc = fitz.open(source)
if op == 'inspect':
    print(json.dumps({'title':doc.metadata.get('title'), 'pageCount':len(doc), 'tool':fitz.VersionBind,
      'pages':[{'pageNumber':i+1,'width':p.rect.width,'height':p.rect.height,'mediaBox':list(p.mediabox),'cropBox':list(p.cropbox),'rotation':p.rotation} for i,p in enumerate(doc)]}))
else:
    number, dest, document_id, revision = int(sys.argv[3]), pathlib.Path(sys.argv[4]), sys.argv[5], int(sys.argv[6])
    dest.mkdir(parents=True, exist_ok=True)
    p=doc[number-1]; text=''; chars=[]; lines=[]; blocks=[]
    # Text extraction uses unrotated crop-relative coordinates; transform to visible rotated crop.
    def rect(box):
        r=fitz.Rect(box)*p.rotation_matrix
        return [r.x0/p.rect.width,r.y0/p.rect.height,r.width/p.rect.width,r.height/p.rect.height]
    method='ocr' if len(sys.argv)>7 and sys.argv[7]=='ocr' else 'embedded'
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
    (dest/'text.txt').write_text(text,encoding='utf-8')
    base={'documentId':document_id,'pageId':f'p{number:04}','extractionRevision':revision}
    dump(dest/'layout.json',base|{'textSha256':hashlib.sha256(text.encode()).hexdigest(),'offsetUnit':'unicode-code-point','pageNumber':number,'width':p.rect.width,'height':p.rect.height,'mediaBox':list(p.mediabox),'cropBox':list(p.cropbox),'rotation':p.rotation,'transform':{'origin':'visible-crop-top-left','rawToRotated':list(p.rotation_matrix),'normalization':[p.rect.width,p.rect.height]},'transcriptRange':[0,len(text)],'synthesizedWhitespace':'LF between lines; two LF between blocks','characters':chars,'lines':lines,'blocks':blocks,'issues':([] if chars else [{'severity':'warning','reason':'No embedded characters found. Use local OCR or reviewed manual transcription before preparing learning content.'}]),'extractionMethod':method,'extractor':{'name':'PyMuPDF','version':fitz.VersionBind}})
    p.get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(dest/'source.png')
    for name in ['entries','annotations','questions']:
        dump(dest/(name+'.json'),base|{name:[]})
    dump(dest/'review.json',base|{'sourceVisualReview':False,'linguisticReview':False,'reviewer':'','issues':[],'coverage':{},'checks':[]})
    print(json.dumps({'page':number,'characters':len(chars),'path':str(dest)}))
