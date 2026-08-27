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
  "auth.serviceUnavailable":
    "Sign-in is temporarily unavailable. Please try again shortly.",
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
  "auth.verificationRequiredTitle": "Verify your email to continue",
  "auth.verificationRequiredBody":
    "Your email and password are correct, but this account still needs email verification before workspace access is allowed.",
  "auth.verificationRequiredCta": "Send a new verification link",
  "auth.noRoleSelection":
    "No role selection is needed. LoyalFlow opens the correct experience after secure sign-in.",
  "auth.passwordResetSuccess":
    "Your password has been updated. Sign in with your new password.",
  "auth.verificationSuccess":
    "Your email has been verified. You can sign in now.",
  "auth.mfaEnabledSuccess":
    "Multi-factor authentication is enabled. Sign in to continue.",
  "auth.resetRequestTitle": "Reset your password",
  "auth.resetRequestBody":
    "Enter your account email and we’ll send password reset instructions.",
  "auth.resetRequestSent":
    "If an eligible account exists for that email, password reset instructions have been sent.",
  "auth.sendResetInstructions": "Send reset instructions",
  "auth.backSignIn": "Back to sign in",
  "auth.chooseNewPassword": "Choose a new password",
  "auth.newPasswordRequirement":
    "Your new password must contain at least 10 characters.",
  "auth.resetLinkInvalid": "This reset link is invalid or has expired.",
  "auth.requestNewResetLink": "Request a new reset link",
  "auth.passwordMismatch": "The passwords do not match.",
  "auth.passwordInvalid": "Please choose a valid password.",
  "auth.newPassword": "New password",
  "auth.confirmNewPassword": "Confirm new password",
  "auth.updatePassword": "Update password",
  "auth.verifyEmailTitle": "Verify your email",
  "auth.verifyEmailInvalid":
    "This verification link is invalid, expired, or has already been used.",
  "auth.verifyEmailBody": "Confirm this email address to finish verification.",
  "auth.verifyEmailCta": "Verify email",
  "auth.resendVerificationTitle": "Resend verification email",
  "auth.resendVerificationBody":
    "Enter your account email. If it is eligible for verification, we will send a new link.",
  "auth.resendVerificationSent":
    "If that account needs verification, a new email has been requested.",
  "auth.sendVerificationLink": "Send verification link",
  "auth.superAdminSecurity": "Super Admin security",
  "auth.setupMfaPageTitle": "Set up multi-factor authentication",
  "auth.setupMfaPageBody":
    "MFA is required for Super Admin access. Verify your account, add LoyalFlow to an authenticator app, and save the one-time recovery codes.",
  "auth.superAdminEmail": "Super Admin email",
  "auth.mfaStartError":
    "Unable to start MFA enrollment. Check your credentials and try again.",
  "auth.mfaPreparing": "Preparing MFA…",
  "auth.mfaStart": "Start MFA setup",
  "auth.mfaAddAuthenticator": "Add LoyalFlow to your authenticator",
  "auth.mfaAddAuthenticatorBody":
    "Enter this secret manually in your authenticator app, then use the current 6-digit code below.",
  "auth.mfaOpenAuthenticator": "Open authenticator link",
  "auth.mfaRecoveryTitle": "Save your recovery codes now",
  "auth.mfaRecoveryBody":
    "Each code works once. Store them somewhere secure before confirming setup.",
  "auth.mfaSixDigitCode": "6-digit authenticator code",
  "auth.mfaConfirmError":
    "The code is invalid or the setup window expired. Restart MFA setup.",
  "auth.mfaEnabling": "Enabling MFA…",
  "auth.mfaEnable": "Enable MFA",
} as const;

export type AuthMessageKey = keyof typeof englishAuthMessages;
