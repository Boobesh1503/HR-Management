// State detection dictionary for Indian states and major cities / districts

interface StateMapping {
  state: string;
  keywords: string[];
}

const STATE_MAPPINGS: StateMapping[] = [
  {
    state: "Tamil Nadu",
    keywords: [
      "tamil nadu", "tamilnadu", "tn", "chennai", "coimbatore", "madurai", "tiruchirappalli", 
      "trichy", "salem", "tirunelveli", "tiruppur", "tirupur", "vellore", "erode", "thoothukudi", 
      "tuticorin", "dindigul", "thanjavur", "ranipet", "sivakasi", "karur", "hosur", "nagercoil", 
      "kanchipuram", "cuddalore", "kumbakonam", "tiruvannamalai", "pollachi", "rajapalayam",
      "pudukkottai", "neyveli", "ambattur", "avadi", "tambaram", "ooty", "udhagamandalam",
      "sri eshwar", "sri krishna", "kumaraguru", "psg", "cit", "anna university", "matriculation",
      "dr.v.g", "sastra", "loyola"
    ],
  },
  {
    state: "Karnataka",
    keywords: [
      "karnataka", "ka", "bangalore", "bengaluru", "mysore", "mysuru", "hubli", "dharwad", 
      "mangalore", "mangaluru", "belgaum", "belagavi", "gulbarga", "kalaburagi", "davangere", 
      "bellary", "ballari", "bijapur", "vijayapura", "shimoga", "shivamogga", "tumkur", "tumakuru", 
      "raichur", "bidar", "hospet", "hosapete", "gadag", "udupi", "kolar", "hassan", "chitradurga"
    ],
  },
  {
    state: "Kerala",
    keywords: [
      "kerala", "kl", "kochi", "cochin", "thiruvananthapuram", "trivandrum", "kozhikode", 
      "calicut", "thrissur", "kollam", "palakkad", "alappuzha", "kannur", "kottayam", "malappuram"
    ],
  },
  {
    state: "Andhra Pradesh",
    keywords: [
      "andhra pradesh", "ap", "visakhapatnam", "vizag", "vijayawada", "guntur", "nellore", 
      "kurnool", "rajahmundry", "tirupati", "kakinada", "kadapa", "anantapur", "eluru"
    ],
  },
  {
    state: "Telangana",
    keywords: [
      "telangana", "ts", "hyderabad", "secunderabad", "warangal", "nizamabad", "khammam", "karimnagar"
    ],
  },
  {
    state: "Maharashtra",
    keywords: [
      "maharashtra", "mh", "mumbai", "pune", "nagpur", "thane", "nashik", "aurangabad", 
      "chhatrapati sambhajinagar", "solapur", "navi mumbai", "amravati", "kolhapur"
    ],
  },
  {
    state: "Delhi NCR",
    keywords: [
      "delhi", "new delhi", "noida", "greater noida", "gurgaon", "gurugram", "faridabad", "ghaziabad"
    ],
  },
];

export function categorizeState(locationText?: string | null): string {
  if (!locationText) return "Other States";

  const normalized = locationText.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  // Direct state check first
  for (const item of STATE_MAPPINGS) {
    for (const kw of item.keywords) {
      // Match whole words or clean boundaries
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(normalized)) {
        return item.state;
      }
    }
  }

  return "Other States";
}

