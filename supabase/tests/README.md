# Pruebas de las reglas de acceso

Las políticas de RLS y los triggers no se pueden verificar leyendo el código.
O se ejecutan contra un motor real, con un rol que no se salte RLS, o son una
suposición. Esta carpeta ejecuta esa comprobación.

## Cómo correrla

Necesitas un PostgreSQL 15 o superior local. **No toca el proyecto de
Supabase**: monta un espejo desechable en tu propia base.

```bash
psql -X -f supabase/tests/00_espejo.sql -f supabase/tests/01_reglas_asignado.sql
```

Imprime una tabla con un veredicto por caso y termina con `ERROR` si alguno
falla, así que también sirve tal cual en un pipeline.

## Qué hay aquí

| Archivo | Qué hace |
|---|---|
| `00_espejo.sql` | Levanta el espejo. Simula `auth.uid()` y los objetos mínimos de `storage`, y luego **ejecuta los archivos de migración reales** en el orden documentado. |
| `01_reglas_asignado.sql` | 48 casos: los ataques que deben rebotar, el uso normal que no debe romperse, los controles previos que deben seguir aguantando, y la higiene de las funciones `SECURITY DEFINER`. |

El espejo corre los archivos reales con `\ir`, no una copia de su contenido.
Es deliberado: una copia se desincroniza y entonces la suite pasa mientras el
sistema falla, que es peor que no tener suite.

Lo único simulado es lo que Supabase aporta y aquí no existe. `auth.uid()` sale
de una variable de sesión (`demo.uid`), que es lo que permite hacerse pasar por
cada rol dentro de `psql`.

## Por qué `app_user`

Los casos corren como `app_user`, un rol **sin `BYPASSRLS`**, equivalente al
`authenticated` de Supabase. Sin eso las políticas no se evaluarían —el dueño
de una tabla se las salta por omisión— y la suite daría verde sin haber probado
nada.

## Cómo leer un resultado

| Obtenido | Significa |
|---|---|
| `OK` | La sentencia se aplicó y tocó al menos una fila. |
| `CERO` | Se aplicó sin tocar ninguna. **Así es como RLS deniega un `UPDATE`**: filtrando, no lanzando error. |
| `PT001`…`PT005` | Un trigger la rechazó con un código propio del proyecto (ver abajo). |

Un `CERO` donde se esperaba `OK` no es un falso positivo: es una regla que
rompió el flujo de trabajo normal.

## Códigos de error del proyecto

Definidos en `../migrations/reglas_cierre_asignado.sql`, `proteger_ultimo_administrador.sql` y `desactivacion_de_usuarios.sql`. Existen para que la
capa de mensajes del cliente pueda traducirlos sin adivinar por el texto.

| Código | Regla |
|---|---|
| `PT001` | El Asignado solo puede cambiar el estado y la evidencia. |
| `PT002` | Una tarea Hecha solo la reabre un Administrador o Gestor. |
| `PT003` | Sin evidencia no se cierra una tarea que la exige. |
| `PT004` | La evidencia debe pertenecer a la propia tarea. |
| `PT005` | No se quita la evidencia de una tarea ya cerrada. |
| `PT006` | No se puede dejar el sistema sin Administrador activo. |
| `PT007` | Solo un Administrador desactiva o reactiva accesos. |
| `PT008` | Nadie puede desactivar su propio acceso. |
| `PT009` | La persona indicada no existe. |

## Al cambiar una política o un trigger

Agrega el caso aquí en el mismo commit. Y si el cambio es una regla nueva,
agrega también el caso de **uso normal** que podría romper: una regla de
seguridad que estorba en el día a día termina desactivada, y entonces no
protege nada.

## Origen

La suite nació de la auditoría del 2 de septiembre de 2026. Los cuatro casos
del grupo *Ataque* son exploits que en ese momento **funcionaban**: se
reprodujeron contra este mismo espejo antes de existir
`reglas_cierre_asignado.sql`. Están aquí para que no vuelvan.
