"""Checkpointed public-source inventory. Downloads do NOT count as reviewed papers."""
import requests,json,re,hashlib,concurrent.futures
from pathlib import Path
from bs4 import BeautifulSoup
from pypdf import PdfReader
from urllib.parse import urljoin,unquote
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'research'; CACHE=ROOT/'work'/'sources'; CACHE.mkdir(parents=True,exist_ok=True)
cutoff='2026-09-08'
base='https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/'
specs=[('4HB1','Human%20Biology/2017/specification-and-sample-assessment/international-gcse-human-biology-2017-spec.pdf'),('4BI1','Biology/2017/specification-and-sample-assessments/international-gcse-biology-2017-specification1.pdf'),('4CH1','Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf'),('4PH1','Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf'),('4EB1','English%20Language%20B/2016/Specification%20and%20sample%20assessments/international-gcse-english-lang-b-specification.pdf'),('4MB1','Mathematics%20B/2016/Specification%20and%20sample%20assessments/international-gcse-in-mathematics-spec-b.pdf')]
sources=[]; points=[]
for code,path in specs:
 url=base+path; rec=dict(id=code+'-spec',qualification=code,url=url,title=code+' official linear specification',publisher='Pearson',documentType='specification',accessDate=cutoff,reviewedSections=[],status='unresolved')
 try:
  r=requests.get(url,timeout=40);r.raise_for_status();file=CACHE/(code+'.pdf');file.write_bytes(r.content);reader=PdfReader(file)
  pages=[p.extract_text() or '' for p in reader.pages];(CACHE/(code+'.txt')).write_text('\n\f\n'.join(pages));rec.update(status='obtained',pages=len(pages),sha256=hashlib.sha256(r.content).hexdigest())
  issue=re.search(r'Issue\s+\d[^\n]*','\n'.join(pages));rec['specificationIssue']=issue.group(0) if issue else 'unresolved'
  for n,page in enumerate(pages):
   for line in page.splitlines():
    m=re.match(r'^\s*(\d{1,2}\.\d{1,3}[BPC]?)\s+(.+)',line)
    if m:points.append(dict(id=code+':'+m[1],qualification=code,reference=m[1],pdfPage=n+1,sourceId=rec['id'],chapterIds=[],drafted=False,sourceChecked=False,humanReviewed=False,extractionStatus='candidate-needs-page-verification'))
 except Exception as e:rec['error']=str(e)[:180]
 sources.append(rec)
 (OUT/'sources.json').write_text(json.dumps(sources,indent=2));(OUT/'coverage.json').write_text(json.dumps(list({p['id']:p for p in points}.values()),indent=2))
 print(code,rec['status'],flush=True)
indexes=[]
for subj,code in [('biology','4BI1'),('chemistry','4CH1'),('physics','4PH1')]:
 for p in (1,2):indexes.append((code,f'https://www.physicsandmathstutor.com/past-papers/gcse-{subj}/edexcel-igcse-paper-{p}/','PMT',str(p)))
indexes += [('4HB1','https://www.savemyexams.com/igcse/biology/edexcel/human-biology/past-papers/','Save My Exams',''),('4EB1','https://www.savemyexams.com/igcse/english-language/edexcel/b/past-papers/','Save My Exams',''),('4MB1','https://studydex.net/course/55/igcse-maths-edexcel-b-4mb1/papers','StudyDex',''),('4MB1','https://mathsgenie.co.uk/igcse/maths/edexcel/papers?view=papers','Maths Genie',''),('4EB1','https://revisionworld.com/a2-level-level-revision/english-language-gcse-level/english-language-gcse-past-papers','Revision World','')]
for slug,code,year in [('human-biology','4HB1',2017),('biology','4BI1',2017),('chemistry','4CH1',2017),('physics','4PH1',2017),('english-language-b','4EB1',2016),('mathematics-b','4MB1',2016)]:indexes.append((code,f'https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-{slug}-{year}.coursematerials.html','Pearson',''))
ledger=[];logs=[]
for code,url,publisher,paper in indexes:
 log=dict(qualification=code,url=url,publisher=publisher,accessDate=cutoff,status='unresolved',discovered=0)
 try:
  r=requests.get(url,timeout=35);r.raise_for_status(); soup=BeautifulSoup(r.text,'html.parser');log['status']='index-obtained';log['title']=soup.title.get_text() if soup.title else url
  (CACHE/(hashlib.sha256(url.encode()).hexdigest()[:12]+'.html')).write_text(r.text)
  for a in soup.select('a[href]'):
   href=urljoin(r.url,a['href']);label=a.get_text(' ',strip=True);decoded=unquote(href)
   if '.pdf' not in href.lower():continue
   if publisher=='PMT' and 'New-Spec' not in decoded:continue
   if publisher=='Maths Genie' and '4MB1' not in (label+decoded).upper():continue
   kind='mark-scheme' if re.search(r'\bMS\b|msc|rms|mark.?scheme',label+' '+decoded,re.I) else 'examiner-report' if re.search(r'pef|report',label+' '+decoded,re.I) else 'question-paper' if re.search(r'\bQP\b|que|paper',label+' '+decoded,re.I) else 'unresolved'
   y=re.search(r'20\d\d',label+' '+decoded);series=next((x for x in ['January','June','November','Specimen'] if x.lower() in (label+' '+decoded).lower()),'unresolved')
   ledger.append(dict(id=hashlib.sha256(href.encode()).hexdigest()[:16],qualification=code,url=href,title=label or decoded.split('/')[-1],publisher='Pearson (linked by '+publisher+')',discoveryUrl=url,year=int(y[0]) if y else None,series=series,component=paper or 'unresolved',variant='R' if re.search(r'\(R\)|[12]R',label+' '+decoded) else 'unresolved',documentType=kind,accessDate=cutoff,accessStatus='discovered',processingStatus='unprocessed',reviewedPages=[],questionSubpartCount=0,marksReconciled=False,matchingSchemeId=None));log['discovered']+=1
 except Exception as e:log['error']=str(e)[:180]
 logs.append(log);(OUT/'discovery-log.json').write_text(json.dumps(logs,indent=2));(OUT/'paper-ledger.json').write_text(json.dumps(list({x['id']:x for x in ledger}.values()),indent=2));print(publisher,code,log['discovered'],flush=True)
