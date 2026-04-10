/**
 * Submit survey response to Google Sheets via Apps Script Web App.
 *
 * Setup (one-time):
 * 1. Create a Google Sheet with columns:
 *    phase | timestamp | currentPlannerRating | yearStanding | wouldUse | easeOfUse | feedback
 *
 * 2. Go to Extensions → Apps Script, paste this:
 *
 *    function doPost(e) {
 *      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *      var data = JSON.parse(e.postData.contents);
 *      sheet.appendRow([
 *        data.phase,
 *        data.submittedAt,
 *        data.currentPlannerRating || "",
 *        data.yearStanding || "",
 *        data.wouldUse || "",
 *        data.easeOfUse || "",
 *        data.feedback || ""
 *      ]);
 *      return ContentService
 *        .createTextOutput(JSON.stringify({ status: "ok" }))
 *        .setMimeType(ContentService.MimeType.JSON);
 *    }
 *
 * 3. Deploy → New Deployment → Web App → Anyone can access
 * 4. Copy the URL and set it as NEXT_PUBLIC_SURVEY_SHEET_URL in your .env.local
 */

const SHEET_URL = process.env.NEXT_PUBLIC_SURVEY_SHEET_URL;

export async function submitToSheet(data: Record<string, unknown>) {
  if (!SHEET_URL) {
    console.warn("[Survey] No NEXT_PUBLIC_SURVEY_SHEET_URL set — skipping sheet submission");
    return;
  }

  try {
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script doesn't return CORS headers
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn("[Survey] Failed to submit to Google Sheet:", err);
  }
}
