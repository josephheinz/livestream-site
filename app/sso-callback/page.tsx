import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Landing spot for the OAuth redirect started in the auth modal; Clerk
// finishes the handshake here and forwards to redirectUrlComplete.
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
