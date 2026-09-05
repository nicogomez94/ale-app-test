import { api } from '../api';

export async function downloadLifeCoupon(id: string) {
  try {
    const blob = await api.lifePolicies.downloadCoupon(id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cuponera.pdf';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error: any) { window.alert(error.message || 'No se pudo descargar la cuponera.'); }
}
