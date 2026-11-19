/**
 * Sends one test SMS with the configured provider, to check the keys after setting them.
 * Usage: AT_USERNAME=... AT_API_KEY=... npx tsx --conditions=react-server scripts/sms-test.mts 0803xxxxxxx
 */
import { normaliseNigerianPhone } from "../lib/core/phone";
import { sendSms, smsConfigured } from "../lib/server/sms";

const to = normaliseNigerianPhone(process.argv[2] ?? "");
if (!to) throw new Error("Give a Nigerian mobile number, like 08031234567");
if (!smsConfigured()) throw new Error("Set AT_USERNAME and AT_API_KEY first");
console.log(await sendSms(to, "Tally: test message. SMS alerts are working."));
