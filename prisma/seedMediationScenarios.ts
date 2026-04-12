/**
 * Seed script — ARBITRATION_MEDIATION practice scenarios
 *
 * Run:  npx tsx prisma/seedMediationScenarios.ts
 *
 * Seeds 4 realistic ADR scenarios (2 mediation, 2 arbitration) for the
 * demo institute. Safe to re-run — uses upsert on caseId so existing
 * records are updated rather than duplicated.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getInstituteAndTutor() {
  const institute = await prisma.institute.findFirst({
    where: { subdomain: 'demo' },
  })
  if (!institute) throw new Error('Demo institute not found. Run the main seed first.')

  const tutor = await prisma.user.findFirst({
    where: { instituteId: institute.id, role: 'TUTOR' },
  })

  return { institute, tutor }
}

// ── Scenario definitions ──────────────────────────────────────────────────────

const scenarios = [

  // ── 1. Commercial supply-chain dispute (Mediation) ────────────────────────
  {
    caseId: 'ARB-SEED-001',
    title: 'SupplyChain Breakdown — Mediation',
    description:
      'A commercial mediation between a garment manufacturer and a raw-material supplier over delayed deliveries and resulting losses.',
    difficulty: 'MEDIUM' as const,
    isPublished: true,
    content: {
      mode: 'mediation',
      disputeType: 'Commercial',
      background:
        'Ramesh Textiles Pvt. Ltd. contracted Priya Fabrics Ltd. to deliver 10,000 metres of cotton fabric by 1 March 2024 for a retail export order. Priya Fabrics delivered only 4,200 metres by 20 March, citing a machine breakdown. Ramesh Textiles missed its export deadline, incurred penalty charges of ₹8.5 lakh from the buyer, and is now demanding compensation. Priya Fabrics claims the delay was caused by a power outage notified to Ramesh in advance and argues it constitutes force majeure.',
      partyA: {
        name: 'Ramesh Textiles Pvt. Ltd.',
        role: 'Claimant',
        position: 'Demanding ₹8.5 lakh as compensation for export penalties caused by the late delivery.',
        interests:
          'Recover losses quickly; preserve business reputation with the export buyer; continue the supplier relationship if possible.',
        facts: [
          'Signed supply contract dated 5 Jan 2024 with delivery deadline of 1 Mar 2024.',
          'Buyer imposed ₹8.5 lakh penalty per contract clause 12(b) for missed delivery.',
          'Ramesh sent two written reminders to Priya Fabrics in February 2024.',
          'Ramesh sourced 3,000 metres from an alternate supplier at ₹1.2 lakh premium cost.',
          'The export order was worth ₹42 lakh in total.',
        ],
      },
      partyB: {
        name: 'Priya Fabrics Ltd.',
        role: 'Respondent',
        position: 'Denying full liability; willing to pay ₹2 lakh as goodwill compensation only.',
        interests:
          'Avoid a large payout; preserve cash flow (currently cash-strapped); maintain the long-term business relationship.',
        facts: [
          'State electricity board issued a written notice of 3-day power cut from 10–12 Feb 2024.',
          'Priya Fabrics notified Ramesh via email on 11 Feb 2024 about likely delays.',
          'Machine breakdown occurred on 15 Feb and repair took 8 days.',
          'Priya Fabrics delivered 4,200 metres on 20 Mar at no extra charge.',
          'Parties have had a 6-year business relationship with no prior disputes.',
        ],
      },
      applicableLaw: [
        'Indian Contract Act, 1872 — Section 32 (contingent contracts), Section 56 (frustration/force majeure)',
        'Arbitration and Conciliation Act, 1996 — Part III (conciliation)',
        'Sale of Goods Act, 1930 — Section 55 (delivery by instalments)',
      ],
      instructions:
        'Conduct the mediation in three phases: (1) Opening — allow each party to present their position uninterrupted; (2) Exploration — use open questions to uncover underlying interests; (3) Bargaining — help the parties generate and evaluate settlement options. Aim to reach a written settlement agreement by the end of the session.',
    },
  },

  // ── 2. Tenant–Landlord property dispute (Mediation) ──────────────────────
  {
    caseId: 'ARB-SEED-002',
    title: 'Security Deposit Dispute — Mediation',
    description:
      'A residential tenancy mediation between a landlord and departing tenant over withheld security deposit and alleged property damage.',
    difficulty: 'EASY' as const,
    isPublished: true,
    content: {
      mode: 'mediation',
      disputeType: 'Property / Real Estate',
      background:
        'Sunita Kaur rented a 2BHK flat in Bengaluru from Mr. Arvind Nair under a leave-and-licence agreement for 11 months ending 31 Jan 2024. Sunita vacated on time and requested return of her ₹1.2 lakh security deposit. Arvind has withheld the full amount, claiming deductions for a broken bathroom tile (₹18,000), repainting (₹35,000), and unpaid electricity bills (₹12,400). Sunita disputes all deductions, arguing normal wear-and-tear and that the tile was pre-existing damage documented in the move-in photos.',
      partyA: {
        name: 'Sunita Kaur',
        role: 'Claimant (Tenant)',
        position: 'Demanding full refund of ₹1,20,000 security deposit.',
        interests:
          'Recover money quickly — she is paying a new deposit elsewhere; wants acknowledgment that she was a responsible tenant.',
        facts: [
          'Move-in inspection photos dated 1 Mar 2023 show the bathroom tile was already cracked.',
          'Sunita has WhatsApp messages from Arvind praising the flat condition in December 2023.',
          'Electricity bills were paid directly to BESCOM; Sunita holds all receipts up to Jan 2024.',
          'The licence agreement does not specify a repainting obligation on the tenant.',
          'Sunita returned the keys on 31 Jan 2024 with a signed handover receipt.',
        ],
      },
      partyB: {
        name: 'Arvind Nair',
        role: 'Respondent (Landlord)',
        position: 'Deducting ₹65,400 for damages and unpaid dues; willing to return only ₹54,600.',
        interests:
          'Recover repair costs before re-letting; concerned about legal hassle; wants to re-let quickly.',
        facts: [
          'Contractor quote for tile replacement and repainting totals ₹53,000.',
          'Arvind claims one electricity bill for ₹12,400 (Dec 2023) was never paid.',
          'Arvind re-let the flat from 15 Feb 2024 after repainting.',
          'The licence agreement includes a clause for "fair wear-and-tear" exclusion.',
          'Arvind did not conduct a formal move-out inspection with Sunita present.',
        ],
      },
      applicableLaw: [
        'Karnataka Rent Act, 1999',
        'Indian Contract Act, 1872 — Section 74 (liquidated damages)',
        'Transfer of Property Act, 1882 — Section 108 (rights and liabilities of lessor/lessee)',
      ],
      instructions:
        'This is a simple two-party mediation. Focus on narrowing the factual disputes first (was the tile pre-damaged? Were bills paid?), then move to interest-based negotiation on the deposit amount. Encourage a joint fact-finding approach before bargaining. A partial refund with a written acknowledgment is a realistic outcome.',
    },
  },

  // ── 3. Employment wrongful termination (Arbitration) ─────────────────────
  {
    caseId: 'ARB-SEED-003',
    title: 'Wrongful Termination — Arbitration',
    description:
      'An employment arbitration where a senior software engineer claims wrongful termination without cause and seeks reinstatement and back-pay.',
    difficulty: 'HARD' as const,
    isPublished: true,
    content: {
      mode: 'arbitration',
      disputeType: 'Labour / Employment',
      background:
        'Kiran Menon, a Senior Software Engineer at TechSpark Solutions Pvt. Ltd., was terminated on 15 Oct 2023 with 30 days\' pay-in-lieu of notice. The company cites "poor performance" following a PIP (Performance Improvement Plan) issued in July 2023. Kiran argues the PIP was issued in bad faith after he reported a data-privacy compliance concern to senior management, amounting to victimisation. He seeks reinstatement or, alternatively, 12 months\' compensation (₹18 lakh), plus damages for reputational harm.',
      partyA: {
        name: 'Kiran Menon',
        role: 'Claimant (Employee)',
        position: 'Seeking reinstatement or ₹18 lakh compensation + ₹5 lakh reputational damages.',
        interests:
          'Vindication of his professional reputation; financial security; deterrence for others who raise compliance concerns.',
        facts: [
          'Kiran received "Exceeds Expectations" in his April 2023 annual appraisal.',
          'He sent a written compliance concern to the CTO on 2 June 2023 regarding GDPR violations.',
          'PIP issued on 10 July 2023 — 35 days after the compliance report.',
          'PIP targets were set without Kiran\'s input and changed twice mid-cycle.',
          'No other team member was on a PIP during the same period despite similar output metrics.',
          'Kiran has a clean disciplinary record over 4 years of employment.',
        ],
      },
      partyB: {
        name: 'TechSpark Solutions Pvt. Ltd.',
        role: 'Respondent (Employer)',
        position: 'Defending the termination as lawful; denying victimisation; opposing reinstatement.',
        interests:
          'Avoid reputational damage from a "whistleblower" narrative; limit financial exposure; set a precedent that performance standards apply equally.',
        facts: [
          'The PIP was approved by HR before Kiran\'s compliance report was internally circulated.',
          'Project delivery metrics show Kiran missed 3 of 5 sprint deadlines in Q2 2023.',
          'Two other employees (not complainants) were also placed on PIPs in Q2 2023.',
          'Kiran was given a 90-day PIP period; he was terminated after 97 days.',
          'Company policy allows termination on notice after PIP failure.',
          'The compliance concern Kiran raised was investigated and found "unsubstantiated" by external auditors.',
        ],
      },
      applicableLaw: [
        'Industrial Disputes Act, 1947 — Section 25F (conditions precedent to retrenchment)',
        'Indian Contract Act, 1872 — employment contract terms',
        'Information Technology Act, 2000 — Section 72A (data privacy obligations)',
        'Whistleblowers Protection Act, 2014',
      ],
      instructions:
        'Conduct a structured hearing in three rounds: (1) Claimant\'s opening submission; (2) Respondent\'s opening submission; (3) Cross-examination round where each party may question the other\'s statements. After hearing both sides, you must issue a written Award addressing: (a) whether the termination was lawful; (b) whether victimisation is established; (c) appropriate remedy. Your award should be reasoned and cite applicable law.',
    },
  },

  // ── 4. Partnership dissolution dispute (Arbitration) ─────────────────────
  {
    caseId: 'ARB-SEED-004',
    title: 'Partnership Dissolution — Arbitration',
    description:
      'A business arbitration between two co-founders over the valuation and exit terms upon dissolving a 50:50 partnership firm.',
    difficulty: 'HARD' as const,
    isPublished: true,
    content: {
      mode: 'arbitration',
      disputeType: 'Commercial',
      background:
        'Anand Sharma and Deepa Iyer co-founded "Brightpath EdTech" as a registered partnership firm in 2020 with equal 50:50 shares. Following irreconcilable strategic differences, both partners agree to dissolve the firm. They dispute (a) the valuation of the firm\'s IP assets (a proprietary learning platform); (b) Deepa\'s claim for ₹12 lakh in unpaid salary she alleges was deferred; and (c) which partner has the right to retain the brand name and customer contracts after dissolution.',
      partyA: {
        name: 'Anand Sharma',
        role: 'Claimant',
        position: 'Values firm at ₹45 lakh; disputes deferred salary claim; asserts right to retain the platform IP as he built it.',
        interests:
          'Continue the product independently; preserve investor relationships; quick clean break.',
        facts: [
          'Anand wrote 80% of the platform code according to Git commit history.',
          'The partnership deed is silent on IP ownership upon dissolution.',
          'No board resolution or written agreement exists for Deepa\'s deferred salary.',
          'Anand introduced all 3 institutional clients currently on the platform.',
          'The firm\'s CA-certified balance sheet values total assets at ₹38 lakh.',
        ],
      },
      partyB: {
        name: 'Deepa Iyer',
        role: 'Respondent',
        position: 'Values firm at ₹70 lakh (goodwill premium); claims ₹12 lakh deferred salary; asserts equal right to IP and clients.',
        interests:
          'Fair recognition for business development work; recover personal financial sacrifice; launch her own competing product.',
        facts: [
          'Deepa\'s WhatsApp messages show Anand acknowledged the deferred salary arrangement in Mar 2022.',
          'Deepa generated ₹28 lakh of the firm\'s ₹35 lakh cumulative revenue through client relationships.',
          'An independent valuation obtained by Deepa values the platform IP at ₹32 lakh alone.',
          'The partnership deed requires unanimous consent for IP assignment.',
          'Deepa holds a CFA certificate and managed all investor communications.',
        ],
      },
      applicableLaw: [
        'Indian Partnership Act, 1932 — Sections 44–55 (dissolution and settlement of accounts)',
        'Indian Contract Act, 1872 — Section 27 (restraint of trade)',
        'Copyright Act, 1957 — Section 17 (authorship and ownership of works)',
        'Arbitration and Conciliation Act, 1996 — Part I (domestic arbitration)',
      ],
      instructions:
        'This is a multi-issue arbitration. Structure your hearing as follows: (1) Opening statements from both parties; (2) Evidence and submissions on each issue separately — valuation, deferred salary, IP and brand rights; (3) Closing arguments. Your Award must resolve all three issues with reasoning, cite applicable statutory provisions, and specify the exact monetary settlement and asset allocation.',
    },
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Arbitration & Mediation scenarios...\n')

  const { institute, tutor } = await getInstituteAndTutor()
  console.log(`📍 Institute : ${institute.name} (${institute.subdomain})`)
  console.log(`👤 Tutor     : ${tutor?.name ?? '(none — tutorId will be null)'}\n`)

  let created = 0
  let updated = 0

  for (const s of scenarios) {
    const existing = await prisma.practiceScenario.findFirst({
      where: { caseId: s.caseId, instituteId: institute.id },
    })

    if (existing) {
      await prisma.practiceScenario.update({
        where: { id: existing.id },
        data: {
          title:       s.title,
          description: s.description,
          difficulty:  s.difficulty,
          isPublished: s.isPublished,
          content:     s.content,
          isActive:    true,
          tutorId:     tutor?.id ?? null,
        },
      })
      console.log(`  ✏️  Updated  : ${s.title}`)
      updated++
    } else {
      await prisma.practiceScenario.create({
        data: {
          instituteId: institute.id,
          moduleType:  'ARBITRATION_MEDIATION',
          tutorId:     tutor?.id ?? null,
          caseId:      s.caseId,
          caseType:    s.content.disputeType,
          title:       s.title,
          description: s.description,
          difficulty:  s.difficulty,
          isPublished: s.isPublished,
          content:     s.content,
        },
      })
      console.log(`  ✅ Created  : ${s.title}`)
      created++
    }
  }

  // Enable the module for the demo institute
  await prisma.practiceModule.upsert({
    where: {
      instituteId_moduleType: {
        instituteId: institute.id,
        moduleType:  'ARBITRATION_MEDIATION',
      },
    },
    update:  { isEnabled: true },
    create:  { instituteId: institute.id, moduleType: 'ARBITRATION_MEDIATION', isEnabled: true },
  })
  console.log('\n  ✅ Module enabled in PracticeModule table')

  console.log(`\n🎉 Done — ${created} created, ${updated} updated`)
  console.log('\nScenarios seeded:')
  console.log('  ARB-SEED-001  SupplyChain Breakdown              [Mediation  · MEDIUM]')
  console.log('  ARB-SEED-002  Security Deposit Dispute           [Mediation  · EASY  ]')
  console.log('  ARB-SEED-003  Wrongful Termination               [Arbitration· HARD  ]')
  console.log('  ARB-SEED-004  Partnership Dissolution            [Arbitration· HARD  ]')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
