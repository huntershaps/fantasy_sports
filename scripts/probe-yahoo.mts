import "dotenv/config";

/**
 * Answers the only question that matters before writing a Yahoo provider: will
 * Yahoo grant this app fantasy read scope at all?
 *
 * The authorize endpoint is the decisive test. If the app lacks fantasy
 * permission, Yahoo rejects `scope=fspt-r` outright rather than showing a
 * consent screen. Reads credentials from .env — never from the command line.
 */
const clientId = process.env.YAHOO_CLIENT_ID ?? "";
const redirectUri =
  process.env.YAHOO_REDIRECT_URI ??
  "https://localhost:3000/api/providers/yahoo/callback";

if (!clientId) {
  console.error("YAHOO_CLIENT_ID is not set in .env");
  process.exit(1);
}

const authorizeUrl =
  "https://api.login.yahoo.com/oauth2/request_auth" +
  `?client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  "&response_type=code&language=en-us&scope=fspt-r";

const response = await fetch(authorizeUrl, { redirect: "manual" });
const location = response.headers.get("location");
const body = await response.text();

console.log(`status:   ${response.status}`);
if (location) console.log(`redirect: ${location.slice(0, 220)}`);

const text = body.toLowerCase();
if (text.includes("invalid_client") || location?.includes("invalid_client")) {
  console.log("\nVERDICT: Yahoo does not recognise this client id.");
} else if (text.includes("invalid_scope") || location?.includes("invalid_scope")) {
  console.log("\nVERDICT: the app exists but is NOT granted fantasy read (fspt-r).");
} else if (response.status === 302 && location?.includes("login.yahoo.com")) {
  console.log("\nVERDICT: scope accepted — Yahoo is asking you to sign in. Fantasy read works.");
} else if (response.status === 200 && text.includes("sign in")) {
  console.log("\nVERDICT: scope accepted — Yahoo served its sign-in page. Fantasy read works.");
} else {
  console.log(`\nInconclusive. First 400 chars of body:\n${body.slice(0, 400)}`);
}

console.log("\nIf scope is accepted, open this in a browser to authorise:");
console.log(authorizeUrl);
