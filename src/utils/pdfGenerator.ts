import jsPDF from 'jspdf';
import { type Invoice } from '../db/db';

// Helper to draw a stylized Indian Rupee symbol (₹) inline via vector paths since standard fonts lack it.
function drawRupee(doc: jsPDF, x: number, y: number, fontSize: number = 9) {
  const oldWidth = doc.getLineWidth();
  const oldColor = doc.getDrawColor();
  
  // Set stroke style matching text color
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.22);
  
  const scale = fontSize / 9;
  const w = 1.5 * scale;
  const h = 2.0 * scale;
  
  const topY = y - h;
  const midY = y - h * 0.55;
  const botY = y;
  
  // Top horizontal bar
  doc.line(x, topY, x + w, topY);
  // Middle horizontal bar
  doc.line(x, topY + (midY - topY) * 0.45, x + w * 0.8, topY + (midY - topY) * 0.45);
  
  // vertical back stem
  doc.line(x + w * 0.15, topY, x + w * 0.15, midY);
  
  // curve
  doc.line(x + w * 0.15, topY, x + w * 0.75, topY);
  doc.line(x + w * 0.75, topY, x + w * 0.75, midY - h * 0.15);
  doc.line(x + w * 0.75, midY - h * 0.15, x + w * 0.15, midY);
  
  // Slanted leg
  doc.line(x + w * 0.3, midY, x + w * 0.75, botY);
  
  // Restore drawing state
  doc.setLineWidth(oldWidth);
  doc.setDrawColor(oldColor);
}

// Helper to write formatted Indian currency text right-aligned and draw the Rupee symbol just to its left.
function writeCurrencyText(
  doc: jsPDF, 
  val: number, 
  x: number, 
  y: number, 
  fontSize: number = 9, 
  showSign: boolean = false
) {
  // Format the absolute numeric value as standard Indian currency (e.g. 13,250.00)
  const formattedVal = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(val));
  
  let prefix = '';
  if (showSign) {
    prefix = val < 0 ? '-' : val > 0 ? '+' : '';
  }
  
  const fullText = prefix ? `${prefix}${formattedVal}` : formattedVal;
  
  // Render number text right-aligned at x
  doc.text(fullText, x, y, { align: 'right' });
  
  // Calculate width of the numeric value only, to position Rupee symbol correctly in front
  const textWidth = doc.getTextWidth(formattedVal);
  
  // Draw the Rupee symbol just left of the numeric text
  drawRupee(doc, x - textWidth - 2.2, y, fontSize);
}

export function downloadInvoicePDF(inv: Invoice, shopDetails: Record<string, any>) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

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

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('GSTIN: ' + (shopDetails.gstin || 'N/A'), 15, 25);
  
  // Shop Details right aligned
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
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
  doc.text('Qty', 105, y, { align: 'right' });
  doc.text('Rate', 125, y, { align: 'right' });
  doc.text('GST %', 145, y, { align: 'right' });
  doc.text('Total (incl. GST)', 190, y, { align: 'right' });

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
      doc.text('Qty', 105, y, { align: 'right' });
      doc.text('Rate', 125, y, { align: 'right' });
      doc.text('GST %', 145, y, { align: 'right' });
      doc.text('Total (incl. GST)', 190, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 7;
    }

    doc.text(String(index + 1), 17, y);
    
    const prodNameLines = doc.splitTextToSize(item.productName, 70);
    doc.text(prodNameLines, 30, y);
    
    doc.text(`${item.quantity} ${item.unit}`, 105, y, { align: 'right' });
    
    // Format selling price and total in Indian currency format with drawn Rupee symbol
    writeCurrencyText(doc, item.sellingPrice, 125, y, 9);
    
    doc.text(`${item.gstRate}%`, 145, y, { align: 'right' });
    
    writeCurrencyText(doc, item.subtotal, 190, y, 9);

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
  
  doc.text('Subtotal (excl. Tax):', 150, y, { align: 'right' });
  writeCurrencyText(doc, inv.subtotal, 190, y, 9);
  y += 5;

  doc.text('Tax (CGST + SGST split):', 150, y, { align: 'right' });
  writeCurrencyText(doc, inv.gstTotal, 190, y, 9);
  y += 5;

  if (inv.discount > 0) {
    doc.text('Discount Applied:', 150, y, { align: 'right' });
    writeCurrencyText(doc, inv.discount, 190, y, 9, true);
    y += 5;
  }

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
