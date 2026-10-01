import type { Legal } from "./types";

export const legal: Legal = {
  updated: "Last updated: 1 October 2026",
  privacy: {
    title: "Privacy Policy",
    intro:
      "UMOVE is a student project by Muhammad Rafi Arsya that connects Universiti Malaya students who need something delivered on campus with student runners. This page explains what we collect, who can see it and how long we keep it. We follow the spirit of Malaysia's Personal Data Protection Act 2010.",
    sections: [
      {
        h: "What we collect",
        p: [
          "From Google when you sign in: your name, email address and Google account ID. We never see your Google password.",
          "What you add: display name, username, college, bio and WhatsApp number.",
          "When you use UMOVE: your requests (what you need, pickup, drop-off, delivery fee, status and times), ratings and reviews, and help chat messages.",
          "If you apply to be a runner: your full name, college or faculty, how you deliver, and a photo of your face.",
          "Technical data: a sign-in cookie, and your IP address, used only to stop abuse (rate limits) and kept in memory, not stored with your account.",
        ],
      },
      {
        h: "What we don't collect",
        p: [
          "No passwords, no payment or bank details (you pay the runner directly), no live location tracking, no ID documents for runners, and no advertising or tracking cookies.",
        ],
      },
      {
        h: "Who can see what",
        p: [
          "Everyone: your display name, username, college, bio, ratings and whether you're a verified runner. The request board shows only your first name.",
          "Only the person you're matched with: your WhatsApp number, after a runner takes the request.",
          "Only the requester of an order a runner has taken: that runner's face photo.",
          "UMOVE admins: everything above, to review runners, help with problems and keep UMOVE safe. Every admin decision is recorded.",
        ],
      },
      {
        h: "Services we use",
        p: [
          "Google (sign-in), Cloudflare (hosting and network protection), Telegram (alerts to UMOVE admins, which may include a request summary or an applicant's name) and, if enabled, email for notifications. We don't sell your data or share it for advertising.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Your account and history stay while your account exists. Runner application photos are deleted 30 days after review; the approved face photo stays while you're a runner. Database backups are kept for up to 14 days.",
          "Want your account deleted? Ask through Help in the app and we'll remove it within 30 days, except records we must keep to resolve an open dispute.",
        ],
      },
      {
        h: "Your choices",
        p: [
          "You can see and change your profile in Settings, ask for a copy of your data or for a correction or deletion through Help, and sign out at any time.",
        ],
      },
      {
        h: "Cookies and storage",
        p: [
          "UMOVE uses one necessary cookie to keep you signed in. Your browser also remembers your language and which announcements you closed. Nothing is used to track you across other websites.",
        ],
      },
      {
        h: "Changes and contact",
        p: [
          "If this policy changes in an important way, we'll announce it in UMOVE. Questions: use Help in the app, or email rafiarsya.work@gmail.com.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro:
      "By using UMOVE you agree to these terms. They're written to be short and clear; please read them before posting or taking a request.",
    sections: [
      {
        h: "What UMOVE is",
        p: [
          "UMOVE is a noticeboard where students post errands and other students deliver them. UMOVE doesn't deliver anything itself, doesn't employ runners and doesn't handle any money. Each delivery is an agreement between the requester and the runner.",
        ],
      },
      {
        h: "Your account",
        p: [
          "One account per person, with your own WhatsApp number. Keep your details accurate and don't let others use your account. Runners must be UM students approved by an admin.",
        ],
      },
      {
        h: "Posting requests",
        p: [
          "Be specific about what you need, where to pick it up and where to deliver it. The delivery fee is at least RM1 and at most RM100, and it can only be raised, not lowered.",
          "You pay the runner the item price plus the delivery fee when you receive the order. Agree on the price on WhatsApp before the runner buys anything.",
        ],
      },
      {
        h: "Not allowed",
        p: [
          "Anything illegal or against Universiti Malaya rules, including weapons, drugs, alcohol, tobacco and vapes, prescription medicine, dangerous goods, and anything for academic dishonesty such as exam answers or doing someone's assignment.",
        ],
      },
      {
        h: "For runners",
        p: [
          "Only take requests you can finish. Follow traffic rules, keep receipts, don't charge more than agreed, and keep the requester updated. You can give a request back before you set off; repeated no-shows can lose you the runner role.",
        ],
      },
      {
        h: "Behaviour and safety",
        p: [
          "Be respectful. No harassment, threats, fraud or spam. Meet in public places such as a college lobby or guard house. Rate each other honestly.",
          "If something goes wrong, talk on WhatsApp first, then use Report a problem on the request. Admins may look into it, cancel requests and suspend accounts. UMOVE can't refund payments made between users.",
        ],
      },
      {
        h: "Limits of our responsibility",
        p: [
          "UMOVE is a student project provided as it is. As far as the law allows, we aren't responsible for items, payments, delays or losses between users, or for downtime of the service.",
        ],
      },
      {
        h: "Changes and law",
        p: [
          "We may update these terms and will announce important changes in UMOVE. These terms follow the laws of Malaysia. Questions: use Help in the app, or email rafiarsya.work@gmail.com.",
        ],
      },
    ],
  },
};
