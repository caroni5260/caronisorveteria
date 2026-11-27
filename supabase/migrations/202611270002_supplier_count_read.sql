-- Read-only visibility of requesting units' counts for supplier attendants.
-- Does not grant permission to enter or change another unit's count.
create or replace function public.workspace_supplier_counts(workspace_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m operation_members; d jsonb; supply_ids text[]; target_ids text[];
begin
  select * into m from operation_members where operation_members.workspace_id=workspace_supplier_counts.workspace_id and user_id=auth.uid();
  if not found then raise exception 'Sem acesso a esta empresa.'; end if;
  if m.role not in ('admin','manager','attendant') then raise exception 'Perfil sem permissão para consultar contagens das unidades atendidas.'; end if;
  select payload into d from operation_workspaces where id=workspace_supplier_counts.workspace_id;
  if m.role in ('admin','manager') then return jsonb_build_object('counts',d->'counts'); end if;
  select coalesce(array_agg(u->>'id'),'{}') into supply_ids
  from jsonb_array_elements(d->'units') u
  where u->>'id'=any(m.unit_ids) and (u->>'active')::boolean and (
    u->>'operatingProfile'='supply' or (
      coalesce(u->>'operatingProfile','auto') not in ('store','supply')
      and (exists(select 1 from jsonb_array_elements(d->'routines') r where r->>'sourceId'=u->>'id') or exists(select 1 from jsonb_array_elements(d->'orders') o where o->>'sourceId'=u->>'id'))
      and not exists(select 1 from jsonb_array_elements(d->'routines') r where r->>'unitId'=u->>'id')
      and not exists(select 1 from jsonb_array_elements(d->'orders') o where o->>'destinationId'=u->>'id')
    )
  );
  select coalesce(array_agg(distinct target),'{}') into target_ids from (
    select r->>'unitId' target from jsonb_array_elements(d->'routines') r where r->>'sourceId'=any(supply_ids)
    union select o->>'destinationId' target from jsonb_array_elements(d->'orders') o where o->>'sourceId'=any(supply_ids)
  ) related;
  return jsonb_build_object('counts',coalesce((select jsonb_agg(c order by c->>'createdAt' desc) from jsonb_array_elements(d->'counts') c where c->>'unitId'=any(target_ids)),'[]'::jsonb));
end $$;
revoke all on function public.workspace_supplier_counts(uuid) from public,anon;
grant execute on function public.workspace_supplier_counts(uuid) to authenticated;
