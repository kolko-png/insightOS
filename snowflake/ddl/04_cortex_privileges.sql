use schema INSIGHTOS_DB.SECURITY;


grant database role SNOWFLAKE.CORTEX_USER to role INSIGHTOS_PROVISIONER;

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
  execute immediate 'grant usage on schema INSIGHTOS_DB.AI to role ' || role_name;
  execute immediate 'grant select, insert on table INSIGHTOS_DB.AI.DOCUMENT_CHUNKS to role ' || role_name;
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
    execute immediate 'grant database role SNOWFLAKE.CORTEX_USER to role ' || record.snowflake_role;
  end for;
end;
