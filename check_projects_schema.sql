-- Query para revisar tablas de projects y columnas con URLs
select column_name, data_type, table_name
from information_schema.columns
where table_name ilike '%project%'
and data_type in ('text', 'varchar', 'jsonb')
order by table_name, ordinal_position;
