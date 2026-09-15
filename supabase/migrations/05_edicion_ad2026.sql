insert into ediciones (nombre, fecha, activa, total_mesas)
values ('Warm Up AD2026', '2026-09-28', true, 74);

-- Las seis franjas, igual que la hoja Cupos del Excel.
insert into cupos (edicion_id, bloque, franja, orden)
select ed.id, f.bloque::bloque_t, f.franja, f.orden
  from ediciones ed,
       (values ('b1', '10:00 – 11:00', 1),
               ('b1', '11:00 – 12:00', 2),
               ('b1', '12:00 – 13:00', 3),
               ('b2', '14:00 – 15:00', 4),
               ('b2', '15:00 – 16:00', 5),
               ('b2', '16:00 – 17:00', 6)) as f(bloque, franja, orden)
 where ed.activa;
