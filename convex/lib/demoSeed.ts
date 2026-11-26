/*
 * Demo projects for convex/seed.ts. Each is a tree of nodes: a title, a
 * markdown document, an optional chat (user / assistant turns) and children.
 */

export type SeedNode = {
  title: string;
  content?: string;
  chat?: [user: string, assistant: string][];
  children?: SeedNode[];
};

export const DEMO_PROJECTS: SeedNode[] = [
  {
    title: "Q3 launch: Teams plan",
    content: `## Goal

Ship the Teams plan by **September 15** with shared projects, roles and billing, and convert 40 of the current 120 multi-seat workspaces.

## Scope

- Shared projects with owner, editor and viewer roles
- Workspace billing (per seat, monthly and annual)
- An admin page for members and invites

## Out of scope

- SSO and SCIM (Q4)
- Audit logs`,
    chat: [
      [
        "We want to launch a Teams plan next quarter. Help me plan it.",
        "Let's anchor on one outcome first: is the launch about revenue from existing multi-seat workspaces, or about bringing in new teams? That decides what's in scope.\n\nIf it's converting existing workspaces, the essentials are shared projects, roles and seat billing. SSO can wait; most teams under 50 people won't ask for it in the first month.",
      ],
      [
        "Existing workspaces. About 120 already have 3+ people sharing one login.",
        "Then a realistic target is converting a third of them, around 40, in the first six weeks. I've drafted the goal, scope and what's out of scope in the document. The next nodes worth opening: the timeline, pricing, and the migration path for shared logins.",
      ],
    ],
    children: [
      {
        title: "Timeline",
        content: `| Week | Milestone |
| --- | --- |
| Jul 1 | Roles and shared projects behind a flag |
| Jul 29 | Billing in test mode |
| Aug 19 | Private beta with 10 workspaces |
| Sep 2 | Pricing page and docs |
| Sep 15 | Public launch |

**Riskiest step:** billing. Stripe seat changes mid-cycle need prorating, and that's where the last two launches slipped.`,
        chat: [
          [
            "What's the riskiest part of this timeline?",
            "Billing. Seat changes mid-cycle need prorating, refunds and invoices that match. I'd start it in parallel with roles rather than after, and give it a two-week buffer before the beta.",
          ],
        ],
        children: [
          {
            title: "Private beta",
            content: `## Who

10 workspaces with 5+ people, picked from the most active shared logins.

## What we learn

- Do invites get accepted within a day?
- Which role do owners give most people?
- Where does billing confuse admins?`,
          },
        ],
      },
      {
        title: "Migration from shared logins",
        content: `Workspaces sharing one login keep their projects. On upgrade:

1. The current login becomes the **owner**.
2. The owner invites teammates by email.
3. Each project stays where it is; nothing moves.

> Don't force the split on day one. A banner nudges, it doesn't block.`,
      },
      {
        title: "Launch announcement",
        content: `## Channels

- Email to all workspace owners
- In-app banner for 2 weeks
- Changelog post and a short demo video

## Message

*Mindmap now works for your whole team.* Share projects, set roles, and pay per seat.`,
      },
    ],
  },
  {
    title: "Pricing for the Teams tier",
    content: `## Decision

Per-seat pricing at **$12/seat/month** (annual) or $15 monthly, with a 3-seat minimum.

## Why per seat

- Matches how teams already think about tools like this
- Grows with the account without renegotiating
- Simple to explain on one line`,
    chat: [
      [
        "Should Teams be per seat or a flat price?",
        "Per seat, mostly. Flat pricing is simpler but leaves money on the table as teams grow, and it makes a 4-person and a 40-person team pay the same.\n\nThe usual worry with per seat is that it discourages inviting people. A 3-seat minimum plus free viewers solves most of that.",
      ],
      [
        "What price point?",
        "Comparable tools sit between $8 and $20 a seat. At $12 annual you're in the middle, and $15 monthly makes the annual plan the obvious choice. I've put the reasoning and the alternatives into the branches.",
      ],
    ],
    children: [
      {
        title: "Competitor pricing",
        content: `| Tool | Per seat (annual) | Free viewers |
| --- | --- | --- |
| Notion | $10 | Yes |
| Miro | $8 | Yes |
| Linear | $8 | No |
| Coda | $10 | Yes |
| Heptabase | $12 | No |

Most offer free viewers. We should too.`,
      },
      {
        title: "Free viewers",
        content: `Viewers can open and comment on shared projects but can't edit or chat with the AI.

**Why:** it removes the cost of sharing a finished map with a stakeholder, which is how new teams find us.`,
        chat: [
          [
            "Won't free viewers cannibalise paid seats?",
            "A little, but viewers can't use the AI, which is the thing people pay for. Expect some leakage from people who only read, and a lot more growth from maps being shared outside the team.",
          ],
        ],
      },
      {
        title: "Usage-based alternative",
        content: `Charge per AI request instead of per seat.

## Rejected because

- Hard to predict a monthly bill
- Punishes the behaviour we want (using the AI more)
- Finance teams prefer a seat count`,
      },
    ],
  },
  {
    title: "Why do new users drop off?",
    content: `## The problem

**62%** of new sign-ups never create a second node. Most leave within the first session.

## What we know

- Drop-off is highest right after the first AI reply
- Users who accept a suggested document come back twice as often
- Mobile sign-ups drop off almost entirely`,
    chat: [
      [
        "Most new users never get past their first node. Help me figure out why.",
        "Start by splitting the drop-off by moment, not by user. If most people leave right after the first reply, the reply isn't showing them what to do next. If they leave before sending anything, it's the empty page.\n\nYour data says the first: drop-off peaks after the first reply. That points to the hand-off from chat to the canvas.",
      ],
      [
        "So what should we test first?",
        "Three cheap tests, in order:\n\n1. End the first reply with one concrete next step (\"Branch into X\").\n2. Show the suggested document inline, not behind a click.\n3. Animate the first branch onto the canvas so the structure is visible.\n\nI've added each as a branch with what we'd measure.",
      ],
    ],
    children: [
      {
        title: "Interview notes",
        content: `## 8 interviews, March

- "I didn't know what the canvas was for." (5 of 8)
- "The answer was good, but then what?" (4 of 8)
- "I thought branching would lose my chat." (3 of 8)

**Pattern:** people like the first answer but don't see a next step.`,
        children: [
          {
            title: "Quotes worth keeping",
            content: `> "It felt like ChatGPT with extra buttons until I saw the map fill in."

> "I'd use this for planning if it remembered why I made each branch."

> "The moment it clicked was when I branched and the context came with me."`,
          },
        ],
      },
      {
        title: "Test: one next step",
        content: `End the first reply with a single suggested branch.

**Measure:** share of users who create a second node in session one.

**Target:** from 38% to 50%.`,
      },
      {
        title: "Test: inline document",
        content: `Show the suggested document right under the reply, with Accept.

**Measure:** accept rate, and day-7 return for those who accept.`,
      },
      {
        title: "Mobile",
        content: `The canvas isn't usable under 600px wide. For now, mobile shows the chat and a list of nodes.

Not fixing this quarter; tracking it.`,
      },
    ],
  },
  {
    title: "AI knowledge tools landscape",
    content: `## Question

Where does a spatial, branching tool fit among AI note and research tools?

## Short answer

Most tools pick either **chat** (fast, but linear and forgetful) or **documents** (structured, but slow to build). Nobody makes the structure grow out of the conversation.`,
    chat: [
      [
        "Map the landscape of AI knowledge tools for me.",
        "I'd group them by what they treat as the main thing:\n\n- **Chat-first:** ChatGPT, Claude, Perplexity. Fast, but everything is one long thread.\n- **Document-first:** Notion AI, Coda. Great structure, but you build it by hand.\n- **Graph-first:** Obsidian, Heptabase, Tana. Powerful, steep to learn.\n\nThe gap is a tool where the structure comes from exploring. I've put each group in its own branch.",
      ],
    ],
    children: [
      {
        title: "Chat-first",
        content: `**Strengths:** instant, no setup, great answers.

**Weaknesses:** one thread, context gets lost, nothing to show for it a week later.

Examples: ChatGPT, Claude, Perplexity.`,
      },
      {
        title: "Document-first",
        content: `**Strengths:** structure, sharing, teams already live there.

**Weaknesses:** the AI helps edit, but you still design the structure.

Examples: Notion AI, Coda AI, Google Docs.`,
      },
      {
        title: "Graph-first",
        content: `**Strengths:** links and backlinks, a real knowledge base over time.

**Weaknesses:** a lot of upfront effort; most people stop before it pays off.

Examples: Obsidian, Heptabase, Tana, Logseq.`,
        children: [
          {
            title: "Heptabase deep dive",
            content: `Closest to us visually: cards on a whiteboard.

- Cards are written by hand; AI is a side panel
- No branching conversation
- Strong with researchers and students`,
          },
        ],
      },
      {
        title: "Where we fit",
        content: `**Explore like a chat, keep it like a document.**

Every branch carries its context, and the map is the record of how you got there.`,
      },
    ],
  },
  {
    title: "Learning Rust",
    content: `## Why

Rewrite the layout engine for big maps (2,000+ nodes) in Rust and compile to WebAssembly.

## Plan

- Weeks 1–2: the book, chapters 1–10
- Weeks 3–4: ownership and lifetimes until they stop surprising me
- Weeks 5–6: a small WASM module that lays out a tree`,
    chat: [
      [
        "Teach me the basics of Rust. I know TypeScript well.",
        "Good starting point. Most of Rust will feel familiar: types, enums, pattern matching. The new idea is **ownership**: every value has one owner, and when the owner goes away, so does the value. No garbage collector.\n\nThe compiler checks this for you, which is why early Rust feels like arguing with it. I'd spend most of your first two weeks there.",
      ],
      [
        "What's the TypeScript equivalent of a Rust enum?",
        "A discriminated union. `type Shape = { kind: \"circle\"; r: number } | { kind: \"square\"; side: number }` is close to Rust's `enum Shape { Circle(f64), Square(f64) }`.\n\nThe difference: Rust's `match` must handle every case, or it won't compile.",
      ],
    ],
    children: [
      {
        title: "Ownership and borrowing",
        content: `## Rules

1. Each value has one owner.
2. You can have **many** immutable borrows (\`&T\`) **or one** mutable borrow (\`&mut T\`), never both.
3. Borrows can't outlive the owner.

\`\`\`rust
let s = String::from("node");
let r = &s;      // fine: borrowed
let t = s;       // moved: s is gone
// println!("{}", r); // error: r points at a moved value
\`\`\``,
      },
      {
        title: "Rust for TypeScript devs",
        content: `| TypeScript | Rust |
| --- | --- |
| \`type A = B \\| C\` | \`enum A { B, C }\` |
| \`interface\` | \`trait\` |
| \`T \\| undefined\` | \`Option<T>\` |
| \`throw\` | \`Result<T, E>\` |
| \`Array<T>\` | \`Vec<T>\` |`,
      },
      {
        title: "WASM layout spike",
        content: `## Goal

Lay out a 2,000-node tree in under 16ms.

## Steps

- [ ] \`wasm-pack\` hello world
- [ ] Port the tidy-tree algorithm
- [ ] Benchmark against the JS version`,
      },
    ],
  },
  {
    title: "Hiring our first designer",
    content: `## Role

A product designer who can prototype in code, owns the canvas and chat experience, and sets up the design system.

## Must have

- Shipped a complex, interactive product
- Comfortable in Figma **and** React
- Strong typography and motion sense`,
    chat: [
      [
        "We're hiring our first designer. What should we look for?",
        "For a first designer at a small team, range matters more than polish in one area. You want someone who can go from a rough idea to a working prototype without a handoff.\n\nThe biggest risk is hiring a great visual designer who needs a PM and an engineer to get anything shipped.",
      ],
    ],
    children: [
      {
        title: "Interview loop",
        content: `1. **Intro call** (30 min): motivation, past work
2. **Portfolio review** (60 min): one project, deep
3. **Working session** (90 min): redesign a real screen with us
4. **Founders** (45 min): values and how they like to work`,
        chat: [
          [
            "Is a take-home better than a working session?",
            "A working session. Take-homes favour people with free evenings and tell you little about how they collaborate. 90 minutes together on a real screen shows how they think and take feedback.",
          ],
        ],
      },
      {
        title: "Where to find candidates",
        content: `- Personal network and referrals first
- Designers who post prototypes (X, Bluesky, Read.cv)
- Design-engineer communities
- Avoid broad job boards for this role`,
      },
      {
        title: "Offer",
        content: `**Salary band:** $150k–$180k plus equity.

Lead with the scope: they define how the product looks and feels from day one.`,
      },
    ],
  },
  {
    title: "Customer interviews: May",
    content: `## Who

12 users: 5 researchers, 4 product managers, 3 students.

## Top themes

1. **Context that follows you** is the reason people stay
2. Finding old branches is hard
3. People want to share a map, not a doc`,
    chat: [
      [
        "Help me synthesise 12 customer interviews.",
        "Let's sort what people said into three buckets: why they stay, what frustrates them, and what they asked for. The first bucket matters most; it's what to protect.\n\nFrom your notes, the strongest \"why they stay\" theme is context carrying into branches. Seven of twelve mentioned it unprompted.",
      ],
    ],
    children: [
      {
        title: "Why they stay",
        content: `- Branches remember the conversation (7 of 12)
- The map shows where they've been (5 of 12)
- Accepting a document is faster than writing one (4 of 12)`,
      },
      {
        title: "Frustrations",
        content: `- Big maps get hard to navigate
- No search across projects
- Can't tell which branch was the "answer"`,
        children: [
          {
            title: "Search across projects",
            content: `Asked for by 6 of 12. Most want to find a branch by what was said, not its title.

**Idea:** search node documents and chats together.`,
          },
        ],
      },
      {
        title: "Requests",
        content: `| Request | Mentions |
| --- | --- |
| Share a read-only map | 6 |
| Search | 6 |
| Mark a branch as the answer | 4 |
| Templates | 3 |`,
      },
    ],
  },
  {
    title: "Weekly planning",
    content: `## This week

- Finish the composer polish
- Interview two more beta users
- Draft the pricing page

## Blocked

- Billing test mode waits on the Stripe account review`,
    chat: [
      [
        "Help me plan this week. I've got the composer work, two interviews and the pricing page.",
        "Do the interviews early in the week: they might change what goes on the pricing page. Composer polish can fill the gaps around them. I'd leave the pricing page draft for Thursday so it includes what you heard.",
      ],
    ],
    children: [
      {
        title: "Composer polish",
        content: `- [x] Stop and retry
- [x] Keep text if sending fails
- [x] Starters on the new page
- [ ] Drafts saved per node
- [ ] Notices for rate limits`,
      },
      {
        title: "Pricing page draft",
        content: `**Headline:** One map for the whole team.

Three columns: Free, Pro, Teams. Teams highlights shared projects and free viewers.`,
      },
    ],
  },
];

/**
 * One project for recording the chat: a node with a few turns of history
 * (some short, some long), so there's something to scroll back through.
 */
export const RECORDING_PROJECT: SeedNode = {
  title: "Two weeks in Japan",
  content: `## Trip

- **When:** April 3 – 17, cherry blossom season
- **Who:** two of us, first time in Japan
- **Budget:** about $6,000 for both, flights booked

## Route

Tokyo (5 nights) → Hakone (1) → Kyoto (4) → Osaka (2) → Tokyo (1)`,
  chat: [
    [
      "We're going to Japan for two weeks in April. First time. Where should we go?",
      "April is a great time, the cherry blossoms peak in Tokyo and Kyoto in early April.\n\nFor a first trip, the classic loop works well: **Tokyo → Hakone → Kyoto → Osaka**, then back to Tokyo for the flight home. It covers the big city, a night at a hot spring, temples and food without spending your days on trains.",
    ],
    [
      "Is the JR Pass still worth it?",
      "Not for this route. The price went up a lot in 2023, and a single Tokyo to Kyoto shinkansen ticket plus a few local trips comes in well under it.\n\nBuy tickets as you go, and get a **Suica** card on your phone for the subway and buses.",
    ],
    [
      "How many nights in Tokyo?",
      "Five at the start, and one more before you fly home. Tokyo is really several cities in one, so I'd split it by area:\n\n1. **Shinjuku and Shibuya:** the neon, the crossing, Omoide Yokocho for dinner\n2. **Asakusa and Ueno:** Senso-ji early in the morning, then Ueno Park for the blossoms\n3. **Harajuku and Omotesando:** Meiji Shrine, then the side streets\n4. **A day trip:** Nikko or Kamakura\n5. **A slow day:** Shimokitazawa, coffee, vintage shops\n\nStay near a JR Yamanote line station so everything is one train away.",
    ],
    [
      "Nice. Where should we stay in Kyoto?",
      "Around **Gion or Higashiyama** if you want to walk out the door into old streets, or near **Kyoto Station** if you'd rather be close to the trains. For four nights I'd pick Higashiyama: most temples are walkable, and you can see them early before the crowds.",
    ],
  ],
};

/**
 * For recording the AI's suggestions: a pricing doc with numbers to
 * change (word-level highlights) and open questions to branch out.
 */
export const PRICING_PROJECT: SeedNode = {
  title: "Self-serve pricing",
  content: `## Goal

Launch self-serve pricing by **March 1**, so small teams can start without talking to sales.

## Plans

| Plan | Price | For |
| --- | --- | --- |
| Free | $0 | One person trying it out |
| Pro | $12 per user / month | Individuals who use it daily |
| Team | $24 per user / month | Teams up to 50 people |

Annual billing is **10% off**.

## Decisions so far

- Pricing is per user, not per workspace
- Free has no time limit, but caps AI replies at 50 a month

## Open questions

- Should Team have a minimum number of seats?
- What happens when a Free user hits the AI limit?
- Do we offer discounts for startups and nonprofits?`,
  chat: [
    [
      "We're launching self-serve pricing. Can you sanity-check the plans?",
      "The shape is right: a free tier to try it, Pro for individuals, Team for groups. Two things stand out:\n\n1. **The jump from Pro to Team is steep.** $12 to $24 is a 2x step for what's mostly sharing and admin. Most tools in this space keep it under 1.5x.\n2. **10% off annual is low.** 15 to 20% is the norm, and it's what gets people to commit for a year.",
    ],
    [
      "What do comparable tools charge for team plans?",
      "Most collaborative docs and note tools land between **$15 and $20 per user per month** for their team tier, billed annually. Above $20 is usually where SSO, audit logs and admin controls come in, which you'd keep for an enterprise plan later.",
    ],
  ],
};
