/*
  GroundWork — integration config.
  Fill these in as you set up accounts. Empty strings fall back to
  email-based flows so the funnel never dead-ends.
*/
window.GW = {
  business: "GroundWork-Web",
  email: "groundworkweb@proton.me",
  phone: "",                                  // optional: "(281) 555-0100"

  // Booking: Calendly event URL or Google Appointment Schedule URL
  // e.g. "https://calendly.com/groundwork/15min"
  calendlyUrl: "https://calendly.com/cyruswilburn2005/30min",

  // Stripe Payment Links (Dashboard → Payment Links).
  // `build` charges the $99 due today. Collect the $300 remainder when they
  // approve the preview. Host or Grow starts the month the site goes live.
  // If you later make plan-specific links, fill `grow` / `host` and they take
  // priority over `build`.
  stripe: {
    build: "https://buy.stripe.com/fZufZj1GYbVW4794AgfUQ02",
    grow: "",
    host: ""
  },

  // Lead endpoint. /api/lead.php stores every start/audit submission in the
  // analytics DB and emails it to GW.email / GW_LEAD_EMAIL.
  // Swap for Formspree/Getform if you prefer: "https://formspree.io/f/xxxx"
  formEndpoint: "/api/lead.php",

  pricing: { build: 399, dueToday: 99, onApproval: 300, host: 99, grow: 199 }
};
