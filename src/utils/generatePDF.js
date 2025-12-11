import { jsPDF } from 'jspdf';

/**
 * Helper function to draw a simple table
 */
function drawTable(doc, headers, data, startY, options = {}) {
    const { margin = 14, cellPadding = 4, headerBg = [31, 41, 55], fontSize = 9, rowHeight = 8 } = options;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - margin * 2;
    const colWidth = tableWidth / headers.length;

    let y = startY;

    // Draw header
    doc.setFillColor(...headerBg);
    doc.rect(margin, y, tableWidth, rowHeight + cellPadding, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');

    headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth + cellPadding, y + rowHeight);
    });

    y += rowHeight + cellPadding + 2;

    // Draw rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    data.forEach((row, rowIndex) => {
        // Alternating row background
        if (rowIndex % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 2, tableWidth, rowHeight + 2, 'F');
        }

        row.forEach((cell, i) => {
            const text = String(cell || '').substring(0, 25); // Truncate long text
            doc.text(text, margin + i * colWidth + cellPadding, y + 4);
        });

        y += rowHeight + 2;

        // Check for page break
        if (y > doc.internal.pageSize.getHeight() - 30) {
            doc.addPage();
            y = 20;
        }
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

        const currentPlan = member.currentSubscription?.planName || 'N/A';
        const planPrice = member.currentSubscription?.planPrice || member.currentSubscription?.price || 0;

        const memberInfo = [
            ['Full Name:', `${member.firstName || ''} ${member.lastName || ''}`],
            ['Member ID:', String(member.memberId || member.id || 'N/A')],
            ['CNI ID:', member.cniId || 'N/A'],
            ['Phone:', member.phone || 'N/A'],
            ['Email:', member.email || 'N/A'],
            ['Current Plan:', currentPlan],
            ['Plan Price:', `${planPrice} MAD`],
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

        yPos += 70;

        // Financial Summary - 3 boxes
        const boxWidth = (pageWidth - 42) / 3;

        // Initial Advance
        doc.setFillColor(219, 234, 254);
        doc.rect(14, yPos, boxWidth, 28, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('Initial Advance', 18, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${initialAdvance} MAD`, 18, yPos + 22);

        // Total Paid
        doc.setFillColor(220, 252, 231);
        doc.rect(14 + boxWidth + 7, yPos, boxWidth, 28, 'F');
        doc.setFontSize(9);
        doc.setTextColor(22, 163, 74);
        doc.text('Total Paid', 14 + boxWidth + 11, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${member.totalPaid || 0} MAD`, 14 + boxWidth + 11, yPos + 22);

        // Outstanding
        doc.setFillColor(254, 226, 226);
        doc.rect(14 + (boxWidth + 7) * 2, yPos, boxWidth, 28, 'F');
        doc.setFontSize(9);
        doc.setTextColor(220, 38, 38);
        doc.text('Outstanding', 14 + (boxWidth + 7) * 2 + 4, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${member.outstandingBalance || 0} MAD`, 14 + (boxWidth + 7) * 2 + 4, yPos + 22);

        doc.setTextColor(0, 0, 0);
        yPos += 40;

        // Subscription History
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Subscription History', 14, yPos);
        yPos += 8;

        const subscriptionData = (member.subscriptionHistory || []).slice().reverse().map(sub => [
            sub.planName || 'Unknown',
            new Date(sub.startDate).toLocaleDateString(),
            new Date(sub.endDate).toLocaleDateString(),
            `${sub.price || 0} MAD`
        ]);

        if (subscriptionData.length > 0) {
            yPos = drawTable(doc, ['Plan', 'Start Date', 'End Date', 'Price'], subscriptionData, yPos);
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

        const paymentData = (member.payments || []).slice().reverse().map(payment => [
            new Date(payment.date).toLocaleDateString(),
            (payment.type || 'payment').replace('_', ' ').toUpperCase(),
            `${payment.amount || 0} MAD`,
            payment.note || '-'
        ]);

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

        // Member Info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Member:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${member.firstName || ''} ${member.lastName || ''}`, 45, yPos);

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('ID:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(member.memberId || member.id || 'N/A'), 45, yPos);

        yPos += 15;

        // Subscription Details Box
        doc.setFillColor(243, 244, 246);
        doc.rect(14, yPos, pageWidth - 28, 50, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Subscription Details', 20, yPos + 12);

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
