import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a professional Member "Fiche Technique" PDF
 * Contains: Member details, Financial info, Subscription history, Payment history
 */
export function generateMemberFichePDF(member, gymName = 'PowerGYM') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(31, 41, 55); // Dark gray
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(gymName || 'PowerGYM', 14, 20);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Fiche Technique - Member Technical File', 14, 30);

        // Generation date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 30, { align: 'right' });

        // Reset text color
        doc.setTextColor(0, 0, 0);

        // Member Info Section
        let yPos = 55;

        doc.setFillColor(243, 244, 246);
        doc.rect(14, yPos - 5, pageWidth - 28, 60, 'F');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Member Information', 20, yPos + 5);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Get initial payment (first payment in array)
        const firstPayment = member.payments && member.payments.length > 0 ? member.payments[0] : null;
        const initialAdvance = firstPayment ? firstPayment.amount : 0;

        // Current plan info
        const currentPlan = member.currentSubscription?.planName || 'N/A';
        const planPrice = member.currentSubscription?.planPrice || member.currentSubscription?.price || 0;

        const memberInfo = [
            ['Full Name:', `${member.firstName || ''} ${member.lastName || ''}`],
            ['Member ID:', member.memberId || member.id || 'N/A'],
            ['CNI ID:', member.cniId || 'N/A'],
            ['Phone:', member.phone || 'N/A'],
            ['Email:', member.email || 'N/A'],
            ['Current Plan:', currentPlan],
            ['Plan Price:', `${planPrice} MAD`],
            ['Insurance:', member.insuranceStatus === 'active' ? 'Paid' : (member.insuranceStatus === 'none' ? 'Not Included' : 'Unpaid')],
        ];

        let infoY = yPos + 15;
        memberInfo.forEach(([label, value], i) => {
            const xPos = i % 2 === 0 ? 20 : 105;
            if (i % 2 === 0 && i > 0) infoY += 10;
            doc.setFont('helvetica', 'bold');
            doc.text(label, xPos, infoY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), xPos + 35, infoY);
        });

        yPos += 75;

        // Financial Summary - 3 columns
        const boxWidth = (pageWidth - 42) / 3;

        // Initial Advance
        doc.setFillColor(219, 234, 254); // Light blue
        doc.rect(14, yPos, boxWidth, 30, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('Initial Advance', 18, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${initialAdvance} MAD`, 18, yPos + 22);

        // Total Paid
        doc.setFillColor(220, 252, 231); // Light green
        doc.rect(14 + boxWidth + 7, yPos, boxWidth, 30, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text('Total Paid', 14 + boxWidth + 11, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${member.totalPaid || 0} MAD`, 14 + boxWidth + 11, yPos + 22);

        // Outstanding Balance
        doc.setFillColor(254, 226, 226); // Light red
        doc.rect(14 + (boxWidth + 7) * 2, yPos, boxWidth, 30, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('Outstanding', 14 + (boxWidth + 7) * 2 + 4, yPos + 10);
        doc.setFontSize(14);
        doc.text(`${member.outstandingBalance || 0} MAD`, 14 + (boxWidth + 7) * 2 + 4, yPos + 22);

        doc.setTextColor(0, 0, 0);
        yPos += 40;

        // Subscription History Table
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Subscription History', 14, yPos);
        yPos += 5;

        const subscriptionData = (member.subscriptionHistory || []).slice().reverse().map(sub => [
            sub.planName || 'Unknown',
            new Date(sub.startDate).toLocaleDateString(),
            new Date(sub.endDate).toLocaleDateString(),
            `${sub.price || 0} MAD`
        ]);

        if (subscriptionData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Plan', 'Start Date', 'End Date', 'Price']],
                body: subscriptionData,
                theme: 'striped',
                headStyles: { fillColor: [31, 41, 55] },
                margin: { left: 14, right: 14 },
            });
            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No subscription history available.', 14, yPos + 10);
            yPos += 20;
        }

        // Payment History Table
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment History', 14, yPos);
        yPos += 5;

        const paymentData = (member.payments || []).slice().reverse().map(payment => [
            new Date(payment.date).toLocaleDateString(),
            payment.type?.replace('_', ' ').toUpperCase() || 'PAYMENT',
            `${payment.amount || 0} MAD`,
            payment.note || '-'
        ]);

        if (paymentData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Type', 'Amount', 'Note']],
                body: paymentData,
                theme: 'striped',
                headStyles: { fillColor: [31, 41, 55] },
                margin: { left: 14, right: 14 },
            });
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No payment history available.', 14, yPos + 10);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            doc.text(`${gymName || 'PowerGYM'} - Confidential Member File`, 14, doc.internal.pageSize.getHeight() - 10);
        }

        // Save - using explicit output
        const fileName = `${member.firstName || 'Member'}_${member.lastName || ''}_FicheTechnique_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        console.log('PDF generated successfully:', fileName);
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
        return false;
    }
}

/**
 * Generate a single Subscription PDF
 */
export function generateSubscriptionPDF(member, subscription, gymName = 'PowerGYM') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(gymName, 14, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Subscription Receipt', 14, 28);

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
    doc.text(member.id || 'N/A', 45, yPos);

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
    doc.text(`${gymName} - Subscription Document`, 14, doc.internal.pageSize.getHeight() - 10);

    // Save
    const fileName = `${member.firstName}_${member.lastName}_Subscription_${new Date(subscription.startDate).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
