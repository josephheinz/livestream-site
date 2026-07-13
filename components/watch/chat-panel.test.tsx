import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "./chat-panel";
import { AuthModalProvider } from "@/components/site/auth-modal";
import { chatMessages, banNotice } from "@/lib/mock-data";

function renderPanel(mode: string) {
  return render(
    <AuthModalProvider>
      <ChatPanel
        mode={mode as never}
        messages={chatMessages}
        ban={banNotice}
        live
        viewers={1204}
      />
    </AuthModalProvider>
  );
}

describe("ChatPanel", () => {
  it("signedin: seeded messages + composer", () => {
    renderPanel("signedin");
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Say something...")).toBeInTheDocument();
  });

  it("signedout: sign-in prompt replaces the composer", () => {
    renderPanel("signedout");
    expect(screen.getByText("Sign in to chat")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
  });

  it("banned: ban notice with reason + expiry, no composer", () => {
    renderPanel("banned");
    expect(screen.getByText(/Repeated off-topic flooding/)).toBeInTheDocument();
    expect(screen.getByText(/2026-07-11/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Say something...")).toBeNull();
  });

  it("unknown mode: falls back to the signed-out prompt", () => {
    renderPanel("whatever");
    expect(screen.getByText("Sign in to chat")).toBeInTheDocument();
  });
});
