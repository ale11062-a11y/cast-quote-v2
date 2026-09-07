import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote, WorkOrder, Company } from '../types';
import { hexToRgb } from './brandTheme';

export interface DocumentPdfOptions {
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder;
  company?: Company | null;
}

export function generateDocumentPdf({ type, data, company }: DocumentPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // 182mm

  const comp = company || data.company;
  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (data as Quote).quote_number : (data as WorkOrder).order_number;
  const docTitle = isQuote ? `ORÇAMENTO Nº ${docNumber}` : `ORDEM DE SERVIÇO Nº ${docNumber}`;

  let currentY = margin;

  // ====================================================
  // 1. HEADER SECTION (Brand & Company Details)
  // ====================================================
  const headerHeight = 26;
  // Primary header container
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, currentY, usableWidth, headerHeight, 'F');

  const hasLogo = Boolean(comp?.logo_url);
  let textStartX = margin + 6;

  // Render company logo if present
  if (hasLogo && comp?.logo_url) {
    try {
      // White container box for maximum contrast
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + 4, currentY + 3, 20, 20, 1.5, 1.5, 'F');

      let format = 'PNG';
      if (comp.logo_url.startsWith('data:image/jpeg') || comp.logo_url.startsWith('data:image/jpg')) {
        format = 'JPEG';
      } else if (comp.logo_url.startsWith('data:image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(comp.logo_url, format, margin + 5, currentY + 4, 18, 18, undefined, 'FAST');
      textStartX = margin + 28;
    } catch (err) {
      console.warn('Não foi possível renderizar a logo no PDF:', err);
      textStartX = margin + 6;
    }
  }

  // Brand Name & Doc Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(comp?.name || 'CAST QUOTE SISTEMAS', textStartX, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  const compMeta = [
    comp?.cnpj ? `CNPJ: ${comp.cnpj}` : '',
    comp?.phone ? `Tel: ${comp.phone}` : '',
    comp?.email ? `Email: ${comp.email}` : ''
  ].filter(Boolean).join('  |  ');
  doc.text(compMeta || 'Soluções Corporativas Especializadas', textStartX, currentY + 15.5);

  if (comp?.address) {
    doc.text(`${comp.address}${comp.city ? ` - ${comp.city}/${comp.state}` : ''}`, textStartX, currentY + 21);
  }

  // Right-aligned Document Badge (dynamically branded with company primary_color)
  const brandHex = comp?.primary_color || '#2563eb';
  const brandRgb = hexToRgb(brandHex) || { r: 37, g: 99, b: 235 };
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.roundedRect(pageWidth - margin - 58, currentY + 5, 52, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(type, pageWidth - margin - 32, currentY + 11, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`#${docNumber}`, pageWidth - margin - 32, currentY + 17, { align: 'center' });

  currentY += 30;

  // ====================================================
  // 2. META INFORMATION BAR (Client & Document Info)
  // ====================================================
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, usableWidth, 26, 2, 2, 'FD');

  // Left Column: Client info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text('DADOS DO CLIENTE', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Cliente: ${data.client_name || 'Não informado'}`, margin + 4, currentY + 12);
  doc.text(`Documento: ${data.client_document || 'Não informado'}`, margin + 4, currentY + 17);
  doc.text(`Contato: ${data.client_phone || ''} ${data.client_email ? `• ${data.client_email}` : ''}`, margin + 4, currentY + 22);

  // Right Column: Order/Quote info
  const rightColX = margin + (usableWidth / 2) + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('INFORMAÇÕES DO REGISTRO', rightColX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(isQuote ? `Data de Emissão: ${formatDatePtBr(data.date)}` : `Data de Execução: ${formatDatePtBr(data.date)}`, rightColX, currentY + 12);
  if (isQuote && (data as Quote).validity_date) {
    doc.text(`Validade da Proposta: ${formatDatePtBr((data as Quote).validity_date!)}`, rightColX, currentY + 17);
    doc.text(`Técnico Responsável: ${data.technician_name || 'Equipe Técnica CAST'}`, rightColX, currentY + 22);
  } else {
    doc.text(`Técnico Responsável: ${data.technician_name || 'Equipe Técnica CAST'}`, rightColX, currentY + 17);
  }

  currentY += 30;

  // ====================================================
  // 3. SCOPE & DESCRIPTION
  // ====================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('OBJETIVO / ESCOPO DO ATENDIMENTO', margin, currentY);
  currentY += 4;

  const descText = isQuote ? (data as Quote).description : (data as WorkOrder).service_description;
  const splitDesc = doc.splitTextToSize(descText || 'Serviços especializados conforme detalhamento a seguir.', usableWidth - 8);
  const descHeight = Math.max(12, splitDesc.length * 4.5 + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, usableWidth, descHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(splitDesc, margin + 4, currentY + 5.5);

  currentY += descHeight + 6;

  // ====================================================
  // 4. ITEMS & SERVICES TABLE
  // ====================================================
  const items = data.items || [];
  const tableRows = items.map((item, index) => [
    index + 1,
    item.item_type === 'servico' ? 'SERVIÇO' : 'MATERIAL',
    item.description,
    `${item.quantity} ${item.unit || 'UN'}`,
    formatBrl(item.unit_price),
    formatBrl(item.total_price)
  ]);

  if (tableRows.length === 0) {
    tableRows.push([1, 'SERVIÇO', 'Execução de serviços técnicos', '1 UN', formatBrl(data.total), formatBrl(data.total)]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'TIPO', 'DESCRIÇÃO DOS ITENS & SERVIÇOS', 'QTD/UN', 'VALOR UNIT.', 'TOTAL']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ====================================================
  // 5. FINANCIAL TOTALS BLOCK
  // ====================================================
  // Ensure totals block fits on page
  if (currentY + 30 > pageHeight - 35) {
    doc.addPage();
    currentY = margin + 5;
  }

  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalsX, currentY, totalsWidth, 25, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', totalsX + 4, currentY + 5.5);
  doc.text(formatBrl(data.subtotal || data.total), totalsX + totalsWidth - 4, currentY + 5.5, { align: 'right' });

  doc.text('Descontos (-):', totalsX + 4, currentY + 10.5);
  doc.text(formatBrl(data.discount || 0), totalsX + totalsWidth - 4, currentY + 10.5, { align: 'right' });

  doc.text('Acréscimos (+):', totalsX + 4, currentY + 15.5);
  doc.text(formatBrl(data.addition || 0), totalsX + totalsWidth - 4, currentY + 15.5, { align: 'right' });

  // Final Total Bar
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(totalsX + 1, currentY + 17.5, totalsWidth - 2, 6.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('VALOR FINAL:', totalsX + 4, currentY + 22);
  doc.text(formatBrl(data.total), totalsX + totalsWidth - 4, currentY + 22, { align: 'right' });

  // Notes on the left of totals
  if (data.notes) {
    const notesWidth = usableWidth - totalsWidth - 6;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, notesWidth, 25, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('OBSERVAÇÕES E CONDIÇÕES COMERCIAIS:', margin + 3, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(data.notes, notesWidth - 6);
    doc.text(splitNotes.slice(0, 4), margin + 3, currentY + 10);
  }

  currentY += 31;

  // ====================================================
  // 6. PHOTOS SECTION (MANDATORY STRICT 5 PER ROW VERTICAL)
  // ====================================================
  const photos = data.photos || [];

  if (photos.length > 0) {
    // Check if header fits
    if (currentY + 25 > pageHeight - 40) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`REGISTRO FOTOGRÁFICO VERTICAL (${photos.length} FOTO${photos.length > 1 ? 'S' : ''})`, margin, currentY);
    currentY += 4;

    // RULE IMPLEMENTATION:
    // - maximum 5 photos per row
    // - side-by-side
    // - ALL PHOTOS MUST HAVE THE EXACT SAME FIXED SIZE
    // - calculated to allow exactly up to 5 vertical photos per row
    // - 1 photo = same fixed size (never enlarged)
    // - 2, 3, 4 photos = same fixed size
    // - 5 photos = fills row
    // - 6th photo = starts row 2
    // - 10 photos = 2 rows of 5
    // - 11 photos = 3 rows (5 + 5 + 1)
    const maxPerRow = 5;
    const gapX = 3.25; // gap between photos
    const photoWidth = (usableWidth - (maxPerRow - 1) * gapX) / maxPerRow; // 33.8mm
    const photoHeight = photoWidth * 1.5; // Exactly 2:3 vertical aspect ratio ~ 50.7mm
    const captionHeight = 4;
    const rowTotalHeight = photoHeight + captionHeight + 3;

    for (let i = 0; i < photos.length; i++) {
      const colIndex = i % maxPerRow;
      const rowIndex = Math.floor(i / maxPerRow);

      // Check if starting a new row requires a new page
      if (colIndex === 0) {
        if (currentY + rowTotalHeight > pageHeight - 30) {
          doc.addPage();
          currentY = margin + 8;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`REGISTRO FOTOGRÁFICO (CONTINUAÇÃO)`, margin, currentY - 2);
        }
      }

      const photoX = margin + colIndex * (photoWidth + gapX);
      const photoY = currentY;

      // Draw photo container border
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(241, 245, 249);
      doc.rect(photoX, photoY, photoWidth, photoHeight, 'FD');

      const photo = photos[i];
      if (photo && photo.url) {
        try {
          // If it is an image data URL or direct image, add to PDF
          doc.addImage(photo.url, 'JPEG', photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1, undefined, 'FAST');
        } catch (imgErr) {
          // Fallback portrait representation if format conversion fails
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text(`Foto Vertical #${i + 1}`, photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
        }
      }

      // Small caption below photo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      const label = photo.caption ? photo.caption : `Foto ${i + 1} (Vertical)`;
      const truncatedLabel = label.length > 22 ? label.substring(0, 20) + '...' : label;
      doc.text(truncatedLabel, photoX + photoWidth / 2, photoY + photoHeight + 3, { align: 'center' });

      // If this is the last column in this row or the last item overall, advance currentY
      if (colIndex === maxPerRow - 1 || i === photos.length - 1) {
        currentY += rowTotalHeight;
      }
    }

    currentY += 4;
  }

  // ====================================================
  // 7. SIGNATURES & FOOTER BLOCK
  // ====================================================
  // Check if signature fits on current page
  if (currentY + 28 > pageHeight - 20) {
    doc.addPage();
    currentY = pageHeight - 38;
  } else {
    currentY = Math.max(currentY + 8, pageHeight - 38);
  }

  const signWidth = 65;
  const sign1X = margin + 15;
  const sign2X = pageWidth - margin - signWidth - 15;

  // Render technician signature image if available
  if (data.technician_signature) {
    try {
      doc.addImage(data.technician_signature, 'PNG', sign1X + 5, currentY - 14, signWidth - 10, 13);
    } catch (sigErr) {
      console.warn('Erro ao renderizar assinatura do técnico no PDF:', sigErr);
    }
  }

  // Render client signature image if available
  if (data.client_signature) {
    try {
      doc.addImage(data.client_signature, 'PNG', sign2X + 5, currentY - 14, signWidth - 10, 13);
    } catch (sigErr) {
      console.warn('Erro ao renderizar assinatura do cliente no PDF:', sigErr);
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sign1X, currentY, sign1X + signWidth, currentY);
  doc.line(sign2X, currentY, sign2X + signWidth, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(data.technician_name || 'TÉCNICO RESPONSÁVEL', sign1X + signWidth / 2, currentY + 4, { align: 'center' });
  doc.text(data.client_name || 'CLIENTE / CONTRATANTE', sign2X + signWidth / 2, currentY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    data.technician_signature ? 'Assinado Digitalmente (Autenticado)' : 'Assinatura e De Acordo',
    sign1X + signWidth / 2,
    currentY + 7.5,
    { align: 'center' }
  );
  doc.text(
    data.client_signature ? 'Assinado Digitalmente na Tela' : 'Aprovação dos Serviços e Valores',
    sign2X + signWidth / 2,
    currentY + 7.5,
    { align: 'center' }
  );

  // Add Page Numbers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CAST Quote • Sistema Profissional Multiempresa • Documento #${docNumber} • Página ${p} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

function formatBrl(val: number): string {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDatePtBr(dateStr?: string): string {
  if (!dateStr) return 'Não informada';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
}

// ============================================================================
// APRESENTAÇÃO COMERCIAL EXECUTIVA EM PDF (SLIDES A4 PAISAGEM)
// ============================================================================
export interface CommercialPresentationOptions {
  company?: Company | null;
  presenterName?: string;
  presenterRole?: string;
}

export function generateCommercialPresentationPdf({ company, presenterName, presenterRole }: CommercialPresentationOptions = {}): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // 269mm
  const usableHeight = pageHeight - margin * 2; // 182mm

  const brandHex = company?.primary_color || '#2563eb';
  const brandRgb = hexToRgb(brandHex) || { r: 37, g: 99, b: 235 };
  const compName = company?.name || 'CAST Quote Sistemas Corporativos';

  const drawFooter = (slideNum: number, totalSlides: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${compName} • Apresentação Comercial Executiva • Confidencial e Exclusivo`,
      margin,
      pageHeight - 7
    );
    doc.text(
      `Slide ${slideNum} de ${totalSlides}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  // ==========================================================================
  // SLIDE 1: CAPA & VISÃO GERAL
  // ==========================================================================
  // Background Header Gradient / Card
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, margin, usableWidth, usableHeight, 4, 4, 'F');

  // Decorative Accent bar top
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.rect(margin + 4, margin, usableWidth - 8, 3, 'F');

  // Badge Tag
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.roundedRect(margin + 16, margin + 18, 70, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PLATAFORMA CORPORATIVA INTEGRADA', margin + 51, margin + 22.5, { align: 'center' });

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text('CAST QUOTE & ORDENS DE SERVIÇO', margin + 16, margin + 38);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    'A solução definitiva para transformar cotações, ordens de serviço e operações de campo.',
    margin + 16,
    margin + 47
  );

  // 4 Pill Highlights on Cover
  const pills = [
    { title: 'Multiempresa White-Label', desc: 'Identidade visual e logo exclusivos' },
    { title: 'Fotos Regulamentares 3:4', desc: 'Carimbo de data, hora e técnico' },
    { title: 'Assinatura Digital Integrada', desc: 'Aprovação direta no celular ou tablet' },
    { title: 'Alta Velocidade & PWA', desc: 'Emissão de propostas em menos de 2 min' }
  ];

  const pillWidth = (usableWidth - 32 - 9) / 4;
  pills.forEach((p, idx) => {
    const px = margin + 16 + idx * (pillWidth + 3);
    const py = margin + 60;
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(px, py, pillWidth, 38, 2, 2, 'F');
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.roundedRect(px, py, pillWidth, 38, 2, 2, 'S');

    // Accent line on pill
    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(px + 4, py + 4, 3, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(p.title, px + 10, py + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const splitDesc = doc.splitTextToSize(p.desc, pillWidth - 14);
    doc.text(splitDesc, px + 10, py + 19);
  });

  // Bottom Box with Presenter and Company Info
  const botY = margin + 112;
  doc.setFillColor(24, 32, 47);
  doc.roundedRect(margin + 16, botY, usableWidth - 32, 48, 3, 3, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(margin + 16, botY, usableWidth - 32, 48, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Apresentado por:', margin + 24, botY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Empresa: ${compName}`, margin + 24, botY + 20);
  if (company?.cnpj) doc.text(`CNPJ: ${company.cnpj}`, margin + 24, botY + 27);
  if (company?.phone || company?.email) {
    doc.text(`Contato: ${company?.phone || ''}  ${company?.email ? '| ' + company.email : ''}`, margin + 24, botY + 34);
  }

  const rightColX = margin + 150;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Objetivo da Apresentação:', rightColX, botY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const objText = 'Demonstrar como a modernização e automação de orçamentos e ordens de serviço reduzem o tempo operacional em até 75%, eliminam glosas e aumentam expressivamente a taxa de conversão comercial da sua empresa.';
  const splitObj = doc.splitTextToSize(objText, usableWidth - 32 - 140);
  doc.text(splitObj, rightColX, botY + 20);

  drawFooter(1, 4);

  // ==========================================================================
  // SLIDE 2: DESAFIOS DO MERCADO vs. A SOLUÇÃO CAST QUOTE
  // ==========================================================================
  doc.addPage('a4', 'landscape');

  // Slide Header
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.rect(margin, margin, 4, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('1. POR QUE MODERNIZAR A SUA OPERAÇÃO TÉCNICA E COMERCIAL?', margin + 8, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Comparativo direto entre o modelo tradicional e a eficiência proporcionada pela plataforma.', margin + 8, margin + 14);

  // Left Card: Cenário Tradicional
  const cardWidth = (usableWidth - 8) / 2;
  const cardHeight = usableHeight - 34;
  const cardY = margin + 22;

  // Red/Danger Card (Tradicional)
  doc.setFillColor(254, 242, 242); // Red 50
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(254, 202, 202); // Red 200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFillColor(239, 68, 68); // Red 500
  doc.roundedRect(margin + 8, cardY + 8, 65, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DESAFIOS ATUAIS (SEM O SISTEMA)', margin + 40.5, cardY + 12.5, { align: 'center' });

  const traditionalPainPoints = [
    { title: 'Orçamentos Manuais e Demorados', desc: 'Uso de planilhas ou papel que demoram horas ou dias para serem entregues, perdendo o timing com o cliente.' },
    { title: 'Erros Frequentes de Cálculo', desc: 'Cálculos manuais de mão de obra, materiais e descontos que geram prejuízos ou margens distorcidas.' },
    { title: 'Falta de Evidências Fotográficas', desc: 'Fotos perdidas no WhatsApp dos técnicos, sem data, sem hora e sem vínculo com a ordem de serviço.' },
    { title: 'Contestações e Falta de Assinatura', desc: 'Serviços executados sem assinatura formal do cliente, dificultando a cobrança e gerando desconfiança.' },
    { title: 'Gestão Cega sem Métricas', desc: 'A diretoria não tem visibilidade em tempo real de quantas propostas foram aprovadas e da produtividade da equipe.' }
  ];

  let painY = cardY + 22;
  traditionalPainPoints.forEach((pt) => {
    doc.setFillColor(239, 68, 68);
    doc.circle(margin + 12, painY + 2, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27); // Red 800
    doc.text(pt.title, margin + 17, painY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(127, 29, 29); // Red 900
    const splitDesc = doc.splitTextToSize(pt.desc, cardWidth - 25);
    doc.text(splitDesc, margin + 17, painY + 8);

    painY += 21;
  });

  // Right Card: Solução CAST Quote
  const rightCardX = margin + cardWidth + 8;
  doc.setFillColor(240, 253, 244); // Green 50
  doc.roundedRect(rightCardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.setLineWidth(0.4);
  doc.roundedRect(rightCardX, cardY, cardWidth, cardHeight, 3, 3, 'S');

  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.roundedRect(rightCardX + 8, cardY + 8, 65, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('COM A PLATAFORMA CAST QUOTE', rightCardX + 40.5, cardY + 12.5, { align: 'center' });

  const solutionPoints = [
    { title: 'Propostas Prontas em 2 Minutos', desc: 'Emissão rápida com itens pré-cadastrados, valores automáticos e layout corporativo impecável.' },
    { title: 'Margens e Totais 100% Precisos', desc: 'Subtotais, descontos comerciais e acréscimos calculados com rigor matemático e segurança.' },
    { title: 'Galeria Vertical 3:4 com Carimbo', desc: 'Registro fotográfico auditável com data, hora e técnico gravados diretamente na imagem.' },
    { title: 'Assinatura Digital no Smartphone', desc: 'O cliente assina com o dedo na tela, gerando termo formal de aceite e eliminando disputas.' },
    { title: 'Dashboard Executivo em Tempo Real', desc: 'Gráficos de faturamento, taxas de conversão, status das OS e controle financeiro integrado.' }
  ];

  let solY = cardY + 22;
  solutionPoints.forEach((pt) => {
    doc.setFillColor(16, 185, 129);
    doc.circle(rightCardX + 12, solY + 2, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70); // Green 800
    doc.text(pt.title, rightCardX + 17, solY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87); // Green 700
    const splitDesc = doc.splitTextToSize(pt.desc, cardWidth - 25);
    doc.text(splitDesc, rightCardX + 17, solY + 8);

    solY += 21;
  });

  drawFooter(2, 4);

  // ==========================================================================
  // SLIDE 3: PRINCIPAIS MÓDULOS E RECURSOS
  // ==========================================================================
  doc.addPage('a4', 'landscape');

  // Slide Header
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.rect(margin, margin, 4, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('2. MÓDULOS INTEGRADOS DE PONTA A PONTA', margin + 8, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Uma arquitetura moderna que atende desde o fechamento comercial até a entrega técnica em campo.', margin + 8, margin + 14);

  // 4 Modular Cards (2x2 Grid)
  const gridW = (usableWidth - 8) / 2;
  const gridH = (usableHeight - 40) / 2;

  const modules = [
    {
      badge: 'MÓDULO COMERCIAL',
      title: 'Cotações & Orçamentos Inteligentes',
      color: brandRgb,
      items: [
        'Composição ágil de itens, materiais e serviços',
        'Cálculo dinâmico de descontos e condições de pagamento',
        'Termos de garantia e validade customizáveis',
        'Envio direto por WhatsApp e PDF com layout executivo'
      ]
    },
    {
      badge: 'MÓDULO OPERACIONAL',
      title: 'Ordens de Serviço & Execução de Campo',
      color: { r: 15, g: 23, b: 42 }, // Slate 900
      items: [
        'Designação clara do técnico responsável por chamado',
        'Checklist completo de tarefas e materiais utilizados',
        'Captura de fotos verticais regulamentares (3:4)',
        'Coleta de assinatura digital do cliente no local'
      ]
    },
    {
      badge: 'WHITE-LABEL & GOVERNANÇA',
      title: 'Multiempresa & Identidade Corporativa',
      color: { r: 126, g: 34, b: 206 }, // Purple 700
      items: [
        'Logotipo da empresa aplicado em todos os PDFs e relatórios',
        'Paleta de cores primárias ajustável com 1 clique',
        'Isolamento completo de dados e clientes por filial',
        'Console DEV independente para gestão global'
      ]
    },
    {
      badge: 'SEGURANÇA & AUDITORIA',
      title: 'Gestão de Usuários & Níveis de Acesso (RBAC)',
      color: { r: 3, g: 105, b: 161 }, // Sky 700
      items: [
        '5 Perfis: DEV, Administrador, Gerente, Supervisor e Técnico',
        'Técnicos visualizam apenas suas próprias ordens de serviço',
        'Banco SQLite ultrarrápido com sincronização em nuvem',
        'Backup e exportação completa em planilhas Excel/CSV'
      ]
    }
  ];

  modules.forEach((mod, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = margin + col * (gridW + 8);
    const my = margin + 22 + row * (gridH + 8);

    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(mx, my, gridW, gridH, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(mx, my, gridW, gridH, 3, 3, 'S');

    // Badge
    doc.setFillColor(mod.color.r, mod.color.g, mod.color.b);
    doc.roundedRect(mx + 8, my + 7, 50, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(mod.badge, mx + 33, my + 11.2, { align: 'center' });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(mod.title, mx + 8, my + 20);

    // Items
    let itmY = my + 27;
    mod.items.forEach((item) => {
      doc.setFillColor(mod.color.r, mod.color.g, mod.color.b);
      doc.rect(mx + 9, itmY + 1.2, 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(item, mx + 14, itmY + 3.2);

      itmY += 7.2;
    });
  });

  drawFooter(3, 4);

  // ==========================================================================
  // SLIDE 4: RETORNO SOBRE O INVESTIMENTO (ROI) & PRÓXIMOS PASSOS
  // ==========================================================================
  doc.addPage('a4', 'landscape');

  // Slide Header
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.rect(margin, margin, 4, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('3. IMPACTO NO NEGÓCIO, ROI & FACILIDADE DE IMPLANTAÇÃO', margin + 8, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Ganhos comprovados em produtividade, redução de custos e aumento do ticket médio.', margin + 8, margin + 14);

  // 4 Big Metric Blocks
  const metricWidth = (usableWidth - 9) / 4;
  const metricHeight = 36;
  const metrics = [
    { num: '75%', label: 'Menos Tempo na Emissão', desc: 'De horas no Word para menos de 2 minutos' },
    { num: '+35%', label: 'Mais Vendas Fechadas', desc: 'Propostas elegantes entregues na hora' },
    { num: '10h', label: 'Economia Semanal/Técnico', desc: 'Elimina retrabalho de papel e digitação' },
    { num: '100%', label: 'Conformidade e Aceite', desc: 'Fotos e assinaturas vinculadas legalmente' }
  ];

  metrics.forEach((m, idx) => {
    const mx = margin + idx * (metricWidth + 3);
    const my = margin + 22;

    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(mx, my, metricWidth, metricHeight, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.text(m.num, mx + metricWidth / 2, my + 13, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(m.label, mx + metricWidth / 2, my + 21, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(m.desc, mx + metricWidth / 2, my + 29, { align: 'center' });
  });

  // Middle Section: Facilidade de Implantação
  const midY = margin + 63;
  const midH = 45;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, midY, usableWidth, midH, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, midY, usableWidth, midH, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Diferenciais Tecnológicos & Facilidade de Adoção:', margin + 10, midY + 11);

  const diffs = [
    { title: 'Instalação Imediata (PWA)', desc: 'Instalável no celular, tablet e computador sem passar por lojas de aplicativos.' },
    { title: 'Operação com ou sem Internet', desc: 'Permite preencher vistorias em campo mesmo sem sinal de dados (Modo Offline).' },
    { title: 'Exportação Completa', desc: 'Gere arquivos em PDF profissionais, exporte planilhas em Excel e faça backup total.' }
  ];

  const diffW = (usableWidth - 28) / 3;
  diffs.forEach((d, i) => {
    const dx = margin + 10 + i * (diffW + 4);
    const dy = midY + 18;

    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.roundedRect(dx, dy, 3, 18, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(d.title, dx + 6, dy + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const splitD = doc.splitTextToSize(d.desc, diffW - 8);
    doc.text(splitD, dx + 6, dy + 12);
  });

  // Bottom CTA Banner
  const ctaY = margin + 114;
  const ctaH = 46;
  doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
  doc.roundedRect(margin, ctaY, usableWidth, ctaH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PRONTO PARA ELEVAR O PADRÃO DA SUA OPERAÇÃO?', margin + 16, ctaY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const ctaText = 'Agende agora uma demonstração guiada para sua equipe ou inicie seu período de teste operacional. Tenha controle absoluto dos seus orçamentos, técnicos e faturamento.';
  const splitCta = doc.splitTextToSize(ctaText, usableWidth - 32);
  doc.text(splitCta, margin + 16, ctaY + 23);

  // Contact info box inside CTA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const contactStr = [
    compName,
    company?.phone ? `Telefone: ${company.phone}` : '',
    company?.email ? `E-mail: ${company.email}` : ''
  ].filter(Boolean).join('   •   ');
  doc.text(contactStr, margin + 16, ctaY + 37);

  drawFooter(4, 4);

  return doc;
}
