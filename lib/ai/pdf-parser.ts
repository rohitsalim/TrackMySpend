import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { statementSchema, type Statement, type ProcessingResult } from '@/types/pdf-processing'

// The comprehensive parsing prompt from PRD.md (lines 424-554)
const STATEMENT_PARSER_PROMPT = `You are a bank statement parser. Please analyze this PDF document and extract the following information:

1. Statement Type
Is this a bank account statement or a credit card statement?

2. Statement Level Information:
Extract the bank name from the statement header
Extract the statement period (start and end dates)
For bank statements:
- Extract the account number
- Extract the account type (savings, current, etc.)
For credit card statements:
- Extract the full credit card number
- Extract the card type (debit, credit, etc.)

3. Transactions
List all transactions with the following details:
- Date (in YYYY-MM-DD format)
- Description (the main transaction description)
- Reference Number (if present, otherwise leave empty)
- Raw Text: Concatenate all text from the transaction row with semicolons (;) between columns. The values from the first column should be at the beginning, then the value from the second column and so on
- Amount (as a string with 2 decimal places - always in the statement's base currency)
- Type (DEBIT/CREDIT)
- Original Currency (if different from base currency, otherwise leave empty)
- Original Amount (if foreign currency transaction, otherwise leave empty)

Foreign Currency Transaction Handling:
If a transaction shows an original foreign currency (e.g., "USD 29.00", "KWD 25.000"), extract:
- original_currency: The currency code (e.g., "USD", "KWD", "EUR")
- original_amount: The amount in foreign currency (e.g., 29.00, 25.000)
- amount: The converted amount in the statement's base currency (e.g., 2506.35 INR)

For domestic transactions, leave original_currency and original_amount empty

Amount Parsing Guidelines:
- Remove commas from amounts (e.g., "1,234.56" becomes 1234.56)
- Handle credit indicators like "Cr", "CR" (these should be CREDIT type)
- For foreign currency, always use the converted amount in base currency for the amount field as a string
- Always format amounts with exactly 2 decimal places (e.g., "1234.56", "10.00")

Key Enhancement Notes:
- Always identify the base currency of the statement (usually found in headers or account details)
- Parse foreign currency indicators like "USD 29.00", "EUR 45.50", "GBP 125.75"
- Maintain consistency - amount field should always be in base currency
- Handle multiple currency formats including different decimal separators and currency placement
- Use null for empty numeric fields and empty string for empty text fields

Here is the PDF content:`

export async function parsePDFStatement(pdfText: string): Promise<ProcessingResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'OpenAI API key is not configured'
        }
      }
    }

    const { object } = await generateObject({
      model: openai('gpt-4-turbo'),
      schema: statementSchema,
      prompt: `${STATEMENT_PARSER_PROMPT}\n\n${pdfText}`,
      temperature: 0, // For consistency in parsing
    })

    // Calculate parsing confidence based on completeness
    const confidence = calculateParsingConfidence(object)

    return {
      success: true,
      statement: object,
      parsing_confidence: confidence
    }

  } catch (error) {
    console.error('PDF parsing error:', error)
    
    return {
      success: false,
      error: {
        code: 'PARSING_FAILED',
        message: error instanceof Error ? error.message : 'Failed to parse PDF statement'
      }
    }
  }
}

function calculateParsingConfidence(statement: Statement): number {
  let score = 0
  const maxScore = 10

  // Basic required fields (4 points)
  if (statement.statement_type) score += 1
  if (statement.bank_name) score += 1
  if (statement.statement_start_date) score += 1
  if (statement.statement_end_date) score += 1

  // Account information (2 points)
  if (statement.statement_type === 'bank' && statement.account_number) score += 1
  if (statement.statement_type === 'credit_card' && statement.full_credit_card_number) score += 1
  if (statement.base_currency) score += 1

  // Transaction quality (4 points)
  if (statement.transactions.length > 0) {
    score += 1
    
    // Check transaction completeness
    const completeTransactions = statement.transactions.filter(tx => 
      tx.date && 
      tx.description && 
      tx.amount && 
      tx.type && 
      tx.raw_text
    ).length
    
    const completenessRatio = completeTransactions / statement.transactions.length
    score += Math.round(completenessRatio * 2) // 0-2 points for transaction completeness
    
    // Bonus for having reference numbers
    const withReferences = statement.transactions.filter(tx => tx.reference_number).length
    if (withReferences > 0) score += 1
  }

  return Math.round((score / maxScore) * 100) // Return percentage
}