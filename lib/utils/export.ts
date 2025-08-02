import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from './formatters'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface ExportData {
  transactions: Transaction[]
  summary: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    dateRange: string
  }
}

// Export transactions to CSV
export function exportToCSV(data: ExportData) {
  const csvData = data.transactions.map(tx => ({
    Date: tx.transaction_date,
    'Vendor Name': tx.vendor_name,
    'Original Vendor': tx.vendor_name_original,
    Category: tx.categories?.name || 'Uncategorized',
    Type: tx.type,
    Amount: tx.amount,
    'Payment Method': tx.raw_transaction_id ? 'Bank Transfer' : 'Other',
    'Internal Transfer': tx.is_internal_transfer ? 'Yes' : 'No',
    Notes: tx.notes || ''
  }))

  const csv = Papa.unparse(csvData)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export transactions to PDF
export function exportToPDF(data: ExportData) {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(20)
  doc.text('Financial Report', 14, 20)
  
  // Date range
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(data.summary.dateRange, 14, 30)
  
  // Summary section
  doc.setTextColor(0)
  doc.setFontSize(14)
  doc.text('Summary', 14, 45)
  
  doc.setFontSize(11)
  const summaryY = 55
  doc.text(`Total Income: ${formatCurrency(data.summary.totalIncome)}`, 14, summaryY)
  doc.text(`Total Expenses: ${formatCurrency(data.summary.totalExpenses)}`, 14, summaryY + 7)
  
  // Net balance with color
  const netBalance = data.summary.netBalance
  if (netBalance >= 0) {
    doc.setTextColor(0, 128, 0) // Green
  } else {
    doc.setTextColor(255, 0, 0) // Red
  }
  doc.text(`Net Balance: ${formatCurrency(netBalance)}`, 14, summaryY + 14)
  
  // Reset color
  doc.setTextColor(0)
  
  // Transactions table
  doc.setFontSize(14)
  doc.text('Transactions', 14, summaryY + 30)
  
  // Prepare table data
  const tableData = data.transactions.map(tx => [
    tx.transaction_date,
    tx.vendor_name.length > 30 ? tx.vendor_name.substring(0, 30) + '...' : tx.vendor_name,
    tx.categories?.name || 'Uncategorized',
    tx.type,
    formatCurrency(tx.amount)
  ])
  
  // Add table
  autoTable(doc, {
    head: [['Date', 'Vendor', 'Category', 'Type', 'Amount']],
    body: tableData,
    startY: summaryY + 35,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      1: { cellWidth: 50 }, // Vendor
      2: { cellWidth: 35 }, // Category
      3: { cellWidth: 20 }, // Type
      4: { cellWidth: 30, halign: 'right' } // Amount
    },
    // Add page numbers
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(10)
      doc.setTextColor(150)
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 10
      )
    }
  })
  
  // Save the PDF
  doc.save(`financial_report_${new Date().toISOString().split('T')[0]}.pdf`)
}