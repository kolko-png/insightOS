create database if not exists INSIGHTOS_DB;

create schema if not exists INSIGHTOS_DB.ANALYTICS;  
create schema if not exists INSIGHTOS_DB.AI;          
create schema if not exists INSIGHTOS_DB.SECURITY;    

create warehouse if not exists INSIGHTOS_WH_INTERACTIVE
  warehouse_size = 'XSMALL'
  auto_suspend = 60
  auto_resume = true
  initially_suspended = true
  comment = 'Dashboard queries, NL->SQL, chat retrieval';

create warehouse if not exists INSIGHTOS_WH_INGEST
  warehouse_size = 'SMALL'
  auto_suspend = 120
  auto_resume = true
  initially_suspended = true
  comment = 'Document embedding batches, scheduled ETL, report generation';


use schema INSIGHTOS_DB.SECURITY;

create table if not exists WORKSPACE_ROLE_MAP (
  snowflake_role   string primary key,   
  workspace_key    string not null,      
  created_at       timestamp_ntz default current_timestamp()
);

create or replace row access policy WORKSPACE_ISOLATION
  as (workspace_key string) returns boolean ->
  exists (
    select 1 from INSIGHTOS_DB.SECURITY.WORKSPACE_ROLE_MAP m
    where m.snowflake_role = current_role()
      and m.workspace_key = workspace_key
  );


use schema INSIGHTOS_DB.ANALYTICS;

create table if not exists REVENUE (
  revenue_id     string primary key,
  workspace_key  string not null,
  amount         number(18,2) not null,
  currency       string default 'USD',
  source         string,          
  recorded_at    date not null,
  created_at     timestamp_ntz default current_timestamp()
);

create table if not exists EXPENSES (
  expense_id     string primary key,
  workspace_key  string not null,
  amount         number(18,2) not null,
  category       string,
  vendor         string,
  recorded_at    date not null,
  created_at     timestamp_ntz default current_timestamp()
);

create table if not exists ORDERS (
  order_id       string primary key,
  workspace_key  string not null,
  customer_id    string,
  status         string,
  total_amount   number(18,2),
  ordered_at     timestamp_ntz,
  fulfilled_at   timestamp_ntz
);

create table if not exists CUSTOMERS (
  customer_id      string primary key,
  workspace_key    string not null,
  name             string,
  segment          string,
  lifetime_value   number(18,2),
  created_at       timestamp_ntz default current_timestamp()
);

create table if not exists SUPPLIERS (
  supplier_id         string primary key,
  workspace_key       string not null,
  name                string,
  reliability_score   number(5,2),
  contact_email       string
);

create table if not exists INVENTORY (
  sku                 string,
  workspace_key       string not null,
  product_name        string,
  quantity_on_hand    number,
  reorder_threshold   number,
  supplier_id         string,
  updated_at          timestamp_ntz default current_timestamp(),
  primary key (sku, workspace_key)
);

create table if not exists INVOICES (
  invoice_id      string primary key,
  workspace_key   string not null,
  customer_id     string,
  amount          number(18,2),
  status          string,  
  issued_at       date,
  due_at          date
);


alter table REVENUE   add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table EXPENSES  add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table ORDERS    add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table CUSTOMERS add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table SUPPLIERS add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table INVENTORY add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);
alter table INVOICES  add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);


use schema INSIGHTOS_DB.AI;

create stage if not exists DOCUMENT_STAGE
  directory = (enable = true)
  encryption = (type = 'SNOWFLAKE_SSE')
  comment = 'Landing zone for uploaded PDF/CSV/XLSX/DOCX before parsing + embedding';

create table if not exists DOCUMENT_CHUNKS (
  chunk_id       string primary key default uuid_string(),
  workspace_key  string not null,
  document_id    string not null,        
  chunk_index    number,
  content        string,
  embedding      vector(float, 768),     
  metadata       variant,                
  created_at     timestamp_ntz default current_timestamp()
);

alter table DOCUMENT_CHUNKS add row access policy INSIGHTOS_DB.SECURITY.WORKSPACE_ISOLATION on (workspace_key);


create or replace cortex search service INSIGHTOS_DOCUMENT_SEARCH
  on content
  attributes workspace_key, document_id, metadata
  warehouse = INSIGHTOS_WH_INTERACTIVE
  target_lag = '5 minutes'
  as (
    select chunk_id, workspace_key, document_id, content, metadata
    from DOCUMENT_CHUNKS
  );
