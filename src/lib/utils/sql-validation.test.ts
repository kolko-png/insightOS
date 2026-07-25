import { describe, it, expect } from 'vitest';
import { validateGeneratedSql, UnsafeSqlError } from '@/lib/utils/sql-validation';

describe('validateGeneratedSql', () => {
  it('accepts a well-formed SELECT with a LIMIT', () => {
    const sql = 'select * from REVENUE limit 100';
    expect(validateGeneratedSql(sql)).toBe(sql);
  });

  it('accepts WITH (CTE) statements', () => {
    const sql = 'with recent as (select * from ORDERS) select * from recent limit 10';
    expect(() => validateGeneratedSql(sql)).not.toThrow();
  });

  it('auto-appends LIMIT 500 when missing from a non-aggregate query', () => {
    const result = validateGeneratedSql('select * from INVOICES');
    expect(result).toBe('select * from INVOICES limit 500');
  });

  it('does not require LIMIT for a single scalar aggregate', () => {
    const sql = 'select sum(amount) from REVENUE';
    expect(validateGeneratedSql(sql)).toBe(sql);
  });

  it('still requires LIMIT for an aggregate with GROUP BY', () => {
    const result = validateGeneratedSql('select sum(amount) from REVENUE group by source');
    expect(result).toContain('limit 500');
  });

  it.each([
    'insert into REVENUE (amount) values (100)',
    'update REVENUE set amount = 0',
    'delete from REVENUE',
    'drop table REVENUE',
    'alter table REVENUE add column x int',
    'merge into REVENUE using x on true when matched then update set amount = 1',
    'copy into REVENUE from @stage',
    'grant select on REVENUE to role x',
    'call some_procedure()',
    'truncate table REVENUE',
  ])('rejects a disallowed statement: %s', (sql) => {
    expect(() => validateGeneratedSql(sql)).toThrow(UnsafeSqlError);
  });

  it('rejects statements that do not start with SELECT or WITH', () => {
    expect(() => validateGeneratedSql('explain select * from REVENUE')).toThrow(UnsafeSqlError);
  });

  it('rejects multiple statements chained with a semicolon', () => {
    expect(() =>
      validateGeneratedSql('select * from REVENUE; drop table REVENUE')
    ).toThrow(UnsafeSqlError);
  });

  it('rejects a query that references no allowlisted table', () => {
    expect(() => validateGeneratedSql('select * from SOME_OTHER_TABLE limit 10')).toThrow(
      UnsafeSqlError
    );
  });

  it('rejects the UNANSWERABLE sentinel with a clear message', () => {
    expect(() => validateGeneratedSql('UNANSWERABLE')).toThrow(UnsafeSqlError);
  });

  it('is case-insensitive when detecting forbidden keywords', () => {
    expect(() => validateGeneratedSql('SELECT * FROM REVENUE; DROP TABLE REVENUE')).toThrow(
      UnsafeSqlError
    );
  });

  it('strips a trailing semicolon rather than rejecting it outright', () => {
    const result = validateGeneratedSql('select * from REVENUE limit 10;');
    expect(result).toBe('select * from REVENUE limit 10');
  });
});
