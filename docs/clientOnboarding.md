# Stripe Registration
``` mermaid
graph LR
    A[Server]--client personal details-->B
    B[Stripe]--client ID associated with details-->A

```

# Lead Byte Registration
```mermaid
    graph LR
    A[Server]--Client business details -->B
    B[Lead Byte]-- send the buyerID-->A 
```


# Client Onboarding

### User Details
- Collect essential user information.
- Includes personal details, contact information, etc.

### Business Details
- Gather information related to the user's business.
- Business name, industry, and other relevant details

### Lead Details
- Capture lead-specific information for tracking purposes.
- Helps in understanding the client's potential needs.

### Card Details
- Securely record payment information for billing purposes.
- PCI-compliant handling of sensitive data.

### User Dashboard
- Access granted upon successful onboarding.
- Central hub for client interactions and management.

```mermaid
    
    graph LR
        A[User Personal Datails] -- JWT TOKEN--> B
        B[Business Details] --Stripe Registration\n/Lead Byte Registration--> C
        C[Leads] --> D
        D[Card Details] --> 
        E[Dashboard]

```

# Credits and Billing

### Payment Methods
- Allows users to add and manage payment methods.
- Primarily supports credit cards.

### Payment Processing Options
- Manually Buy: User-initiated payment.
- Auto Charges: Automated billing based on usage.
- Weekly Payment Requests: Scheduled weekly payments.

### Billing for Non-Billable Clients
- Disables credit and billing features for specific user types.
- Enhances flexibility for varied business models.

## Add payment method


```mermaid

flowchart LR

    A["` **UI**
        _ADD NEW PAYMENT BUTTON_
        _SAVE BUTTON_
    `"] --(1)create session request on \nclick of add payment  --> B  
    A -- (4)on click of save \n button--> C -- (5) stripe sends \n session id -->B -- (6) server verfies card and \n add it to ui and db--> A
    B[SERVER] --(2)client Secret -->
    C[STRIPE] -- (3)opens the stripe form on ui  --> A
   
    style B color: red

```

## Add credits manually

```mermaid

flowchart LR
    A["`**UI DASHBOARD**
        Add credits
         manually
    `"] -- (1) amount --> B
    B[SERVER] --(2) sends payment\n method and amount--> C
    C[STRIPE] --(3) webhook call, trasnactions/\ninvoices will generated--> B
    B --(4) fail/ \n suceess--> A

    style B color: red

```

## Autocharge

```mermaid

    flowchart LR
        A[SERVER] --auto charge amount & \n payment method--> B
        B[STRIPE] -- webhook call, transactions/\n invoices generated --> A
        style A color:red

```

## Non-Billable Clients
- Non-billable clients complete onboarding without billing details.
- Access limited to non-financial features.


```mermaid
    
    graph LR
        A[User Personal Datails] -- JWT TOKEN--> B
        B[Business Details] --> C
        C[Leads] --> D 
        D[Dashboard]

```


# Business Management
- Customizable lead costs, lead columns based on business industry.
- User with selected industry will get the leads based on their industry.


# XERO integration and Invoices
  
  ```mermaid
  graph LR 
        A[Server]--during onboarding step of\n business details sends business name-->
        B[XERO]--send the contact ID associated\n with unique business name-->A
  
  ```
  ## Invoice generation

  ```mermaid
  graph LR
  A[Server]--send details of amount,\n accountcode-->B
  B[Xero] --sends invoiceId -->A
  
  ```
  


# Lead Processing
- We create a unique URL of every user associated with Buyer Id.
- Then, we use that url in lead byte and send the json data to this URL
- In Backend, we store that data based on buyer id.
```mermaid
        graph LR
A[Server]--user url/{buyerId}-->B
        B[Lead Byte]--send lead data-->A

```


# Webhook Events
- Activity Logs - used to send updated data to given webhook URL.
- Business Details Submissions: send user's business and service details on creation and updation.
- CMS Buyer - send user's all details on onboarding to dashboard to CMS for creating buyer on spotdiff CMS.
- Event Expension - used to send user's specific details upon some events like 0 credits, top-up, updation of post codes.
- Fully Signup Non-Billable Clients - when non-billable user complete onboarding.
-  Fully Signup with credits - when user complete onboarding and their initial top-up.
-  lead details submission - used to send lead data.
-  lead reported - when lead's get reported.
-  lead reprocess - when lead's get reprocess.
-  send lead data - when user receives leads then the lead data also get triggered to their zapier URL.  