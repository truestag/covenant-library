#!/usr/bin/env python3
from __future__ import annotations
import hashlib, html, json, re, shutil, urllib.parse, urllib.request, zipfile
from pathlib import Path

OUT=Path('Covenant-Library-Seven-JSON')
RAW=OUT/'_source'
CACHE=OUT/'_cache'
ACCESS_DATE='2026-09-15'
SEFARIA='https://raw.githubusercontent.com/vtr44/sefaria-export/master/txt/Midrash/Halakhah'
DSS_ZIP='https://github.com/ETCBC/dss/archive/refs/heads/master.zip'

RABBINIC=[
 ('MEKHILTA-DERABBI-YISHMAEL','Mekhilta DeRabbi Yishmael',['Mekhilta de-Rabbi Ishmael','Mekhilta de-Rabbi Yishmael','Mechilta'],'Mekhilta DeRabbi Yishmael/English/Mechilta, translated by Rabbi Shraga Silverstein.txt','mekhilta','d51e671fed35b04dc234199fe9705f14423c490e'),
 ('SIFREI-BAMIDBAR','Sifrei Bamidbar',['Sifre Numbers','Sifrei Numbers','Sifre Bamidbar'],'Sifrei Bamidbar/English/Sifrei by Rabbi Shraga Silverstein.txt','sifrei','2e132fc988bb0593b0feae9947f85e6e1d88d609'),
 ('SIFREI-DEVARIM','Sifrei Devarim',['Sifre Deuteronomy','Sifrei Deuteronomy','Sifre Devarim'],'Sifrei Devarim/English/Sifrei by Rabbi Shraga Silverstein.txt','sifrei','bbec3ba4377e4495deb1baaaa5b25196dec00978'),
]
DSS=[
 ('COMMUNITY-RULE-1QS','The Community Rule',['Community Rule','Serekh ha-Yahad','Rule of the Community','1QS'],['1QS']),
 ('WAR-SCROLL-1QM','The War Scroll',['War Scroll','Milhamah','1QM'],['1QM']),
 ('TEMPLE-SCROLL-11Q19','The Temple Scroll',['Temple Scroll','11Q19','11QT'],['11Q19']),
 ('BOOK-OF-GIANTS-QUMRAN','The Book of Giants — Qumran Aramaic Fragments',['Book of Giants','Qumran Book of Giants','1Q23','2Q26','4Q203','4Q530','4Q531','4Q532','4Q533','6Q8'],['1Q23','2Q26','4Q203','4Q530','4Q531','4Q532','4Q533','6Q8']),
]

def get(url,timeout=180):
    req=urllib.request.Request(url,headers={'User-Agent':'Covenant-Library/2.1 free-reader acquisition'})
    with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()
def sha(b):return hashlib.sha256(b).hexdigest()
def blocks(lines):
    out=[]; cur=[]
    for x in lines:
        if x.strip():cur.append(x.rstrip())
        elif cur:out.append('\n'.join(cur).strip());cur=[]
    if cur:out.append('\n'.join(cur).strip())
    return [x for x in out if x]
def segs(texts,source_prefix=None):
    a=[]
    for i,t in enumerate(texts,1):
        o={'v':str(i),'label':str(i),'text':t}
        if source_prefix:o['sourceRef']=f'{source_prefix}:{i}'
        a.append(o)
    return a

def parse_sifrei(text):
    m=list(re.finditer(r'(?m)^Paragraph\s+(\d+)\s*$',text))
    if not m:raise ValueError('No Sifrei Paragraph headings')
    ch={}
    for i,x in enumerate(m):
        n=x.group(1); end=m[i+1].start() if i+1<len(m) else len(text)
        b=blocks(text[x.end():end].splitlines())
        if not b:raise ValueError('empty Sifrei paragraph '+n)
        ch[n]=segs(b,f'Paragraph {n}')
    return ch

def parse_mekhilta(text):
    tract=None; current=None; rec=[]
    for line in text.splitlines():
        s=line.strip(); mt=re.match(r'^Tractate\s+(.+)$',s); mc=re.match(r'^Chapter\s+(\d+)\s*$',s)
        if mt:tract=mt.group(1).strip();continue
        if mc and tract:
            if current:rec.append(current)
            current={'tract':tract,'chapter':mc.group(1),'lines':[]};continue
        if current is not None:current['lines'].append(line)
    if current:rec.append(current)
    if not rec:raise ValueError('No Mekhilta tractate/chapter structure')
    ch={}; cmap=[]
    for i,r in enumerate(rec,1):
        b=blocks(r['lines'])
        if not b:raise ValueError('empty Mekhilta chapter')
        ch[str(i)]=segs(b,f"Mekhilta DeRabbi Yishmael, Tractate {r['tract']} {r['chapter']}")
        cmap.append({'readerChapter':i,'tractate':r['tract'],'sourceChapter':r['chapter'],'segments':len(b)})
    return ch,cmap

def write_rabbinic():
    made=[]
    for ident,name,aliases,path,kind,blob in RABBINIC:
        url=SEFARIA+'/'+ '/'.join(urllib.parse.quote(p,safe='') for p in path.split('/'))
        data=get(url); RAW.mkdir(parents=True,exist_ok=True); (RAW/f'{ident}.txt').write_bytes(data)
        text=html.unescape(data.decode('utf-8-sig')).replace('\r\n','\n').replace('\r','\n')
        if kind=='mekhilta': ch,cmap=parse_mekhilta(text)
        else: ch=parse_sifrei(text); cmap=None
        total=sum(len(v) for v in ch.values())
        book={'id':ident,'name':name,'title':name,'sequence':1,'chapters':len(ch),'verses':total,'chapterNumbers':list(ch),'aliases':aliases,'readerAvailability':'local-json','bundledJson':True,'localMirror':True,'searchable':True,'contentMode':'prose','section':'Rabbinic Midrash','categories':['rabbinic','midrash','tannaitic-halakhic-midrash'],'translator':'Rabbi Shraga Silverstein','sourceNote':'English translation exported by Sefaria. Source wording preserved; segmented only for Covenant Library reader navigation.','readerSourceUrl':'https://www.sefaria.org/','rights':'Creative Commons Attribution (CC BY). Attribution must be preserved.','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':'Rabbi Shraga Silverstein, English translation; Sefaria distribution/export.','sourceUrl':url,'sourceGitBlobSha':blob,'sourceSha256':sha(data),'acquiredAt':ACCESS_DATE,'distributionNote':'Covenant Library is free: no subscription, paywall, or monetary access charge.'}
        if cmap:book['chapterMap']=cmap
        obj={'edition':'v2-jewish-midrash-sefaria-silverstein','book':book,'chapters':ch}
        p=OUT/f'{ident}.json'; p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); made.append(p)
    return made

def dss_repo():
    CACHE.mkdir(parents=True,exist_ok=True); z=CACHE/'dss.zip'; z.write_bytes(get(DSS_ZIP))
    with zipfile.ZipFile(z) as f:f.extractall(CACHE)
    cand=list(CACHE.glob('dss-*/tf/2.0.1'))
    if not cand:raise RuntimeError('ETCBC DSS tf/2.0.1 missing')
    return cand[0]
def tf_api(tfdir):
    from tf.fabric import Fabric
    TF=Fabric(locations=str(tfdir),silent='deep')
    return TF.load('otype oslots scroll fragment line full glyph punc after lang',silent='deep')
def line_text(api,n):
    try:
        s=api.T.text(n,fmt='text-orig-extra')
        if s and s.strip():return s.strip()
    except Exception:pass
    parts=[]
    for w in api.L.d(n,otype='word'):
        full=api.F.full.v(w) or ''; after=api.F.after.v(w) or ''
        parts.append(full+after)
    return ''.join(parts).strip()
def dss_payload(api,ident,name,aliases,wanted):
    F,L,T=api.F,api.L,api.T
    scrolls={F.scroll.v(n):n for n in F.otype.s('scroll') if F.scroll.v(n)}
    selected=[(s,scrolls[s]) for s in wanted if s in scrolls]
    if not selected:raise ValueError(name+': no requested manuscript found')
    ch={}; cmap=[]; c=0; total=0
    for code,node in selected:
        groups=[]; last=None
        for ln in L.d(node,otype='line'):
            sec=T.sectionFromNode(ln); frag=str(sec[1]) if sec and len(sec)>1 else '1'; line=str(sec[2]) if sec and len(sec)>2 else '?'; key=(code,frag)
            if key!=last:groups.append({'key':key,'lines':[]});last=key
            txt=line_text(api,ln)
            if txt:groups[-1]['lines'].append((line,txt))
        for g in groups:
            if not g['lines']:continue
            c+=1; code,frag=g['key']; arr=[]
            for i,(ln,txt) in enumerate(g['lines'],1):arr.append({'v':str(i),'label':str(ln),'text':txt,'sourceRef':f'{code} {frag}:{ln}','manuscript':code,'fragmentOrColumn':frag,'sourceLine':str(ln)})
            ch[str(c)]=arr; total+=len(arr);cmap.append({'readerChapter':c,'manuscript':code,'fragmentOrColumn':frag,'segments':len(arr)})
    if not total:raise ValueError(name+': no text extracted')
    book={'id':ident,'name':name,'title':name,'sequence':1,'chapters':len(ch),'verses':total,'chapterNumbers':list(ch),'aliases':aliases,'readerAvailability':'local-json','bundledJson':True,'localMirror':True,'searchable':True,'contentMode':'manuscript-lines','section':'Dead Sea Scrolls','categories':['dead-sea-scrolls','qumran','second-temple'],'language':'Hebrew/Aramaic as encoded by ETCBC','sourceNote':'Unicode manuscript transcription extracted from ETCBC Dead Sea Scrolls Text-Fabric corpus 2.0.1. This is not a modern English translation.','readerSourceUrl':'https://github.com/ETCBC/dss','rights':'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).','licenseUrl':'https://creativecommons.org/licenses/by-nc/4.0/','attribution':'Martin G. Abegg, Jr., James E. Bowley, Edward M. Cook; Text-Fabric conversion by Jarod Jacobs, Martijn Naaijer, and Dirk Roorda.','sourceVersion':'ETCBC DSS Text-Fabric 2.0.1','sourceRepositoryCommit':'47ecc1738fad6e67df7d40a3e84d73e4a125e265','manuscripts':[x for x,_ in selected],'chapterMap':cmap,'acquiredAt':ACCESS_DATE,'distributionNote':'Embedded under CC BY-NC 4.0. Covenant Library distribution of this dataset must remain noncommercial; reader access is free with no subscription, paywall, or monetary access charge.'}
    if ident=='BOOK-OF-GIANTS-QUMRAN':book['identityNote']='Qumran Aramaic Book of Giants manuscript witnesses only; not Henning’s Manichaean witnesses and not the Wise-Abegg-Cook modern English translation.'
    return {'edition':'v2-dead-sea-scrolls-etcbc-2.0.1','book':book,'chapters':ch}
def write_dss():
    tfdir=dss_repo(); api=tf_api(tfdir); made=[]
    for ident,name,aliases,wanted in DSS:
        obj=dss_payload(api,ident,name,aliases,wanted); p=OUT/f'{ident}.json';p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');made.append(p)
    return made

def validate(paths):
    report=[]
    for p in paths:
        obj=json.loads(p.read_text(encoding='utf-8')); total=sum(len(v) for v in obj['chapters'].values())
        if not obj['chapters'] or total<1:raise ValueError(p.name+' empty')
        if any(not x.get('text','').strip() for v in obj['chapters'].values() for x in v):raise ValueError(p.name+' blank segment')
        report.append({'file':p.name,'title':obj['book']['title'],'chapters':len(obj['chapters']),'segments':total,'sha256':sha(p.read_bytes()),'rights':obj['book']['rights']})
    return report

def main():
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir(); paths=write_rabbinic()+write_dss(); report=validate(paths)
    manifest={'generated':ACCESS_DATE,'distribution':'free reader; no subscription; no paywall; no monetary access charge','works':report}
    (OUT/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['file']}\n" for x in report),encoding='utf-8')
    with zipfile.ZipFile('Covenant-Library-Seven-New-Books-JSON-2026-09-15.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in paths+[OUT/'MANIFEST.json',OUT/'SHA256SUMS.txt']:z.write(p,p.name)
    print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
