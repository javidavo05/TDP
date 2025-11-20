import { config } from "dotenv";
import { resolve } from "path";
import { EmailService } from "../src/services/email/EmailService";
import { Ticket } from "../src/domain/entities/Ticket";

// Load environment variables from .env.local
// Try multiple paths to find .env.local
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Enable debug mode for email service
process.env.DEBUG_EMAIL = "true";

// Check environment variables
const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  console.error("❌ Error: RESEND_API_KEY is not configured in .env.local");
  console.log("\n📝 Please add the following to your .env.local file:");
  console.log("RESEND_API_KEY=re_your_api_key_here");
  console.log("RESEND_FROM_EMAIL=onboarding@resend.dev");
  process.exit(1);
}

if (!resendFromEmail) {
  console.warn("⚠️  Warning: RESEND_FROM_EMAIL is not configured, using default: noreply@tdp.com");
}

async function testEmail() {
  console.log("📧 Starting email test...\n");

  // Get test email from command line argument
  // Note: Resend test mode only allows sending to the account owner's email
  // For testing with onboarding@resend.dev, you can only send to your registered email
  const testEmail = process.argv[2] || "javier@pimepanama.com";
  
  console.log("⚠️  Important: Resend test mode only allows sending to your registered email address.");
  console.log("   For production, you'll need to verify a domain in Resend.\n");

  console.log(`📬 Sending test email to: ${testEmail}`);
  console.log(`📤 From email: ${resendFromEmail || "noreply@tdp.com"}\n`);

  try {
    // Create EmailService instance
    const emailService = new EmailService();

    // Create test ticket data
    const testTicket = Ticket.create({
      tripId: "test-trip-id",
      seatId: "test-seat-id",
      passengerName: "Juan Pérez",
      destinationStopId: "test-destination-stop",
      price: 25.00,
      itbms: 1.75,
      passengerEmail: testEmail,
      passengerPhone: "+507-6000-1234",
    });

    // Mark ticket as paid for the test
    testTicket.markAsPaid();

    // Create test trip data
    const testTrip = {
      id: "test-trip-id",
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      arrivalEstimate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      route: {
        origin: "Ciudad de Panamá",
        destination: "David, Chiriquí",
      },
    };

    // Create test seat data
    const testSeat = {
      id: "test-seat-id",
      number: "A12",
    };

    // Create test payment data
    const testPayment = {
      amount: 25.00,
      itbms: 1.75,
      totalAmount: 26.75,
      method: "Yappy Comercial",
    };

    console.log("📋 Test data created:");
    console.log(`   - Passenger: ${testTicket.passengerName}`);
    console.log(`   - Route: ${testTrip.route.origin} → ${testTrip.route.destination}`);
    console.log(`   - Seat: ${testSeat.number}`);
    console.log(`   - Total: $${testPayment.totalAmount.toFixed(2)} USD`);
    console.log(`   - QR Code: ${testTicket.qrCode}\n`);

    // Send the email
    console.log("🚀 Sending email...");
    console.log(`📤 API Key (first 10 chars): ${resendApiKey?.substring(0, 10)}...`);
    console.log(`📧 From: ${resendFromEmail || "noreply@tdp.com"}`);
    console.log(`📬 To: ${testEmail}\n`);
    
    const result = await emailService.sendTicketConfirmation(
      testTicket,
      testTrip,
      testSeat,
      testPayment
    );

    console.log("\n✅ Email sent successfully!");
    if (result) {
      console.log(`📧 Email ID: ${result.id || "N/A"}`);
    }
    console.log(`📬 Check your inbox at: ${testEmail}`);
    console.log("\n💡 Note: If you don't see the email:");
    console.log("   - Check your spam folder");
    console.log("   - Wait a few seconds (email delivery can take 10-30 seconds)");
    console.log("   - Verify that RESEND_API_KEY is correct");
    console.log("   - If using onboarding@resend.dev, emails may take longer to deliver");
    console.log("   - Check Resend dashboard: https://resend.com/emails");
  } catch (error) {
    console.error("\n❌ Error sending email:");
    console.error(error);

    if (error instanceof Error) {
      if (error.message.includes("RESEND_API_KEY")) {
        console.log("\n💡 Make sure RESEND_API_KEY is set in your .env.local file");
      } else if (error.message.includes("Invalid API key")) {
        console.log("\n💡 Your RESEND_API_KEY appears to be invalid. Please check it in your Resend dashboard.");
      } else if (error.message.includes("domain")) {
        console.log("\n💡 Domain verification issue. For testing, use: RESEND_FROM_EMAIL=onboarding@resend.dev");
      }
    }

    process.exit(1);
  }
}

// Run the test
testEmail()
  .then(() => {
    console.log("\n✨ Test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unexpected error:", error);
    process.exit(1);
  });

