import { useEffect, useRef, useState } from "react";
import { http } from "../api/http";
import { useSocket } from "../hooks/useSocket";
import StickerMessage from "../components/StickerMessage";

export default function OverlayPage() {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [overlayConfig, setOverlayConfig] = useState({
    bubbleOpacity: 0.98,
    theme: {
      bubbleTopColor: "#af72ff",
      bubbleBottomColor: "#7139e5",
      bubbleShadowColor: "#320f63",
      bubbleTopRgba: "rgba(175, 114, 255, 0.98)",
      bubbleBottomRgba: "rgba(113, 57, 229, 0.98)",
      nameTextColor: "#ffffff",
      handleTextColor: "#ffffff",
      messageTextColor: "#ffffff",
      nameFontSizeRem: 0.9,
      handleFontSizeRem: 0.74,
      messageFontSizeRem: 0.84,
      stickerSizePx: 63
    }
  });
  const stackRef = useRef(null);

  useEffect(() => {
    http("/api/dashboard/messages/recent").then(setMessages);
    http("/api/dashboard/overlay-config").then(setOverlayConfig);
  }, []);

  useEffect(() => {
    document.body.classList.add("overlay-page");
    return () => {
      document.body.classList.remove("overlay-page");
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewMessage = (message) => {
      setMessages((current) => [...current.slice(-9), message]);
    };
    const handleOverlayConfig = (config) => {
      setOverlayConfig(config);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("overlay:config-updated", handleOverlayConfig);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("overlay:config-updated", handleOverlayConfig);
    };
  }, [socket]);

  useEffect(() => {
    if (!stackRef.current) {
      return;
    }

    stackRef.current.scrollTo({
      top: stackRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  return (
    <main className="overlay-shell">
      <section
        ref={stackRef}
        className={`overlay-stack overlay-stack-${overlayConfig.alignment || "right"} ${overlayConfig.softTopFade ? "overlay-stack-soft-fade" : ""}`}
      >
        {messages.map((message) => (
          <article
            key={message._id}
            className={`overlay-bubble overlay-bubble-${overlayConfig.alignment || "right"} ${overlayConfig.fixedBubbleWidth ? "overlay-bubble-fixed" : ""}`}
            style={{
              "--overlay-bubble-top": overlayConfig.theme?.bubbleTopRgba,
              "--overlay-bubble-bottom": overlayConfig.theme?.bubbleBottomRgba,
              "--overlay-bubble-shadow": overlayConfig.theme?.bubbleShadowColor,
              "--mod-badge-bg": overlayConfig.theme?.modBadgeBackground,
              "--mod-badge-border": overlayConfig.theme?.modBadgeBorder,
              "--mod-badge-text": overlayConfig.theme?.modBadgeText,
              "--bubble-name-color": overlayConfig.theme?.nameTextColor,
              "--bubble-handle-color": overlayConfig.theme?.handleTextColor,
              "--bubble-message-color": overlayConfig.theme?.messageTextColor,
              "--bubble-name-size": `${overlayConfig.theme?.nameFontSizeRem || 0.9}rem`,
              "--bubble-handle-size": `${overlayConfig.theme?.handleFontSizeRem || 0.74}rem`,
              "--bubble-message-size": `${overlayConfig.theme?.messageFontSizeRem || 0.84}rem`,
              "--overlay-sticker-size": `${overlayConfig.theme?.stickerSizePx || 63}px`
            }}
          >
            <img
              className="avatar"
              src={message.sender.profilePictureUrl || "https://placehold.co/64x64/png"}
              alt={message.sender.nickname || message.sender.uniqueId}
            />
            <div className="bubble-content">
              <div className="bubble-header">
                <div className="bubble-title-row">
                  <h3>{message.sender.nickname || "Invitado"}</h3>
                  {message.sender?.isModerator && (
                    <span className="mod-badge">MOD</span>
                  )}
                </div>
                <p>@{message.sender.uniqueId || "chat"}</p>
              </div>
              <div className="bubble-message">
                <StickerMessage segments={message.renderedSegments} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
