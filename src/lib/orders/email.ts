import type { Order } from "@/types/order";

const PAYMENT_LABELS: Record<string, string> = {
  pouzece: "Plaćanje pouzećem",
  uplata: "Uplata na račun",
  kartica: "Platna kartica",
};

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${i.price > 0 ? i.price_formatted : "—"}</td>
        </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px;text-align:left">Proizvod</th>
          <th style="padding:8px;text-align:center">Kol.</th>
          <th style="padding:8px;text-align:right">Cena</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 8px;font-weight:bold">Ukupno</td>
          <td style="padding:12px 8px;font-weight:bold;text-align:right">${order.total_formatted}</td>
        </tr>
      </tfoot>
    </table>`;
}

function customerEmailHtml(order: Order): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="color:#ff9900">bojleri.com</h1>
      <h2 style="font-size:20px">Potvrda porudžbine ${order.id}</h2>
      <p>Zdravo ${order.customer.name},</p>
      <p>Hvala na porudžbini. Primili smo vašu narudžbinu i kontaktiraćemo vas uskoro radi potvrde i dogovora dostave.</p>
      ${itemsTable(order)}
      <p style="margin-top:20px"><strong>Plaćanje:</strong> ${PAYMENT_LABELS[order.payment] || order.payment}</p>
      <p><strong>Dostava:</strong> ${order.customer.address}, ${order.customer.city}</p>
      <p><strong>Telefon:</strong> ${order.customer.phone}</p>
      ${order.customer.note ? `<p><strong>Napomena:</strong> ${order.customer.note}</p>` : ""}
      <p style="margin-top:24px;font-size:13px;color:#666">
        Pitanja? Pišite na <a href="mailto:prodaja@bojleri.com">prodaja@bojleri.com</a> ili pozovite +381 64 827 9855.
      </p>
    </div>`;
}

function shopEmailHtml(order: Order): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h1 style="color:#ff9900">Nova porudžbina — ${order.id}</h1>
      <p><strong>Kupac:</strong> ${order.customer.name}</p>
      <p><strong>Email:</strong> <a href="mailto:${order.customer.email}">${order.customer.email}</a></p>
      <p><strong>Telefon:</strong> <a href="tel:${order.customer.phone.replace(/\s/g, "")}">${order.customer.phone}</a></p>
      <p><strong>Adresa:</strong> ${order.customer.address}, ${order.customer.city}</p>
      <p><strong>Plaćanje:</strong> ${PAYMENT_LABELS[order.payment] || order.payment}</p>
      ${order.customer.note ? `<p><strong>Napomena:</strong> ${order.customer.note}</p>` : ""}
      ${itemsTable(order)}
    </div>`;
}

async function sendResendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.ORDER_FROM_EMAIL || "bojleri.com <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return false;
  }
  return true;
}

async function sendWeb3FormsNotification(order: Order): Promise<boolean> {
  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return false;

  const items = order.items.map((i) => `${i.name} × ${i.quantity} — ${i.price_formatted}`).join("\n");
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key: key,
      subject: `Nova porudžbina ${order.id} — bojleri.com`,
      from_name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      message: [
        `Porudžbina: ${order.id}`,
        `Kupac: ${order.customer.name}`,
        `Telefon: ${order.customer.phone}`,
        `Email: ${order.customer.email}`,
        `Adresa: ${order.customer.address}, ${order.customer.city}`,
        `Plaćanje: ${PAYMENT_LABELS[order.payment] || order.payment}`,
        `Ukupno: ${order.total_formatted}`,
        "",
        "Artikli:",
        items,
        order.customer.note ? `\nNapomena: ${order.customer.note}` : "",
      ].join("\n"),
    }),
  });

  return res.ok;
}

export async function sendOrderEmails(order: Order): Promise<{ customer: boolean; shop: boolean }> {
  const notifyEmail = process.env.ORDER_NOTIFY_EMAIL || "prodaja@bojleri.com";

  const [customer, shop] = await Promise.all([
    sendResendEmail(
      order.customer.email,
      `Potvrda porudžbine ${order.id} — bojleri.com`,
      customerEmailHtml(order)
    ),
    sendResendEmail(
      notifyEmail,
      `Nova porudžbina ${order.id} — ${order.customer.name}`,
      shopEmailHtml(order)
    ),
  ]);

  if (customer || shop) return { customer, shop };

  const web3 = await sendWeb3FormsNotification(order);
  return { customer: false, shop: web3 };
}