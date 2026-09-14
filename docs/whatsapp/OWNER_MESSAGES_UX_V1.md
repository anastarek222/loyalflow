# Tanee WhatsApp + Messages — Owner UX V1

Status: implementation authority for the pre-Stitch WhatsApp owner experience.
Scope: owner-facing IA, product logic, labels, visibility, and operational hierarchy. This is not a full visual redesign.

## 1. Product boundary

Tanee has three distinct concepts and they must not be mixed:

1. **WhatsApp Settings** — connect the business sender, control automatic messages, author copy, and understand readiness.
2. **Messages** — operational delivery inbox/history for customer messages and recovery actions.
3. **Campaigns** — audience/campaign creation and outbound marketing workflows.

A business owner should never need Meta developer tooling, raw provider identifiers, access tokens, webhook configuration, or Graph API version controls during the normal product journey.

## 2. Navigation

Owner primary navigation in Simple mode:

1. Home
2. Scan
3. Customers
4. **Messages**
5. Activity

Advanced/product areas remain under the existing information architecture:

- Loyalty Program
- Rewards
- Offers
- Campaigns
- Recovery
- Reports
- Team
- Branches
- Settings

`Messages` is an operational destination, not a Settings subsection and not a Campaigns alias.

## 3. WhatsApp Settings

Path remains:

`/businesses/[slug]/settings/whatsapp`

### 3.1 Connection card

Normal owner sees:

- WhatsApp connection status: Not connected / Connected / Needs attention.
- Connected business display name and business phone when available.
- Primary action: **Connect WhatsApp** through official Meta Embedded Signup.
- Recovery action when required: **Reconnect WhatsApp**.
- Secondary destructive action: **Disconnect WhatsApp** with confirmation.

Normal owner does **not** see:

- Access token
- Phone Number ID
- WABA ID
- Graph API version
- raw webhook configuration
- raw provider/template IDs

Those belong to support/Super Admin diagnostics only.

### 3.2 Readiness checklist

Before messaging is ready, show one compact checklist instead of technical errors:

- Connect WhatsApp
- Get selected message templates approved by Meta
- Ready to send

The page must distinguish connection readiness from template approval readiness.

### 3.3 Automatic messages

One card/row per event:

- Welcome
- Balance Updated
- Reward Ready
- Reward Redeemed
- New Reward
- New Offer

Each event contains:

- ON/OFF control
- short explanation of the trigger
- owner-authored message copy
- supported variable chips
- WhatsApp-style preview
- approval state: Draft / In review / Approved / Needs changes
- Save action

Provider actions use owner language:

- **Send for review** instead of `Reconcile/submit`
- **Check status** instead of `Refresh from Meta`

Deterministic provider template names are not shown to normal owners.

### 3.4 Sending controls

Keep **Global Pause**, with explicit copy that it pauses automatic sends without disconnecting WhatsApp or deleting message copy.

Disconnect is separate and must never be presented as the normal way to stop automations.

### 3.5 Advanced diagnostics

Visible only to Super Admin/support context:

- WABA ID
- Phone Number ID
- Graph API version
- credential/provider readiness
- raw template/provider identifiers
- reconciliation diagnostics

Access tokens must never be rendered back after storage.

## 4. Messages

Primary label:

- EN: **Messages**
- AR: **الرسائل**

Purpose copy:

- EN: `Track WhatsApp messages sent to customers.`
- AR: `تابع رسائل واتساب المرسلة للعملاء وحالة توصيلها.`

### 4.1 Summary states

Show operational status filters/counters:

- All
- Queued
- Sending
- Sent
- Delivered
- Read
- Failed / Action required

### 4.2 Filters

- Customer
- Message type/event
- Delivery state
- Date range when supported
- Source when supported: Automatic / Manual / Campaign

### 4.3 Message row

Owner-facing row should prioritize:

- Customer
- Message type
- Source
- Sent/created time
- Delivery status
- concise failure/recovery text when needed
- safe action when available

Provider message IDs and internal job IDs are diagnostics, not primary row content.

### 4.4 Message details

Details should show:

- rendered message copy
- customer link
- delivery timeline: Queued → Sent → Delivered → Read
- timestamps
- attempt/recovery state
- safe Retry or Resend action when allowed

Retry/Resend must never replay the loyalty/reward business event.

## 5. Customer profile

Customer profile keeps a compact WhatsApp section with:

- consent/eligibility state
- masked or appropriate customer WhatsApp number display
- manual-send actions when the selected template is ready
- latest delivery status
- **View all messages** link to Messages filtered to that customer

Do not expose raw provider IDs/errors to normal owners.

## 6. Campaigns

Campaigns remains separate from Messages.

Campaigns owns:

- audience selection
- targeting/segments
- campaign copy/composition
- campaign scheduling/sending when provider-backed bulk delivery is available

Messages owns the resulting operational delivery history.

Do not make Messages a campaign builder and do not make Campaigns the delivery-history inbox.

## 7. Owner connection journey

Normal owner journey:

1. Settings → WhatsApp
2. Select **Connect WhatsApp**
3. Tanee opens official Meta Embedded Signup
4. Owner signs into Meta and selects/creates the permitted business/WABA/number flow
5. Owner approves requested access
6. Meta returns control to Tanee
7. Tanee stores the resulting connection securely
8. Owner sees Connected + readiness checklist
9. Owner authors/enables messages and submits templates for Meta review
10. Once approved, automatic/manual delivery becomes available

The owner does not create a Meta developer app or manually copy credentials into Tanee.

## 8. Certification-only controls

The temporary/manual setup used during staging certification is not the final customer journey.

Any manual credential entry or raw reconciliation tooling retained for platform certification must be hidden from normal owner UX and treated as support/Super Admin diagnostics.

## 9. Current implementation mapping

Already present in the codebase:

- Meta Embedded Signup client flow
- secure server action completion flow
- encrypted credential storage
- WABA subscription/readiness checks
- owner-authored automation copy
- template binding/approval states
- durable customer notification jobs
- provider delivery status tracking
- WhatsApp message history
- Retry/Resend recovery rules
- customer-level manual delivery

Current UX work:

- surface Messages in primary navigation
- rename/reframe history as Messages for owners
- simplify WhatsApp Settings for normal owners
- keep technical diagnostics for Super Admin/support
- link customer profile, Messages, and WhatsApp Settings coherently

## 10. Release gate

This UX work does not waive WhatsApp V1 certification.

Before WhatsApp V1 can be considered staging-certified, evidence still requires:

1. one Meta-approved template
2. a real provider message ID
3. Sent → Delivered → Read evidence
4. one controlled provider failure/recovery proof

No Production release is implied by this document.
