use schema INSIGHTOS_DB.ANALYTICS;

create table if not exists PURCHASE_REQUESTS (
  request_id     string primary key,
  workspace_key  string not null,
  sku            string,
  supplier_id    string,
  quantity       number,
  status         string default 'draft', -- draft, sent, fulfilled, cancelled
  created_by     string default 'automation', -- workflow id
  created_at     timestamp_ntz default current_timestamp()
);

alter table PURCHASE_REQUESTS
  add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);

use schema INSIGHTOS_DB.SECURITY;

create or replace procedure PROVISION_WORKSPACE(WORKSPACE_KEY string)
returns string
language sql
execute as owner
as
$$
begin
  let role_name string := 'WORKSPACE_' || upper(workspace_key) || '_ROLE';

  execute immediate 'create role if not exists ' || role_name;
  execute immediate 'grant role ' || role_name || ' to role INSIGHTOS_APP_RUNTIME';
  execute immediate 'grant usage on database INSIGHTOS_DB to role ' || role_name;

  execute immediate 'grant usage on schema INSIGHTOS_DB.ANALYTICS to role ' || role_name;
  execute immediate 'grant select, insert, update on all tables in schema INSIGHTOS_DB.ANALYTICS to role ' || role_name;
  -- THE FIX — covers PURCHASE_REQUESTS and any table added after this point.
  execute immediate 'grant select, insert, update on future tables in schema INSIGHTOS_DB.ANALYTICS to role ' || role_name;

  execute immediate 'grant usage on schema INSIGHTOS_DB.AI to role ' || role_name;
  execute immediate 'grant select, insert on table INSIGHTOS_DB.AI.DOCUMENT_CHUNKS to role ' || role_name;
  execute immediate 'grant select, insert on future tables in schema INSIGHTOS_DB.AI to role ' || role_name;
  execute immediate 'grant read, write on stage INSIGHTOS_DB.AI.DOCUMENT_STAGE to role ' || role_name;

  execute immediate 'grant database role SNOWFLAKE.CORTEX_USER to role ' || role_name;

  insert into INSIGHTOS_DB.SECURITY.WORKSPACE_ROLE_MAP (snowflake_role, workspace_key)
  values (role_name, workspace_key);

  return role_name;
end;
$$;

grant usage on procedure PROVISION_WORKSPACE(string) to role INSIGHTOS_APP_RUNTIME;


declare
  workspace_role_cursor cursor for
    select snowflake_role from INSIGHTOS_DB.SECURITY.WORKSPACE_ROLE_MAP;
begin
  for record in workspace_role_cursor do
    execute immediate 'grant select, insert, update on table INSIGHTOS_DB.ANALYTICS.PURCHASE_REQUESTS to role ' || record.snowflake_role;
    execute immediate 'grant select, insert, update on future tables in schema INSIGHTOS_DB.ANALYTICS to role ' || record.snowflake_role;
    execute immediate 'grant select, insert on future tables in schema INSIGHTOS_DB.AI to role ' || record.snowflake_role;
  end for;
end;
