-- HML fixtures only. No production names, stock balances, or credentials.
insert into public.stock_positions(id,name,parent_id) values
 ('20000000-0000-4000-8000-000000000001','Armário HML',null),
 ('20000000-0000-4000-8000-000000000002','Prateleira HML','20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000003','Triagem HML','20000000-0000-4000-8000-000000000001')
on conflict(id) do nothing;
insert into public.categories(id,name,preferred_position_id,triage_position_id,triage_on_return) values
 ('30000000-0000-4000-8000-000000000001','Computação HML','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',true),
 ('30000000-0000-4000-8000-000000000002','Conectividade HML',null,null,false)
on conflict(id) do nothing;
insert into public.manufacturers(id,name) values('40000000-0000-4000-8000-000000000001','Fabricante fictício HML') on conflict(id) do nothing;
insert into public.suppliers(id,name,cnpj,address,notes) values('50000000-0000-4000-8000-000000000001','Fornecedor fictício HML','11222333000181','Endereço de teste HML','Dados sintéticos para homologação; não utilizar operacionalmente.') on conflict(id) do nothing;
insert into public.locations(id,name) values('60000000-0000-4000-8000-000000000001','Laboratório HML'),('60000000-0000-4000-8000-000000000002','Gate HML') on conflict(id) do nothing;
