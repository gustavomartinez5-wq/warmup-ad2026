-- Carreras que busca cada empresa, para el filtro de /host.
--
-- Salen de leer lo que cada empresa escribió en el Forms (hoja «Catálogo de Empresas»
-- del libro de control) y traducirlo a la lista cerrada de 47 carreras del Tec.
-- El criterio es amplio a propósito: si una empresa pide «Ing. de Calidad», entran
-- IIS, IQ e INA, porque en manufactura se parecen. Si pide «negocios y análisis de
-- datos», entran BGB, LIT, LAE, LAF, LEC e IDM.
--
-- Esto es criterio, no dato duro. Si alguna empresa quedó de más o de menos, se
-- corrige aquí y se vuelve a correr, o a mano desde la ficha de la empresa en la app.
--
-- Pares de siglas que son la misma carrera en planes distintos: IIS/BIE,
-- IMT/BME y LIN/BGB. Se etiquetan las dos para que el filtro encuentre a la
-- empresa sin importar cuál traiga el estudiante en su matrícula.

begin;

create temporary table tabla_nueva as
with grupos as (
  select
    -- Todas las ingenierías
    array['IAL','IBT','IC','IDM','IDS','IE','IFI','IID','IIS','BIE','IM','IMA',
          'IMD','IMT','BME','INA','IQ','IQA','IRS','ISD','ITC','ITD']          as ing,
    -- Las de piso de manufactura: cuando dicen «ingeniería» y son una planta
    array['IIS','BIE','IM','IMA','IMT','BME','IE','IFI','IQ','IQA','INA',
          'IRS','ISD','IID']                                                   as manuf,
    -- Tecnología, software y datos
    array['ITC','ITD','ISD','IRS','IDM','IFI']                                 as tec,
    -- Negocios y administrativas
    array['LAE','LAF','LCPF','LDE','LDO','LEM','LIN','BGB','LIT']              as neg,
    -- Todo el catálogo
    array['ARQ','BGB','BIE','BME','IAL','IBT','IC','IDM','IDS','IE','IFI','IID',
          'IIS','IM','IMA','IMD','IMT','INA','IQ','IQA','IRS','ISD','ITC','ITD',
          'LAD','LAE','LAF','LBC','LC','LCPF','LDE','LDI','LDO','LEC','LED',
          'LEI','LEM','LIN','LIT','LLE','LNB','LPE','LPS','LRI','LTM','LTP',
          'LUB']                                                               as todas
),

mapa (empresa, siglas) as (
  select v.empresa, v.siglas from grupos g cross join lateral (values

  ('Ruhrpumpen',               g.manuf),
  ('Vitro',                    g.manuf || array['LAE','LAF','LIN','BGB','LDE','LEM','LIT']),
  ('British American Tobacco', g.ing || g.neg || array['LEC','LED','LRI','LTP','LC','LPE','LLE','LEI','LPS']),
  ('Celekta',                  g.ing || array['LIN','BGB','LRI','LAF','LCPF','LEC','LED','LAE','LDE','LIT']),
  ('BBVA México',              array['LAF','LCPF','LEC','LAE','LIT','LDE']),
  ('Management Solutions',     array['LIN','BGB','LRI','LCPF','LAE','LEC','LAF','LIT',
                                     'IIS','BIE','IQ','IQA','ITD','IMT','BME','ISD','IRS','IDM','IFI','ITC','IID']),
  ('Growth & Profit Consulting', g.ing || g.neg || array['LEC']),
  ('EY',                       array['LCPF','LAF','LED','LEC','ITC','ITD','IDM']),
  ('Redwood Logistics',        array['LIN','BGB','LRI','LAF','LCPF','LAE','LDE','IIS','BIE']),
  ('Farmacias del Ahorro',     array['LAE','LDE','LEM','LIN','BGB','LIT','LAF',
                                     'IDM','ITC','ITD','IIS','BIE','IID','ISD']),
  ('Cemex',                    g.ing || g.neg),
  ('PwC',                      array['LCPF','LAF','LEC','LAE','LIT']),
  ('SAP',                      g.tec || g.neg),
  ('Logrand',                  g.neg),
  ('Ragasa',                   g.ing),
  ('HEB México',               array['IQ','IQA','IAL','IBT','IIS','BIE','ITC','ITD','IDM',
                                     'LAF','LCPF','LEM','LAE','LIN','BGB','LIT','LC']),
  ('Celestica',                g.ing),
  ('SLB',                      array['IM','IMA','IMT','BME','INA','IIS','BIE','IFI','IE']),
  ('Cydsa',                    array['LCPF','LAF','LAE','IQ','IQA','IIS','BIE']),
  ('Areya',                    array['ARQ','IC','LUB','LDI']),
  ('Fastenal',                 g.ing || array['LAF','LCPF','LAE']),
  ('Delphus Consulting',       g.ing || g.neg || array['LEC']),
  -- «Todas las carreras menos Arquitectura»
  ('OmniSource Mexico',        array(select unnest(g.todas) except select unnest(array['ARQ','LUB']))),
  ('Definity',                 array['ITC','ITD','ISD','IRS','IDM','IIS','BIE','LAE','LEM','LDI','LAD','LIT']),
  ('Index Nuevo León',         g.todas),
  ('Unitivida',                g.neg || array['LEC','LAF']),
  ('London Consulting Group',  g.ing),
  ('Schneider Electric',       array['IIS','BIE','IMT','BME','IM','IMA','IE','IRS','ISD','IFI','LIN','BGB']),
  ('Iconn',                    array['LED','LAF','LCPF','LAE','LEM','LIN','BGB','LDE','LIT','LRI','IIS','BIE']),
  ('Goldco',                   g.todas),
  ('Caterpillar México',       g.ing || array['LAE','LDE','LAF','LIN','BGB']),
  ('Clarios',                  array['IE','IMT','BME','IRS','ISD','ITC','IDM','IM','IMA','IFI','INA']),
  ('Johnson Controls',         array['IMT','BME','IM','IMA','IE','IRS','ISD','IIS','BIE','IDS','IFI']),
  ('COPARMEX',                 g.ing || g.neg || array['LEC','LED','LTP']),
  ('Data IQ',                  array['IDM','ITC','ITD','ISD','IFI','LIT','LAE']),
  ('Capital Becarios',         g.neg || array['ITC','ITD']),
  ('ZF',                       g.manuf || array['LAF','LAE','LDO','LC','LEM','LIN','BGB','LCPF','LDE','LIT','ITC']),
  ('The Home Depot México',    g.ing || g.neg || array['LRI','LED']),
  ('CHUBB',                    array['ITC','ITD','ISD','IRS','IDM','IFI']),
  ('Tecnológico de Monterrey', array['LRI','LTP','LC','LAE','LDE','LDO','LEI','IQ','IQA','IIS','BIE']),
  ('Farmacias Benavides',      g.ing || array['LAF','LCPF','LRI','LAE','LDE']),
  ('Pro Meritum',              g.ing || g.neg || array['LEC']),
  ('Apex Systems',             g.ing || array['LAE','LDE']),
  ('P&G',                      g.ing || g.neg),
  ('KATCON',                   array['IM','IMA','IIS','BIE','IMT','BME','LDI','ITC','ISD','IRS','IE']),
  ('Steelcase',                g.ing || g.neg || array['ARQ','LUB','LDI','LAD','LPS']),
  ('GE Vernova',               array['IM','IMA','IMT','BME','IE','IIS','BIE','IRS','ISD','IFI']),
  ('Whirlpool',                g.ing),
  ('Barry Callebaut',          g.ing || array['LIN','BGB','LRI','LAF','LCPF','LAE']),
  ('Banamex',                  array['LAF','LCPF','LEC','LIT','LAE']),
  ('Calidra',                  g.manuf || array['LAE','LDE','LAF','LCPF']),
  ('ABB',                      array['IIS','BIE','IM','IMA','IMT','BME','IID','LIN','BGB','LAE','LDE']),
  ('Danfoss',                  g.manuf || array['ITC','ITD','LIN','BGB','LAF','LCPF','LAE','LEM']),
  ('Heineken México',          g.todas)

  ) as v(empresa, siglas)
),

edicion as (select id from ediciones where activa)

-- El etiquetado se reemplaza completo. Va en dos pasos a propósito: un DELETE y un
-- INSERT dentro del mismo statement verían la misma foto de la tabla, y el borrado
-- se llevaría lo que el insert acaba de poner.
select e.id as empresa_id, s as siglas
  from mapa m
  join edicion ed on true
  join empresas e on e.nombre = m.empresa and e.edicion_id = ed.id
  cross join lateral unnest(m.siglas) as s;

delete from empresa_carreras ec
 using empresas e
 where ec.empresa_id = e.id
   and e.edicion_id = (select id from ediciones where activa);

insert into empresa_carreras (empresa_id, siglas)
select empresa_id, siglas from tabla_nueva
on conflict do nothing;

drop table tabla_nueva;

commit;
