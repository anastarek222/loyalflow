# TC8 Participant Recruitment and Consent Guide

Status: `PREPARATION_ONLY`

## Purpose
Provide a repeatable, privacy-safe way to recruit and approve 5–10 real businesses for the LoyalFlow Closed Beta after the TC6 runtime gate is satisfied.

## Eligibility
A candidate business should:
- have an owner or authorized operator willing to participate;
- be able to test the agreed Staging/Beta journeys;
- understand that the environment is a Closed Beta and not Production;
- avoid uploading unnecessary sensitive personal data;
- be reachable for issue follow-up during the Beta window.

## Exclusions
Do not onboard a participant when:
- they require Production guarantees or contractual SLA commitments;
- they need unsupported provider/payment behavior for the test to be meaningful;
- they cannot provide an authorized business contact;
- the TC6 runtime gate is not PASS;
- the Product Owner has not approved the cohort.

## Recruitment script
Use a short, non-technical invitation that states:
1. LoyalFlow is running a limited Closed Beta.
2. Participation is for product testing, not a Production service commitment.
3. The participant will test defined workflows and report issues.
4. Only minimum necessary business/test data should be used.
5. Participation can be stopped at any time.

## Consent record
Before activation, record only:
- Participant ID from the participant tracker.
- Business display name.
- Authorized contact role.
- Approval date.
- Beta terms acknowledged: yes/no.
- Privacy/data-minimization acknowledgement: yes/no.
- Product Owner cohort approval: yes/no.

Do not place secrets, credentials, payment card data, government IDs, or customer-sensitive payloads in the tracker.

## Activation gate
A participant is `APPROVED_FOR_BETA` only when:
- TC6 runtime proof is PASS;
- the candidate meets eligibility criteria;
- acknowledgements above are complete;
- Product Owner approval is recorded.

This document does not activate any participant.