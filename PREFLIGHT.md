# Preflight — lunes 28 de septiembre, 9:00 a.m.

Para leer y palomear, no para descubrir. **Córrelo completo una vez antes**, en seco, para que
el día del evento ya sepas dónde está cada cosa.

Tiempo: unos 15 minutos.

---

## 1 · ¿La base está despierta? · 2 min

Lo primero, porque es lo único que no se arregla en un minuto.

```bash
curl -s https://warmup-ad2026.vercel.app/api/latido
```

Tiene que responder `"vivo":true` con la edición y la fecha. Si responde error o tarda mucho,
**el proyecto se pausó**: entra a supabase.com, abre el proyecto y dale *Resume project*.
Tarda unos minutos. Por eso esto va primero.

## 2 · Limpiar lo que dejaron los ensayos · 1 min

En el editor SQL de Supabase:

```sql
delete from mesas_estado;
```

Si no lo haces, el salón arranca con mesas marcadas de una prueba vieja y los hosts mandan
estudiantes a mesas que nadie ocupa.

## 3 · ¿Las cifras siguen cuadrando? · 2 min

Abre https://warmup-ad2026.vercel.app/admin y mira el Tablero:

| Debe decir | |
|---|---|
| Empresas registradas | 54 |
| Reclutadores Bloque 1 | 70 |
| Reclutadores Bloque 2 | 49 |
| Mesas por conseguir | 0 |
| Empresas sin carreras | 0 |

Si algo no cuadra, alguien reimportó el Excel encima. Revisa en Reclutadores que Celestica
siga con sus dos mesas en Bloque 2 —la 22 y la 23— y nada en Bloque 1.

## 4 · Los tres hosts pueden entrar · 2 min

Que **cada uno** entre desde **su propio celular** a
https://warmup-ad2026.vercel.app/host con la cuenta compartida. No basta con que entre uno.

Si alguien no se sabe la contraseña, ese es el momento de descubrirlo, no a las 10:05.

## 5 · La red del salón, no la de la oficina · 3 min

**Este es el paso que de verdad importa**, y es el único que no se puede hacer desde el
escritorio. Párate en Centrales Norte, con la red de ahí:

- Abre `/host` en un celular. El punto de arriba debe decir **En vivo** en verde.
- Abre `/mesa` en otro celular, elige una mesa cualquiera y marca **Ocupado**.
- En el primer celular, esa mesa debe ponerse azul con el reloj corriendo, **sin recargar**.
- Regresa la mesa a Disponible.

Si el punto dice **Sin conexión**, la señal del salón no alcanza para el tiempo real. La app
sigue sirviendo —los botones escriben igual— pero las pantallas no se actualizan solas y hay
que tocar Recargar. Bueno saberlo antes y avisarle al equipo.

## 6 · El QR impreso · 2 min

Escanea **el acrílico impreso**, no el de la pantalla. Debe abrir la lista de mesas del bloque
que corre según la hora. A las 9:00 la app todavía cree que es Bloque 1; eso está bien.

Comprueba que la lista muestre el estado de cada mesa a la derecha —Disponible, Ocupado— porque
es lo que evita que dos personas de la misma empresa agarren la misma mesa.

## 7 · Deja el teléfono de guardia listo · 1 min

Ten a la mano, en una nota:

- El link de `/admin` y la cuenta compartida.
- Cómo se despausa el proyecto en Supabase.
- Que los cambios de último minuto se hacen desde `/host`, tocando la mesa.

---

## Si algo se cae a media jornada

**Una pantalla parece congelada.** Mira el punto de arriba. Si dice *Sin conexión*, toca
*reconectar*. Si sigue, toca *Recargar*. Los botones de los reclutadores siguen funcionando
aunque el tiempo real esté caído: lo que se pierde es la actualización automática, no los datos.

**Un reclutador dice que su mesa no aparece.** Que toque *Esta no es mi mesa* y busque por
número, no por nombre de empresa. El número está en su acrílico.

**Alguien agarró la mesa equivocada.** Desde `/host`, toca la mesa y corrige el estado. La
pantalla del reclutador se entera sola.

**Todo lo demás.** El Excel sigue siendo el respaldo: nada de lo que pase en la app cambia el
libro de control.
