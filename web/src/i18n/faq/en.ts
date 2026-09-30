import type { FaqCategory } from "./types";

export const faq: FaqCategory[] = [
  {
    id: "basics",
    title: "Getting started",
    items: [
      { id: "what", q: "What is UMOVE?", a: "A campus errand board for UM students. Post what you need, and a verified student runner collects it and brings it to you." },
      { id: "who", q: "Who can use UMOVE?", a: "Anyone with a Google account can sign in and post a request. Runners are UM students checked by an admin before they can take requests." },
      { id: "signup", q: "How do I sign up?", a: "Tap Sign in and continue with Google. There's no password to remember. Then add your WhatsApp number in Settings so your runner can reach you." },
      { id: "where", q: "Which areas does UMOVE cover?", a: "The UM campus and the residential colleges around it. Runners decide which trips they take, so nearby spots may work too; just say where in your request." },
      { id: "when", q: "When can I use it?", a: "Any time. Requests are taken by students who are free at that moment, so it's quickest during the day and evening." },
    ],
  },
  {
    id: "ordering",
    title: "Ordering",
    items: [
      { id: "post", q: "How do I post a request?", a: "Tap Post a request, write what you need, where to pick it up, where to deliver it, and the delivery fee you'll pay. Runners see it right away on the live board." },
      { id: "what-can", q: "What can I request?", a: "Food, drinks, groceries, printing, stationery and parcel pick-ups around campus. Be specific: the shop, the item and any options." },
      { id: "pickup-place", q: "Where can runners pick things up?", a: "From places inside UM: cafeterias at the residential colleges, shops and print corners. Choose one from the list when you post. If your spot isn't listed yet, type it in, but keep it inside campus. A check mark shows a place from the UMOVE list." },
      { id: "not-allowed", q: "What isn't allowed?", a: "Alcohol, tobacco or vapes, drugs, weapons, exam help, anything illegal or against UM rules, and anything a runner couldn't carry safely. Such requests are removed and accounts can be suspended." },
      { id: "fee", q: "How much delivery fee should I offer?", a: "At least RM1. A fair guide: RM1 to RM2 within the same college or faculty, RM3 to RM5 across campus, and more for heavy items, rain or late at night. A fair fee gets taken faster." },
      { id: "code", q: "What's the order code (like UM-7K3F9Q)?", a: "Every request gets a random code. Use it when you talk to your runner or to us, so everyone knows which order you mean." },
      { id: "edit", q: "Can I change a request after posting it?", a: "Not directly. If no runner has taken it yet, cancel it and post a new one. If a runner has taken it, agree the change with them on WhatsApp." },
      { id: "cancel", q: "Can I cancel?", a: "Yes, until a runner takes your request. After that, talk to your runner on WhatsApp first. A runner can give a request back before setting off, and it returns to the board." },
      { id: "limits", q: "Is there a limit on requests?", a: "You can have up to 3 requests in progress and post up to 20 a day. This keeps the board fair for everyone." },
      { id: "nobody", q: "What if nobody takes my request?", a: "It stays on the board until you cancel it. If it's waiting a long time, a slightly higher fee or a clearer pick-up spot usually helps." },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    items: [
      { id: "cost", q: "How much does UMOVE cost?", a: "UMOVE itself is free and takes no cut. You pay the item price plus the delivery fee you set, straight to your runner." },
      { id: "pay", q: "How do I pay?", a: "When your order arrives, directly to the runner: cash, DuitNow QR or Touch 'n Go. UMOVE never holds anyone's money." },
      { id: "upfront", q: "Who pays for the items first?", a: "Usually the runner buys them and you pay back on delivery. Agree the price on WhatsApp first. For expensive orders a runner may ask you to transfer the item cost in advance: only do this with a verified runner, after you've chatted." },
      { id: "receipt", q: "Will I get a receipt?", a: "Ask your runner to keep the shop receipt and show it on handover, especially for groceries or anything with a changing price." },
      { id: "dispute", q: "What if there's a problem with the payment?", a: "Talk to the other person on WhatsApp first; most mix-ups are sorted quickly. If not, send us a Help request with the order code and we'll step in." },
    ],
  },
  {
    id: "runners",
    title: "For runners",
    items: [
      { id: "become", q: "Who can become a runner?", a: "UM students with an active WhatsApp number. The form is short: your name, college, how you'll deliver, and a clear photo of your face. No ID documents." },
      { id: "apply", q: "How do I apply?", a: "Go to Become a runner or Settings → Roles → Apply. Fill in your name, college or faculty, how you'll deliver, and add a clear photo of your face." },
      { id: "review-time", q: "How long does approval take?", a: "Usually within 24 hours. You'll see the status in Settings and get an email. If it's not approved, you'll see why and can apply again after 24 hours." },
      { id: "vehicle", q: "Do I need a vehicle?", a: "No. You can deliver on foot, by bicycle or scooter, motorcycle or car. Choose what you'll use when you apply; it shows on your profile." },
      { id: "earn", q: "How do I get paid?", a: "The customer pays you the item price plus the delivery fee on handover. You keep the whole fee; UMOVE takes nothing." },
      { id: "at-once", q: "How many requests can I take at once?", a: "Up to 3. Mark each one as on the way and delivered so customers can follow along." },
      { id: "give-back", q: "Can I give a request back?", a: "Yes, before you tap I'm on my way. Let the customer know on WhatsApp. After you set off, finish the delivery or sort it out with the customer." },
      { id: "runner-rules", q: "What are the rules for runners?", a: "Meet in public places, confirm prices before buying, keep receipts, follow traffic rules and be polite. Repeated no-shows or complaints can get your runner role removed." },
    ],
  },
  {
    id: "safety",
    title: "Safety and privacy",
    items: [
      { id: "who-coming", q: "Will I know who's delivering?", a: "Yes. Once a runner takes your request, you'll see their face photo, name, how they travel, and their deliveries and rating on the request page. Check it's the same person when they arrive. Photos are checked by an admin and only shown to you after the match." },
      { id: "other-runner", q: "Can I ask for a different runner?", a: "Yes. Until your runner taps I'm on my way, you can tap Find another runner on the request page. Your request goes back on the board and that runner can't take it again." },
      { id: "verified", q: "How are runners checked?", a: "Every runner is reviewed by an admin within 24 hours, including their face photo. Verified runners have a blue check, and you see who's coming once your request is taken." },
      { id: "whatsapp", q: "Who sees my WhatsApp number?", a: "Only the one person you're matched with, after a runner takes your request. It never appears on public pages." },
      { id: "one-number", q: "Can I use one WhatsApp number on two accounts?", a: "No. Each WhatsApp number belongs to one UMOVE account, so people can't hide behind a second account. Changed your number? Update it in Settings." },
      { id: "meet", q: "Where should we meet?", a: "At a public spot such as a college lobby, guard house or faculty entrance. Runners don't go into rooms." },
      { id: "report", q: "How do I report someone?", a: "Send a Help request, choose Report someone, and include the order code. We review every report and can suspend accounts." },
      { id: "ratings", q: "How do ratings work?", a: "After a delivery, the customer and the runner rate each other from 1 to 5 stars. Ratings show on public profiles." },
      { id: "data", q: "What data does UMOVE keep?", a: "Your Google name and email, your profile, your requests and ratings. We never show your email or WhatsApp publicly, and we don't sell data." },
    ],
  },
  {
    id: "account",
    title: "Account and app",
    items: [
      { id: "install", q: "Can I install UMOVE like an app?", a: "Yes, on any phone or laptop. Android or computer: open it in Chrome or Edge and choose Install app, or use Settings → App. iPhone: open it in Safari, tap Share, then Add to Home Screen." },
      { id: "language", q: "Can I change the language?", a: "Yes. Settings → Preferences: English, Bahasa Indonesia or Bahasa Melayu." },
      { id: "profile", q: "How do I change my name or username?", a: "Settings → Profile. Your username is used in your profile link." },
      { id: "delete", q: "How do I delete my account?", a: "Send a Help request under My account and we'll delete it for you." },
      { id: "notify", q: "Will I get notifications?", a: "The site updates live while it's open, and important things (like application results) come by email. Phone notifications for runners are coming later." },
    ],
  },
  {
    id: "help",
    title: "Getting help",
    items: [
      { id: "contact", q: "How do I contact the UMOVE team?", a: "Open Help and send a request with a short description. An admin reviews it and opens a chat with you, usually within a few hours." },
      { id: "why-review", q: "Why is my help request under review?", a: "We read every request first so we can reply properly and keep the chat for real issues. You'll get an email when it's opened." },
      { id: "maintenance", q: "Why do I see a maintenance screen?", a: "We're updating UMOVE, or the server is briefly unreachable. The page reloads by itself when we're back. Planned maintenance is announced in advance." },
    ],
  },
];
