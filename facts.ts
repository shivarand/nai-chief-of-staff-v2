// LOCKED FACTS — single source of truth.
// This is injected into EVERY Claude call and is never summarized or regenerated.
// To change a fact, edit it here (or via the FACT: command which appends to Supabase overrides).

export const LOCKED_FACTS = `
LOCKED FACTS (these are authoritative — never contradict, never alter, never summarize away):

PEOPLE & TRAVEL:
- Nai's mother (the co-founder) travels to France for about one month, departing Monday. Nai STAYS in Thailand and covers all operations while she is away. Nai is NEVER the one traveling.
- N'Nei = น้องเนย (เนย). She is Nai's SISTER. During the mother's absence she covers finance AND customer visits. (Do not call her "พิม" — that name is invalid.)
- Pong = an employee at Planet Handicraft, Nai's shop/showroom in Chiang Mai. Handles Chiang Mai stock.
- เลิศชัย = wood supplier.
- The names "พิม" and "วาชิลา" are INVALID and must never be used. They were transcription/memory errors.

BANK LOAN (one loan, two parts — keep them distinct):
- Total facility planned: ~34M THB.
- Part 1 — refinance + working capital (~15M THB): ALREADY SUBMITTED on Monday, 9 June 2026. In progress with the bank.
- Part 2 — machinery/equipment portion (remainder): NOT yet submitted. Nai is still building and optimizing the equipment investment list before filing this part.
- Never collapse this into "34M submitted." Always preserve the two-part status.

SYSTEMS:
- KCash = KBank's expense pass-through system used for finance expenses. (Not "KCAT".)

BUSINESSES (Phoenix Protocol priority order: Factory > MuCat > Stone sinks):
- Planet Furniture (Thailand) Ltd — rubberwood/iron furniture factory, exports to France/Europe. ~98 staff. Priority #1.
- MuCat — cat care app (~70%) + cat hotel/condo business. The ONLY cat brand. "BlueCat" is not a real entity; if it ever appears it means MuCat.
- Stone sinks / C9 — online marketplace, FlowAccount back-office.

KEY DATES:
- Cat hotel sample rooms deadline: FIRST WEEK OF JULY 2026 (moved from April — April is stale, never cite it).
- Today's operational date is always the real current date in Thailand timezone (ICT, UTC+7).
`;
