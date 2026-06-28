import jsPDF from 'jspdf';
import { type Invoice } from '../db/db';

// Helper to format numeric values to Indian standard representation (e.g. 13,250.00)
function formatIndianNumber(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(val));
}

// Helper to write formatted currency with native Rupee symbol using the registered Unicode Roboto font.
function writeCurrencyText(
  doc: jsPDF,
  val: number,
  x: number,
  y: number,
  fontSize: number = 9,
  showSign: boolean = false
) {
  // Switch to Unicode font for rendering the ₹ symbol
  doc.setFont("Roboto", "normal");
  doc.setFontSize(fontSize);

  const formattedVal = formatIndianNumber(val);
  let prefix = '';
  if (showSign) {
    prefix = val < 0 ? '-' : val > 0 ? '+' : '';
  }

  const textToDraw = prefix ? `${prefix}₹${formattedVal}` : `₹${formattedVal}`;
  doc.text(textToDraw, x, y, { align: 'right' });
}

export async function downloadInvoicePDF(inv: Invoice, shopDetails: Record<string, any>) {
  // Dynamically load the base64-encoded Roboto font module to prevent large initial bundle sizes
  const { robotoBase64 } = await import('../assets/robotoBase64');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register Roboto regular font in VFS
  doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

  // Determine if it is a GST or Non-GST invoice (defaulting to true if undefined and tax is present)
  const isGst = inv.isGst !== undefined ? inv.isGst : (inv.gstTotal > 0);
  const businessGstin = isGst ? (inv.billingGstin || shopDetails.gstin) : '';

  const primaryColor = [37, 99, 235]; // Royal Blue
  const darkGray = [31, 41, 55];
  const lightGray = [243, 244, 246];

  // Helper functions for layouts
  const drawLine = (y: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
  };

  // --- Header ---
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(shopDetails.businessName || 'SMARTBILL ELECTRICALS', 15, 20);

  // Display GSTIN if applicable
  if (isGst && businessGstin) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`GSTIN: ${businessGstin}`, 15, 25);
  }
  
  // Shop Details right aligned
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const addressLines = doc.splitTextToSize(shopDetails.address || '', 75);
  doc.text(addressLines, 120, 20);
  doc.text(`Phone: ${shopDetails.phone || ''}`, 120, 20 + (addressLines.length * 4.5));

  drawLine(38);

  // --- Invoice Info & Customer Details ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INVOICE TO:', 15, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${inv.customerName}`, 15, 51);
  doc.text(`Phone: ${inv.customerPhone}`, 15, 56);

  // Invoice Metadata right aligned
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE NO: ${inv.invoiceNumber}`, 120, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(inv.dateTime).toLocaleDateString('en-IN')}`, 120, 51);
  doc.text(`Time: ${new Date(inv.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 120, 56);
  doc.text(`Payment Mode: ${inv.paymentMode}`, 120, 61);

  drawLine(66);

  // --- Table Headers ---
  let y = 74;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y - 5, 180, 7.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  doc.text('S.No', 17, y);
  doc.text('Product Description', 30, y);

  // Adjust table layout columns based on GST selection
  if (isGst) {
    doc.text('Qty', 105, y, { align: 'right' });
    doc.text('Rate', 125, y, { align: 'right' });
    doc.text('GST %', 145, y, { align: 'right' });
    doc.text('Total (incl. GST)', 190, y, { align: 'right' });
  } else {
    doc.text('Qty', 115, y, { align: 'right' });
    doc.text('Rate', 145, y, { align: 'right' });
    doc.text('Total Amount', 190, y, { align: 'right' });
  }

  // --- Table Items ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 7;

  inv.items.forEach((item, index) => {
    // Check page height limit
    if (y > 230) {
      doc.addPage();
      y = 25; // Reset y
      // Re-draw headers
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(15, y - 5, 180, 7.5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text('S.No', 17, y);
      doc.text('Product Description', 30, y);
      
      if (isGst) {
        doc.text('Qty', 105, y, { align: 'right' });
        doc.text('Rate', 125, y, { align: 'right' });
        doc.text('GST %', 145, y, { align: 'right' });
        doc.text('Total (incl. GST)', 190, y, { align: 'right' });
      } else {
        doc.text('Qty', 115, y, { align: 'right' });
        doc.text('Rate', 145, y, { align: 'right' });
        doc.text('Total Amount', 190, y, { align: 'right' });
      }
      
      doc.setFont('helvetica', 'normal');
      y += 7;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(String(index + 1), 17, y);
    
    // Description width can expand if GST column is hidden
    const descWidth = isGst ? 70 : 80;
    const prodNameLines = doc.splitTextToSize(item.productName, descWidth);
    doc.text(prodNameLines, 30, y);
    
    if (isGst) {
      doc.text(`${item.quantity} ${item.unit}`, 105, y, { align: 'right' });
      writeCurrencyText(doc, item.sellingPrice, 125, y, 9);
      doc.setFont('helvetica', 'normal'); // restore helvetica
      doc.text(`${item.gstRate}%`, 145, y, { align: 'right' });
      writeCurrencyText(doc, item.subtotal, 190, y, 9);
    } else {
      doc.text(`${item.quantity} ${item.unit}`, 115, y, { align: 'right' });
      writeCurrencyText(doc, item.sellingPrice, 145, y, 9);
      writeCurrencyText(doc, item.subtotal, 190, y, 9);
    }

    y += Math.max(prodNameLines.length * 4.5, 6);
  });

  drawLine(y - 2);
  y += 6;

  // --- Totals ---
  if (y > 220) {
    doc.addPage();
    y = 25;
  }

  doc.setFont('helvetica', 'normal');
  // Amount in Words left side
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount in Words:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(inv.amountInWords, 90), 15, y + 4.5);

  // Totals calculations right side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  
  if (isGst) {
    doc.text('Subtotal (excl. Tax):', 150, y, { align: 'right' });
    writeCurrencyText(doc, inv.subtotal, 190, y, 9);
    y += 5;

    doc.text('Tax (CGST + SGST split):', 150, y, { align: 'right' });
    writeCurrencyText(doc, inv.gstTotal, 190, y, 9);
    y += 5;
  } else {
    // For Non-GST, Subtotal is the sum of items (excl. any GST representation)
    const itemsTotal = inv.items.reduce((acc, item) => acc + item.subtotal, 0);
    doc.text('Subtotal:', 150, y, { align: 'right' });
    writeCurrencyText(doc, itemsTotal, 190, y, 9);
    y += 5;
  }

  if (inv.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Discount Applied:', 150, y, { align: 'right' });
    writeCurrencyText(doc, inv.discount, 190, y, 9, true);
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.text('Round Off:', 150, y, { align: 'right' });
  writeCurrencyText(doc, inv.roundOff, 190, y, 9, true);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('GRAND TOTAL:', 150, y, { align: 'right' });
  writeCurrencyText(doc, inv.grandTotal, 190, y, 11);

  y += 12;

  // --- Footer & UPI QR Code ---
  drawLine(y);
  y += 8;

  // Policies left side
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Warranty Terms & Conditions:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(shopDetails.warrantyNotes || 'Brand warranty applies.', 90), 15, y + 4);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Return & Exchange Policy:', 15, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(shopDetails.returnPolicy || 'No returns.', 90), 15, y + 19);

  // QR Code / UPI payment right side
  if (shopDetails.upiId) {
    const upiUrl = `upi://pay?pa=${shopDetails.upiId}&pn=${encodeURIComponent(shopDetails.businessName || 'Shop')}&am=${inv.grandTotal}&cu=INR`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiUrl)}`;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('SCAN TO PAY WITH ANY UPI APP', 160, y, { align: 'center' });
    
    try {
      doc.addImage(qrImageUrl, 'PNG', 140, y + 2, 40, 40);
    } catch (err) {
      doc.rect(140, y + 2, 40, 40);
      doc.text('QR Loading...', 160, y + 20, { align: 'center' });
    }
    y += 42;
  } else {
    // Signature sign
    doc.text('Authorized Signature', 170, y + 18, { align: 'center' });
    doc.line(150, y + 14, 190, y + 14);
    y += 24;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(shopDetails.footerMessage || 'Thank you for your business!', 105, y + 6, { align: 'center' });

  // Save
  doc.save(`${inv.invoiceNumber}.pdf`);
}
