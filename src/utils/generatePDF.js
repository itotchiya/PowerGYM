import { jsPDF } from 'jspdf';

/**
 * Helper function to draw a simple table
 */
function drawTable(doc, headers, data, startY, options = {}) {
    const { margin = 14, cellPadding = 4, headerBg = [31, 41, 55], fontSize = 8, rowHeight = 8 } = options;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - margin * 2;

    // Custom column width ratios (adjustable based on content)
    // Indexes: 0: Plan/Date, 1: Start/Type, 2: End/Amount, 3: Duration/Note, 4: Price/Status
    // We try to give more space to the description columns
    const colRatios = headers.length === 5
        ? [0.3, 0.15, 0.15, 0.2, 0.2] // Plan/Note needs more space
        : headers.length === 4
            ? [0.15, 0.45, 0.15, 0.25] // Subscription history or Payment history variant
            : headers.map(() => 1 / headers.length); // Default equal width

    const colWidths = colRatios.map(ratio => tableWidth * ratio);

    let y = startY;

    // Draw header
    doc.setFillColor(...headerBg);
    doc.rect(margin, y, tableWidth, rowHeight + cellPadding, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');

    let currentX = margin;
    headers.forEach((header, i) => {
        doc.text(header, currentX + cellPadding, y + rowHeight);
        currentX += colWidths[i];
    });

    y += rowHeight + cellPadding + 2;

    // Draw rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    data.forEach((row, rowIndex) => {
        // Calculate max height for this row based on text wrapping
        let maxLines = 1;
        const processedCells = row.map((cell, i) => {
            let text = '';
            let style = null;

            if (typeof cell === 'object' && cell !== null && cell.content) {
                text = String(cell.content);
                style = cell.style;
            } else {
                text = String(cell || '');
            }

            const availableWidth = colWidths[i] - (cellPadding * 2);
            const wrappedText = doc.splitTextToSize(text, availableWidth);
            if (wrappedText.length > maxLines) maxLines = wrappedText.length;

            return { lines: wrappedText, style };
        });

        const currentRowHeight = (maxLines * (fontSize / 2)) + (cellPadding * 2) + 4;

        // Check for page break
        if (y + currentRowHeight > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20; // Reset Y
            // Redraw Header on new page
            doc.setFillColor(...headerBg);
            doc.rect(margin, y, tableWidth, rowHeight + cellPadding, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'bold');

            let headerX = margin;
            headers.forEach((header, i) => {
                doc.text(header, headerX + cellPadding, y + rowHeight);
                headerX += colWidths[i];
            });
            y += rowHeight + cellPadding + 2;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
        }

        // Alternating row background
        if (rowIndex % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, tableWidth, currentRowHeight, 'F');
        }

        // Draw Cells
        let cellX = margin;
        processedCells.forEach((cellData, i) => {
            const { lines, style } = cellData;

            // Vertical alignment (simple top padding)
            const textY = y + cellPadding + 4;

            doc.text(lines, cellX + cellPadding, textY);

            if (style === 'strikethrough') {
                doc.setLineWidth(0.5);
                lines.forEach((line, lineIndex) => {
                    const lineWidth = doc.getTextWidth(line);
                    const lineY = textY + (lineIndex * (fontSize / 2)); // Approx line height separation
                    doc.line(cellX + cellPadding, lineY - 1, cellX + cellPadding + lineWidth, lineY - 1);
                });
            }

            cellX += colWidths[i];
        });

        y += currentRowHeight;
    });

    return y + 5;
}

/**
 * Generate a professional Member "Fiche Membre" PDF
 * Contains: Member details, Financial info, Subscription history, Payment history
 */
export function generateMemberFichePDF(member, gymName = 'PowerGYM') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(31, 41, 55);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(gymName || 'PowerGYM', 14, 20);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Fiche Membre - Member File', 14, 30);

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 30, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // Member Info Section
        let yPos = 55;

        doc.setFillColor(243, 244, 246);
        doc.rect(14, yPos - 5, pageWidth - 28, 55, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Member Information', 20, yPos + 5);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Get initial payment
        const firstPayment = member.payments && member.payments.length > 0 ? member.payments[0] : null;
        const initialAdvance = firstPayment ? firstPayment.amount : 0;

        const memberInfo = [
            ['Full Name:', `${member.firstName || ''} ${member.lastName || ''}`],
            ['Member ID:', String(member.memberId || member.id || 'N/A')],
            ['CNI ID:', member.cniId || 'N/A'],
            ['Phone:', member.phone || 'N/A'],
            ['Email:', member.email || 'N/A'],
            ['Join Date:', member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'],
        ];

        let infoY = yPos + 15;
        memberInfo.forEach(([label, value], i) => {
            const xPos = i % 2 === 0 ? 20 : 110;
            if (i % 2 === 0 && i > 0) infoY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text(label, xPos, infoY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), xPos + 28, infoY);
        });

        yPos += 50;

        // Subscription History
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Subscription History', 14, yPos);
        yPos += 8;

        // Calculate active plans for dynamic ranking
        const activePlans = (member.subscriptionHistory || []).filter(sub => !sub.deleted).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const subscriptionData = (member.subscriptionHistory || []).slice().reverse().map(sub => {
            const isDeleted = sub.deleted;
            let status = 'Active';
            let planLabel = sub.planName || 'Unknown';

            if (isDeleted) {
                status = 'Deleted';
            } else {
                if (new Date(sub.endDate) <= new Date()) {
                    status = 'Expired';
                }

                // Determine rank among active plans
                const rank = activePlans.findIndex(p => p.startDate === sub.startDate && p.planId === sub.planId) + 1;
                if (rank > 0) {
                    const ordinal = (rank % 10 === 1 && rank % 100 !== 11) ? 'st' :
                        (rank % 10 === 2 && rank % 100 !== 12) ? 'nd' :
                            (rank % 10 === 3 && rank % 100 !== 13) ? 'rd' : 'th';
                    planLabel = `${sub.planName} (${sub.edited ? 'Edited ' : ''}${rank}${ordinal} Plan)`;
                }
            }

            const cellStyle = isDeleted ? { style: 'strikethrough' } : {};

            return [
                { content: planLabel, ...cellStyle },
                { content: new Date(sub.startDate).toLocaleDateString(), ...cellStyle },
                { content: new Date(sub.endDate).toLocaleDateString(), ...cellStyle },
                { content: `${sub.price || 0} MAD`, ...cellStyle },
                { content: status, ...cellStyle }
            ];
        });

        if (subscriptionData.length > 0) {
            yPos = drawTable(doc, ['Plan', 'Start Date', 'End Date', 'Price', 'Status'], subscriptionData, yPos);
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No subscription history available.', 14, yPos + 5);
            yPos += 15;
        }

        yPos += 10;

        // Payment History
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment History', 14, yPos);
        yPos += 8;

        const paymentData = (member.payments || []).slice().reverse().map(payment => {
            const type = (payment.type || 'payment').replace('_', ' ').toUpperCase();
            const isDeleted = payment.deleted;
            const cellStyle = isDeleted ? { style: 'strikethrough' } : {};

            // Find linked plan
            let linkedPlanInfo = '';
            // We search in activePlans for the one covering this payment
            // Note: Use a bit of buffer or just match closest start date
            if (!isDeleted) {
                const paymentDate = new Date(payment.date);
                const matchedPlan = activePlans.find(sub => {
                    const start = new Date(sub.startDate);
                    const end = new Date(sub.endDate);
                    // Allow payment to be a bit before start (e.g. deposit) or during
                    const bufferTime = 24 * 60 * 60 * 1000 * 7; // 7 days buffer before start
                    return paymentDate >= (start.getTime() - bufferTime) && paymentDate <= end;
                });

                if (matchedPlan) {
                    const rank = activePlans.indexOf(matchedPlan) + 1;
                    const ordinal = (rank % 10 === 1 && rank % 100 !== 11) ? 'st' :
                        (rank % 10 === 2 && rank % 100 !== 12) ? 'nd' :
                            (rank % 10 === 3 && rank % 100 !== 13) ? 'rd' : 'th';
                    linkedPlanInfo = ` - For ${rank}${ordinal} Plan`;

                    if (matchedPlan.edited) linkedPlanInfo += " (Edited)";
                }
            }

            return [
                { content: new Date(payment.date).toLocaleDateString(), ...cellStyle },
                { content: `${type} (Deleted)`, ...cellStyle, content: isDeleted ? `${type} (Deleted)` : type + linkedPlanInfo },
                { content: `${payment.amount || 0} MAD`, ...cellStyle },
                { content: payment.note || '-', ...cellStyle }
            ];
        });

        if (paymentData.length > 0) {
            yPos = drawTable(doc, ['Date', 'Type', 'Amount', 'Note'], paymentData, yPos);
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No payment history available.', 14, yPos + 5);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            doc.text(`${gymName || 'PowerGYM'} - Confidential`, 14, doc.internal.pageSize.getHeight() - 10);
        }

        // Save - Format: FirstName_LastName_CNI_FicheMembre_MemberID
        const clean = (value, fallback = '') =>
            (value || fallback).replace(/[^a-zA-Z0-9]/g, '');

        const firstName = clean(member.firstName, 'Member');
        const lastName = clean(member.lastName, '');
        const cni = clean(member.cniId, 'NA');
        const memberId = member.memberId || member.id || 'ID';

        // Underscore version with no spaces
        const fileName = `${firstName}_${lastName}_${cni}_FicheMembre_${memberId}.pdf`;

        doc.save(fileName);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF: ' + error.message);
        return false;
    }
}

/**
 * Generate a single Subscription PDF
 */
export function generateSubscriptionPDF(member, subscription, gymName = 'PowerGYM') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(31, 41, 55);
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(gymName || 'PowerGYM', 14, 18);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Fiche Abonnement - Subscription File', 14, 28);

        doc.setFontSize(9);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 28, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        let yPos = 50;

        // Member Info Section
        doc.setFillColor(243, 244, 246);
        doc.rect(14, yPos - 5, pageWidth - 28, 50, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Member Information', 20, yPos + 5);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const memberInfo = [
            ['Full Name:', `${member.firstName || ''} ${member.lastName || ''}`],
            ['Member ID:', String(member.memberId || member.id || 'N/A')],
            ['CNI ID:', member.cniId || 'N/A'],
            ['Phone:', member.phone || 'N/A'],
            ['Email:', member.email || 'N/A'],
            ['Insurance:', member.insuranceStatus === 'active' ? 'Paid' : 'Unpaid'],
        ];

        let infoY = yPos + 15;
        memberInfo.forEach(([label, value], i) => {
            const xPos = i % 2 === 0 ? 20 : 110;
            if (i % 2 === 0 && i > 0) infoY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text(label, xPos, infoY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), xPos + 28, infoY);
        });

        yPos += 60;

        // Subscription Details Box
        doc.setFillColor(219, 234, 254);
        doc.rect(14, yPos, pageWidth - 28, 50, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('Subscription Details', 20, yPos + 12);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const details = [
            ['Plan:', subscription.planName || 'N/A'],
            ['Start Date:', new Date(subscription.startDate).toLocaleDateString()],
            ['End Date:', new Date(subscription.endDate).toLocaleDateString()],
            ['Price:', `${subscription.price || 0} MAD`],
        ];

        let detailY = yPos + 22;
        details.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 20, detailY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 55, detailY);
            detailY += 8;
        });

        yPos += 60;

        // Insurance Section
        doc.setFillColor(220, 252, 231);
        doc.rect(14, yPos, pageWidth - 28, 30, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text('Insurance', 20, yPos + 12);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const insuranceStatus = member.insuranceStatus === 'active' ? 'Paid' : 'Unpaid';
        const insuranceExpiry = member.insuranceExpiryDate ? new Date(member.insuranceExpiryDate).toLocaleDateString() : 'N/A';
        const insuranceFee = member.insuranceFee || 50;

        doc.setFont('helvetica', 'bold');
        doc.text('Status:', 20, yPos + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(insuranceStatus, 55, yPos + 22);

        doc.setFont('helvetica', 'bold');
        doc.text('Valid Until:', 80, yPos + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(insuranceExpiry, 115, yPos + 22);

        doc.setFont('helvetica', 'bold');
        doc.text('Fee:', 150, yPos + 22);
        doc.setFont('helvetica', 'normal');
        doc.text(`${insuranceFee} MAD`, 165, yPos + 22);

        yPos += 40;

        // Status
        const isActive = new Date(subscription.endDate) > new Date();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        if (isActive) {
            doc.setTextColor(22, 163, 74);
            doc.text('STATUS: ACTIVE', 14, yPos);
        } else {
            doc.setTextColor(220, 38, 38);
            doc.text('STATUS: EXPIRED', 14, yPos);
        }

        // Footer
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(8);
        doc.text(`${gymName || 'PowerGYM'} - Subscription Document`, 14, doc.internal.pageSize.getHeight() - 10);

        // Save - Format: FirstName - LastName - CNI - Date - Fiche Abonnement
        const firstName = (member.firstName || 'Member').replace(/[^a-zA-Z0-9]/g, '');
        const lastName = (member.lastName || '').replace(/[^a-zA-Z0-9]/g, '');
        const cni = (member.cniId || 'N-A').replace(/[^a-zA-Z0-9]/g, '');
        const subDate = new Date(subscription.startDate).toLocaleDateString('fr-FR').replace(/\//g, '-');
        const fileName = `${firstName}_${lastName}_${cni}_${subDate}_FicheAbonnement.pdf`;
        doc.save(fileName);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF: ' + error.message);
        return false;
    }
}
