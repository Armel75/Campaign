import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';


interface ExportButtonsProps {
  campaignId: string;
}


export default function ExportButtons({ campaignId }: ExportButtonsProps) {
  const [, setCampaign] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  // Récupérer les infos de la campagne pour l'export Excel
  useEffect(() => {
    if (!campaignId) return;
    api.get(`/campaigns/${campaignId}`).then(res => {
      setCampaign(res.data?.data || res.data);
    });
  }, [campaignId]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      window.print();
    } else if (type === 'excel') {
      if (!campaignId) return;
      setExporting(true);
      try {
        const response = await api.get(`/campaigns/${campaignId}/export-excel`, {
          responseType: 'blob',
        });
        // Récupérer le nom du fichier depuis l'en-tête
        const disposition = response.headers['content-disposition'];
        let fileName = `campagne_${campaignId}.xlsx`;
        if (disposition) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match) fileName = match[1];
        }
        // Créer un lien de téléchargement
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert('Erreur lors de l\'export Excel.');
      } finally {
        setExporting(false);
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => handleExport('excel')} disabled={exporting}>
        {exporting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin text-green-600" /> Export en cours…</>
        ) : (
          <><FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export Excel</>
        )}
      </Button>
    </div>
  );
}
