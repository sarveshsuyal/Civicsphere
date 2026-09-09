begin;
alter table public.datasets add column upload_request_id uuid;
alter table public.datasets add column source_crs_override integer check(source_crs_override between 1 and 999999);
create unique index datasets_upload_request on public.datasets(uploaded_by,upload_request_id);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 dataset_id uuid not null, job_type text not null default 'GIS_IMPORT' check(job_type='GIS_IMPORT'),
 status text not null default 'QUEUED' check(status in ('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
 progress integer not null default 0 check(progress between 0 and 100), attempts integer not null default 0,
 lease_token uuid, lease_until timestamptz, started_at timestamptz, completed_at timestamptz,
 error text, created_by uuid not null, created_at timestamptz not null default now(), metadata jsonb not null default '{}',
 foreign key(dataset_id,organization_id) references public.datasets(id,organization_id),
 foreign key(created_by,organization_id) references public.profiles(id,organization_id)
);
create unique index jobs_one_active_dataset on public.jobs(dataset_id) where status in ('QUEUED','PROCESSING');
create index jobs_queue on public.jobs(status,created_at);
create index jobs_organization on public.jobs(organization_id,created_at desc);
create table public.spatial_features (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 dataset_id uuid not null, source_index integer not null, geometry extensions.geometry(Geometry,4326) not null,
 properties jsonb not null default '{}', processing_job_id uuid not null references public.jobs,
 created_at timestamptz not null default now(), unique(dataset_id,source_index),
 foreign key(dataset_id,organization_id) references public.datasets(id,organization_id),
 check(extensions.st_isvalid(geometry) and not extensions.st_isempty(geometry))
);
create index features_geometry on public.spatial_features using gist(geometry);
create index features_dataset on public.spatial_features(dataset_id);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), task_id text not null unique default ('TASK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 organization_id uuid not null references public.organizations, issue_id uuid not null, department_id uuid not null, officer_id uuid not null,
 status text not null default 'ASSIGNED' check(status in ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
 assigned_at timestamptz not null default now(), deadline timestamptz, created_by uuid not null, created_at timestamptz not null default now(),
 foreign key(issue_id,organization_id) references public.issues(id,organization_id),
 foreign key(department_id,organization_id) references public.departments(id,organization_id),
 foreign key(officer_id,organization_id) references public.profiles(id,organization_id),
 foreign key(created_by,organization_id) references public.profiles(id,organization_id)
);
create unique index tasks_one_active_issue on public.tasks(issue_id) where status in ('ASSIGNED','IN_PROGRESS');
create index tasks_officer_status on public.tasks(officer_id,status);
create index tasks_department on public.tasks(department_id);
create index tasks_deadline on public.tasks(deadline) where deadline is not null;
alter table public.jobs enable row level security;
alter table public.spatial_features enable row level security;
alter table public.tasks enable row level security;
create policy jobs_read on public.jobs for select to authenticated using(exists(select 1 from public.datasets d where d.id=dataset_id));
create policy features_read on public.spatial_features for select to authenticated using(exists(select 1 from public.datasets d where d.id=dataset_id and d.status='READY'));
create policy tasks_read on public.tasks for select to authenticated using(civic_private.can_read_issue(organization_id,department_id,officer_id,created_by));
revoke all on public.jobs,public.spatial_features,public.tasks from public,anon,authenticated;
grant select on public.jobs,public.spatial_features,public.tasks to authenticated;
-- Read-only operational layers may be visible within an organization; raw files
-- remain accessible only through the narrower storage policies below.
drop policy datasets_read on public.datasets;
create policy datasets_read on public.datasets for select to authenticated using(
 organization_id=(select (civic_private.current_profile()).organization_id) and
 ((select (civic_private.current_profile()).role) in ('ADMIN','SUPER_ADMIN','CITY_OFFICER','GIS_ANALYST','DATA_MANAGER')
 or uploaded_by=auth.uid() or (status='READY' and (select (civic_private.current_profile()).role)<>'PUBLIC_USER'))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('datasets','datasets',false,20971520,array['application/geo+json','application/json','application/zip'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
create policy civic_dataset_insert on storage.objects for insert to authenticated with check(
 bucket_id='datasets' and exists(select 1 from public.datasets d where d.storage_path=name and d.uploaded_by=auth.uid()
 and d.status='UPLOADED' and d.created_at>now()-interval '1 hour' and (select (civic_private.current_profile()).role) in ('SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER'))
);
create policy civic_dataset_read on storage.objects for select to authenticated using(
 bucket_id='datasets' and exists(select 1 from public.datasets d where d.storage_path=name and d.status='READY'
 and (d.uploaded_by=auth.uid() or (select (civic_private.current_profile()).role) in ('SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER')))
);
-- No client UPDATE, DELETE or upsert policy: stored inputs are immutable.
create function civic_private.reserve_dataset(dataset_name text,kind text,extension text,bytes bigint,sha256 text,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; d public.datasets; new_id uuid:=gen_random_uuid(); mime text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 select * into p from civic_private.current_profile();
 if p.id is null or p.role not in ('SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if dataset_name is null or length(trim(dataset_name)) not between 3 and 120 or kind not in ('ROAD_NETWORK','BUILDING','DRAINAGE','WATER','OTHER') or kind is null
 or extension not in ('geojson','json','zip') or extension is null or bytes is null or bytes not between 1 and 20971520
 or sha256 is null or sha256 !~ '^[a-f0-9]{64}$' or request_id is null then raise exception 'INVALID_UPLOAD' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p.id::text,0));
 select * into d from public.datasets where uploaded_by=p.id and upload_request_id=request_id;
 if found then
  if d.name<>trim(dataset_name) or d.checksum<>sha256 or d.file_size<>bytes or d.file_extension<>extension or d.dataset_type<>kind then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='22023'; end if;
  return jsonb_build_object('id',d.id,'storage_path',d.storage_path,'mime_type',d.mime_type);
 end if;
 if (select count(*) from public.datasets where uploaded_by=p.id and created_at>now()-interval '1 hour')>=10 then raise exception 'UPLOAD_RATE_LIMIT' using errcode='54000'; end if;
 mime:=case when extension='zip' then 'application/zip' when extension='geojson' then 'application/geo+json' else 'application/json' end;
 insert into public.datasets(id,organization_id,name,dataset_type,storage_path,file_size,file_extension,mime_type,checksum,uploaded_by,upload_request_id)
 values(new_id,p.organization_id,trim(dataset_name),kind,p.organization_id::text||'/'||p.id::text||'/'||new_id::text||'.'||extension,bytes,extension,mime,sha256,p.id,request_id) returning * into d;
 insert into public.audit_logs(organization_id,actor_user_id,action,object_type,object_id,new_values,reason,correlation_id)
 values(p.organization_id,p.id,'UPLOAD','DATASET',d.id,jsonb_build_object('status','UPLOADED'),'Dataset upload reserved',request_id);
 return jsonb_build_object('id',d.id,'storage_path',d.storage_path,'mime_type',d.mime_type);
end $$;
create function public.reserve_dataset(dataset_name text,kind text,extension text,bytes bigint,sha256 text,request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select civic_private.reserve_dataset(dataset_name,kind,extension,bytes,sha256,request_id)$$;

create function civic_private.queue_dataset(target_id uuid,crs_code integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.profiles; d public.datasets; job_id uuid; object_size bigint;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 select * into p from civic_private.current_profile();
 if p.id is null or p.role not in ('SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into d from public.datasets where id=target_id and organization_id=p.organization_id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 select id into job_id from public.jobs where dataset_id=d.id and status in ('QUEUED','PROCESSING');
 if found then return job_id; end if;
 if d.status not in ('UPLOADED','NEEDS_CRS','FAILED') then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
 if crs_code is not null and (crs_code not between 1 and 999999 or d.status<>'NEEDS_CRS') then raise exception 'INVALID_CRS' using errcode='22023'; end if;
 if d.status='NEEDS_CRS' and crs_code is null then raise exception 'CRS_REQUIRED' using errcode='22023'; end if;
 if (select count(*) from public.jobs where dataset_id=d.id)>=3 then raise exception 'RETRY_LIMIT' using errcode='54000'; end if;
 select (o.metadata->>'size')::bigint into object_size from storage.objects o where o.bucket_id='datasets' and o.name=d.storage_path;
 if object_size is null or object_size<>d.file_size then raise exception 'UPLOAD_INCOMPLETE' using errcode='22023'; end if;
 insert into public.jobs(organization_id,dataset_id,created_by) values(p.organization_id,d.id,p.id) returning id into job_id;
 update public.datasets set status='VALIDATING',source_crs_override=coalesce(crs_code,source_crs_override),processing_error=null,updated_at=now() where id=d.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,object_type,object_id,new_values,reason,correlation_id)
 values(p.organization_id,p.id,'PROCESS','DATASET',d.id,jsonb_build_object('job_id',job_id,'crs_override',crs_code),'GIS validation queued',gen_random_uuid());
 return job_id;
end $$;
create function public.queue_dataset(target_id uuid,crs_code integer default null) returns uuid language sql security invoker set search_path='' as $$select civic_private.queue_dataset(target_id,crs_code)$$;

-- Service-role-only worker RPCs. The key belongs exclusively in worker secrets.
create function public.claim_gis_job() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.jobs; d public.datasets;
begin
 select * into j from public.jobs where status='QUEUED' or (status='PROCESSING' and lease_until<now()) order by created_at limit 1 for update skip locked;
 if not found then return null; end if;
 if j.attempts>=3 then
  update public.jobs set status='FAILED',error='WORKER_LEASE_EXHAUSTED',completed_at=now(),lease_token=null where id=j.id;
  update public.datasets set status='FAILED',processing_error='WORKER_LEASE_EXHAUSTED',updated_at=now() where id=j.dataset_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,object_type,object_id,new_values,reason,correlation_id) values(j.organization_id,j.created_by,'PROCESS_RESULT','DATASET',j.dataset_id,jsonb_build_object('job_id',j.id,'outcome','FAILED','executor','GIS_WORKER'),'Worker lease retry limit reached',gen_random_uuid());
  return null;
 end if;
 update public.jobs set status='PROCESSING',attempts=attempts+1,started_at=coalesce(started_at,now()),lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',progress=5 where id=j.id returning * into j;
 update public.datasets set status='PROCESSING',updated_at=now() where id=j.dataset_id returning * into d;
 return jsonb_build_object('job_id',j.id,'lease_token',j.lease_token,'dataset',to_jsonb(d));
end $$;
create function public.finish_gis_job(job_id uuid,token uuid,outcome text,features jsonb default '[]',quality jsonb default '{}',source_crs text default null,error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare j public.jobs; f jsonb; g extensions.geometry; n integer:=0; bbox extensions.geometry;
begin
 select * into j from public.jobs where id=job_id for update;
 if not found or j.status<>'PROCESSING' or j.lease_token is distinct from token or j.lease_until<=now() then raise exception 'STALE_JOB' using errcode='42501'; end if;
 if outcome is null or outcome not in ('READY','NEEDS_CRS','FAILED') or features is null or jsonb_typeof(features)<>'array' or jsonb_array_length(features)>10000 or pg_column_size(features)>33554432 then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
 if outcome='READY' then
  if jsonb_array_length(features)=0 then raise exception 'EMPTY_DATASET' using errcode='22023'; end if;
  delete from public.spatial_features where dataset_id=j.dataset_id;
  for f in select value from jsonb_array_elements(features) loop
   g:=extensions.st_setsrid(extensions.st_geomfromgeojson((f->'geometry')::text),4326);
   if not extensions.st_isvalid(g) or extensions.st_isempty(g) or extensions.st_ndims(g)<>2 or not extensions.st_coveredby(g,extensions.st_makeenvelope(-180,-90,180,90,4326)) then raise exception 'INVALID_GEOMETRY' using errcode='22023'; end if;
   insert into public.spatial_features(organization_id,dataset_id,source_index,geometry,properties,processing_job_id)
   values(j.organization_id,j.dataset_id,n,g,coalesce(f->'properties','{}'),j.id);n:=n+1;
  end loop;
  select extensions.st_envelope(extensions.st_collect(geometry)) into bbox from public.spatial_features where dataset_id=j.dataset_id;
  -- Point/line extents cannot be stored as a Polygon; retain bounds in metadata.
  update public.datasets set status='READY',feature_count=n,original_crs=source_crs,geometry_type=quality->>'geometry_type',
   metadata=metadata||jsonb_build_object('quality',quality,'job_id',j.id,'bounds',extensions.st_asgeojson(bbox)::jsonb),
   validated_at=now(),processed_at=now(),processing_error=null,updated_at=now() where id=j.dataset_id;
 else
  update public.datasets set status=outcome::public.dataset_status,processing_error=left(error_code,200),metadata=metadata||jsonb_build_object('quality',quality),updated_at=now() where id=j.dataset_id;
 end if;
 update public.jobs set status=case when outcome='FAILED' then 'FAILED' else 'COMPLETED' end,progress=100,completed_at=now(),lease_token=null,lease_until=null,error=left(error_code,200),metadata=jsonb_build_object('outcome',outcome,'quality',quality) where id=j.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,object_type,object_id,new_values,reason,correlation_id)
 values(j.organization_id,j.created_by,'PROCESS_RESULT','DATASET',j.dataset_id,jsonb_build_object('job_id',j.id,'outcome',outcome,'features',n,'executor','GIS_WORKER'),'GIS worker result',gen_random_uuid());
end $$;
create function public.features_in_view(target_dataset uuid,west float8,south float8,east float8,north float8)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if west is null or south is null or east is null or north is null or not(west>=-180 and east<=180 and south>=-90 and north<=90 and west<east and south<north) then raise exception 'INVALID_BOUNDS' using errcode='22023'; end if;
 select jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(jsonb_build_object('type','Feature','id',f.id,'geometry',extensions.st_asgeojson(f.geometry)::jsonb,'properties',f.properties)),'[]'),'limit',500)
 into result from (select id,geometry,properties from public.spatial_features where dataset_id=target_dataset and geometry operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326) order by source_index limit 500) f;
 return result;
end $$;

create function civic_private.assignment_officers() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'display_name',o.display_name,'department_id',o.department_id)),'[]')
 from public.profiles o, civic_private.current_profile() p
 where auth.uid() is not null and p.id is not null and p.organization_id=o.organization_id and o.is_active and o.role='FIELD_OFFICER'
 and (p.role in ('SUPER_ADMIN','ADMIN','CITY_OFFICER') or (p.role='DEPARTMENT_MANAGER' and p.department_id=o.department_id))
$$;
create function public.assignment_options() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('departments',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name)),'[]') from public.departments d where d.is_active),'officers',civic_private.assignment_officers())
$$;
create function civic_private.assign_issue(target_id uuid,department uuid,officer uuid,assignment_reason text,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; prior public.issues; dept public.departments; audit public.audit_logs; task public.tasks; hours numeric; due timestamptz;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 select * into p from civic_private.current_profile();
 if p.id is null or p.role not in ('SUPER_ADMIN','ADMIN','CITY_OFFICER','DEPARTMENT_MANAGER') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if request_id is null or assignment_reason is null or length(trim(assignment_reason)) not between 10 and 2000 then raise exception 'INVALID_ASSIGNMENT' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p.id::text||request_id::text,0));
 select * into audit from public.audit_logs a where a.actor_user_id=p.id and a.correlation_id=request_id;
 if found then
  if audit.action<>'ASSIGN' or audit.object_id<>target_id or audit.new_values->>'department' is distinct from department::text or audit.new_values->>'officer' is distinct from officer::text or audit.reason<>assignment_reason then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='22023'; end if;
  return audit.new_values;
 end if;
 select * into prior from public.issues where id=target_id and organization_id=p.organization_id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if prior.status<>'VERIFIED' or prior.reviewed_by is null then raise exception 'VERIFICATION_REQUIRED' using errcode='22023'; end if;
 if p.role='DEPARTMENT_MANAGER' and (p.department_id is distinct from department or prior.assigned_department is distinct from p.department_id) then raise exception 'DEPARTMENT_SCOPE' using errcode='42501'; end if;
 select * into dept from public.departments where id=department and organization_id=p.organization_id and is_active;
 if not found then raise exception 'INVALID_DEPARTMENT' using errcode='22023'; end if;
 perform 1 from public.profiles where id=officer and organization_id=p.organization_id and department_id=department and role='FIELD_OFFICER' and is_active;
 if not found then raise exception 'INVALID_OFFICER' using errcode='22023'; end if;
 hours:=case prior.severity when 'CRITICAL' then 4 when 'HIGH' then 24 when 'MEDIUM' then 72 when 'LOW' then 168 else null end;
 if dept.default_sla_policy ? prior.severity::text then
  hours:=(dept.default_sla_policy->>prior.severity::text)::numeric;
  if hours is null or hours not between 0.25 and 8760 then raise exception 'INVALID_SLA_POLICY' using errcode='22023'; end if;
 end if;
 due:=case when hours is null then null else now()+hours*interval '1 hour' end;
 insert into public.tasks(organization_id,issue_id,department_id,officer_id,created_by,deadline) values(p.organization_id,prior.id,department,officer,p.id,due) returning * into task;
 update public.issues set status='ASSIGNED',assigned_department=department,assigned_officer=officer,deadline=due,updated_at=now() where id=prior.id;
 insert into public.audit_logs(organization_id,actor_user_id,action,object_type,object_id,previous_values,new_values,reason,correlation_id)
 values(p.organization_id,p.id,'ASSIGN','ISSUE',prior.id,jsonb_build_object('status',prior.status),jsonb_build_object('status','ASSIGNED','task_id',task.id,'department',department,'officer',officer,'deadline',due),assignment_reason,request_id);
 return jsonb_build_object('task_id',task.id,'deadline',due);
end $$;
create function public.assign_issue(target_id uuid,department uuid,officer uuid,assignment_reason text,request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select civic_private.assign_issue(target_id,department,officer,assignment_reason,request_id)$$;
-- Revoke default PUBLIC execution before committing any definer function.
revoke all on function civic_private.reserve_dataset(text,text,text,bigint,text,uuid),civic_private.queue_dataset(uuid,integer),civic_private.assignment_officers(),civic_private.assign_issue(uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function civic_private.reserve_dataset(text,text,text,bigint,text,uuid),civic_private.queue_dataset(uuid,integer),civic_private.assignment_officers(),civic_private.assign_issue(uuid,uuid,uuid,text,uuid) to authenticated;
revoke all on function public.reserve_dataset(text,text,text,bigint,text,uuid),public.queue_dataset(uuid,integer),public.features_in_view(uuid,float8,float8,float8,float8),public.assignment_options(),public.assign_issue(uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.reserve_dataset(text,text,text,bigint,text,uuid),public.queue_dataset(uuid,integer),public.features_in_view(uuid,float8,float8,float8,float8),public.assignment_options(),public.assign_issue(uuid,uuid,uuid,text,uuid) to authenticated;
revoke all on function public.claim_gis_job(),public.finish_gis_job(uuid,uuid,text,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.claim_gis_job(),public.finish_gis_job(uuid,uuid,text,jsonb,jsonb,text,text) to service_role;

-- Extend the issue viewport contract without ever returning unbounded city data.
drop function public.issues_in_view(double precision,double precision,double precision,double precision,public.issue_severity);
create function public.issues_in_view(west float8,south float8,east float8,north float8,severity_filter public.issue_severity default null,status_filter public.issue_status default null,type_filter text default null)
returns setof public.issues language plpgsql stable security invoker set search_path='' as $$
begin
 if west is null or south is null or east is null or north is null or not(west>=-180 and east<=180 and south>=-90 and north<=90 and west<east and south<north) then raise exception 'INVALID_BOUNDS' using errcode='22023'; end if;
 return query select i.* from public.issues i where i.geometry operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)
 and (severity_filter is null or i.severity=severity_filter) and (status_filter is null or i.status=status_filter) and (type_filter is null or i.issue_type=type_filter)
 order by i.priority_score desc,i.id limit 100;
end $$;
revoke all on function public.issues_in_view(float8,float8,float8,float8,public.issue_severity,public.issue_status,text) from public,anon;
grant execute on function public.issues_in_view(float8,float8,float8,float8,public.issue_severity,public.issue_status,text) to authenticated;
commit;
