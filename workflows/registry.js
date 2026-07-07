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
<<<<<<< HEAD
=======
 * StepObject fields:
 *   hint, targetLabel, action, alternatives, elementType, zone — used by the ranker
 *   title       — short action name shown in the step header
 *   instruction — plain-English action shown as the primary guidance ("Click X")
 *   reason      — why the user is doing this ("This verifies your identity")
 *   nextHint    — what happens immediately after ("You'll enter your details")
 *
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
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
<<<<<<< HEAD
    { hint: 'Click "Get Aadhaar" or "Book Appointment"', targetLabel: 'Book Appointment', action: 'click', alternatives: ['Get Aadhaar', 'Schedule Appointment', 'Apply Online'], elementType: 'button', zone: 'main' },
    { hint: 'Select your state', targetLabel: 'State', action: 'select', alternatives: ['Select State', 'State/UT'], elementType: 'select', zone: 'main' },
    { hint: 'Select your district', targetLabel: 'District', action: 'select', alternatives: ['Select District'], elementType: 'select', zone: 'main' },
    { hint: 'Click the appointment slot', targetLabel: 'Book Appointment', action: 'click', alternatives: ['Book', 'Schedule', 'Confirm Appointment'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Click "Get Aadhaar" or "Book Appointment"', targetLabel: 'Book Appointment',
      action: 'click', alternatives: ['Get Aadhaar', 'Schedule Appointment', 'Apply Online'],
      elementType: 'button', zone: 'main',
      title:       'Book an Appointment',
      instruction: 'Click "Book Appointment" or "Get Aadhaar".',
      reason:      'This opens the official appointment system for Aadhaar enrolment.',
      nextHint:    'You\'ll choose your state and district next.',
    },
    {
      hint: 'Select your state', targetLabel: 'State',
      action: 'select', alternatives: ['Select State', 'State/UT'],
      elementType: 'select', zone: 'main',
      title:       'Select Your State',
      instruction: 'Choose your state from the dropdown list.',
      reason:      'The system needs your location to find enrolment centres near you.',
      nextHint:    'Then you\'ll pick your district.',
    },
    {
      hint: 'Select your district', targetLabel: 'District',
      action: 'select', alternatives: ['Select District'],
      elementType: 'select', zone: 'main',
      title:       'Select Your District',
      instruction: 'Choose your district from the dropdown list.',
      reason:      'This narrows down available enrolment centres in your area.',
      nextHint:    'Available appointment slots will appear.',
    },
    {
      hint: 'Click the appointment slot', targetLabel: 'Book Appointment',
      action: 'click', alternatives: ['Book', 'Schedule', 'Confirm Appointment'],
      elementType: 'button', zone: 'main',
      title:       'Confirm Your Appointment',
      instruction: 'Click an available slot to confirm your booking.',
      reason:      'This reserves your spot at the enrolment centre.',
      nextHint:    'You\'ll receive a confirmation with your appointment details.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('aadhaar-update', 'Update Aadhaar Details', [
    'update aadhaar', 'aadhaar update', 'change aadhaar', 'correct aadhaar',
    'aadhaar address update', 'update address in aadhaar',
  ], [
<<<<<<< HEAD
    { hint: 'Enter your Aadhaar number', targetLabel: 'Aadhaar Number', action: 'type', alternatives: ['Enter Aadhaar', '12-digit number', 'VID'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your registered mobile number', targetLabel: 'Mobile Number', action: 'type', alternatives: ['Mobile', 'Phone Number', 'Registered Mobile'], elementType: 'input', zone: 'main' },
    { hint: 'Request OTP', targetLabel: 'Send OTP', action: 'click', alternatives: ['Get OTP', 'Request OTP', 'Generate OTP'], elementType: 'button', zone: 'main' },
    { hint: 'Enter the OTP sent to your mobile', targetLabel: 'OTP', action: 'type', alternatives: ['Enter OTP', 'One Time Password', 'Verification Code'], elementType: 'input', zone: 'main' },
    { hint: 'Submit OTP and log in', targetLabel: 'Login', action: 'click', alternatives: ['Submit', 'Verify', 'Proceed'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Enter your Aadhaar number', targetLabel: 'Aadhaar Number',
      action: 'type', alternatives: ['Enter Aadhaar', '12-digit number', 'VID'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Aadhaar Number',
      instruction: 'Type your 12-digit Aadhaar number in the field.',
      reason:      'This identifies your Aadhaar record in the UIDAI system.',
      nextHint:    'You\'ll enter your registered mobile number next.',
    },
    {
      hint: 'Enter your registered mobile number', targetLabel: 'Mobile Number',
      action: 'type', alternatives: ['Mobile', 'Phone Number', 'Registered Mobile'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Mobile Number',
      instruction: 'Type the mobile number linked to your Aadhaar.',
      reason:      'An OTP will be sent here to verify your identity.',
      nextHint:    'Click "Send OTP" to receive your one-time password.',
    },
    {
      hint: 'Request OTP', targetLabel: 'Send OTP',
      action: 'click', alternatives: ['Get OTP', 'Request OTP', 'Generate OTP'],
      elementType: 'button', zone: 'main',
      title:       'Request OTP',
      instruction: 'Click "Send OTP" to receive the verification code.',
      reason:      'UIDAI sends a 6-digit code to your registered mobile to verify it\'s you.',
      nextHint:    'Check your mobile — the OTP usually arrives within 30 seconds.',
    },
    {
      hint: 'Enter the OTP sent to your mobile', targetLabel: 'OTP',
      action: 'type', alternatives: ['Enter OTP', 'One Time Password', 'Verification Code'],
      elementType: 'input', zone: 'main',
      title:       'Enter the OTP',
      instruction: 'Type the 6-digit code sent to your mobile number.',
      reason:      'This confirms you have access to the registered phone number.',
      nextHint:    'Click Login to proceed to your Aadhaar dashboard.',
    },
    {
      hint: 'Submit OTP and log in', targetLabel: 'Login',
      action: 'click', alternatives: ['Submit', 'Verify', 'Proceed'],
      elementType: 'button', zone: 'main',
      title:       'Log In',
      instruction: 'Click "Login" to submit your OTP and sign in.',
      reason:      'This completes identity verification and opens your Aadhaar profile.',
      nextHint:    'You\'ll be able to update your details from the next screen.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('pan-apply', 'Apply for PAN Card', [
    'apply for pan', 'pan card application', 'new pan card', 'get pan card', 'pan application',
  ], [
<<<<<<< HEAD
    { hint: 'Click "Apply Online" for new PAN', targetLabel: 'Apply Online', action: 'click', alternatives: ['New PAN', 'Apply for PAN', 'Apply Now'], elementType: 'button', zone: 'main' },
    { hint: 'Select application type', targetLabel: 'Application Type', action: 'select', alternatives: ['Select Type', 'Category'], elementType: 'select', zone: 'main' },
    { hint: 'Enter your full name', targetLabel: 'Full Name', action: 'type', alternatives: ['Name', 'Applicant Name', 'Your Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your date of birth', targetLabel: 'Date of Birth', action: 'type', alternatives: ['DOB', 'Birth Date', 'Date of Birth (DD/MM/YYYY)'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the application', targetLabel: 'Submit', action: 'click', alternatives: ['Proceed', 'Continue', 'Next'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Click "Apply Online" for new PAN', targetLabel: 'Apply Online',
      action: 'click', alternatives: ['New PAN', 'Apply for PAN', 'Apply Now'],
      elementType: 'button', zone: 'main',
      title:       'Start PAN Application',
      instruction: 'Click "Apply Online" to begin your PAN card application.',
      reason:      'This opens the official application form for a new PAN card.',
      nextHint:    'You\'ll select your application type next.',
    },
    {
      hint: 'Select application type', targetLabel: 'Application Type',
      action: 'select', alternatives: ['Select Type', 'Category'],
      elementType: 'select', zone: 'main',
      title:       'Select Application Type',
      instruction: 'Choose "New PAN – Indian Citizen (Form 49A)" from the dropdown.',
      reason:      'The application type determines which form and rules apply to your case.',
      nextHint:    'Then you\'ll enter your personal details.',
    },
    {
      hint: 'Enter your full name', targetLabel: 'Full Name',
      action: 'type', alternatives: ['Name', 'Applicant Name', 'Your Name'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Full Name',
      instruction: 'Type your name exactly as it appears on your Aadhaar or birth certificate.',
      reason:      'Your name on the PAN card must match your official identity documents.',
      nextHint:    'Next you\'ll enter your date of birth.',
    },
    {
      hint: 'Enter your date of birth', targetLabel: 'Date of Birth',
      action: 'type', alternatives: ['DOB', 'Birth Date', 'Date of Birth (DD/MM/YYYY)'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Date of Birth',
      instruction: 'Enter your date of birth in DD/MM/YYYY format.',
      reason:      'Your DOB is used to uniquely identify you in the tax database.',
      nextHint:    'Then submit the form to continue.',
    },
    {
      hint: 'Submit the application', targetLabel: 'Submit',
      action: 'click', alternatives: ['Proceed', 'Continue', 'Next'],
      elementType: 'button', zone: 'main',
      title:       'Submit the Form',
      instruction: 'Click "Submit" to send your application.',
      reason:      'This saves your information and moves you to the next section.',
      nextHint:    'You\'ll be asked for documents and payment details.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('passport-apply', 'Apply for Passport', [
    'apply for passport', 'passport application', 'new passport', 'get passport',
    'passport seva', 'passport renewal',
  ], [
<<<<<<< HEAD
    { hint: 'Register or log in to Passport Seva', targetLabel: 'Login', action: 'click', alternatives: ['Register', 'Sign In', 'Log In', 'New User'], elementType: 'button', zone: 'header' },
    { hint: 'Click "Apply for Fresh Passport"', targetLabel: 'Apply for Fresh Passport', action: 'click', alternatives: ['Fresh Passport', 'New Passport', 'Apply Now'], elementType: 'link', zone: 'main' },
    { hint: 'Fill in your name', targetLabel: 'Given Name', action: 'type', alternatives: ['First Name', 'Name', 'Full Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your date of birth', targetLabel: 'Date of Birth', action: 'type', alternatives: ['DOB', 'Birth Date'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the form', targetLabel: 'Submit', action: 'click', alternatives: ['Save', 'Proceed', 'Next'], elementType: 'button', zone: 'main' },
    { hint: 'Pay the application fee', targetLabel: 'Pay and Book Appointment', action: 'click', alternatives: ['Pay Fee', 'Book Appointment', 'Proceed to Payment'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Register or log in to Passport Seva', targetLabel: 'Login',
      action: 'click', alternatives: ['Register', 'Sign In', 'Log In', 'New User'],
      elementType: 'button', zone: 'header',
      title:       'Log In to Passport Seva',
      instruction: 'Click "Login" or "Register" at the top of the page.',
      reason:      'A Passport Seva account is required to apply online.',
      nextHint:    'Once logged in, you\'ll apply for a fresh passport.',
    },
    {
      hint: 'Click "Apply for Fresh Passport"', targetLabel: 'Apply for Fresh Passport',
      action: 'click', alternatives: ['Fresh Passport', 'New Passport', 'Apply Now'],
      elementType: 'link', zone: 'main',
      title:       'Apply for Fresh Passport',
      instruction: 'Click "Apply for Fresh Passport / Re-issue of Passport".',
      reason:      'This starts the online application for a new passport.',
      nextHint:    'You\'ll fill in your personal details next.',
    },
    {
      hint: 'Fill in your name', targetLabel: 'Given Name',
      action: 'type', alternatives: ['First Name', 'Name', 'Full Name'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Name',
      instruction: 'Type your given name as it should appear on your passport.',
      reason:      'The name on your passport must match your supporting documents exactly.',
      nextHint:    'Then enter your date of birth.',
    },
    {
      hint: 'Enter your date of birth', targetLabel: 'Date of Birth',
      action: 'type', alternatives: ['DOB', 'Birth Date'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Date of Birth',
      instruction: 'Enter your date of birth in DD/MM/YYYY format.',
      reason:      'This is a mandatory field for all passport applicants.',
      nextHint:    'Submit the form to move to the next section.',
    },
    {
      hint: 'Submit the form', targetLabel: 'Submit',
      action: 'click', alternatives: ['Save', 'Proceed', 'Next'],
      elementType: 'button', zone: 'main',
      title:       'Save and Continue',
      instruction: 'Click "Submit" to save this section and continue.',
      reason:      'Your details are saved securely before you proceed to payment.',
      nextHint:    'You\'ll pay the application fee and book an appointment.',
    },
    {
      hint: 'Pay the application fee', targetLabel: 'Pay and Book Appointment',
      action: 'click', alternatives: ['Pay Fee', 'Book Appointment', 'Proceed to Payment'],
      elementType: 'button', zone: 'main',
      title:       'Pay the Fee and Book an Appointment',
      instruction: 'Click "Pay and Book Appointment" to proceed to payment.',
      reason:      'The fee secures your appointment at a Passport Seva Kendra.',
      nextHint:    'You\'ll choose a convenient date and time at your nearest PSK.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('digilocker-signup', 'Create DigiLocker Account', [
    'digilocker', 'digi locker', 'create digilocker', 'sign up digilocker',
  ], [
<<<<<<< HEAD
    { hint: 'Click "Sign Up" to create an account', targetLabel: 'Sign Up', action: 'click', alternatives: ['Create Account', 'Register', 'Get Started'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your mobile number', targetLabel: 'Mobile Number', action: 'type', alternatives: ['Phone Number', 'Mobile', 'Enter Mobile'], elementType: 'input', zone: 'main' },
    { hint: 'Enter OTP to verify', targetLabel: 'OTP', action: 'type', alternatives: ['Enter OTP', 'Verification Code', 'One Time Password'], elementType: 'input', zone: 'main' },
    { hint: 'Set your username', targetLabel: 'Username', action: 'type', alternatives: ['Choose Username', 'User ID'], elementType: 'input', zone: 'main' },
    { hint: 'Set your PIN', targetLabel: 'PIN', action: 'type', alternatives: ['6-digit PIN', 'Security PIN', 'Create PIN'], elementType: 'input', zone: 'main' },
=======
    {
      hint: 'Click "Sign Up" to create an account', targetLabel: 'Sign Up',
      action: 'click', alternatives: ['Create Account', 'Register', 'Get Started'],
      elementType: 'button', zone: 'main',
      title:       'Create a DigiLocker Account',
      instruction: 'Click "Sign Up" to start creating your account.',
      reason:      'DigiLocker is India\'s official digital document wallet, linked to your Aadhaar.',
      nextHint:    'You\'ll enter your mobile number to get started.',
    },
    {
      hint: 'Enter your mobile number', targetLabel: 'Mobile Number',
      action: 'type', alternatives: ['Phone Number', 'Mobile', 'Enter Mobile'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Mobile Number',
      instruction: 'Type your 10-digit mobile number.',
      reason:      'Your mobile number links your DigiLocker to your Aadhaar via OTP.',
      nextHint:    'You\'ll receive an OTP to verify your number.',
    },
    {
      hint: 'Enter OTP to verify', targetLabel: 'OTP',
      action: 'type', alternatives: ['Enter OTP', 'Verification Code', 'One Time Password'],
      elementType: 'input', zone: 'main',
      title:       'Verify with OTP',
      instruction: 'Enter the 6-digit OTP sent to your mobile.',
      reason:      'This confirms you own the mobile number you registered.',
      nextHint:    'You\'ll set a username and PIN next.',
    },
    {
      hint: 'Set your username', targetLabel: 'Username',
      action: 'type', alternatives: ['Choose Username', 'User ID'],
      elementType: 'input', zone: 'main',
      title:       'Choose a Username',
      instruction: 'Create a unique username for your DigiLocker account.',
      reason:      'Your username is how you\'ll log in to DigiLocker in the future.',
      nextHint:    'Then set a 6-digit security PIN.',
    },
    {
      hint: 'Set your PIN', targetLabel: 'PIN',
      action: 'type', alternatives: ['6-digit PIN', 'Security PIN', 'Create PIN'],
      elementType: 'input', zone: 'main',
      title:       'Set a Security PIN',
      instruction: 'Create a 6-digit PIN you\'ll remember.',
      reason:      'Your PIN secures your DigiLocker documents and is required at each login.',
      nextHint:    'Your DigiLocker account will be ready immediately after this.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  // ── Banking ──────────────────────────────────────────────────────────────────

  W('bank-login', 'Log in to Net Banking', [
    'net banking', 'internet banking', 'online banking login',
    'log in to bank', 'bank login',
  ], [
<<<<<<< HEAD
    { hint: 'Enter your user ID / customer ID', targetLabel: 'User ID', action: 'type', alternatives: ['Customer ID', 'Username', 'Login ID', 'Account Number'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your password', targetLabel: 'Password', action: 'type', alternatives: ['Enter Password', 'Login Password', 'Net Banking Password'], elementType: 'input', zone: 'main' },
    { hint: 'Click Login', targetLabel: 'Login', action: 'click', alternatives: ['Sign In', 'Log In', 'Submit', 'Continue'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Enter your user ID / customer ID', targetLabel: 'User ID',
      action: 'type', alternatives: ['Customer ID', 'Username', 'Login ID', 'Account Number'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your User ID',
      instruction: 'Type your net banking User ID or Customer ID.',
      reason:      'This identifies your bank account in the net banking system.',
      nextHint:    'Then enter your password to continue.',
    },
    {
      hint: 'Enter your password', targetLabel: 'Password',
      action: 'type', alternatives: ['Enter Password', 'Login Password', 'Net Banking Password'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Password',
      instruction: 'Type your net banking password.',
      reason:      'Your password, combined with your User ID, authenticates your login.',
      nextHint:    'Click Login to access your account.',
    },
    {
      hint: 'Click Login', targetLabel: 'Login',
      action: 'click', alternatives: ['Sign In', 'Log In', 'Submit', 'Continue'],
      elementType: 'button', zone: 'main',
      title:       'Log In',
      instruction: 'Click "Login" to sign into your net banking account.',
      reason:      'This submits your credentials and opens your account dashboard.',
      nextHint:    'Your account summary and options will appear.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('upi-payment', 'Send Money via UPI', [
    'upi payment', 'send money upi', 'pay via upi', 'gpay', 'google pay',
    'phonepe', 'phone pe', 'paytm payment',
  ], [
<<<<<<< HEAD
    { hint: 'Enter UPI ID or phone number', targetLabel: 'UPI ID', action: 'type', alternatives: ['Phone Number', 'Enter VPA', 'Pay To', 'Recipient UPI'], elementType: 'input', zone: 'main' },
    { hint: 'Enter the amount', targetLabel: 'Amount', action: 'type', alternatives: ['Enter Amount', 'Payment Amount', '₹'], elementType: 'input', zone: 'main' },
    { hint: 'Click Pay / Proceed', targetLabel: 'Pay', action: 'click', alternatives: ['Proceed', 'Send', 'Transfer', 'Pay Now'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your UPI PIN', targetLabel: 'UPI PIN', action: 'type', alternatives: ['4-digit PIN', '6-digit PIN', 'MPIN', 'Enter PIN'], elementType: 'input', zone: 'modal' },
=======
    {
      hint: 'Enter UPI ID or phone number', targetLabel: 'UPI ID',
      action: 'type', alternatives: ['Phone Number', 'Enter VPA', 'Pay To', 'Recipient UPI'],
      elementType: 'input', zone: 'main',
      title:       'Enter Recipient Details',
      instruction: 'Type the recipient\'s UPI ID (e.g. name@upi) or mobile number.',
      reason:      'This tells the system who should receive the payment.',
      nextHint:    'Then enter the amount you want to send.',
    },
    {
      hint: 'Enter the amount', targetLabel: 'Amount',
      action: 'type', alternatives: ['Enter Amount', 'Payment Amount', '₹'],
      elementType: 'input', zone: 'main',
      title:       'Enter the Amount',
      instruction: 'Type the amount you want to send (in rupees).',
      reason:      'This is how much money will be transferred to the recipient.',
      nextHint:    'Click Pay to proceed.',
    },
    {
      hint: 'Click Pay / Proceed', targetLabel: 'Pay',
      action: 'click', alternatives: ['Proceed', 'Send', 'Transfer', 'Pay Now'],
      elementType: 'button', zone: 'main',
      title:       'Proceed to Pay',
      instruction: 'Click "Pay" or "Proceed" to confirm the payment.',
      reason:      'This initiates the transfer — you\'ll verify it with your UPI PIN next.',
      nextHint:    'A dialog will appear asking for your 4 or 6-digit UPI PIN.',
    },
    {
      hint: 'Enter your UPI PIN', targetLabel: 'UPI PIN',
      action: 'type', alternatives: ['4-digit PIN', '6-digit PIN', 'MPIN', 'Enter PIN'],
      elementType: 'input', zone: 'modal',
      title:       'Enter Your UPI PIN',
      instruction: 'Type your 4 or 6-digit UPI PIN to authorise the payment.',
      reason:      'Your PIN is the final security check before money is transferred.',
      nextHint:    'The payment will be processed immediately after this.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  // ── E-commerce ───────────────────────────────────────────────────────────────

  W('shopping-checkout', 'Complete a Purchase / Checkout', [
    'checkout', 'buy now', 'place order', 'complete purchase',
    'add to cart and buy', 'shopping checkout',
  ], [
<<<<<<< HEAD
    { hint: 'Click "Add to Cart" or "Buy Now"', targetLabel: 'Add to Cart', action: 'click', alternatives: ['Buy Now', 'Add to Bag', 'Shop Now'], elementType: 'button', zone: 'main' },
    { hint: 'Go to Cart / Proceed to Checkout', targetLabel: 'Proceed to Checkout', action: 'click', alternatives: ['Go to Cart', 'Checkout', 'View Cart'], elementType: 'button', zone: 'main' },
    { hint: 'Enter or confirm delivery address', targetLabel: 'Deliver Here', action: 'click', alternatives: ['Confirm Address', 'Use this Address', 'Select Address'], elementType: 'button', zone: 'main' },
    { hint: 'Select payment method', targetLabel: 'Continue', action: 'click', alternatives: ['Place Order', 'Proceed to Pay', 'Pay Now', 'Select Payment Method'], elementType: 'button', zone: 'main' },
    { hint: 'Place the order', targetLabel: 'Place Order', action: 'click', alternatives: ['Confirm Order', 'Pay Now', 'Order Now'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Click "Add to Cart" or "Buy Now"', targetLabel: 'Add to Cart',
      action: 'click', alternatives: ['Buy Now', 'Add to Bag', 'Shop Now'],
      elementType: 'button', zone: 'main',
      title:       'Add Item to Cart',
      instruction: 'Click "Add to Cart" or "Buy Now" on the product page.',
      reason:      'This reserves the item and adds it to your shopping cart.',
      nextHint:    'Then proceed to checkout to complete the purchase.',
    },
    {
      hint: 'Go to Cart / Proceed to Checkout', targetLabel: 'Proceed to Checkout',
      action: 'click', alternatives: ['Go to Cart', 'Checkout', 'View Cart'],
      elementType: 'button', zone: 'main',
      title:       'Go to Checkout',
      instruction: 'Click "Proceed to Checkout" or "Go to Cart".',
      reason:      'This takes you to the checkout where you can review your order.',
      nextHint:    'You\'ll confirm your delivery address next.',
    },
    {
      hint: 'Enter or confirm delivery address', targetLabel: 'Deliver Here',
      action: 'click', alternatives: ['Confirm Address', 'Use this Address', 'Select Address'],
      elementType: 'button', zone: 'main',
      title:       'Confirm Delivery Address',
      instruction: 'Click "Deliver Here" next to your address, or add a new one.',
      reason:      'Your delivery address tells the seller where to ship your order.',
      nextHint:    'You\'ll choose a payment method after this.',
    },
    {
      hint: 'Select payment method', targetLabel: 'Continue',
      action: 'click', alternatives: ['Place Order', 'Proceed to Pay', 'Pay Now', 'Select Payment Method'],
      elementType: 'button', zone: 'main',
      title:       'Choose Payment Method',
      instruction: 'Select how you want to pay, then click "Continue".',
      reason:      'Choosing a payment method confirms how the money will be collected.',
      nextHint:    'You\'ll place the final order on the next screen.',
    },
    {
      hint: 'Place the order', targetLabel: 'Place Order',
      action: 'click', alternatives: ['Confirm Order', 'Pay Now', 'Order Now'],
      elementType: 'button', zone: 'main',
      title:       'Place Your Order',
      instruction: 'Click "Place Order" to complete your purchase.',
      reason:      'This confirms the order and initiates the payment.',
      nextHint:    'You\'ll see an order confirmation with a tracking number.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  // ── Common ────────────────────────────────────────────────────────────────────

  W('register', 'Create an Account / Sign Up', [
    'sign up', 'register', 'create account', 'create an account',
    'new account', 'join', 'open account',
  ], [
<<<<<<< HEAD
    { hint: 'Click Sign Up / Register', targetLabel: 'Sign Up', action: 'click', alternatives: ['Register', 'Create Account', 'Join', 'Get Started'], elementType: 'button', zone: 'main' },
    { hint: 'Enter your full name', targetLabel: 'Full Name', action: 'type', alternatives: ['Name', 'Your Name', 'First Name'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your email address', targetLabel: 'Email', action: 'type', alternatives: ['Email Address', 'Username', 'Enter Email'], elementType: 'input', zone: 'main' },
    { hint: 'Enter a password', targetLabel: 'Password', action: 'type', alternatives: ['Create Password', 'Choose Password', 'New Password'], elementType: 'input', zone: 'main' },
    { hint: 'Submit the registration', targetLabel: 'Submit', action: 'click', alternatives: ['Create Account', 'Register', 'Sign Up', 'Continue'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Click Sign Up / Register', targetLabel: 'Sign Up',
      action: 'click', alternatives: ['Register', 'Create Account', 'Join', 'Get Started'],
      elementType: 'button', zone: 'main',
      title:       'Open the Sign-Up Form',
      instruction: 'Click "Sign Up" or "Register" to open the registration form.',
      reason:      'This takes you to the form where you\'ll create your account.',
      nextHint:    'You\'ll fill in your name, email, and password.',
    },
    {
      hint: 'Enter your full name', targetLabel: 'Full Name',
      action: 'type', alternatives: ['Name', 'Your Name', 'First Name'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Name',
      instruction: 'Type your full name in the name field.',
      reason:      'Your name personalises your account and may appear in communications.',
      nextHint:    'Then enter your email address.',
    },
    {
      hint: 'Enter your email address', targetLabel: 'Email',
      action: 'type', alternatives: ['Email Address', 'Username', 'Enter Email'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Email',
      instruction: 'Type your email address — this will be your login username.',
      reason:      'Your email is used to verify your account and recover your password.',
      nextHint:    'Then create a password for your account.',
    },
    {
      hint: 'Enter a password', targetLabel: 'Password',
      action: 'type', alternatives: ['Create Password', 'Choose Password', 'New Password'],
      elementType: 'input', zone: 'main',
      title:       'Create a Password',
      instruction: 'Choose a strong password (letters, numbers, and symbols).',
      reason:      'A strong password keeps your account secure.',
      nextHint:    'Then submit the form to create your account.',
    },
    {
      hint: 'Submit the registration', targetLabel: 'Submit',
      action: 'click', alternatives: ['Create Account', 'Register', 'Sign Up', 'Continue'],
      elementType: 'button', zone: 'main',
      title:       'Create Your Account',
      instruction: 'Click "Submit" or "Create Account" to finish registration.',
      reason:      'This sends your details and creates your new account.',
      nextHint:    'Check your email — you may need to verify your address.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
  ]),

  W('login', 'Log In / Sign In', [
    'log in', 'login', 'sign in', 'sign into',
  ], [
<<<<<<< HEAD
    { hint: 'Enter your email or username', targetLabel: 'Email', action: 'type', alternatives: ['Email Address', 'Username', 'Mobile Number', 'User ID'], elementType: 'input', zone: 'main' },
    { hint: 'Enter your password', targetLabel: 'Password', action: 'type', alternatives: ['Enter Password', 'Your Password'], elementType: 'input', zone: 'main' },
    { hint: 'Click Sign In', targetLabel: 'Sign In', action: 'click', alternatives: ['Log In', 'Login', 'Continue', 'Next'], elementType: 'button', zone: 'main' },
=======
    {
      hint: 'Enter your email or username', targetLabel: 'Email',
      action: 'type', alternatives: ['Email Address', 'Username', 'Mobile Number', 'User ID'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Email or Username',
      instruction: 'Type your email address or username in the login field.',
      reason:      'This tells the system which account you\'re trying to access.',
      nextHint:    'Then enter your password.',
    },
    {
      hint: 'Enter your password', targetLabel: 'Password',
      action: 'type', alternatives: ['Enter Password', 'Your Password'],
      elementType: 'input', zone: 'main',
      title:       'Enter Your Password',
      instruction: 'Type your password for this account.',
      reason:      'Your password proves you are the owner of this account.',
      nextHint:    'Click Sign In to access your account.',
    },
    {
      hint: 'Click Sign In', targetLabel: 'Sign In',
      action: 'click', alternatives: ['Log In', 'Login', 'Continue', 'Next'],
      elementType: 'button', zone: 'main',
      title:       'Sign In',
      instruction: 'Click "Sign In" or "Log In" to access your account.',
      reason:      'This submits your credentials and opens your account.',
      nextHint:    'Your account dashboard or home page will load.',
    },
>>>>>>> 5d80ee7cb4e0c8288b353ddaa9e8f5315739759c
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
