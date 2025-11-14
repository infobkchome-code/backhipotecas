import { randomUUID } from 'crypto';  // ⬅ Asegúrate de tener esto arriba del archivo

// ...

const seguimientoToken = randomUUID();

const { data, error } = await supabase
  .from('casos')
  .insert([
    {
      user_id_uuid: userId,
      client_id_uuid: clientId,
      titulo,
      estado: 'en_estudio',
      progreso: 0,
      notas_internas: notas || '',
      seguimiento_token: seguimientoToken,   // ⬅ NUEVO
    },
  ])
  .select()
  .single();
