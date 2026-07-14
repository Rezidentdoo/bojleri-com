#!/usr/bin/env node
/**
 * Test porudžbine — šalje 2 test narudžbine na production API.
 * Usage: node scripts/test-orders.mjs
 */
const BASE = process.env.ORDER_TEST_URL || "https://bojleri.com";

const TEST_ORDERS = [
  {
    label: "Igor (Yahoo)",
    customer: {
      name: "Igor Stojanović",
      email: "igorstojan@yahoo.com",
      phone: "+381 64 123 4567",
      address: "Test ulica 1",
      city: "Beograd",
      note: "TEST porudžbina — bojleri.com (može se ignorisati)",
    },
  },
  {
    label: "Aqua Land (Gmail)",
    customer: {
      name: "Aqua Land Serbia",
      email: "aqua.land.serbia@gmail.com",
      phone: "+381 64 987 6543",
      address: "Bulevar test 15",
      city: "Novi Sad",
      note: "TEST porudžbina — bojleri.com (može se ignorisati)",
    },
  },
];

const TEST_ITEM = {
  id: "termorad-prohrom-s-280l",
  name: "TERMORAD PROHROM S-280L",
  quantity: 1,
  price: 116110,
  price_formatted: "116.110 RSD",
};

async function placeOrder(testCase) {
  const payload = {
    customer: testCase.customer,
    payment: "pouzece",
    items: [TEST_ITEM],
    total: TEST_ITEM.price * TEST_ITEM.quantity,
  };

  const res = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, label: testCase.label };
}

console.log(`\n🛒 Test porudžbine → ${BASE}/api/orders\n`);

const results = [];
for (const testCase of TEST_ORDERS) {
  const result = await placeOrder(testCase);
  results.push(result);
  const { status, data, label } = result;
  console.log(`[${label}] HTTP ${status}`);
  console.log(`  email: ${testCase.customer.email}`);
  console.log(`  order: ${data.orderId || "—"}`);
  console.log(`  emailSent: ${data.emailSent} (kupac: ${data.emailToCustomer}, prodavnica: ${data.emailToShop})`);
  if (data.error) console.log(`  error: ${data.error}`);
  console.log("");
}

const allOk = results.every((r) => r.status === 200 && r.data.ok);
const emailsOk = results.every((r) => r.data.emailSent);
console.log(allOk ? "✅ Porudžbine kreirane." : "❌ Neke porudžbine nisu uspele.");
console.log(emailsOk ? "✅ Emailovi poslati." : "⚠️  Email nije poslat — proveri SMTP na serveru.\n");
process.exit(allOk ? 0 : 1);