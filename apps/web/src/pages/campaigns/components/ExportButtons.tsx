import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  campaignId: string;
}

export default function ExportButtons({ campaignId }: ExportButtonsProps) {
  const handleExport = (type: 'pdf' | 'excel') => {
    if (type === 'pdf') {
      window.print();
    } else {
      alert(`Exporting campaign ${campaignId} to ${type.toUpperCase()}... (Not implemented in backend yet)`);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => handleExport('pdf')}>
        <FileText className="mr-2 h-4 w-4 text-red-600" />
        Export PDF
      </Button>
      <Button variant="outline" onClick={() => handleExport('excel')}>
        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        Export Excel
      </Button>
    </div>
  );
}
