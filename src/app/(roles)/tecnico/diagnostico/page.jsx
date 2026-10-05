import { redirect } from 'next/navigation';

export default function DiagnosticoFallbackPage() {
  redirect('/tecnico/inicio');
}
