import type { Report } from "../model/types";

export const reports: Report[] = [
  {
    id: "customer-signal-q2",
    category: "Data analysis",
    title: "Customer signals that reshaped the Q2 growth forecast",
    excerpt:
      "A cross-source analysis of activation, retention, and account expansion reveals where growth quality improved and where demand softened.",
    createdAt: "24 Jul 2026",
    author: "Linh Nguyen",
    source: "Growth Intelligence",
    tags: ["Customer", "Forecast", "Q2"],
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Analytics dashboard with charts and performance indicators",
    readingTime: "8 min read",
    lead:
      "The quarter closed above the baseline forecast, but the strongest signal was not acquisition volume. Improved activation among mid-market accounts produced a healthier revenue mix and reduced dependency on late-quarter campaigns.",
    sections: [
      {
        heading: "What changed",
        body:
          "Activation within the first fourteen days increased after onboarding was simplified. The effect was most visible in teams importing structured operational data, where time-to-first-insight fell by almost one working day.",
      },
      {
        heading: "Decision outlook",
        body:
          "The next planning cycle should protect onboarding capacity and prioritize accounts showing high data readiness. Paid acquisition remains useful, but expansion from activated cohorts now offers the more efficient path to durable growth.",
      },
    ],
    metrics: [
      { label: "Activation", value: 86, displayValue: "68.4%", change: "+7.2%" },
      { label: "Retention", value: 74, displayValue: "91.2%", change: "+2.8%" },
      { label: "Expansion", value: 62, displayValue: "$1.84M", change: "+11.6%" },
    ],
    table: [
      {
        dimension: "Enterprise",
        current: "$2.18M",
        previous: "$1.97M",
        status: "On track",
      },
      {
        dimension: "Mid-market",
        current: "$1.42M",
        previous: "$1.11M",
        status: "On track",
      },
      {
        dimension: "Self-serve",
        current: "$640K",
        previous: "$668K",
        status: "Watch",
      },
    ],
  },
  {
    id: "operations-control-tower",
    category: "Operations",
    title: "Control tower review: throughput rises as queue pressure eases",
    excerpt:
      "Weekly operational health across intake, processing, and review queues, including the exceptions that still need an owner.",
    createdAt: "22 Jul 2026",
    author: "Minh Tran",
    source: "Operations Office",
    tags: ["SLA", "Throughput"],
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Modern operations workspace with teams collaborating",
    readingTime: "6 min read",
    lead:
      "Processing volume increased without adding queue pressure. Automation absorbed routine validation work, allowing operators to focus on exceptions and reducing the number of cases carried into the next day.",
    sections: [
      {
        heading: "Operational movement",
        body:
          "Median handling time improved in every region except APAC evening coverage. The remaining delay is concentrated in records that arrive without an accountable data owner.",
      },
      {
        heading: "Recommended action",
        body:
          "Assign a named owner during source registration and move schema checks earlier in the intake path. These two controls address most of the avoidable review loop.",
      },
    ],
    metrics: [
      { label: "Throughput", value: 88, displayValue: "14.8K", change: "+9.4%" },
      { label: "SLA met", value: 93, displayValue: "96.1%", change: "+3.1%" },
      { label: "Backlog", value: 28, displayValue: "318", change: "-18.7%" },
    ],
    table: [
      {
        dimension: "Intake",
        current: "99.2%",
        previous: "97.8%",
        status: "On track",
      },
      {
        dimension: "Processing",
        current: "95.8%",
        previous: "91.6%",
        status: "On track",
      },
      {
        dimension: "Review",
        current: "88.4%",
        previous: "90.1%",
        status: "Watch",
      },
    ],
  },
  {
    id: "platform-reliability",
    category: "System health",
    title: "Platform reliability brief: a quieter month with one clear risk",
    excerpt:
      "Availability remained high across core services while a recurring ingestion pattern created avoidable compute pressure.",
    createdAt: "18 Jul 2026",
    author: "An Pham",
    source: "Platform Engineering",
    tags: ["Reliability", "Infrastructure"],
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Connected network infrastructure viewed from space",
    readingTime: "7 min read",
    lead:
      "Core availability held above target and incident volume declined. The principal risk is a bursty ingestion pattern from three large repositories that produces short periods of heavy executor contention.",
    sections: [
      {
        heading: "Reliability posture",
        body:
          "No severity-one incidents were recorded. Most customer-visible degradation came from retries during concurrent backfills rather than service failure.",
      },
      {
        heading: "Engineering priority",
        body:
          "Introduce admission control for large backfills and publish capacity guidance at connection time. This should reduce retry amplification without limiting routine ingestion.",
      },
    ],
    metrics: [
      { label: "Availability", value: 99, displayValue: "99.96%", change: "+0.03%" },
      { label: "Incidents", value: 18, displayValue: "7", change: "-36.4%" },
      { label: "MTTR", value: 31, displayValue: "24 min", change: "-12 min" },
    ],
    table: [
      {
        dimension: "Document API",
        current: "99.99%",
        previous: "99.95%",
        status: "On track",
      },
      {
        dimension: "Search API",
        current: "99.97%",
        previous: "99.96%",
        status: "On track",
      },
      {
        dimension: "Ingestion workers",
        current: "99.82%",
        previous: "99.91%",
        status: "Action needed",
      },
    ],
  },
  {
    id: "evidence-quality",
    category: "Governance",
    title: "Evidence quality index: provenance improves across shared corpora",
    excerpt:
      "Coverage, freshness, and ownership are trending in the right direction, but finance sources still contain material attribution gaps.",
    createdAt: "15 Jul 2026",
    author: "Mai Le",
    source: "Data Governance",
    tags: ["Evidence", "Quality"],
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Detailed electronic system board representing data lineage",
    readingTime: "5 min read",
    lead:
      "Evidence quality improved for the third consecutive review. Newly registered sources now arrive with stronger ownership metadata, while automated freshness checks have reduced stale evidence in high-use corpora.",
    sections: [
      {
        heading: "Coverage findings",
        body:
          "Sales and service corpora now meet the provenance threshold. Finance remains below target because several historical exports do not identify the transformation owner.",
      },
      {
        heading: "Governance response",
        body:
          "Require ownership metadata before indexing new finance sources and schedule remediation for the twelve highest-use historical exports.",
      },
    ],
    metrics: [
      { label: "Provenance", value: 82, displayValue: "82%", change: "+9%" },
      { label: "Freshness", value: 91, displayValue: "91%", change: "+4%" },
      { label: "Ownership", value: 76, displayValue: "76%", change: "+13%" },
    ],
    table: [
      {
        dimension: "Sales corpus",
        current: "92%",
        previous: "84%",
        status: "On track",
      },
      {
        dimension: "Service corpus",
        current: "87%",
        previous: "81%",
        status: "On track",
      },
      {
        dimension: "Finance corpus",
        current: "68%",
        previous: "65%",
        status: "Action needed",
      },
    ],
  },
  {
    id: "market-watch",
    category: "Market watch",
    title: "Signals to watch before the next regional expansion decision",
    excerpt:
      "A concise read on demand density, implementation readiness, and regulatory friction across three candidate markets.",
    createdAt: "10 Jul 2026",
    author: "Huy Vo",
    source: "Strategy & Insights",
    tags: ["Market", "Strategy"],
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Laptop displaying financial and market performance charts",
    readingTime: "9 min read",
    lead:
      "Demand is strongest in Singapore, but implementation readiness has improved fastest in Vietnam. Australia remains attractive for deal size while carrying a longer compliance path.",
    sections: [
      {
        heading: "Comparative signal",
        body:
          "Vietnam combines improving demand density with a partner network that can shorten implementation. Singapore offers faster enterprise access, though competition is materially higher.",
      },
      {
        heading: "Planning implication",
        body:
          "Run a focused partner-led validation in Vietnam while maintaining enterprise discovery in Singapore. Defer a full Australia launch until the compliance workstream is costed.",
      },
    ],
    metrics: [
      { label: "Demand", value: 79, displayValue: "79/100", change: "+8" },
      { label: "Readiness", value: 72, displayValue: "72/100", change: "+11" },
      { label: "Risk", value: 38, displayValue: "38/100", change: "-4" },
    ],
    table: [
      {
        dimension: "Vietnam",
        current: "78/100",
        previous: "67/100",
        status: "On track",
      },
      {
        dimension: "Singapore",
        current: "81/100",
        previous: "79/100",
        status: "On track",
      },
      {
        dimension: "Australia",
        current: "64/100",
        previous: "66/100",
        status: "Watch",
      },
    ],
  },
  {
    id: "security-review",
    category: "Risk",
    title: "Monthly security review: access hygiene improves, secrets need focus",
    excerpt:
      "Identity controls are performing well, while a small set of long-lived integration credentials remains the most urgent exposure.",
    createdAt: "04 Jul 2026",
    author: "Khoa Do",
    source: "Security Office",
    tags: ["Security", "Access"],
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Security analyst working on a laptop",
    readingTime: "6 min read",
    lead:
      "Privileged access reviews closed on time and dormant accounts declined. Eight integration credentials still exceed the rotation policy and account for most of the residual exposure.",
    sections: [
      {
        heading: "Control performance",
        body:
          "Single sign-on coverage and quarterly access certification are both above target. Exceptions now cluster around older machine-to-machine integrations.",
      },
      {
        heading: "Required response",
        body:
          "Rotate the eight overdue credentials, assign service ownership, and migrate the two highest-risk integrations to short-lived tokens this cycle.",
      },
    ],
    metrics: [
      { label: "SSO coverage", value: 97, displayValue: "97.4%", change: "+1.8%" },
      { label: "Dormant users", value: 21, displayValue: "19", change: "-14" },
      { label: "Overdue secrets", value: 34, displayValue: "8", change: "-3" },
    ],
    table: [
      {
        dimension: "Workforce access",
        current: "98%",
        previous: "96%",
        status: "On track",
      },
      {
        dimension: "Service accounts",
        current: "84%",
        previous: "78%",
        status: "Watch",
      },
      {
        dimension: "Legacy integrations",
        current: "62%",
        previous: "59%",
        status: "Action needed",
      },
    ],
  },
];
