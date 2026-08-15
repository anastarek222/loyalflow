export const englishAuthMessages = {
  "auth.signIn": "Sign in",
  "auth.signInWorkspace": "Sign in to your workspace",
  "auth.email": "Email address",
  "auth.password": "Password",
  "auth.forgotPassword": "Forgot password?",
  "auth.secureWorkspace": "Secure LoyalFlow workspace",
  "auth.emailPlaceholder": "name@company.com",
  "auth.passwordPlaceholder": "Enter your password",
  "auth.signingIn": "Checking account…",
  "auth.invalid": "The sign-in details or security code are incorrect.",
  "auth.welcomeBack": "Welcome back",
  "auth.signInBody":
    "Use the same sign-in for every LoyalFlow role. We will route you to the right workspace securely.",
  "auth.backHome": "Back to homepage",
  "auth.protectedAccess": "Protected workspace access",
  "auth.workspaceReadyTitle": "Your loyalty workspace is ready when you are.",
  "auth.workspaceReadyBody":
    "Return to the place where your team runs customers, rewards, branches, and daily loyalty activity.",
  "auth.benefitCustomers": "Customer activity in one connected view",
  "auth.benefitRewards": "Clear reward progress and operations",
  "auth.benefitRoles": "Access that follows each team member’s role",
  "auth.mfaTitle": "One more security step",
  "auth.mfaBody":
    "Enter the current code from your authenticator app or use one of your recovery codes.",
  "auth.mfaLabel": "Security code",
  "auth.mfaPlaceholder": "123456 or recovery code",
  "auth.verify": "Verify and continue",
  "auth.verifying": "Verifying…",
  "auth.back": "Back to sign in",
  "auth.mfaSetupTitle": "Secure setup required",
  "auth.mfaSetupBody":
    "Your credentials are correct, but this account must finish multi-factor authentication setup before access is allowed.",
  "auth.mfaSetupCta": "Set up secure access",
  "auth.resendVerification": "Need a new verification email?",
  "auth.noRoleSelection":
    "No role selection is needed. LoyalFlow opens the correct experience after secure sign-in.",
  "auth.passwordResetSuccess":
    "Your password has been updated. Sign in with your new password.",
  "auth.verificationSuccess":
    "Your email has been verified. You can sign in now.",
  "auth.mfaEnabledSuccess":
    "Multi-factor authentication is enabled. Sign in to continue.",
} as const;

export type AuthMessageKey = keyof typeof englishAuthMessages;
