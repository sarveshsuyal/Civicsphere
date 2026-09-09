import test from 'node:test';
import assert from 'node:assert/strict';
import {slaState,uploadExtension,validSignature,assignmentSchema,datasetSchema} from '../frontend/src/types/operations.ts';
const start='2026-09-09T00:00:00Z',deadline='2026-09-09T04:00:00Z';
test('SLA warning thresholds include exact boundaries',()=>{
 for(const [hours,state] of [[0,'onTrack'],[2.99,'onTrack'],[3,'warning'],[3.6,'managerWarning'],[4,'breached']] as const){
  assert.equal(slaState(start,deadline,Date.parse(start)+hours*3600000).state,state);
 }
});
test('SLA supports INFO without a deadline and rejects invalid clocks',()=>{
 assert.equal(slaState(start,null).state,'unrestricted');
 assert.throws(()=>slaState(start,start));assert.throws(()=>slaState(start,'not-a-date'));
 assert.equal(slaState(start,deadline,Date.parse(start)-1000).percent,0);
});
test('upload extension and size are bounded',()=>{
 assert.equal(uploadExtension('roads.GEOJSON',20*1024*1024),'geojson');
 for(const [name,size] of [['roads.exe',100],['roads.geojson',0],['roads.zip',20971521]] as const)assert.throws(()=>uploadExtension(name,size));
});
test('client signature screening rejects disguised executable and invalid ZIP',()=>{
 assert.equal(validSignature('zip',new Uint8Array([0x50,0x4b,3,4])),true);
 assert.equal(validSignature('zip',new TextEncoder().encode('MZmalware')),false);
 assert.equal(validSignature('geojson',new TextEncoder().encode(' \n {"type":"FeatureCollection"}')),true);
 assert.equal(validSignature('geojson',new TextEncoder().encode('<html>')),false);
});
test('assignment schema rejects unscoped IDs and empty reasons',()=>{
 assert.equal(assignmentSchema.safeParse({department:'demo',officer:'demo',reason:'okay'}).success,false);
 assert.equal(assignmentSchema.safeParse({department:'754ed00b-f26a-4fda-a1d7-6b80cfceac03',officer:'e04c43a5-219d-471d-b792-5398ac629bea',reason:'Roads department field inspection'}).success,true);
});
test('dataset metadata constrains categories and normalizes names',()=>{
 assert.equal(datasetSchema.parse({name:'  Road segments  ',kind:'ROAD_NETWORK'}).name,'Road segments');
 assert.equal(datasetSchema.safeParse({name:'Roads',kind:'EXECUTABLE'}).success,false);
});
