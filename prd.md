## **🧠 Project Name: *TrackMySpend* (Placeholder)**

**Version**: MVP  
**Owner**: Rohith Salim  
**Date**: July 2025  
---

## **🔥 Problem Statement**

For young Indian families, understanding where their money goes each month is difficult. Most people rely on multiple bank accounts, credit cards, and UPI apps. Monthly statements are hard to read, vendors are anonymized, and there’s no easy way to get a consolidated picture of expenses.

**Goal:**  
Build a secure, intuitive web app that helps users (and their families) understand how they’re spending their money by uploading their financial statements and getting clear, categorized insights.

---

## **🎯 Goals & Success Metrics**

**Launch Goal:**  
Get 10 users from the founder’s personal network to upload statements and use the app regularly.

**Success Criteria:**

* 10 users complete at least 1 upload session uploading at least 1 document  
* Users return to check dashboards at least once post-upload  
* 1–2 users manually edit or tag expenses  
* All users give feedback on what they want from the application

---

## **🧱 Scope (MVP)**

### **✅ Key Features**

#### **1\. 🔐 Authentication**

* Email-based login (basic auth via Supabase). Would prefer if we just do Google Authentication.

#### **2\. 📤 Upload Statements**

* Users can upload up to **20 PDFs** at once  
* Statement formats will vary (ICICI, HDFC, etc.)  
  * Use LLM-based processing to extract transaction data  
* Store raw files in Supabase storage  
* Note:   
  * Users may upload the same statements or partial statements. We need to make sure we have de-duping logic at the individual line-item level.   
  * Additionally, we also need to de-dupe for the scenario of a user paying their credit card statement which shows up as a debit on the account statement and a credit on the credit card statement  
    * These kinds of transactions should show up in the list of transactions as a disabled row with a message on hover 

#### **3\. 🧾 Transaction Parsing & Storage**

* Parse each PDF to extract key details (current schema attached at the bottom)  
* Store transactions in a structured DB

#### **4\. 🏷 Vendor Deanonymization**

* Use LLM \+ Google Search to map vendor names (e.g. “Bundl Tech” → “Swiggy”)  
  * “Magic Moment”  
* Allow user to edit mapped names  
* Save overrides for future users (shared vendor mapping memory)

#### **5\. 📂 Categorization**

* Auto-categorize transactions into predefined categories (e.g. Food, Travel)  
* Support subcategories  
* Allow users to:  
  * Edit categories per transaction  
  * Add custom categories  
* Eg. on Categories and Sub-categories  
  * There may be a top-level category called Healthcare and a Sub-category called Daughter’s Healthcare  

#### **6\. 📊 Dashboard (Post-login Landing Screen)**

* “My View” (default), “Family View”, “Specific User” toggle  
* Show charts:  
  * Month-over-month: **Income vs Expense**  
  * Monthly: **Category-wise Expense Breakdown**  
    * Allow users to toggle by various categories  
  * Key Transactions  
* LLM-generated **monthly insights** (text-based)  
  * “You seem to have ordered a lot more this month than the previous month”  
  * We can, for the MVP, just send everything to claude/chatgpt and see what they come up with. Eventually \- we may want to be a lot more defined in what we want to show. 

#### **7\. 📄 Transactions View**

* Table of all transactions  
* Filter by:  
  * Month  
  * Category  
  * Vendor  
  * Person  
* Allow users to edit transactions \- especially the merchant name and the category associated with the transactions  
  * A user should be able to add a new category from there itself. 

#### **8\. 🧍 Profile**

* Name \+ Email  
* Uploaded Statements List View:  
  * File name  
  * Upload date  
  * Person inferred  
  * Number of transactions  
  * Total Income (summing all credit transactions)  
  * Total Expenses (summing all debit transactions)  
  * Option to delete  
* Logout

#### **9\. 📱 Responsive Design**

* Desktop: Side Navigation  
* Mobile: Bottom Tab Navigation (Dashboard, Transactions, Profile)

---

## **🖥 Navigation Summary**

| Section | Desktop Nav | Mobile Tab Nav |
| ----- | ----- | ----- |
| Dashboard | Side Nav Item | Bottom Tab |
| Transactions | Side Nav Item | Bottom Tab |
| Profile | Side Nav Item | Bottom Tab |

---

## **❌ Not in Scope (MVP)**

These are explicitly excluded from the MVP build to stay focused:

* Chatbot interface to “talk to expenses” and “get suggestions”  
* Budget setting & tracking  
* Goal setting and financial planning  
* Manual Expense Entry  
  * OCR from receipt photos  
* Real-time expense tracking via SMS or API integration  
* Payment collection (pay-what-you-want)  
* Multi-user family account invites  
  * Role-based access permissions for families  
* Recurring billing or subscriptions detection  
  * Allowing users to be able to cancel subscriptions from within the platform itself  
* Allowing users to tag expenses (beyond categories).   
  * Tags could be for things like: “One-time Expense”, “Business Expense”  
* Custom Category Manager in Profile

---

## **🧪 Testing Requirements**

* ✅ Upload & parse PDFs from at least 5 Indian banks/cards  
* ✅ Ensure fallback experience if parsing fails  
* ✅ Validate charts and summaries for a sample user with 3 months of data  
* ✅ Test editing transactions, vendors, and categories  
* ✅ Mobile usability on iOS and Android browser  
* ✅ Data privacy disclaimers and basic trust indicators on UI

---

## **📦 Deliverables**

* Functional web app (responsive)  
* Excellent test coverage for both backend \+ FE code  
* API endpoints in case a mobile app needs to be built separately   
* Working upload → parse → dashboard flow  
* LLM integration for parsing & monthly insights  
* UI polish for 3 core views (Dashboard, Transactions, Profile)  
* GitHub repo with README and setup instructions

---

# Appendix

## Wireframes from Monarch Money (US Company)

Only the dashboard and the Transaction View is actually relevant for us. 

### Dashboard![][image1]

This is the general layout that I am thinking out. The different cards that I see on there are:

1. Income vs expenses  
2. Upcoming recurring expenses  
3. Key insights (Will send everything over to claude to get those insights)

### Transactions

# ![][image2]

Will contain all transactions across different cards and sources grouped by day. The grid should have filters to slice and dice this data. 

Users should be able to rename the vendor/merchant (column 1\) and change the category (column 2). If a category does not exist, they should be able to create a new category on demand. 

### Cashflow

![][image3]  
![][image4]

This is basically meant to show income versus expenses grouped by category. 

No actions on the user other than viewing it. 

### Reports

![][image5]  
This is a cool chart that exists which shows where your money is going visually. However, there may be better ways to express this data. 

Again filters should exist to slide and dice the chart data appropriately. 

## Current Schema

### Core Entities

#### 1\. Users

* Table:   
* users  
* Purpose: Stores user account information  
* Key Fields:  
  * id: Primary key  
  * email: Unique email address  
  * hashed\_password: Securely hashed password  
  * is\_active: Account status flag  
  * is\_superuser: Admin privileges flag  
  * created\_at: Account creation timestamp  
  * updated\_at: Last update timestamp

#### 2\. Bank Accounts

* Table: bank\_accounts  
* Purpose: Tracks user's bank accounts  
* Key Fields:  
  * id: Primary key  
  * user\_id: Foreign key to users  
  * bank\_name: Name of the bank  
  * account\_type: Type of account (e.g., CHECKING, SAVINGS)  
  * account\_number: Last 4 digits of account number  
  * balance: Current account balance  
  * currency: Account currency code (e.g., USD, EUR)

#### 3\. Credit Cards

* Table: credit\_cards  
* Purpose: Tracks user's credit cards  
* Key Fields:  
  * id: Primary key  
  * user\_id: Foreign key to users  
  * card\_type: Card network (e.g., VISA, MASTERCARD)  
  * last\_4\_digits: Last 4 digits of card number  
  * credit\_limit: Card's credit limit  
  * current\_balance: Current balance  
  * statement\_date: Monthly statement date  
  * due\_date: Payment due date

#### 4\. Vendors

* Table: vendors  
* Purpose: Master list of all vendors/merchants  
* Key Fields:  
  * id: Primary key  
  * name: Vendor name  
  * category: Default category for vendor  
  * created\_at: Creation timestamp

#### 5\. Vendor Aliases

* Table: vendor\_aliases  
* Purpose: Maps transaction descriptions to vendors  
* Key Fields:  
  * id: Primary key  
  * vendor\_id: Foreign key to vendors  
  * alias\_name: Common name or variation  
  * is\_primary: Whether this is the primary alias  
  * created\_at: Creation timestamp

#### 6\. Categories

* Table:   
* categories  
* Purpose: System-defined expense categories  
* Key Fields:  
  * id: Primary key  
  * name: Category name (e.g., "Food", "Transportation")  
  * description: Category description  
  * parent\_id: For subcategories (self-referential)

#### 7\. User Categories

* Table:   
* user\_categories  
* Purpose: User-specific categories  
* Key Fields:  
  * id: Primary key  
  * user\_id: Foreign key to users  
  * name: Category name  
  * color: Hex color code for UI  
  * icon: Icon identifier  
  * parent\_id: For subcategories  
  * is\_system: Whether it's a system category

#### 7.5 RawTransaction

#### 8\. Transactions

* Table:   
* transactions  
* Purpose: Core transaction records  
* Key Fields:  
  * id: Primary key  
  * user\_id: Foreign key to users  
  * vendor\_id: Foreign key to vendors  
  * user\_category\_id: Foreign key to user\_categories  
  * bank\_account\_id: Foreign key to bank\_accounts (nullable)  
  * credit\_card\_id: Foreign key to credit\_cards (nullable)  
  * amount: Transaction amount  
  * transaction\_type: DEBIT, CREDIT, or INVESTMENT  
  * description: Transaction description  
  * transaction\_date: Date of transaction  
  * notes: User notes  
  * original\_currency\_code: For foreign transactions  
  * original\_amount: Amount in original currency

#### 9\. Files

* Table: files  
* Purpose: Tracks uploaded statement files  
* Key Fields:  
  * id: Primary key  
  * user\_id: Foreign key to users  
  * filename: Original filename  
  * file\_type: File extension/type  
  * status: Processing status  
  * uploaded\_at: Upload timestamp

#### 10\. Statement Metadata

* Table:   
* statement\_metadata  
* Purpose: Metadata for bank/credit card statements  
* Key Fields:  
  * id: Primary key  
  * file\_id: Foreign key to files  
  * account\_type: BANK or CREDIT\_CARD  
  * account\_id: ID of related account  
  * statement\_period\_start: Start date  
  * statement\_period\_end: End date  
  * opening\_balance: Account balance at start  
  * closing\_balance: Account balance at end

### Key Relationships

1. User to Accounts:  
   * One-to-Many: A user can have multiple bank accounts and credit cards  
   * Enforced by user\_id foreign keys in bank\_accounts and credit\_cards  
2. Transaction to Vendor:  
   * Many-to-One: Many transactions can reference one vendor  
   * Enforced by vendor\_id in   
   * transactions  
3. Transaction to Category:  
   * Many-to-One: Transactions are categorized under a single user category  
   * Enforced by user\_category\_id in   
   * transactions  
4. Vendor to Aliases:  
   * One-to-Many: A vendor can have multiple aliases  
   * Enforced by vendor\_id in vendor\_aliases  
5. File to Statements:  
   * One-to-Many: One file can contain multiple statements  
   * Enforced by file\_id in   
   * statement\_metadata

### Indexes

1. Transaction Lookups:  
   * idx\_transactions\_user\_date: On   
   * (user\_id, transaction\_date DESC)  
   * idx\_transactions\_vendor: On vendor\_id  
   * idx\_transactions\_category: On user\_category\_id  
2. Performance:  
   * idx\_bank\_accounts\_user: On user\_id in bank\_accounts  
   * idx\_credit\_cards\_user: On user\_id in credit\_cards  
   * idx\_vendor\_aliases\_vendor: On vendor\_id in vendor\_aliases

### Enums

1. TransactionType:  
   * DEBIT: Money going out  
   * CREDIT: Money coming in  
   * INVESTMENT: Investment-related transactions  
2. AccountType (for bank accounts):  
   * CHECKING  
   * SAVINGS  
   * CREDIT\_CARD  
   * INVESTMENT  
3. FileStatus:  
   * PENDING: Uploaded but not processed  
   * PROCESSING: Currently being processed  
   * COMPLETED: Successfully processed  
   * FAILED: Processing failed

### Security Considerations

1. Sensitive Data:  
   * Passwords are hashed using bcrypt  
   * Account numbers are never stored fully \- only last 4 digits  
   * No CVV or full card numbers are stored  
2. Data Access:  
   * All queries are scoped to the current user  
   * Row-level security could be implemented in the future

### Future Extensions

1. Multi-currency Support:  
   * Track exchange rates  
   * Support for automatic currency conversion  
2. Recurring Transactions:  
   * Identify and track recurring payments  
   * Predict future expenses  
3. Budgeting:  
   * Set budget limits per category  
   * Track spending against budgets  
4. Receipts:  
   * Store receipt images  
   * OCR for receipt data extraction

This schema is designed to be flexible enough to handle various financial institutions' data while maintaining data integrity and performance. The relationships are normalized to reduce redundancy while still allowing for efficient querying of transaction data.

## Prompt to Extract Data from a Credit Card/Account Statement

Enhanced Bank/Credit Card Statement Parser Prompt  
You are a bank statement parser. Please analyze this PDF document and extract the following information:

1\. Statement Type  
Is this a bank account statement or a credit card statement?

2\. Statement Level Information:

Extract the bank name from the statement header  
Extract the statement period (start and end dates)  
For bank statements:

Extract the account number  
Extract the account type (savings, current, etc.)

For credit card statements:

Extract the full credit card number  
Extract the card type (debit, credit, etc.)

3\. Transactions  
List all transactions with the following details:

Date (in YYYY-MM-DD format)  
Description (the main transaction description)  
Reference Number (if present, otherwise leave empty)  
Raw Text: Concatenate all text from the transaction row with semicolons (;) between columns. The values from the first column should be at the beginning, then the value from the second column and so on  
Amount (as a float \- always in the statement's base currency)  
Type (DEBIT/CREDIT)  
Original Currency (if different from base currency, otherwise leave empty)  
Original Amount (if foreign currency transaction, otherwise leave empty)

Foreign Currency Transaction Handling:

If a transaction shows an original foreign currency (e.g., "USD 29.00", "KWD 25.000"), extract:

original\_currency: The currency code (e.g., "USD", "KWD", "EUR")  
original\_amount: The amount in foreign currency (e.g., 29.00, 25.000)  
amount: The converted amount in the statement's base currency (e.g., 2506.35 INR)

For domestic transactions, leave original\_currency and original\_amount empty

Amount Parsing Guidelines:

Remove commas from amounts (e.g., "1,234.56" becomes 1234.56)  
Handle credit indicators like "Cr", "CR" (these should be CREDIT type)  
For foreign currency, always use the converted amount in base currency for the amount field

JSON Output Format:  
{{  
   "statement\_type": "bank|credit\_card",  
   "bank\_name": "",  
   "statement\_start\_date": "YYYY-MM-DD",  
   "statement\_end\_date": "YYYY-MM-DD",  
   "base\_currency": "",  \# The primary currency of the statement (e.g., "INR", "USD")  
   "account\_number": "",  \# Mostly for bank statements but some credit card statements could have it as well  
   "account\_type": "",    \# Only for bank statements  
   "full\_credit\_card\_number": "",  \# Only for credit card statements  
   "card\_type": "",       \# Only for credit card statements  
   "transactions": \[  
       {{  
           "date": "YYYY-MM-DD",  
           "description": "",  
           "reference\_number": "",  
           "raw\_text": "",  
           "amount": 0.0,  
           "type": "DEBIT|CREDIT",  
           "original\_currency": "",  \# Empty if domestic transaction  
           "original\_amount": 0.0   \# Empty if domestic transaction  
       }}  
   \]  
}}

Examples:

Domestic Transaction:  
Date: 01/05/2024; Ref: 123456; Description: Online Purchase; Amount: 500.00 DR  
Output:  
{{  
   "date": "2024-05-01",  
   "description": "Online Purchase",  
   "reference\_number": "123456",  
   "raw\_text": "01/05/2024;123456;Online Purchase;500.00 DR",  
   "amount": 500.00,  
   "type": "DEBIT",  
   "original\_currency": "",  
   "original\_amount": null  
}}

Foreign Currency Transaction:  
Date: 07/04/2025; Description: AMAZON.COM USD 29.95; Converted: 2,487.63 INR  
Output:  
{{  
   "date": "2025-04-07",  
   "description": "AMAZON.COM",  
   "reference\_number": "",  
   "raw\_text": "07/04/2025;AMAZON.COM USD 29.95;Converted: 2,487.63 INR",  
   "amount": 2487.63,  
   "type": "DEBIT",  
   "original\_currency": "USD",  
   "original\_amount": 29.95  
}}

Credit/Reversal Transaction:  
Date: 22/03/2025; Description: PETRO SURCHARGE WAIVER; Amount: 50.09 Cr  
Output:  
{{  
   "date": "2025-03-22",  
   "description": "PETRO SURCHARGE WAIVER",  
   "reference\_number": "",  
   "raw\_text": "22/03/2025;PETRO SURCHARGE WAIVER;50.09 Cr",  
   "amount": 50.09,  
   "type": "CREDIT",  
   "original\_currency": "",  
   "original\_amount": null  
}}

Key Enhancement Notes:

Always identify the base currency of the statement (usually found in headers or account details)  
Parse foreign currency indicators like "USD 29.00", "EUR 45.50", "GBP 125.75"  
Maintain consistency \- amount field should always be in base currency  
Handle multiple currency formats including different decimal separators and currency placement  
Use null for empty numeric fields and empty string for empty text fields

Here is the PDF content:  


