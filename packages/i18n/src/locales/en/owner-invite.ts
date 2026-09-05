export const englishOwnerInviteMessages = {
  "ownerInvite.metaTitle": "Complete your Tanee setup",
  "ownerInvite.metaDescription": "Continue your secure Tanee business setup.",
  "ownerInvite.title": "Set your password",
  "ownerInvite.body":
    "Choose your Tanee password to continue setting up your business.",
  "ownerInvite.missing":
    "Open the secure link from your Tanee email to continue your business setup.",
  "ownerInvite.invalid": "This secure setup link is invalid or has expired.",
  "ownerInvite.backLogin": "Back to login",
  "ownerInvite.passwordMismatch": "The passwords do not match.",
  "ownerInvite.passwordInvalid": "Please choose a valid password.",
  "ownerInvite.password": "Password",
  "ownerInvite.confirmPassword": "Confirm password",
  "ownerInvite.activate": "Continue setup",
} as const;

export type OwnerInviteMessageKey = keyof typeof englishOwnerInviteMessages;
