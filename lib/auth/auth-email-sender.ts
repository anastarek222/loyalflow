export const TANEE_AUTH_EMAIL_BRAND = "Tanee";
const TANEE_AUTH_EMAIL_ADDRESS = "noreply@gettanee.com";

export function resolveTaneeAuthEmailSender() {
  return `${TANEE_AUTH_EMAIL_BRAND} <${TANEE_AUTH_EMAIL_ADDRESS}>`;
}
