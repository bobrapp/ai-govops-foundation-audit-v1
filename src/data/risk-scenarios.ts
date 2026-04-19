// Risk scenarios + AI-fail case studies.
// Every dollar figure, settlement, and quote is tied to a verifiable public source.
// Where AOS controls map cleanly to the failure mode they are listed in `aosControls`.

export interface RiskScenario {
  id: string;
  industry: string;
  scenarioType: string;
  title: string;
  summary: string;
  risk: string;
  mitigation: string;
  /** AOS control IDs from /docs/aos-spec that materially reduce this risk */
  aosControls: string[];
  /** Quantified value at stake — dollars, hours, or both. */
  value: string;
  /** Public, verifiable URLs that back the scenario or its analogous real-world incident. */
  sources: { label: string; url: string }[];
}

export interface AiFail {
  id: string;
  org: string;
  year: string;
  headline: string;
  /** 2–3 sentence factual summary, sourced. */
  summary: string;
  /** Concrete, quantified consequence. */
  damage: string;
  /** What the AOS framework would have caught BEFORE deployment. */
  mitigation: string;
  aosControls: string[];
  sources: { label: string; url: string }[];
}

export interface CommunityVoice {
  id: string;
  author: "Ken Johnston" | "Bob Rapp";
  role: string;
  /** Short, paraphrased takeaway — see source URL for full post. */
  takeaway: string;
  /** Direct, attributable quote pulled from the source. */
  quote: string;
  sourceUrl: string;
  sourceLabel: string;
}

// ---------------------------------------------------------------------------
// Industry × scenario matrix
// ---------------------------------------------------------------------------

export const RISK_SCENARIOS: RiskScenario[] = [
  {
    id: "healthcare-care-denial",
    industry: "Healthcare / Payer",
    scenarioType: "Algorithmic coverage denial",
    title: "Medicare-Advantage post-acute care denial engine",
    summary:
      "An insurer deploys a length-of-stay prediction model to gate skilled-nursing and rehab coverage for elderly members. Reviewers feel pressure to keep human override rates inside a narrow band of the model's recommendation.",
    risk: "Class-action wrongful-denial litigation, CMS enforcement, and reputational collapse if the model is shown to override clinician judgment without an auditable human-in-the-loop.",
    mitigation:
      "AOS forces a logged human-override path (AOS-L1-09), separation of reviewer and developer roles (AOS-L1-10), full decision logs with model + policy version (AOS-L1-08), and a healthcare-specific scenario pack (AOS-L1-12). Every denial leaves a tamper-evident evidence row.",
    aosControls: ["AOS-L1-08", "AOS-L1-09", "AOS-L1-10", "AOS-L1-12"],
    value:
      "Lokken v. UnitedHealth seeks class-wide damages on behalf of MA members allegedly denied coverage at 90%+ rates by the nH Predict algorithm — exposure runs into the hundreds of millions.",
    sources: [
      {
        label: "Class-action complaint summary (ClassAction.org)",
        url: "https://www.classaction.org/news/unitedhealth-groups-flawed-ai-model-wrongfully-denies-elderly-patients-post-acute-care-coverage-class-action-alleges",
      },
      {
        label: "Discovery order — D. Minn. (Becker's)",
        url: "https://www.beckerspayer.com/legal/judge-orders-unitedhealth-to-hand-over-broad-discovery-in-ai-coverage-denial-case/",
      },
    ],
  },
  {
    id: "legal-fabricated-citations",
    industry: "Legal Services",
    scenarioType: "Generative-AI hallucination in filings",
    title: "Attorney files a brief drafted by a public LLM",
    summary:
      "A law firm uses a public chatbot to draft a motion. The model fabricates six case citations — including fake judges, fake quotes, and fake reporter numbers — and the brief is filed without independent verification.",
    risk: "Court sanctions, malpractice exposure, bar-discipline referrals, and a permanent published opinion naming the firm.",
    mitigation:
      "AOS-L1-08 requires every consequential AI output to log model id and policy version. AOS-L1-15 (model card) and AOS-L1-16 (provenance) make it obvious which artifacts came from a generative model and require a human attestation before they leave the firm.",
    aosControls: ["AOS-L1-08", "AOS-L1-09", "AOS-L1-15", "AOS-L1-16"],
    value:
      "Mata v. Avianca: $5,000 in sanctions per attorney plus the firm; the case became the global cautionary precedent and triggered standing orders in dozens of US courts requiring AI-use disclosures.",
    sources: [
      {
        label: "Mata v. Avianca — Wikipedia (with court order PDFs)",
        url: "https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.",
      },
      {
        label: "Case analysis (LegalClarity)",
        url: "https://legalclarity.org/what-happened-in-the-mata-v-avianca-case/",
      },
    ],
  },
  {
    id: "hr-algorithmic-screening",
    industry: "HR / Recruiting",
    scenarioType: "Automated candidate rejection",
    title: "Resume-screening model with protected-class disparate impact",
    summary:
      "An online tutoring company configures its applicant-tracking system to auto-reject applicants over a hard age cut-off. More than 200 qualified older applicants are filtered out before any human sees the resume.",
    risk: "EEOC enforcement, ADEA / Title VII liability, and forced consent decrees that mandate ongoing third-party audits — exactly the audits AOS is designed to produce evidence for.",
    mitigation:
      "Scenario pack for HR (AOS-L1-12) red-team tests for disparate impact (AOS-L1-11). Decision logs (AOS-L1-08) make it possible to reconstruct which rule rejected which candidate, instead of guessing in discovery.",
    aosControls: ["AOS-L1-08", "AOS-L1-11", "AOS-L1-12"],
    value:
      "iTutorGroup paid $365,000 to settle the EEOC's first AI-bias case — small dollars, large precedent. Defense costs in similar matters routinely exceed $1M.",
    sources: [
      {
        label: "EEOC press release",
        url: "https://www.eeoc.gov/newsroom/itutorgroup-pay-365000-settle-eeoc-discriminatory-hiring-suit",
      },
      {
        label: "Reuters coverage",
        url: "https://www.reuters.com/legal/tutoring-firm-settles-us-agencys-first-bias-lawsuit-involving-ai-software-2023-08-10/",
      },
    ],
  },
  {
    id: "media-generative-ip",
    industry: "Media / Publishing",
    scenarioType: "Training-data IP infringement",
    title: "Generative model trained on paywalled news archives",
    summary:
      "A foundation-model provider scrapes a major newspaper's archive for training. Output verbatim reproduces multi-paragraph passages from paywalled articles, including bylines.",
    risk: "Copyright infringement at statutory-damages scale, DMCA exposure, and an injunction risk against the model itself.",
    mitigation:
      "AOS-L1-13 (data lineage), AOS-L1-15 (model card with training-data disclosure), and AOS-L1-16 (C2PA provenance on generated outputs) make it possible to prove what data went in and to attach a verifiable provenance chain to what comes out.",
    aosControls: ["AOS-L1-13", "AOS-L1-15", "AOS-L1-16"],
    value:
      "NYT v. OpenAI/Microsoft (S.D.N.Y. 1:23-cv-11195, filed Dec 2023) seeks 'billions of dollars in statutory and actual damages' and destruction of infringing models.",
    sources: [
      {
        label: "NYT complaint (PDF)",
        url: "https://nytco-assets.nytimes.com/2023/12/NYT_Complaint_Dec2023.pdf",
      },
      {
        label: "Docket (Justia)",
        url: "https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2023cv11195/612697/514/",
      },
    ],
  },
  {
    id: "consumer-chatbot-misrep",
    industry: "Consumer / Travel",
    scenarioType: "Customer-facing chatbot misrepresentation",
    title: "Airline chatbot invents a refund policy",
    summary:
      "A customer-support chatbot tells a grieving passenger he can claim a bereavement refund retroactively. The airline's actual policy says the opposite. The passenger sues; the airline argues the chatbot is 'a separate legal entity'.",
    risk: "Direct liability for chatbot statements, plus a precedent that strips the 'the AI said it, not us' defense across consumer-facing deployments.",
    mitigation:
      "AOS-L1-08 logs every chatbot response with policy version. AOS-L1-04 forces controls to run in CI on every prompt-template change so a stale policy can't reach production unnoticed.",
    aosControls: ["AOS-L1-01", "AOS-L1-04", "AOS-L1-08"],
    value:
      "Moffatt v. Air Canada (BCCRT 2024-149): the tribunal ordered Air Canada to pay the passenger and rejected the 'separate entity' defense — a precedent that now anchors every chatbot-liability discussion.",
    sources: [
      {
        label: "BCCRT decision (PDF)",
        url: "https://decisions.civilresolutionbc.ca/crt/crtd/en/525448/1/document.do",
      },
      {
        label: "CBC News write-up",
        url: "https://www.cbc.ca/1.7116416",
      },
    ],
  },
  {
    id: "realestate-pricing-model",
    industry: "Real Estate / Fintech",
    scenarioType: "AI-driven pricing & valuation",
    title: "iBuyer pricing model with no drift gate",
    summary:
      "An iBuyer uses a machine-learning home-valuation model to make instant cash offers. The model fails to recalibrate fast enough to a softening market and the company over-pays for thousands of homes.",
    risk: "Massive inventory write-downs, mass layoffs, securities-class-action exposure for failure-to-disclose model risk.",
    mitigation:
      "AOS-L1-11 (regression-blocking red-team / drift tests in CI) plus AOS-L1-04 (CI gate on every change) catch the divergence before it ships. AOS-L1-18 (incident response) ensures a kill-switch is rehearsed.",
    aosControls: ["AOS-L1-04", "AOS-L1-11", "AOS-L1-15", "AOS-L1-18"],
    value:
      "Zillow took a $304M Q3 2021 inventory write-down, wound down Zillow Offers, cut ~25% of staff (~2,000 jobs), and lost roughly $8B in market cap in the days following the announcement.",
    sources: [
      {
        label: "Zillow Q3 2021 earnings release (investor PDF)",
        url: "https://s24.q4cdn.com/723050407/files/doc_financials/2021/q3/Zillow-Group-3Q21-Earnings-Release.pdf",
      },
      {
        label: "Zillow IR announcement",
        url: "https://investors.zillowgroup.com/investors/news-and-events/news/news-details/2021/Zillow-Group-Reports-Third-Quarter-2021-Financial-Results--Shares-Plan-to-Wind-Down-Zillow-Offers-Operations/default.aspx",
      },
    ],
  },
  {
    id: "manufacturing-ip-leak",
    industry: "Semiconductors / Manufacturing",
    scenarioType: "Trade-secret leakage to public LLM",
    title: "Engineers paste proprietary source into a public chatbot",
    summary:
      "Three separate engineering teams paste internal source code, meeting notes, and yield-tuning data into a public LLM to 'help debug'. The data leaves the corporate boundary and becomes part of an external service's logs.",
    risk: "Permanent loss of trade-secret status, regulatory exposure under data-protection law, and a chilling effect on any future AI-assisted productivity program.",
    mitigation:
      "AOS-L1-14 (PII / regulated-data classification + minimization) and AOS-L1-13 (lineage) require every input to be classified before it can be sent to an external model. AOS-L1-17 (SBOM + provenance) covers the dependency side.",
    aosControls: ["AOS-L1-13", "AOS-L1-14", "AOS-L1-17"],
    value:
      "Samsung banned generative-AI tools company-wide following three confirmed leaks in ~20 days in April 2023. Internal memo cited 'inability to retrieve and delete the data' once submitted.",
    sources: [
      {
        label: "Extremetech report",
        url: "https://www.extremetech.com/internet/samsung-fab-workers-using-chatgpt-accidentally-leak-confidential-information",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Notable AI-fails — short, sourced
// ---------------------------------------------------------------------------

export const AI_FAILS: AiFail[] = [
  {
    id: "fail-air-canada",
    org: "Air Canada",
    year: "2024",
    headline: "Chatbot promised a refund the airline didn't offer",
    summary:
      "Civil Resolution Tribunal of BC found Air Canada liable for negligent misrepresentation when its chatbot told a passenger he could claim a bereavement fare retroactively — contradicting the airline's published policy.",
    damage:
      "Damages awarded to passenger plus tribunal costs; precedent now cited globally as the end of the 'the AI said it, not us' defense.",
    mitigation:
      "AOS-L1-08 logs every chatbot turn with policy version; AOS-L1-04 blocks deploy when policy and prompt template diverge.",
    aosControls: ["AOS-L1-04", "AOS-L1-08"],
    sources: [
      {
        label: "BCCRT decision",
        url: "https://decisions.civilresolutionbc.ca/crt/crtd/en/525448/1/document.do",
      },
      { label: "CBC News", url: "https://www.cbc.ca/1.7116416" },
    ],
  },
  {
    id: "fail-mata-avianca",
    org: "Mata v. Avianca",
    year: "2023",
    headline: "Six fabricated case citations from ChatGPT",
    summary:
      "Judge Castel (S.D.N.Y.) sanctioned two attorneys and their firm $5,000 for filing a brief containing six entirely fictional citations generated by a public LLM, with no human verification step.",
    damage:
      "$5,000 sanction; permanent published opinion; standing orders in dozens of US courts now require AI-use disclosure.",
    mitigation:
      "AOS-L1-09 (logged human override + reviewer separation) and AOS-L1-15 (model card on every output) would have flagged the unverified generative output before filing.",
    aosControls: ["AOS-L1-09", "AOS-L1-15"],
    sources: [
      {
        label: "Wikipedia summary with order PDFs",
        url: "https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.",
      },
    ],
  },
  {
    id: "fail-itutorgroup",
    org: "iTutorGroup",
    year: "2023",
    headline: "Auto-rejected 200+ older applicants",
    summary:
      "EEOC's first AI-bias enforcement action: iTutorGroup's online application system was programmed to auto-reject women over 55 and men over 60. Settled for $365,000.",
    damage:
      "$365,000 settlement, four-year consent decree, mandatory anti-discrimination training, and ongoing reporting to EEOC.",
    mitigation:
      "AOS-L1-11 (red-team / disparate-impact tests in CI) and AOS-L1-12 (HR scenario pack) would have failed the build before deployment.",
    aosControls: ["AOS-L1-11", "AOS-L1-12"],
    sources: [
      {
        label: "EEOC release",
        url: "https://www.eeoc.gov/newsroom/itutorgroup-pay-365000-settle-eeoc-discriminatory-hiring-suit",
      },
    ],
  },
  {
    id: "fail-zillow-offers",
    org: "Zillow Offers",
    year: "2021",
    headline: "Pricing model overpaid for thousands of homes",
    summary:
      "Zillow's iBuying model failed to keep up with market shifts. The company shut down Zillow Offers, took a $304M write-down, and laid off ~25% of staff.",
    damage:
      "$304M Q3 2021 inventory write-down, ~2,000 jobs cut, roughly $8B in market-cap loss in days.",
    mitigation:
      "AOS-L1-11 (regression gate), AOS-L1-15 (model card + drift monitor), and AOS-L1-18 (rehearsed incident response with kill-switch).",
    aosControls: ["AOS-L1-11", "AOS-L1-15", "AOS-L1-18"],
    sources: [
      {
        label: "Zillow Q3 2021 earnings PDF",
        url: "https://s24.q4cdn.com/723050407/files/doc_financials/2021/q3/Zillow-Group-3Q21-Earnings-Release.pdf",
      },
    ],
  },
  {
    id: "fail-samsung-leak",
    org: "Samsung Semiconductor",
    year: "2023",
    headline: "Source code pasted into public chatbot",
    summary:
      "In ~20 days in April 2023, three Samsung engineering teams pasted proprietary source, meeting notes, and yield data into a public LLM. Samsung subsequently banned generative AI tools enterprise-wide.",
    damage:
      "Permanent exposure of trade-secret data (cannot be retrieved or deleted from the third-party service); enterprise-wide ban; productivity setback.",
    mitigation:
      "AOS-L1-14 (data classification + minimization) and AOS-L1-13 (lineage) gate every input to an external model on classification labels.",
    aosControls: ["AOS-L1-13", "AOS-L1-14"],
    sources: [
      {
        label: "Extremetech report",
        url: "https://www.extremetech.com/internet/samsung-fab-workers-using-chatgpt-accidentally-leak-confidential-information",
      },
    ],
  },
  {
    id: "fail-nyt-openai",
    org: "NYT v. OpenAI / Microsoft",
    year: "2023→",
    headline: "Newspaper sues over training-data scraping",
    summary:
      "The New York Times filed suit (S.D.N.Y. 1:23-cv-11195) alleging OpenAI and Microsoft trained their models on millions of NYT articles without license, and that the models reproduce protected text verbatim.",
    damage:
      "Complaint seeks 'billions of dollars in statutory and actual damages' and destruction of infringing models; case is active and reshaping AI training-data discovery norms.",
    mitigation:
      "AOS-L1-13 (training-data lineage), AOS-L1-15 (model card disclosure), AOS-L1-16 (C2PA provenance on outputs).",
    aosControls: ["AOS-L1-13", "AOS-L1-15", "AOS-L1-16"],
    sources: [
      {
        label: "NYT complaint (PDF)",
        url: "https://nytco-assets.nytimes.com/2023/12/NYT_Complaint_Dec2023.pdf",
      },
    ],
  },
  {
    id: "fail-unitedhealth-nhp",
    org: "UnitedHealth / nH Predict",
    year: "2023→",
    headline: "Algorithm allegedly used to deny post-acute care",
    summary:
      "Lokken et al. v. UnitedHealth Group (D. Minn. 0:23-cv-03514) alleges the nH Predict model was used to deny medically necessary post-acute care to elderly Medicare Advantage members at scale.",
    damage:
      "Federal class action, broad discovery order against UnitedHealth (March 2025), regulatory and reputational exposure in the hundreds of millions.",
    mitigation:
      "AOS-L1-08 (decision logs), AOS-L1-09 (human-override path + drill), AOS-L1-10 (reviewer / developer separation), AOS-L1-12 (healthcare scenario pack).",
    aosControls: ["AOS-L1-08", "AOS-L1-09", "AOS-L1-10", "AOS-L1-12"],
    sources: [
      {
        label: "Class-action summary",
        url: "https://www.classaction.org/news/unitedhealth-groups-flawed-ai-model-wrongfully-denies-elderly-patients-post-acute-care-coverage-class-action-alleges",
      },
      {
        label: "Discovery order (Becker's)",
        url: "https://www.beckerspayer.com/legal/judge-orders-unitedhealth-to-hand-over-broad-discovery-in-ai-coverage-denial-case/",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Voices from the practitioner community whose published positions inform AOS
// ---------------------------------------------------------------------------

export const COMMUNITY_VOICES: CommunityVoice[] = [
  {
    id: "voice-johnston-steering-wheel",
    author: "Ken Johnston",
    role: "VP Data, Analytics & AI, Envorso · AiGovOps Foundation",
    takeaway:
      "Governance is not a cost center; treated correctly it accelerates safe AI deployment.",
    quote:
      "Governance isn't a brake; it's the steering wheel that allows you to drive faster.",
    sourceUrl:
      "https://www.linkedin.com/posts/bobrapp_2026-the-ai-regulatory-big-bang-is-here-activity-7427083231776198656-1hpK",
    sourceLabel: "LinkedIn — quoted in Bob Rapp's 2026 regulatory post",
  },
  {
    id: "voice-johnston-profile",
    author: "Ken Johnston",
    role: "VP Data, Analytics & AI, Envorso · AiGovOps Foundation",
    takeaway:
      "Three decades across Microsoft, Bing, and Ford — argues that ethical AI requires the same operational rigor as cloud SRE.",
    quote:
      "Executive engineering manager for Cloud Services, Data Science, and Ethical AI.",
    sourceUrl: "https://www.linkedin.com/in/rkjohnston",
    sourceLabel: "LinkedIn profile",
  },
  {
    id: "voice-rapp-govops",
    author: "Bob Rapp",
    role: "AiGovOps Foundation",
    takeaway:
      "Static annual audits are obsolete. Embed bias and drift monitors into CI/CD; keep a kill-switch on every autonomous agent.",
    quote:
      "DO: Embed bias and drift monitors directly into your CI/CD pipeline. DO: Maintain a 'Kill Switch' for every autonomous agent. DON'T: Treat governance as a static annual audit.",
    sourceUrl:
      "https://www.linkedin.com/posts/bobrapp_ai-governance-is-no-longer-a-check-the-box-activity-7421598302632218624-9Wy3",
    sourceLabel: "LinkedIn — 'AI Governance evolves to GovOps'",
  },
  {
    id: "voice-rapp-2026",
    author: "Bob Rapp",
    role: "AiGovOps Foundation",
    takeaway:
      "Treat compliance as a software pipeline: policy-as-code, automated evidence chains, hourly verification of agentic behavior.",
    quote:
      "Audit data lineage today; don't wait for a subpoena. Policy as code: version and deploy it with your models. Automate evidence chains for every model deployment. Verify agentic behaviors hourly to stop autonomous drift.",
    sourceUrl:
      "https://www.linkedin.com/posts/bobrapp_2026-the-ai-regulatory-big-bang-is-here-activity-7427083231776198656-1hpK",
    sourceLabel: "LinkedIn — '2026: the AI regulatory big bang is here'",
  },
];
