export default function CaseDetail({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-green-900 mb-4">Expediente #{params.id}</h1>
      <p className="text-gray-700">Aquí verás la información detallada y los documentos del caso.</p>
    </main>
  );
}

