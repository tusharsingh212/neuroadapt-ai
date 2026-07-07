/**
 * NeuroAdapt AI — Workflow Registry
 *
 * Pre-defined step sequences for common tasks.
 * When a user's goal matches a workflow, these steps are used directly —
 * no LLM call for step generation, no hallucination risk, consistent UX.
 *
 * Each workflow has:
 *   id        — unique identifier
 *   name      — display name
 *   patterns  — lowercase substrings; any match triggers this workflow
 *   steps     — StepObject[] (same schema as generateSteps output)
 *
 * Matching is substring-based: the user's normalised goal must contain at
 * least one pattern. Longer patterns are checked first (most-specific wins).
 */

const W = (id, name, patterns, steps) => ({ id, name, patterns, steps });

const WORKFLOWS = [

  // ── Indian Government ───────────────────────────────────────────────────────

  W('aadhaar-apply', 'Apply for Aadhaar', [
    'apply for aadhaar', 'aadhaar application', 'get aadhaar card',
    'new aadhaar', 'aadhaar enrolment', 'aadhaar enrollment',
  ], [
    { hint: 'Click "Get Aadhaar" or "Book Appointment"', targetLabel: 'Book Appointment', action: 'click', alternatives: ['Get Aadhaar', 'Schedule Appointment', 'Apply Online'], elementType: 'button', zone: 'main' },
    { hint: 'Select your state', targetLabel: 'State', action: 'select', alternatives: ['Select State', 'State/UT'], elementType: 'select', zone: 'main' },
    { hint: 'Select your district', targetLabel: 'District', action: 'select', alternatives: ['Select District'], elementType: 'select', zone: 'main' },
    { hint: 'Click the appointment slot', targetLabel: 'Book Appointment', action: 'click', alternatives: ['Book', 'Schedule', 'Confirm Appointment'], elementType: 'button', zone: 'main' },
  ]),

  W('aadhaar-update', 'Update Aadhaar Details', [
    'update aadhaar', 'aadhaar update', 'change aadhaar', 'correct aadhaar',
    'aadhaar address update', 'update address in aadhaar',
  ], [
    { hint: 'Enter your Aadhaar number', targetLabel: 'Aadhaar Number', action: 'type', alternatives: ['Enter Aadhaar', '12-digit number', 'VID'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your registered mobile number', targetLabel: 'Mobile Number', action: 'type', alternatives: ['Mobile', 'Phone Number', 'Registered Mobile'], elementType: 'input', zone: 'main' },
    { hint: 'Request OTP', targetLabel: 'Send OTP', action: 'click', alternatives: ['Get OTP', 'Request OTP', 'Generate OTP'], elementType: 'button', zone: 'main' },
    { hint: 'Enter the OTP sent to your mobile', targetLabel: 'OTP', action: 'type', alternatives: ['Enter OTP', 'One Time Password', 'Verification Code'], elementType: 'input', zone: 'main' },
    { hint: 'Submit OTP and log in', targetLabel: 'Login', action: 'click', alternatives: ['Submit', 'Verify', 'Proceed'], elementType: 'button', zone: 'main' },
  ]),

  W('pan-apply', 'Apply for PAN Card', [
    'apply for pan', 'pan card application', 'new pan card', 'get pan card', 'pan application',
  ], [
    { hint: 'Click "Apply Online" for new PAN', targetLabel: 'Apply Online', action: 'click', alternatives: ['New PAN', 'Apply for PAN', 'Apply Now'], elementType: 'button', zone: 'main' },
    { hint: 'Select application type', targetLabel: 'Application Type', action: 'select', alternatives: ['Select Type', 'Category'], elementType: 'select', zone: 'main' },
    { hint: 'Enter your full name', targetLabel: 'Full Name', action: 'type', alternatives: ['Name', 'Applicant Name', 'Your Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your date of birth', targetLabel: 'Date of Birth', action: 'type', alternatives: ['DOB', 'Birth Date', 'Date of Birth (DD/MM/YYYY)'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the application', targetLabel: 'Submit', action: 'click', alternatives: ['Proceed', 'Continue', 'Next'], elementType: 'button', zone: 'main' },
  ]),

  W('passport-apply', 'Apply for Passport', [
    'apply for passport', 'passport application', 'new passport', 'get passport',
    'passport seva', 'passport renewal',
  ], [
    { hint: 'Register or log in to Passport Seva', targetLabel: 'Login', action: 'click', alternatives: ['Register', 'Sign In', 'Log In', 'New User'], elementType: 'button', zone: 'header' },
    { hint: 'Click "Apply for Fresh Passport"', targetLabel: 'Apply for Fresh Passport', action: 'click', alternatives: ['Fresh Passport', 'New Passport', 'Apply Now'], elementType: 'link', zone: 'main' },
    { hint: 'Fill in your name', targetLabel: 'Given Name', action: 'type', alternatives: ['First Name', 'Name', 'Full Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your date of birth', targetLabel: 'Date of Birth', action: 'type', alternatives: ['DOB', 'Birth Date'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the form', targetLabel: 'Submit', action: 'click', alternatives: ['Save', 'Proceed', 'Next'], elementType: 'button', zone: 'main' },
    { hint: 'Pay the application fee', targetLabel: 'Pay and Book Appointment', action: 'click', alternatives: ['Pay Fee', 'Book Appointment', 'Proceed to Payment'], elementType: 'button', zone: 'main' },
  ]),

  W('digilocker-signup', 'Create DigiLocker Account', [
    'digilocker', 'digi locker', 'create digilocker', 'sign up digilocker',
  ], [
    { hint: 'Click "Sign Up" to create an account', targetLabel: 'Sign Up', action: 'click', alternatives: ['Create Account', 'Register', 'Get Started'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your mobile number', targetLabel: 'Mobile Number', action: 'type', alternatives: ['Phone Number', 'Mobile', 'Enter Mobile'], elementType: 'input', zone: 'main' },
    { hint: 'Enter OTP to verify', targetLabel: 'OTP', action: 'type', alternatives: ['Enter OTP', 'Verification Code', 'One Time Password'], elementType: 'input', zone: 'main' },
    { hint: 'Set your username', targetLabel: 'Username', action: 'type', alternatives: ['Choose Username', 'User ID'], elementType: 'input', zone: 'main' },
    { hint: 'Set your PIN', targetLabel: 'PIN', action: 'type', alternatives: ['6-digit PIN', 'Security PIN', 'Create PIN'], elementType: 'input', zone: 'main' },
  ]),

  // ── Banking ──────────────────────────────────────────────────────────────────

  W('bank-login', 'Log in to Net Banking', [
    'net banking', 'internet banking', 'online banking login',
    'log in to bank', 'bank login',
  ], [
    { hint: 'Enter your user ID / customer ID', targetLabel: 'User ID', action: 'type', alternatives: ['Customer ID', 'Username', 'Login ID', 'Account Number'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your password', targetLabel: 'Password', action: 'type', alternatives: ['Enter Password', 'Login Password', 'Net Banking Password'], elementType: 'input', zone: 'main' },
    { hint: 'Click Login', targetLabel: 'Login', action: 'click', alternatives: ['Sign In', 'Log In', 'Submit', 'Continue'], elementType: 'button', zone: 'main' },
  ]),

  W('upi-payment', 'Send Money via UPI', [
    'upi payment', 'send money upi', 'pay via upi', 'gpay', 'google pay',
    'phonepe', 'phone pe', 'paytm payment',
  ], [
    { hint: 'Enter UPI ID or phone number', targetLabel: 'UPI ID', action: 'type', alternatives: ['Phone Number', 'Enter VPA', 'Pay To', 'Recipient UPI'], elementType: 'input', zone: 'main' },
    { hint: 'Enter the amount', targetLabel: 'Amount', action: 'type', alternatives: ['Enter Amount', 'Payment Amount', '₹'], elementType: 'input', zone: 'main' },
    { hint: 'Click Pay / Proceed', targetLabel: 'Pay', action: 'click', alternatives: ['Proceed', 'Send', 'Transfer', 'Pay Now'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your UPI PIN', targetLabel: 'UPI PIN', action: 'type', alternatives: ['4-digit PIN', '6-digit PIN', 'MPIN', 'Enter PIN'], elementType: 'input', zone: 'modal' },
  ]),

  // ── E-commerce ───────────────────────────────────────────────────────────────

  W('shopping-checkout', 'Complete a Purchase / Checkout', [
    'checkout', 'buy now', 'place order', 'complete purchase',
    'add to cart and buy', 'shopping checkout',
  ], [
    { hint: 'Click "Add to Cart" or "Buy Now"', targetLabel: 'Add to Cart', action: 'click', alternatives: ['Buy Now', 'Add to Bag', 'Shop Now'], elementType: 'button', zone: 'main' },
    { hint: 'Go to Cart / Proceed to Checkout', targetLabel: 'Proceed to Checkout', action: 'click', alternatives: ['Go to Cart', 'Checkout', 'View Cart'], elementType: 'button', zone: 'main' },
    { hint: 'Enter or confirm delivery address', targetLabel: 'Deliver Here', action: 'click', alternatives: ['Confirm Address', 'Use this Address', 'Select Address'], elementType: 'button', zone: 'main' },
    { hint: 'Select payment method', targetLabel: 'Continue', action: 'click', alternatives: ['Place Order', 'Proceed to Pay', 'Pay Now', 'Select Payment Method'], elementType: 'button', zone: 'main' },
    { hint: 'Place the order', targetLabel: 'Place Order', action: 'click', alternatives: ['Confirm Order', 'Pay Now', 'Order Now'], elementType: 'button', zone: 'main' },
  ]),

  // ── Common ────────────────────────────────────────────────────────────────────

  W('register', 'Create an Account / Sign Up', [
    'sign up', 'register', 'create account', 'create an account',
    'new account', 'join', 'open account',
  ], [
    { hint: 'Click Sign Up / Register', targetLabel: 'Sign Up', action: 'click', alternatives: ['Register', 'Create Account', 'Join', 'Get Started'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your full name', targetLabel: 'Full Name', action: 'type', alternatives: ['Name', 'Your Name', 'First Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your email address', targetLabel: 'Email', action: 'type', alternatives: ['Email Address', 'Username', 'Enter Email'], elementType: 'input', zone: 'main' },
    { hint: 'Enter a password', targetLabel: 'Password', action: 'type', alternatives: ['Create Password', 'Choose Password', 'New Password'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the registration', targetLabel: 'Submit', action: 'click', alternatives: ['Create Account', 'Register', 'Sign Up', 'Continue'], elementType: 'button', zone: 'main' },
  ]),

  W('login', 'Log In / Sign In', [
    'log in', 'login', 'sign in', 'sign into',
  ], [
    { hint: 'Enter your email or username', targetLabel: 'Email', action: 'type', alternatives: ['Email Address', 'Username', 'Mobile Number', 'User ID'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your password', targetLabel: 'Password', action: 'type', alternatives: ['Enter Password', 'Your Password'], elementType: 'input', zone: 'main' },
    { hint: 'Click Sign In', targetLabel: 'Sign In', action: 'click', alternatives: ['Log In', 'Login', 'Continue', 'Next'], elementType: 'button', zone: 'main' },
  ]),

];

// Sort by pattern length descending so longer, more-specific patterns are tested first
const SORTED_WORKFLOWS = [...WORKFLOWS].sort(
  (a, b) => Math.max(...b.patterns.map((p) => p.length)) -
            Math.max(...a.patterns.map((p) => p.length))
);

/**
 * Find a pre-defined workflow that matches the user's goal.
 * Returns the workflow object, or null if none matches.
 * Matching is case-insensitive substring search.
 */
export function matchWorkflow(goal) {
  if (!goal?.trim()) return null;
  const normalised = goal.toLowerCase().trim();
  return SORTED_WORKFLOWS.find((w) =>
    w.patterns.some((p) => normalised.includes(p))
  ) ?? null;
}

export { SORTED_WORKFLOWS as WORKFLOWS };
