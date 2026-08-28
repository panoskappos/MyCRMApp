import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, QrCode, X } from "lucide-react";
import type { FireExtinguisher } from "../types";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

interface QrFireExtinguishersProps {
  extinguisher: FireExtinguisher;
  customerName?: string;
  storeName?: string;
  size?: number;
}

export const QrFireExtinguishers: React.FC<QrFireExtinguishersProps> = ({
  extinguisher,
  customerName = "Άγνωστος Πελάτης",
  storeName = "Άγνωστο Κατάστημα",
}) => {
  const [showModal, setShowModal] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Get customerID and storeID from extinguisher
  const customerID = extinguisher.customerID || 'N/A';
  const storeID = extinguisher.storeID || 'N/A';
  const serialNumber = extinguisher.serialNumber || extinguisher.extinguisherID;

  // Calculate next inspection date from the latest active inspection
  const getNextInspection = (): string => {
    if (!extinguisher.inspections || Object.keys(extinguisher.inspections).length === 0) {
      return 'N/A';
    }
    const activeDates = Object.keys(extinguisher.inspections)
      .filter(date => {
        const inspection = extinguisher.inspections[date];
        return inspection.isActive !== false;
      })
      .sort((a, b) => b.localeCompare(a));
    
    if (activeDates.length === 0) return 'N/A';
    
    const lastInspection = extinguisher.inspections[activeDates[0]];
    if (!lastInspection.recheckDate) return 'N/A';
    
    const date = new Date(lastInspection.recheckDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const nextInspection = getNextInspection();

  // Create readable text for QR code
  let qrText = `🔥 ΠΥΡΟΣΒΕΣΤΗΡΑΣ
━━━━━━━━━━━━━━━━━━
Πελάτης: ${customerName} (ID: ${customerID})
Κατάστημα: ${storeName} (ID: ${storeID})

ΣΤΟΙΧΕΙΑ:
• S/N: ${serialNumber}
• Επόμενος Έλεγχος: ${nextInspection}`;

  qrText += `\n━━━━━━━━━━━━━━━━━━`;


  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      
      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, 0, 0, 400, 400);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `QR-${serialNumber}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      });

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${extinguisher.serialNumber || extinguisher.extinguisherID}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 2cm;
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                page-break-after: always;
              }
              .qr-info {
                margin-bottom: 20px;
              }
              .qr-info h2 {
                margin: 5px 0;
                font-size: 20px;
                font-weight: bold;
              }
              .qr-info p {
                margin: 5px 0;
                font-size: 14px;
              }
              .qr-code {
                width: 300px;
                height: 300px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-info">
              <h2>${customerName}</h2>
              <p><strong>ID Πελάτη:</strong> ${customerID}</p>
              <p><strong>Κατάστημα:</strong> ${storeName}</p>
              <p><strong>ID Καταστήματος:</strong> ${storeID}</p>
              <p><strong>S/N:</strong> ${serialNumber}</p>
              <p><strong>Επόμενος Έλεγχος:</strong> ${nextInspection}</p>
            </div>
            <div class="qr-code">${svgData}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
      >
        <QrCode className="h-4 w-4" />
      </Button>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <Card 
            className="w-full max-w-md max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>QR Code Πυροσβεστήρα</CardTitle>
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Display */}
              <div ref={qrRef} className="flex justify-center p-6 bg-white rounded-lg border">
                <QRCodeSVG
                  value={qrText}
                  size={300}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Extinguisher Info */}
              <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Πληροφορίες Πυροσβεστήρα</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Πελάτη:</span>
                    <span className="font-medium">{customerID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Πελάτης:</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Καταστήματος:</span>
                    <span className="font-medium">{storeID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Κατάστημα:</span>
                    <span className="font-medium">{storeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">S/N:</span>
                    <span className="font-medium">{serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Επόμενος Έλεγχος:</span>
                    <span className="font-medium">{nextInspection}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Λήψη PNG
                </Button>
                <Button onClick={handlePrint} variant="default" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Εκτύπωση
                </Button>
              </div>

              {/* Info */}
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-200 break-words">
                <strong>💡 Σάρωση:</strong> Σκανάρετε το QR code με την κάμερα του κινητού σας.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
