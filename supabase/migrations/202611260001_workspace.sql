-- First implementation: company-scoped aggregate, transactional RPC commands.
-- No browser may write payloads, memberships or audit rows directly.
create extension if not exists pgcrypto;

create table public.operation_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table public.operation_members (
  workspace_id uuid not null references public.operation_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin','manager','attendant','kitchen','driver')),
  unit_ids text[] not null default '{}',
  primary key(workspace_id,user_id)
);
create table public.operation_audit (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operation_workspaces(id) on delete cascade,
  actor_id uuid not null,
  actor text not null,
  action text not null,
  detail text not null,
  unit_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.operation_members(user_id);
create index on public.operation_audit(workspace_id,created_at desc);
alter table public.operation_workspaces enable row level security;
alter table public.operation_members enable row level security;
alter table public.operation_audit enable row level security;
revoke all on public.operation_workspaces,public.operation_members,public.operation_audit from anon,authenticated;

create function public.workspace_create(company_name text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare w uuid; n text:=trim(company_name); user_email text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if length(n)<1 or length(n)>160 then raise exception 'Nome da empresa inválido.'; end if;
  select email into user_email from auth.users where id=auth.uid();
  insert into operation_workspaces(name,payload) values(n,jsonb_build_object(
    'name',n,'units','[]'::jsonb,'sectors','[]'::jsonb,'routes','[]'::jsonb,
    'categories','[]'::jsonb,'erpProducts','[]'::jsonb,'products','[]'::jsonb,
    'routines','[]'::jsonb,'orders','[]'::jsonb,'counts','[]'::jsonb,
    'settings',jsonb_build_object('brand',n,'primary','#10145e','accent','#00a9e5','whatsapp','','losses',false)
  )) returning id into w;
  insert into operation_members values(w,auth.uid(),split_part(user_email,'@',1),user_email,'admin','{}');
  insert into operation_audit(workspace_id,actor_id,actor,action,detail) values(w,auth.uid(),user_email,'Empresa criada',n);
  return w;
end $$;

create function public.workspace_list() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name) order by w.created_at),'[]'::jsonb)
  from operation_workspaces w join operation_members m on m.workspace_id=w.id where m.user_id=auth.uid();
$$;

create function public.workspace_get(workspace_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m operation_members; d jsonb; privileged boolean; u text[];
begin
  select * into m from operation_members where operation_members.workspace_id=workspace_get.workspace_id and user_id=auth.uid();
  if not found then raise exception 'Sem acesso a esta empresa.'; end if;
  privileged:=m.role in ('admin','manager'); u:=m.unit_ids;
  select payload||jsonb_build_object('id',id::text) into d from operation_workspaces where id=workspace_get.workspace_id;
  d:=d||jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',name,'email',email,'role',role,'unitIds',unit_ids)) from operation_members where operation_members.workspace_id=workspace_get.workspace_id and (privileged or user_id=auth.uid())),'[]'::jsonb));
  if not privileged then
    d:=jsonb_set(d,'{units}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'units') x where x->>'id'=any(u)),'[]'::jsonb));
    d:=jsonb_set(d,'{orders}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'orders') x where x->>'sourceId'=any(u) or x->>'destinationId'=any(u)),'[]'::jsonb));
    d:=jsonb_set(d,'{counts}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'counts') x where x->>'unitId'=any(u)),'[]'::jsonb));
    -- Other unit names are needed for requesting supplies; return minimal names as reference.
    d:=d||jsonb_build_object('referenceUnits',(select payload->'units' from operation_workspaces where id=workspace_get.workspace_id));
  end if;
  d:=d||jsonb_build_object('events',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'at',a.created_at,'actor',a.actor,'action',a.action,'detail',a.detail,'unitIds',a.unit_ids) order by a.created_at desc) from (select * from operation_audit where operation_audit.workspace_id=workspace_get.workspace_id and (privileged or unit_ids && u) order by created_at desc limit 500) a),'[]'::jsonb));
  return d;
end $$;

create function public.workspace_apply(workspace_id uuid, operation jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m operation_members; d jsonb; typ text:=operation->>'type'; rec jsonb; collection text;
  privileged boolean; target text; o jsonb; idx integer; line jsonb; p jsonb; route jsonb;
  lines jsonb:='[]'; n numeric; requested numeric; prep numeric; divergence boolean:=false;
  ids text[]:='{}'; action_name text; detail text:=''; unit text; item record;
begin
  select * into m from operation_members where operation_members.workspace_id=workspace_apply.workspace_id and user_id=auth.uid();
  if not found then raise exception 'Sem acesso a esta empresa.'; end if;
  privileged:=m.role in ('admin','manager');
  select payload into d from operation_workspaces where id=workspace_apply.workspace_id for update;
  if typ like 'save_%' then
    if not privileged then raise exception 'Apenas gestores podem alterar cadastros.'; end if;
    rec:=operation->'record'; target:=rec->>'id';
    if typ='save_settings' then
      if length(trim(rec->>'brand')) not between 1 and 160 or not (rec->>'primary' ~ '^#[0-9a-fA-F]{6}$') or not (rec->>'accent' ~ '^#[0-9a-fA-F]{6}$') then raise exception 'Identidade inválida.'; end if;
      d:=jsonb_set(d,'{settings}',jsonb_build_object('brand',rec->>'brand','primary',rec->>'primary','accent',rec->>'accent','whatsapp',coalesce(rec->>'whatsapp',''),'losses',false));
      action_name:='Configurações atualizadas';
    elsif typ='save_person' then
      if m.role<>'admin' then raise exception 'Apenas administradores gerenciam acessos.'; end if;
      if target=auth.uid()::text then raise exception 'O administrador não pode alterar o próprio acesso por este formulário.'; end if;
      if rec->>'role' not in ('admin','manager','attendant','kitchen','driver') then raise exception 'Perfil inválido.'; end if;
      if not exists(select 1 from auth.users where id=target::uuid and lower(email)=lower(rec->>'email')) then raise exception 'Crie a conta no Supabase Auth e confira UUID/e-mail.'; end if;
      if exists(select 1 from jsonb_array_elements_text(rec->'unitIds') j where not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=j)) then raise exception 'Unidade inválida.'; end if;
      insert into operation_members(workspace_id,user_id,name,email,role,unit_ids) values(workspace_apply.workspace_id,target::uuid,rec->>'name',rec->>'email',rec->>'role',array(select jsonb_array_elements_text(rec->'unitIds')))
      on conflict on constraint operation_members_pkey do update set name=excluded.name,email=excluded.email,role=excluded.role,unit_ids=excluded.unit_ids;
      action_name:='Acesso cadastrado/atualizado'; detail:=rec->>'email';
    else
      collection:=case typ when 'save_unit' then 'units' when 'save_sector' then 'sectors' when 'save_route' then 'routes' when 'save_category' then 'categories' when 'save_erp' then 'erpProducts' when 'save_product' then 'products' when 'save_routine' then 'routines' end;
      if collection is null then raise exception 'Cadastro desconhecido.'; end if;
      if coalesce(length(target),0)=0 or length(trim(rec->>'name')) not between 1 and 160 then raise exception 'Preencha o nome e identificador.'; end if;
      if typ='save_sector' and not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=rec->>'unitId') then raise exception 'Unidade inválida.'; end if;
      if typ='save_route' and (rec->>'mode' not in ('separation','production') or coalesce(length(trim(rec->>'printTitle')),0)=0) then raise exception 'Atendimento inválido.'; end if;
      if typ='save_product' then
        if not exists(select 1 from jsonb_array_elements(d->'routes') x where x->>'id'=rec->>'routeId') or not exists(select 1 from jsonb_array_elements(d->'sectors') x where x->>'id'=rec->>'sectorId') or not exists(select 1 from jsonb_array_elements(d->'categories') x where x->>'name'=rec->>'category') then raise exception 'Confira categoria, atendimento e setor.'; end if;
        if coalesce((rec->>'packSize')::numeric,0) not between 1 and 1000000 or coalesce((rec->>'erpFactor')::numeric,0) not between 0.001 and 1000000 or coalesce(length(rec->>'unit'),0)=0 then raise exception 'Embalagem ou conversão inválida.'; end if;
        if coalesce(rec->>'erpProductId','')<>'' and not exists(select 1 from jsonb_array_elements(d->'erpProducts') x where x->>'id'=rec->>'erpProductId') then raise exception 'Produto ERP inválido.'; end if;
      end if;
      if typ='save_routine' and (rec->>'unitId'=rec->>'sourceId' or not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=rec->>'unitId') or not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=rec->>'sourceId') or not (rec->>'cutoff' ~ '^\d{2}:\d{2}$') or not (rec->>'delivery' ~ '^\d{2}:\d{2}$')) then raise exception 'Rotina inválida.'; end if;
      if typ='save_category' then
        select x into p from jsonb_array_elements(d->'categories') x where x->>'id'=target;
        if p is not null then d:=jsonb_set(d,'{products}',coalesce((select jsonb_agg(case when x->>'category'=p->>'name' then jsonb_set(x,'{category}',rec->'name') else x end) from jsonb_array_elements(d->'products') x),'[]'::jsonb)); end if;
      end if;
      d:=jsonb_set(d,array[collection],coalesce((select jsonb_agg(x) from jsonb_array_elements(d->collection) x where x->>'id'<>target),'[]'::jsonb)||jsonb_build_array(rec));
      action_name:='Cadastro atualizado: '||collection; detail:=rec->>'name';
    end if;
  elsif typ='create_order' then
    if m.role not in ('admin','manager','attendant') then raise exception 'Perfil sem permissão para solicitar.'; end if;
    o:=operation->'order';
    if not privileged and not (o->>'destinationId'=any(m.unit_ids)) then raise exception 'Destino fora das unidades autorizadas.'; end if;
    if o->>'sourceId'=o->>'destinationId' then raise exception 'Origem e destino devem ser diferentes.'; end if;
    if not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=o->>'sourceId' and (x->>'active')::boolean) or not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=o->>'destinationId' and (x->>'active')::boolean) then raise exception 'Unidades inválidas.'; end if;
    if coalesce(jsonb_array_length(o->'lines'),0)=0 then raise exception 'Pedido vazio.'; end if;
    if (select count(*) from jsonb_array_elements(o->'lines'))<>(select count(distinct x->>'productId') from jsonb_array_elements(o->'lines') x) then raise exception 'Produto duplicado.'; end if;
    for line in select * from jsonb_array_elements(o->'lines') loop
      select x into p from jsonb_array_elements(d->'products') x where x->>'id'=line->>'productId' and (x->>'active')::boolean;
      if p is null then raise exception 'Produto indisponível.'; end if;
      n:=(line->>'requested')::numeric; if n is null or n<=0 or n>1000000 then raise exception 'Quantidade inválida.'; end if;
      select x into route from jsonb_array_elements(d->'routes') x where x->>'id'=p->>'routeId';
      if not exists(select 1 from jsonb_array_elements(d->'sectors') x where x->>'id'=p->>'sectorId' and x->>'unitId'=o->>'sourceId') then raise exception 'O setor do produto não pertence à unidade fornecedora.'; end if;
      lines:=lines||jsonb_build_array(jsonb_build_object('productId',p->>'id','name',p->>'name','unit',p->>'unit','kind',route->>'mode','routeId',route->>'id','routeName',route->>'name','sectorId',p->>'sectorId','erpName',coalesce((select x->>'name' from jsonb_array_elements(d->'erpProducts') x where x->>'id'=p->>'erpProductId'),''),'erpFactor',(p->>'erpFactor')::numeric,'requested',n));
    end loop;
    o:=jsonb_build_object('id',gen_random_uuid()::text,'number',lpad((jsonb_array_length(d->'orders')+1)::text,4,'0'),'sourceId',o->>'sourceId','destinationId',o->>'destinationId','due',(o->>'due')::timestamptz,'ready',o->>'ready','note',coalesce(o->>'note',''),'status','requested','createdAt',now(),'actor',m.name,'createdBy',auth.uid(),'divergence',false,'lines',lines);
    -- Retain a valid client UUID so navigation can immediately select the new order.
    o:=jsonb_set(o,'{id}',to_jsonb(((operation->'order'->>'id')::uuid)::text));
    if exists(select 1 from jsonb_array_elements(d->'orders') x where x->>'id'=o->>'id') then raise exception 'Pedido já registrado.'; end if;
    d:=jsonb_set(d,'{orders}',jsonb_build_array(o)||(d->'orders')); ids:=array[o->>'sourceId',o->>'destinationId']; action_name:='Pedido solicitado'; detail:=o->>'number';
  elsif typ='count' then
    if m.role not in ('admin','manager','attendant') then raise exception 'Perfil sem permissão para contar.'; end if;
    rec:=operation->'count'; unit:=rec->>'unitId';
    if not privileged and not unit=any(m.unit_ids) then raise exception 'Unidade não autorizada.'; end if;
    if not exists(select 1 from jsonb_array_elements(d->'units') x where x->>'id'=unit) or coalesce(jsonb_array_length(rec->'lines'),0)=0 then raise exception 'Contagem inválida.'; end if;
    if (select count(*) from jsonb_array_elements(rec->'lines'))<>(select count(distinct x->>'productId') from jsonb_array_elements(rec->'lines') x) then raise exception 'Produto duplicado na contagem.'; end if;
    for line in select * from jsonb_array_elements(rec->'lines') loop
      if not exists(select 1 from jsonb_array_elements(d->'products') x where x->>'id'=line->>'productId') then raise exception 'Produto inválido.'; end if;
      if coalesce((line->>'closed')::numeric,-1) not between 0 and 1000000 or coalesce((line->>'opened')::numeric,-1) not between 0 and 1 or coalesce((line->>'loose')::numeric,-1) not between 0 and 1000000 then raise exception 'Quantidade inválida.'; end if;
      if (line->>'closed')::numeric<>trunc((line->>'closed')::numeric) or (line->>'loose')::numeric<>trunc((line->>'loose')::numeric) then raise exception 'Embalagens fechadas e avulsos devem ser inteiros.'; end if;
      if (line->>'opened')::numeric>0 and not exists(select 1 from jsonb_array_elements(d->'products') x where x->>'id'=line->>'productId' and (x->>'fractions')::boolean) then raise exception 'Este produto não permite frações.'; end if;
    end loop;
    rec:=jsonb_build_object('id',gen_random_uuid(),'unitId',unit,'lines',rec->'lines','actor',m.name,'createdAt',now());
    d:=jsonb_set(d,'{counts}',jsonb_build_array(rec)||(d->'counts')); ids:=array[unit]; action_name:='Contagem registrada'; detail:=jsonb_array_length(rec->'lines')||' produtos';
  elsif typ in ('prepare','dispatch','receive','resolve','mark_erp') then
    select x.value,x.ordinality::integer-1 into o,idx from jsonb_array_elements(d->'orders') with ordinality x where x.value->>'id'=operation->>'id';
    if o is null then raise exception 'Pedido não encontrado.'; end if;
    ids:=array[o->>'sourceId',o->>'destinationId']; detail:=o->>'number';
    if typ in ('prepare','dispatch') and not privileged and not o->>'sourceId'=any(m.unit_ids) then raise exception 'Origem não autorizada.'; end if;
    if typ='prepare' then
      if m.role not in ('admin','manager','attendant','kitchen') or o->>'status' not in ('requested','preparing') then raise exception 'Preparação indisponível.'; end if;
      for line in select * from jsonb_array_elements(o->'lines') loop
        n:=(operation->'amounts'->>(line->>'productId'))::numeric; if n is null or n<0 or n>1000000 then raise exception 'Quantidade inválida.'; end if;
        lines:=lines||jsonb_build_array(line||jsonb_build_object('prepared',n));
      end loop;
      o:=o||jsonb_build_object('lines',lines,'status','preparing'); action_name:='Preparação registrada';
    elsif typ='dispatch' then
      if m.role not in ('admin','manager','attendant','driver') or o->>'status'<>'preparing' or coalesce(length(trim(operation->>'driver')),0)=0 or (operation->>'volumes')::numeric<1 then raise exception 'Confira preparação, entregador e volumes.'; end if;
      o:=o||jsonb_build_object('status','dispatched','dispatchedAt',now(),'dispatchedBy',auth.uid(),'driver',operation->>'driver','volumes',operation->>'volumes','seals',operation->>'seals'); action_name:='Retirada registrada';
    elsif typ='receive' then
      if m.role not in ('admin','manager','attendant') or o->>'status'<>'dispatched' then raise exception 'Recebimento indisponível.'; end if;
      if not privileged and not o->>'destinationId'=any(m.unit_ids) then raise exception 'Destino não autorizado.'; end if;
      for line in select * from jsonb_array_elements(o->'lines') loop
        n:=(operation->'amounts'->>(line->>'productId'))::numeric;
        if n is null or n<0 or n>1000000 then raise exception 'Informe a quantidade recebida de todos os produtos.'; end if;
        if n<>(line->>'prepared')::numeric then divergence:=true; end if;
        lines:=lines||jsonb_build_array(line||jsonb_build_object('received',n));
      end loop;
      for item in select key,value from jsonb_each_text(operation->'amounts') loop
        n:=item.value::numeric;
        if n<0 or n>1000000 then raise exception 'Quantidade inválida.'; end if;
        if n>0 and not exists(select 1 from jsonb_array_elements(o->'lines') x where x->>'productId'=item.key) then
          select x into p from jsonb_array_elements(d->'products') x where x->>'id'=item.key;
          if p is null then raise exception 'Produto extra não cadastrado.'; end if;
          select x into route from jsonb_array_elements(d->'routes') x where x->>'id'=p->>'routeId';
          lines:=lines||jsonb_build_array(jsonb_build_object('productId',p->>'id','name',p->>'name','unit',p->>'unit','kind',route->>'mode','routeId',route->>'id','routeName',route->>'name','sectorId',p->>'sectorId','erpName',coalesce((select x->>'name' from jsonb_array_elements(d->'erpProducts') x where x->>'id'=p->>'erpProductId'),''),'erpFactor',(p->>'erpFactor')::numeric,'requested',0,'prepared',0,'received',n)); divergence:=true;
        end if;
      end loop;
      if divergence and coalesce(length(trim(operation->>'note')),0)=0 then raise exception 'Descreva a divergência.'; end if;
      o:=o||jsonb_build_object('lines',lines,'status','received','receivedAt',now(),'receivedBy',auth.uid(),'receiptNote',operation->>'note','divergence',divergence); action_name:='Recebimento conferido';
    elsif typ='resolve' then
      if not privileged or not (o->>'divergence')::boolean or o ? 'resolution' or coalesce(length(trim(operation->>'note')),0)=0 then raise exception 'Resolução indisponível.'; end if;
      if o->>'receivedBy'=auth.uid()::text or o->>'dispatchedBy'=auth.uid()::text then raise exception 'A divergência precisa ser analisada por outro gestor.'; end if;
      o:=o||jsonb_build_object('resolution',operation->>'note','resolvedBy',auth.uid()); action_name:='Divergência analisada';
    elsif typ='mark_erp' then
      if not privileged or o->>'status'<>'received' or o ? 'erpAt' or coalesce(length(trim(operation->>'reference')),0)=0 then raise exception 'Lançamento indisponível ou já confirmado.'; end if;
      if exists(select 1 from jsonb_array_elements(o->'lines') x where coalesce(x->>'erpName','')='') then raise exception 'Há itens sem correspondência no ERP.'; end if;
      o:=o||jsonb_build_object('erpAt',now(),'erpReference',operation->>'reference'); action_name:='Lançamento no ERP confirmado'; detail:=detail||' · ERP: '||(operation->>'reference');
    end if;
    d:=jsonb_set(d,array['orders',idx::text],o);
  else raise exception 'Operação desconhecida.';
  end if;
  update operation_workspaces set payload=d where id=workspace_apply.workspace_id;
  insert into operation_audit(workspace_id,actor_id,actor,action,detail,unit_ids) values(workspace_apply.workspace_id,auth.uid(),m.name,action_name,coalesce(detail,''),ids);
end $$;

revoke all on function public.workspace_create(text) from public,anon;
revoke all on function public.workspace_list() from public,anon;
revoke all on function public.workspace_get(uuid) from public,anon;
revoke all on function public.workspace_apply(uuid,jsonb) from public,anon;
grant execute on function public.workspace_create(text),public.workspace_list(),public.workspace_get(uuid),public.workspace_apply(uuid,jsonb) to authenticated;
