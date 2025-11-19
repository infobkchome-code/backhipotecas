  // Subida + log documento (versión simplificada)
  const handleUpload = async () => {
    if (!fileToUpload) {
      setDocsMsg('Primero selecciona un archivo.');
      return;
    }
    if (!userId || !caso) {
      setDocsMsg('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setUploading(true);
    setDocsMsg(null);

    try {
      // Nombre "seguro" sin espacios
      const safeName = fileToUpload.name.replace(/\s+/g, '_');
      // Ruta muy sencilla: userId/casoId/nombreArchivo
      const path = `${userId}/${caso.id}/${safeName}`;

      // Subir archivo (upsert: true para evitar error si existe)
      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, fileToUpload, {
          upsert: true,
        });

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        setDocsMsg(
          `No se ha podido subir el documento: ${uploadError.message ?? ''}`
        );
        setUploading(false);
        return;
      }

      // Recargar lista de documentos
      const { data, error: listError } = await supabase.storage
        .from('docs')
        .list(`${userId}/${caso.id}`, {
          limit: 100,
          offset: 0,
        });

      if (listError) {
        console.error('Error recargando docs:', listError);
        setDocsMsg(
          'Documento subido, pero no se pudo refrescar la lista de documentos.'
        );
      } else {
        const mapped: FileItem[] =
          data?.map((f) => ({
            name: f.name,
            created_at: f.created_at ?? null,
          })) ?? [];

        setFiles(mapped);
        setDocsMsg('Documento subido correctamente.');
      }

      setFileToUpload(null);

      // Intentar crear log (si la tabla no existe, no rompe la subida)
      try {
        const { error: logError } = await supabase.from('expediente_logs').insert({
          caso_id: caso.id,
          user_id: userId,
          tipo: 'documento',
          descripcion: `Documento añadido: ${safeName}`,
          visible_cliente: true,
        });

        if (logError) {
          console.error('Error creando log de documento:', logError);
        } else {
          // Recargar logs para que aparezca el movimiento
          const { data: logsData, error: logsReloadError } = await supabase
            .from('expediente_logs')
            .select('id, created_at, tipo, descripcion, visible_cliente')
            .eq('caso_id', caso.id)
            .order('created_at', { ascending: false });

          if (!logsReloadError && logsData) {
            setLogs(logsData as LogItem[]);
          }
        }
      } catch (e) {
        console.error('Error inesperado creando log de documento:', e);
        // No tocamos docsMsg para no liar al usuario
      }
    } catch (err: any) {
      console.error('Error general en subida:', err);
      setDocsMsg('Error inesperado subiendo el documento.');
    } finally {
      setUploading(false);
    }
  };
