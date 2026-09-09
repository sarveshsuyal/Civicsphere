"""Leased Supabase job consumer. Run as a separate, resource-limited service."""
from __future__ import annotations
import json
import logging
import os
import time
import urllib.request
import urllib.parse
from pathlib import Path
from tempfile import TemporaryDirectory
from .security import IngestionError, NeedsCRS, MAX_UPLOAD
from .processor import process
logging.basicConfig(level=logging.INFO,format='%(message)s')

class Backend:
    def __init__(self):
        self.url = os.environ['SUPABASE_URL'].rstrip('/')
        if urllib.parse.urlparse(self.url).scheme != 'https':
            raise ValueError('Worker requires an HTTPS Supabase origin')
        self.key = os.environ['WORKER_SUPABASE_SERVICE_ROLE_KEY']

    def rpc(self, name: str, data: dict):
        payload = json.dumps(data,allow_nan=False).encode()
        request = urllib.request.Request(self.url+'/rest/v1/rpc/'+name,data=payload,
            headers={'Authorization':'Bearer '+self.key,'apikey':self.key,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=120) as response:
            body=response.read(40*1024*1024)
            return json.loads(body) if body else None

    def download(self, storage_path: str, destination: Path):
        path = urllib.parse.quote(storage_path,safe='/')
        request=urllib.request.Request(self.url+'/storage/v1/object/authenticated/datasets/'+path,
            headers={'Authorization':'Bearer '+self.key,'apikey':self.key})
        total=0
        with urllib.request.urlopen(request,timeout=60) as response, destination.open('xb') as output:
            while chunk:=response.read(65536):
                total+=len(chunk)
                if total>MAX_UPLOAD:
                    raise IngestionError('FILE_SIZE_LIMIT')
                output.write(chunk)

    def run_once(self) -> bool:
        job=self.rpc('claim_gis_job',{})
        if not job:
            return False
        result={'job_id':job['job_id'],'token':job['lease_token'],'outcome':'FAILED',
                'features':[],'quality':{},'source_crs':None,'error_code':None}
        started=time.monotonic()
        try:
            with TemporaryDirectory(prefix='civic-input-') as directory:
                path=Path(directory)/('input.'+job['dataset']['file_extension'])
                self.download(job['dataset']['storage_path'],path)
                features,quality,crs=process(path,job['dataset'])
                result.update(outcome='READY',features=features,quality=quality,source_crs=crs)
        except NeedsCRS:
            result.update(outcome='NEEDS_CRS',error_code='CRS_REQUIRED')
        except IngestionError as error:
            result['error_code']=str(error)
        except Exception as error:
            result['error_code']='PROCESSING_FAILED'
            logging.error(json.dumps({'event':'gis_error','job':job['job_id'],'type':type(error).__name__}))
        self.rpc('finish_gis_job',result)  # Lease token rejects stale results atomically.
        logging.info(json.dumps({'event':'gis_finished','job':job['job_id'],
                     'outcome':result['outcome'],'seconds':round(time.monotonic()-started,2)}))
        return True

def main():
    backend=Backend()
    while True:
        try:
            if not backend.run_once():
                time.sleep(5)
        except Exception as error:
            logging.error(json.dumps({'event':'worker_transport_error','type':type(error).__name__}))
            time.sleep(10)

if __name__=='__main__':
    main()
