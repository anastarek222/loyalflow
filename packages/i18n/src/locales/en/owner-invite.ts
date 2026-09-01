export const englishOwnerInviteMessages = {
  "ownerInvite.metaTitle": "Accept owner invitation | LoyalFlow Beta",
  "ownerInvite.metaDescription": "Accept a secure LoyalFlow Beta owner invitation.",
  "ownerInvite.title": "Accept owner invitation",
  "ownerInvite.body":
    "Choose your LoyalFlow password to activate your invited owner account.",
  "ownerInvite.invalid": "This invitation link is invalid or has expired.",
  "ownerInvite.backLogin": "Back to login",
  "ownerInvite.passwordMismatch": "The passwords do not match.",
  "ownerInvite.passwordInvalid": "Please choose a valid password.",
  "ownerInvite.password": "Password",
  "ownerInvite.confirmPassword": "Confirm password",
  "ownerInvite.activate": "Activate owner account",
} as const;

export type OwnerInviteMessageKey = keyof typeof englishOwnerInviteMessages;
