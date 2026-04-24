import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../api/http";
import { useSocket } from "../hooks/useSocket";
import QueuePlayer from "../components/QueuePlayer";
import StickerMessage from "../components/StickerMessage";
import previewStickerUrl from "../assets/loco.gif";

function OverlayPreview({ overlayConfig }) {
  const previewMessage = {
    sender: {
      nickname: "gilo",
      uniqueId: "gilo.mx",
      profilePictureUrl: "https://placehold.co/96x96/6d28d9/ffffff/png?text=G",
      isModerator: true
    },
    renderedSegments: [
      { type: "text", value: "Este es un mensaje " },
      {
        type: "sticker",
        stickerId: "preview-sticker",
        stickerUrl: previewStickerUrl,
        label: "Sticker"
      },
      { type: "text", value: " para tu overlay" }
    ]
  };

  return (
    <div
      className={`overlay-preview-shell ${overlayConfig?.perspectiveEnabled ? "overlay-perspective-enabled" : ""}`}
      style={{
        "--overlay-perspective-depth": `${overlayConfig?.theme?.perspectiveDepth || 900}px`,
        "--overlay-perspective-rotate-x": `${overlayConfig?.theme?.perspectiveRotateX || 0}deg`,
        "--overlay-perspective-rotate-y": `${overlayConfig?.theme?.perspectiveRotateY || 0}deg`,
        "--overlay-perspective-eye-level": `${overlayConfig?.theme?.perspectiveEyeLevel || 50}%`
      }}
    >
      <article
        className={`overlay-bubble overlay-bubble-preview overlay-bubble-${overlayConfig?.alignment || "right"}`}
        style={{
          "--overlay-bubble-top": overlayConfig?.theme?.bubbleTopRgba,
          "--overlay-bubble-bottom": overlayConfig?.theme?.bubbleBottomRgba,
          "--overlay-bubble-shadow": overlayConfig?.theme?.bubbleShadowColor,
          "--mod-badge-bg": overlayConfig?.theme?.modBadgeBackground,
          "--mod-badge-border": overlayConfig?.theme?.modBadgeBorder,
          "--mod-badge-text": overlayConfig?.theme?.modBadgeText,
          "--bubble-name-color": overlayConfig?.theme?.nameTextColor,
          "--bubble-handle-color": overlayConfig?.theme?.handleTextColor,
          "--bubble-message-color": overlayConfig?.theme?.messageTextColor,
          "--bubble-name-size": `${overlayConfig?.theme?.nameFontSizeRem || 0.9}rem`,
          "--bubble-handle-size": `${overlayConfig?.theme?.handleFontSizeRem || 0.74}rem`,
          "--bubble-message-size": `${overlayConfig?.theme?.messageFontSizeRem || 0.84}rem`,
          "--overlay-sticker-size": `${overlayConfig?.theme?.stickerSizePx || 63}px`,
          "--overlay-perspective-depth": `${overlayConfig?.theme?.perspectiveDepth || 900}px`,
          "--overlay-perspective-rotate-x": `${overlayConfig?.theme?.perspectiveRotateX || 0}deg`,
          "--overlay-perspective-rotate-y": `${overlayConfig?.theme?.perspectiveRotateY || 0}deg`,
          "--overlay-perspective-eye-level": `${overlayConfig?.theme?.perspectiveEyeLevel || 50}%`
        }}
      >
        <img
          className="avatar"
          src={previewMessage.sender.profilePictureUrl}
          alt={previewMessage.sender.nickname}
        />
        <div className="bubble-content">
          <div className="bubble-header">
            <div className="bubble-title-row">
              <h3>{previewMessage.sender.nickname}</h3>
              <span className="mod-badge">MOD</span>
            </div>
            <p>@{previewMessage.sender.uniqueId}</p>
          </div>
          <div className="bubble-message">
            <StickerMessage segments={previewMessage.renderedSegments} />
          </div>
        </div>
      </article>
    </div>
  );
}

function ChatBubbleCard({ message, statusLabel, showOriginal = false, overlayConfig = null }) {
  return (
    <article
      className="dashboard-chat-bubble"
      style={{
        "--mod-badge-bg": overlayConfig?.theme?.modBadgeBackground,
        "--mod-badge-border": overlayConfig?.theme?.modBadgeBorder,
        "--mod-badge-text": overlayConfig?.theme?.modBadgeText
      }}
    >
      <img
        className="avatar"
        src={message.sender?.profilePictureUrl || "https://placehold.co/64x64/png"}
        alt={message.sender?.nickname || message.sender?.uniqueId || "chat"}
      />
      <div className="bubble-content">
        <div className="bubble-header">
          <div className="bubble-title-row">
            <h3>{message.sender?.nickname || "Invitado"}</h3>
            {message.sender?.isModerator && (
              <span className="mod-badge">MOD</span>
            )}
          </div>
          <p>@{message.sender?.uniqueId || "chat"}</p>
        </div>
        {statusLabel && <span className="reading-badge">{statusLabel}</span>}
        <div className="bubble-message">
          {message.renderedSegments?.length ? (
            <StickerMessage segments={message.renderedSegments} />
          ) : (
            message.filteredMessage || message.originalMessage
          )}
        </div>
        {showOriginal && (
          <small className="original-line">
            Original: {message.originalMessage}
          </small>
        )}
      </div>
    </article>
  );
}

function SenderMeta({ sender }) {
  const displayName = sender?.nickname || sender?.uniqueId || "Sin nombre";
  const handle = sender?.uniqueId ? `@${sender.uniqueId}` : "@anonimo";

  return (
    <div className="sender-meta">
      <img
        className="sender-avatar"
        src={sender?.profilePictureUrl || "https://placehold.co/64x64/png"}
        alt={displayName}
      />
      <div>
        <strong>{displayName}</strong>
        <span>{handle}</span>
      </div>
    </div>
  );
}

function SearchList({ title, items, renderItem, search, setSearch, children, footer = null }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
        />
      </div>
      {children}
      <div className="list">{items.map(renderItem)}</div>
      {footer}
    </section>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-row">
      <button
        type="button"
        className="pagination-button pagination-icon-button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Pagina anterior"
        title="Pagina anterior"
      >
        {"\u2039"}
      </button>
      <span className="pagination-status">
        {page}
      </span>
      <button
        type="button"
        className="pagination-button pagination-icon-button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Pagina siguiente"
        title="Pagina siguiente"
      >
        {"\u203A"}
      </button>
    </div>
  );
}

function formatLanguageLabel(languageCode) {
  try {
    const [language, region] = String(languageCode || "").split("-");
    const languageNames = new Intl.DisplayNames(["es"], { type: "language" });
    const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
    const languageLabel = languageNames.of(language) || languageCode;
    const regionLabel = region ? regionNames.of(region) : "";
    return regionLabel ? `${languageLabel} (${regionLabel})` : languageLabel;
  } catch {
    return languageCode;
  }
}

function dbToPercent(volumeGainDb) {
  const percent = Math.round(100 * 10 ** (Number(volumeGainDb || 0) / 20));
  return Math.min(200, Math.max(0, percent));
}

function percentToDb(percent) {
  const normalizedPercent = Math.min(200, Math.max(0, Number(percent) || 0));
  if (normalizedPercent <= 0) {
    return -96;
  }
  return Math.max(-96, Math.min(16, 20 * Math.log10(normalizedPercent / 100)));
}

function scaleToPercent(value, baseline) {
  return Math.round((Number(value || baseline) / baseline) * 100);
}

export default function DashboardPage() {
  const socket = useSocket();
  const googleCredentialsInputRef = useRef(null);
  const colorInputRef = useRef(null);
  const modBadgeColorInputRef = useRef(null);
  const nameTextColorInputRef = useRef(null);
  const handleTextColorInputRef = useRef(null);
  const messageTextColorInputRef = useRef(null);
  const [summary, setSummary] = useState({
    queue: { paused: false, current: null, items: [] },
    recentMessages: [],
    forbidden: {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      query: ""
    },
    replacements: {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      query: ""
    },
    stickers: {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      query: ""
    },
    readerConfig: {
      enabled: true,
      googleCredentialsConfigured: false,
      languageCode: "es-US",
      voiceName: "es-US-Standard-A",
      speakingRate: 1,
      pitch: 0,
      volumeGainDb: 0,
      modsOnly: false,
      includeUserName: true,
      noSpam: true,
      blockWeirdChars: true,
      reduceEmojiSpam: true
    },
    readerVoiceOptions: [],
    liveStats: { viewerCount: 0, updatedAt: null },
    liveUsers: [],
    mutedUsers: [],
    overlayConfig: {
      bubbleBaseColor: "#8c00ff",
      modBadgeColor: "#ff6e8a",
      nameTextColor: "#ffffff",
      handleTextColor: "#ffffff",
      messageTextColor: "#ffffff",
      bubbleOpacity: 0.98,
      perspectiveEnabled: false,
      perspectiveDepth: 900,
      perspectiveRotateX: 0,
      perspectiveRotateY: 0,
      perspectiveEyeLevel: 50,
      softTopFade: true,
      fixedBubbleWidth: false,
      alignment: "right",
      theme: {
        bubbleTopColor: "#af72ff",
        bubbleBottomColor: "#7139e5",
        bubbleShadowColor: "#320f63",
        bubbleTopRgba: "rgba(175, 114, 255, 0.98)",
        bubbleBottomRgba: "rgba(113, 57, 229, 0.98)",
        modBadgeBackground: "rgba(255, 110, 138, 0.18)",
        modBadgeBorder: "rgba(255, 145, 165, 0.32)",
        modBadgeText: "#ffb4c2",
        nameTextColor: "#ffffff",
        handleTextColor: "#ffffff",
        messageTextColor: "#ffffff",
        nameFontSizeRem: 0.9,
        handleFontSizeRem: 0.74,
        messageFontSizeRem: 0.84,
        stickerSizePx: 63,
        perspectiveEnabled: false,
        perspectiveDepth: 900,
        perspectiveRotateX: 0,
        perspectiveRotateY: 0,
        perspectiveEyeLevel: 50
      }
    }
  });
  const [search, setSearch] = useState({
    liveUsers: "",
    mutedUsers: "",
    forbidden: "",
    replacements: "",
    stickers: "",
  });
  const [forms, setForms] = useState({
    forbidden: "",
    replacementFrom: "",
    replacementTo: "",
    stickerKeyword: "",
    stickerFile: null,
  });
  const [isStickerDragActive, setIsStickerDragActive] = useState(false);
  const [overlayColor, setOverlayColor] = useState("#8c00ff");
  const [overlayModBadgeColor, setOverlayModBadgeColor] = useState("#ff6e8a");
  const [overlayNameTextColor, setOverlayNameTextColor] = useState("#ffffff");
  const [overlayHandleTextColor, setOverlayHandleTextColor] = useState("#ffffff");
  const [overlayMessageTextColor, setOverlayMessageTextColor] = useState("#ffffff");
  const [overlayNameFontSizeRem, setOverlayNameFontSizeRem] = useState(0.9);
  const [overlayHandleFontSizeRem, setOverlayHandleFontSizeRem] = useState(0.74);
  const [overlayMessageFontSizeRem, setOverlayMessageFontSizeRem] = useState(0.84);
  const [overlayStickerSizePx, setOverlayStickerSizePx] = useState(63);
  const [overlayOpacity, setOverlayOpacity] = useState(0.98);
  const [overlayPerspectiveEnabled, setOverlayPerspectiveEnabled] = useState(false);
  const [overlayPerspectiveDepth, setOverlayPerspectiveDepth] = useState(900);
  const [overlayPerspectiveRotateX, setOverlayPerspectiveRotateX] = useState(0);
  const [overlayPerspectiveRotateY, setOverlayPerspectiveRotateY] = useState(0);
  const [overlayPerspectiveEyeLevel, setOverlayPerspectiveEyeLevel] = useState(50);
  const [overlaySoftTopFade, setOverlaySoftTopFade] = useState(true);
  const [overlayFixedBubbleWidth, setOverlayFixedBubbleWidth] = useState(false);
  const [overlayAlignment, setOverlayAlignment] = useState("right");
  const [overlayUrlCopied, setOverlayUrlCopied] = useState(false);
  const [forbiddenPage, setForbiddenPage] = useState(1);
  const [replacementPage, setReplacementPage] = useState(1);
  const [stickerPage, setStickerPage] = useState(1);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState("");
  const liveUsersSearchRef = useRef("");
  const mutedUsersSearchRef = useRef("");

  const refreshSummary = async () => {
    const data = await http("/api/dashboard/summary");
    setSummary(data);
    setOverlayColor(data.overlayConfig?.bubbleBaseColor || "#8c00ff");
    setOverlayModBadgeColor(data.overlayConfig?.modBadgeColor || "#ff6e8a");
    setOverlayNameTextColor(data.overlayConfig?.nameTextColor || "#ffffff");
    setOverlayHandleTextColor(data.overlayConfig?.handleTextColor || "#ffffff");
    setOverlayMessageTextColor(data.overlayConfig?.messageTextColor || "#ffffff");
    setOverlayNameFontSizeRem(data.overlayConfig?.nameFontSizeRem ?? 0.9);
    setOverlayHandleFontSizeRem(data.overlayConfig?.handleFontSizeRem ?? 0.74);
    setOverlayMessageFontSizeRem(data.overlayConfig?.messageFontSizeRem ?? 0.84);
    setOverlayStickerSizePx(data.overlayConfig?.stickerSizePx ?? 63);
    setOverlayOpacity(data.overlayConfig?.bubbleOpacity ?? 0.98);
    setOverlayPerspectiveEnabled(data.overlayConfig?.perspectiveEnabled ?? false);
    setOverlayPerspectiveDepth(data.overlayConfig?.perspectiveDepth ?? 900);
    setOverlayPerspectiveRotateX(data.overlayConfig?.perspectiveRotateX ?? 0);
    setOverlayPerspectiveRotateY(data.overlayConfig?.perspectiveRotateY ?? 0);
    setOverlayPerspectiveEyeLevel(data.overlayConfig?.perspectiveEyeLevel ?? 50);
    setOverlaySoftTopFade(data.overlayConfig?.softTopFade ?? true);
    setOverlayFixedBubbleWidth(data.overlayConfig?.fixedBubbleWidth ?? false);
    setOverlayAlignment(data.overlayConfig?.alignment || "right");
  };

  const refreshSearch = async (key, endpoint) => {
    const data = await http(
      `/api/dashboard/${endpoint}?q=${encodeURIComponent(search[key])}`,
    );
    setSummary((current) => ({ ...current, [key]: data }));
  };

  const refreshForbiddenWords = async (page = forbiddenPage, query = search.forbidden) => {
    const data = await http(
      `/api/dashboard/forbidden-words?q=${encodeURIComponent(query)}&page=${page}&pageSize=20`
    );
    setSummary((current) => ({ ...current, forbidden: data }));
    setForbiddenPage(data.page);
  };

  const refreshReplacementRules = async (page = replacementPage, query = search.replacements) => {
    const data = await http(
      `/api/dashboard/replacement-rules?q=${encodeURIComponent(query)}&page=${page}&pageSize=20`
    );
    setSummary((current) => ({ ...current, replacements: data }));
    setReplacementPage(data.page);
  };

  const refreshStickers = async (page = stickerPage, query = search.stickers) => {
    const data = await http(
      `/api/dashboard/stickers?q=${encodeURIComponent(query)}&page=${page}&pageSize=20`
    );
    setSummary((current) => ({ ...current, stickers: data }));
    setStickerPage(data.page);
  };

  const refreshLiveUsers = async () => {
    const data = await http(
      `/api/dashboard/live-users?q=${encodeURIComponent(search.liveUsers)}`,
    );
    setSummary((current) => ({ ...current, liveUsers: data }));
  };

  const refreshMutedUsers = async () => {
    const data = await http(
      `/api/dashboard/muted-users?q=${encodeURIComponent(search.mutedUsers)}`,
    );
    setSummary((current) => ({ ...current, mutedUsers: data }));
  };

  useEffect(() => {
    refreshSummary();
  }, []);

  useEffect(() => {
    liveUsersSearchRef.current = search.liveUsers;
  }, [search.liveUsers]);

  useEffect(() => {
    mutedUsersSearchRef.current = search.mutedUsers;
  }, [search.mutedUsers]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleQueue = (queue) => {
      setSummary((current) => ({ ...current, queue }));
    };

    const handleMessage = (message) => {
      console.group("[Frontend chat event]");
      console.log("rawEvent:", message.rawEvent);
      console.log("sender:", message.sender);
      console.log("message:", message);
      console.groupEnd();

      setSummary((current) => ({
        ...current,
        recentMessages: [...current.recentMessages.slice(-9), message],
      }));
    };
    const handleOverlayConfig = (config) => {
      setSummary((current) => ({ ...current, overlayConfig: config }));
      setOverlayColor(config.bubbleBaseColor || "#8c00ff");
      setOverlayModBadgeColor(config.modBadgeColor || "#ff6e8a");
      setOverlayNameTextColor(config.nameTextColor || "#ffffff");
      setOverlayHandleTextColor(config.handleTextColor || "#ffffff");
      setOverlayMessageTextColor(config.messageTextColor || "#ffffff");
      setOverlayNameFontSizeRem(config.nameFontSizeRem ?? 0.9);
      setOverlayHandleFontSizeRem(config.handleFontSizeRem ?? 0.74);
      setOverlayMessageFontSizeRem(config.messageFontSizeRem ?? 0.84);
      setOverlayStickerSizePx(config.stickerSizePx ?? 63);
      setOverlayOpacity(config.bubbleOpacity ?? 0.98);
      setOverlayPerspectiveEnabled(config.perspectiveEnabled ?? false);
      setOverlayPerspectiveDepth(config.perspectiveDepth ?? 900);
      setOverlayPerspectiveRotateX(config.perspectiveRotateX ?? 0);
      setOverlayPerspectiveRotateY(config.perspectiveRotateY ?? 0);
      setOverlayPerspectiveEyeLevel(config.perspectiveEyeLevel ?? 50);
      setOverlaySoftTopFade(config.softTopFade ?? true);
      setOverlayFixedBubbleWidth(config.fixedBubbleWidth ?? false);
      setOverlayAlignment(config.alignment || "right");
    };
    const handleLiveStats = (liveStats) => {
      setSummary((current) => ({ ...current, liveStats }));
    };
    const handleLiveUsers = (liveUsers) => {
      if (liveUsersSearchRef.current.trim()) {
        return;
      }
      setSummary((current) => ({ ...current, liveUsers }));
    };
    const handleMutedUsers = (mutedUsers) => {
      if (mutedUsersSearchRef.current.trim()) {
        return;
      }
      setSummary((current) => ({ ...current, mutedUsers }));
    };
    const handleReaderConfig = (readerConfig) => {
      setSummary((current) => ({ ...current, readerConfig }));
    };

    socket.on("queue:updated", handleQueue);
    socket.on("message:new", handleMessage);
    socket.on("overlay:config-updated", handleOverlayConfig);
    socket.on("live:stats-updated", handleLiveStats);
    socket.on("live:users-updated", handleLiveUsers);
    socket.on("live:muted-users-updated", handleMutedUsers);
    socket.on("reader:config-updated", handleReaderConfig);

    return () => {
      socket.off("queue:updated", handleQueue);
      socket.off("message:new", handleMessage);
      socket.off("overlay:config-updated", handleOverlayConfig);
      socket.off("live:stats-updated", handleLiveStats);
      socket.off("live:users-updated", handleLiveUsers);
      socket.off("live:muted-users-updated", handleMutedUsers);
      socket.off("reader:config-updated", handleReaderConfig);
    };
  }, [socket]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshLiveUsers();
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [search.liveUsers]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshMutedUsers();
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [search.mutedUsers]);

  useEffect(() => {
    setForbiddenPage(1);
  }, [search.forbidden]);

  useEffect(() => {
    refreshForbiddenWords(forbiddenPage, search.forbidden);
  }, [forbiddenPage, search.forbidden]);

  useEffect(() => {
    setReplacementPage(1);
  }, [search.replacements]);

  useEffect(() => {
    refreshReplacementRules(replacementPage, search.replacements);
  }, [replacementPage, search.replacements]);

  useEffect(() => {
    setStickerPage(1);
  }, [search.stickers]);

  useEffect(() => {
    refreshStickers(stickerPage, search.stickers);
  }, [stickerPage, search.stickers]);

  const queuedTotal = useMemo(
    () => summary.queue.items.length,
    [summary.queue.items.length],
  );
  const showSpanishCharacterFilter = useMemo(
    () => String(summary.readerConfig.languageCode || "").toLowerCase().startsWith("es-"),
    [summary.readerConfig.languageCode]
  );
  const volumePercent = useMemo(
    () => dbToPercent(summary.readerConfig.volumeGainDb),
    [summary.readerConfig.volumeGainDb]
  );

  const addForbiddenWord = async (e) => {
    e.preventDefault();
    if (!forms.forbidden.trim()) {
      return;
    }

    await http("/api/moderation/forbidden-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: forms.forbidden.trim() }),
    });
    setForms((current) => ({ ...current, forbidden: "" }));
    refreshSummary();
    refreshForbiddenWords(1, "");
  };

  const addReplacementRule = async (e) => {
    e.preventDefault();
    if (!forms.replacementFrom.trim() || !forms.replacementTo.trim()) {
      return;
    }

    await http("/api/moderation/replacement-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: forms.replacementFrom.trim(),
        to: forms.replacementTo.trim(),
      }),
    });
    setForms((current) => ({
      ...current,
      replacementFrom: "",
      replacementTo: "",
    }));
    refreshSummary();
    refreshReplacementRules(1, "");
  };

  const addSticker = async (e) => {
    e.preventDefault();
    if (!forms.stickerKeyword.trim() || !forms.stickerFile) {
      return;
    }

    const formData = new FormData();
    formData.append("keyword", forms.stickerKeyword.trim());
    formData.append("file", forms.stickerFile);

    await http("/api/stickers", {
      method: "POST",
      body: formData,
    });

    setForms((current) => ({
      ...current,
      stickerKeyword: "",
      stickerFile: null,
    }));
    setStickerPreviewUrl("");
    setIsStickerDragActive(false);
    refreshSummary();
    refreshStickers(1, "");
  };

  const setStickerFile = (file) => {
    setForms((current) => ({ ...current, stickerFile: file }));
    setStickerPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handleStickerDrop = (event) => {
    event.preventDefault();
    setIsStickerDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    setStickerFile(file);
  };

  const saveOverlayConfig = async (nextConfig) => {
    const config = await http("/api/dashboard/overlay-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig)
    });
    setSummary((current) => ({ ...current, overlayConfig: config }));
    setOverlayColor(config.bubbleBaseColor || "#8c00ff");
    setOverlayModBadgeColor(config.modBadgeColor || "#ff6e8a");
    setOverlayNameTextColor(config.nameTextColor || "#ffffff");
    setOverlayHandleTextColor(config.handleTextColor || "#ffffff");
    setOverlayMessageTextColor(config.messageTextColor || "#ffffff");
    setOverlayNameFontSizeRem(config.nameFontSizeRem ?? 0.9);
    setOverlayHandleFontSizeRem(config.handleFontSizeRem ?? 0.74);
    setOverlayMessageFontSizeRem(config.messageFontSizeRem ?? 0.84);
    setOverlayStickerSizePx(config.stickerSizePx ?? 63);
    setOverlayOpacity(config.bubbleOpacity ?? 0.98);
    setOverlayPerspectiveEnabled(config.perspectiveEnabled ?? false);
    setOverlayPerspectiveDepth(config.perspectiveDepth ?? 900);
    setOverlayPerspectiveRotateX(config.perspectiveRotateX ?? 0);
    setOverlayPerspectiveRotateY(config.perspectiveRotateY ?? 0);
    setOverlayPerspectiveEyeLevel(config.perspectiveEyeLevel ?? 50);
    setOverlaySoftTopFade(config.softTopFade ?? true);
    setOverlayFixedBubbleWidth(config.fixedBubbleWidth ?? false);
    setOverlayAlignment(config.alignment || "right");
  };

  const buildNextOverlayConfig = (overrides = {}) => ({
    bubbleBaseColor: overlayColor,
    modBadgeColor: overlayModBadgeColor,
    nameTextColor: overlayNameTextColor,
    handleTextColor: overlayHandleTextColor,
    messageTextColor: overlayMessageTextColor,
    nameFontSizeRem: overlayNameFontSizeRem,
    handleFontSizeRem: overlayHandleFontSizeRem,
    messageFontSizeRem: overlayMessageFontSizeRem,
    stickerSizePx: overlayStickerSizePx,
    bubbleOpacity: overlayOpacity,
    perspectiveEnabled: overlayPerspectiveEnabled,
    perspectiveDepth: overlayPerspectiveDepth,
    perspectiveRotateX: overlayPerspectiveRotateX,
    perspectiveRotateY: overlayPerspectiveRotateY,
    perspectiveEyeLevel: overlayPerspectiveEyeLevel,
    softTopFade: overlaySoftTopFade,
    fixedBubbleWidth: overlayFixedBubbleWidth,
    alignment: overlayAlignment,
    ...overrides
  });

  const updateOverlayColor = async (nextColor) => {
    setOverlayColor(nextColor);
    await saveOverlayConfig(buildNextOverlayConfig({ bubbleBaseColor: nextColor }));
  };

  const updateOverlayModBadgeColor = async (nextColor) => {
    setOverlayModBadgeColor(nextColor);
    await saveOverlayConfig(buildNextOverlayConfig({ modBadgeColor: nextColor }));
  };

  const updateOverlayNameTextColor = async (nextColor) => {
    setOverlayNameTextColor(nextColor);
    await saveOverlayConfig(buildNextOverlayConfig({ nameTextColor: nextColor }));
  };

  const updateOverlayHandleTextColor = async (nextColor) => {
    setOverlayHandleTextColor(nextColor);
    await saveOverlayConfig(buildNextOverlayConfig({ handleTextColor: nextColor }));
  };

  const updateOverlayMessageTextColor = async (nextColor) => {
    setOverlayMessageTextColor(nextColor);
    await saveOverlayConfig(buildNextOverlayConfig({ messageTextColor: nextColor }));
  };

  const updateOverlayNameFontSizeRem = async (nextSize) => {
    setOverlayNameFontSizeRem(nextSize);
    await saveOverlayConfig(buildNextOverlayConfig({ nameFontSizeRem: nextSize }));
  };

  const updateOverlayHandleFontSizeRem = async (nextSize) => {
    setOverlayHandleFontSizeRem(nextSize);
    await saveOverlayConfig(buildNextOverlayConfig({ handleFontSizeRem: nextSize }));
  };

  const updateOverlayMessageFontSizeRem = async (nextSize) => {
    setOverlayMessageFontSizeRem(nextSize);
    await saveOverlayConfig(buildNextOverlayConfig({ messageFontSizeRem: nextSize }));
  };

  const updateOverlayStickerSizePx = async (nextSize) => {
    setOverlayStickerSizePx(nextSize);
    await saveOverlayConfig(buildNextOverlayConfig({ stickerSizePx: nextSize }));
  };

  const updateOverlayPerspectiveEnabled = async (nextValue) => {
    setOverlayPerspectiveEnabled(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ perspectiveEnabled: nextValue }));
  };

  const updateOverlayPerspectiveDepth = async (nextValue) => {
    setOverlayPerspectiveDepth(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ perspectiveDepth: nextValue }));
  };

  const updateOverlayPerspectiveRotateX = async (nextValue) => {
    setOverlayPerspectiveRotateX(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ perspectiveRotateX: nextValue }));
  };

  const updateOverlayPerspectiveRotateY = async (nextValue) => {
    setOverlayPerspectiveRotateY(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ perspectiveRotateY: nextValue }));
  };

  const updateOverlayPerspectiveEyeLevel = async (nextValue) => {
    setOverlayPerspectiveEyeLevel(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ perspectiveEyeLevel: nextValue }));
  };

  const updateOverlayOpacity = async (nextOpacity) => {
    setOverlayOpacity(nextOpacity);
    await saveOverlayConfig(buildNextOverlayConfig({ bubbleOpacity: nextOpacity }));
  };

  const updateOverlayAlignment = async (nextAlignment) => {
    setOverlayAlignment(nextAlignment);
    await saveOverlayConfig(buildNextOverlayConfig({ alignment: nextAlignment }));
  };

  const updateOverlaySoftTopFade = async (nextValue) => {
    setOverlaySoftTopFade(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ softTopFade: nextValue }));
  };

  const updateOverlayFixedBubbleWidth = async (nextValue) => {
    setOverlayFixedBubbleWidth(nextValue);
    await saveOverlayConfig(buildNextOverlayConfig({ fixedBubbleWidth: nextValue }));
  };

  const resetOverlayStyle = async () => {
    await saveOverlayConfig({
      bubbleBaseColor: "#8c00ff",
      modBadgeColor: "#ff6e8a",
      nameTextColor: "#ffffff",
      handleTextColor: "#ffffff",
      messageTextColor: "#ffffff",
      nameFontSizeRem: 0.9,
      handleFontSizeRem: 0.74,
      messageFontSizeRem: 0.84,
      stickerSizePx: 63,
      bubbleOpacity: 0.98,
      perspectiveEnabled: false,
      perspectiveDepth: 900,
      perspectiveRotateX: 0,
      perspectiveRotateY: 0,
      perspectiveEyeLevel: 50,
      softTopFade: true,
      fixedBubbleWidth: false,
      alignment: "right"
    });
  };

  const copyOverlayUrl = async () => {
    const overlayUrl = `${window.location.origin}/overlay`;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setOverlayUrlCopied(true);
      window.setTimeout(() => setOverlayUrlCopied(false), 1800);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleLiveUserMute = async (user) => {
    const target = user.muted
      ? "/api/dashboard/live-users/unmute"
      : "/api/dashboard/live-users/mute";

    await http(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });

    refreshLiveUsers();
    refreshMutedUsers();
  };

  const updateQueueSnapshot = (queue) => {
    setSummary((current) => ({ ...current, queue }));
  };

  const toggleQueuePause = async () => {
    const queue = await http(
      summary.queue.paused ? "/api/queue/resume" : "/api/queue/pause",
      { method: "POST" }
    );
    updateQueueSnapshot(queue);
  };

  const clearQueue = async () => {
    const queue = await http("/api/queue", { method: "DELETE" });
    updateQueueSnapshot(queue);
  };

  const availableVoices = useMemo(
    () =>
      summary.readerVoiceOptions.filter(
        (voice) => voice.languageCode === summary.readerConfig.languageCode
      ),
    [summary.readerConfig.languageCode, summary.readerVoiceOptions]
  );

  const languageOptions = useMemo(() => {
    const seen = new Set();
    return summary.readerVoiceOptions
      .filter((voice) => {
        if (seen.has(voice.languageCode)) {
          return false;
        }
        seen.add(voice.languageCode);
        return true;
      })
      .map((voice) => ({
        value: voice.languageCode,
        label: formatLanguageLabel(voice.languageCode)
      }));
  }, [summary.readerVoiceOptions]);

  const saveReaderConfig = async (nextConfig) => {
    const config = await http("/api/dashboard/reader-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig)
    });
    setSummary((current) => ({ ...current, readerConfig: config }));
  };

  const handleGoogleCredentialsUpload = async (file) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await http("/api/dashboard/google-credentials", {
      method: "POST",
      body: formData
    });

    setSummary((current) => ({
      ...current,
      readerConfig: response.config,
      readerVoiceOptions: response.voiceOptions
    }));

    if (googleCredentialsInputRef.current) {
      googleCredentialsInputRef.current.value = "";
    }
  };

  const updateReaderConfigField = async (field, value) => {
    const nextConfig = { ...summary.readerConfig, [field]: value };

    if (field === "languageCode") {
      const nextVoice = summary.readerVoiceOptions.find(
        (voice) => voice.languageCode === value
      );
      nextConfig.voiceName = nextVoice?.voiceName || nextConfig.voiceName;
    }

    await saveReaderConfig(nextConfig);
  };

  return (
    <main className="dashboard-shell">
      <QueuePlayer
        enabled={!summary.queue.paused}
        onRefresh={refreshSummary}
        volumePercent={volumePercent}
      />

      <section className="hero">
        <div>
          <p className="eyebrow">TikTok Stream Control</p>
          <h1>Dashboard</h1>
          <p className="hero-copy">
            Controla la lectura TTS, palabras prohibidas, reemplazos y stickers
            desde una sola interfaz.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card stat-card-live">
            <span>En vivo</span>
            <strong>{summary.liveStats?.viewerCount ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>En cola</span>
            <strong>{queuedTotal}</strong>
          </div>
          <div className="stat-card">
            <span>Estado</span>
            <strong>{summary.queue.paused ? "Pausado" : "Activo"}</strong>
          </div>
          <div className="stat-card">
            <span>Overlay</span>
            <a href="/overlay" target="_blank" rel="noreferrer">
              Abrir
            </a>
          </div>
        </div>
      </section>

      <section className="dashboard-columns">
        <section className="left-column">
          <section className="panel queue-panel queue-panel-compact">
            <div className="panel-header">
              <h2>Lector de comentarios</h2>
              <div className="action-row">
                <button
                  className={
                    summary.queue.paused ? "button-resume" : "button-pause"
                  }
                  onClick={toggleQueuePause}
                >
                  {summary.queue.paused ? "Reanudar" : "Pausar"}
                </button>
                <button
                  className="button-secondary"
                  onClick={clearQueue}
                >
                  Borrar todo
                </button>
              </div>
            </div>

            <div className="reader-toolbar">
              <div className="reader-toolbar-row reader-toolbar-row-top">
                <label className="reader-mini-control">
                  <span>Idioma</span>
                  <select
                    className="reader-select-compact"
                    value={summary.readerConfig.languageCode}
                    onChange={(e) => updateReaderConfigField("languageCode", e.target.value)}
                  >
                    {languageOptions.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="reader-mini-control reader-mini-voice">
                  <span>Voz</span>
                  <select
                    className="reader-select-compact"
                    value={summary.readerConfig.voiceName}
                    onChange={(e) => updateReaderConfigField("voiceName", e.target.value)}
                  >
                    {availableVoices.map((voice) => (
                      <option
                        key={`${voice.languageCode}-${voice.voiceName}`}
                        value={voice.voiceName}
                      >
                        {voice.voiceName} - Free
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="reader-toolbar-row reader-toolbar-row-bottom">
                <label className="reader-mini-control reader-slider-control">
                  <span>Velocidad</span>
                  <div className="reader-slider-inline">
                    <input
                      type="range"
                      min="0.25"
                      max="2"
                      step="0.05"
                      value={summary.readerConfig.speakingRate}
                      onChange={(e) =>
                        updateReaderConfigField("speakingRate", Number(e.target.value))
                      }
                    />
                    <code>{summary.readerConfig.speakingRate.toFixed(2)}x</code>
                  </div>
                </label>

                <label className="reader-mini-control reader-slider-control">
                  <span>Pitch</span>
                  <div className="reader-slider-inline">
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={summary.readerConfig.pitch}
                      onChange={(e) =>
                        updateReaderConfigField("pitch", Number(e.target.value))
                      }
                    />
                    <code>{summary.readerConfig.pitch}</code>
                  </div>
                </label>

                <label className="reader-mini-control reader-slider-control">
                  <span>Volumen</span>
                  <div className="reader-slider-inline">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="1"
                      value={volumePercent}
                      onChange={(e) =>
                        updateReaderConfigField("volumeGainDb", percentToDb(e.target.value))
                      }
                    />
                    <code>{volumePercent}%</code>
                  </div>
                </label>
              </div>

              <div className="reader-toolbar-row reader-toolbar-row-checks">
                <label className="reader-mini-check">
                  <input
                    type="checkbox"
                    checked={Boolean(summary.readerConfig.modsOnly)}
                    onChange={(e) =>
                      updateReaderConfigField("modsOnly", e.target.checked)
                    }
                    title="El lector leera solo mensajes de los mods."
                  />
                  <span title="El lector leera solo mensajes de los mods.">Solo mods</span>
                </label>

                <label className="reader-mini-check reader-mini-check-break">
                  <input
                    type="checkbox"
                    checked={Boolean(summary.readerConfig.includeUserName)}
                    onChange={(e) =>
                      updateReaderConfigField("includeUserName", e.target.checked)
                    }
                    title="Si esta activado, el lector dira: usuario dijo: mensaje."
                  />
                  <span title="Si esta activado, el lector dira: usuario dijo: mensaje.">
                    Leer nombre del usuario
                  </span>
                </label>

                <label className="reader-mini-check">
                  <input
                    type="checkbox"
                    checked={Boolean(summary.readerConfig.noSpam)}
                    onChange={(e) =>
                      updateReaderConfigField("noSpam", e.target.checked)
                    }
                    title="Si hay un mensaje de un usuario en el reproductor, no podra enviar exactamente el mismo hasta que este haya sido leido."
                  />
                  <span title="Si hay un mensaje de un usuario en el reproductor, no podra enviar exactamente el mismo hasta que este haya sido leido.">No spam</span>
                </label>

                {showSpanishCharacterFilter && (
                  <label className="reader-mini-check">
                    <input
                      type="checkbox"
                      checked={Boolean(summary.readerConfig.blockWeirdChars)}
                      onChange={(e) =>
                        updateReaderConfigField("blockWeirdChars", e.target.checked)
                      }
                      title="No permite la lectura de caracteres raros en otros idiomas, para evitar a los groseros y sus copys."
                    />
                    <span title="No permite la lectura de caracteres raros en otros idiomas, para evitar a los groseros y sus copys.">Bloquear caracteres raros</span>
                  </label>
                )}

                <label className="reader-mini-check">
                  <input
                    type="checkbox"
                    checked={Boolean(summary.readerConfig.reduceEmojiSpam)}
                    onChange={(e) =>
                      updateReaderConfigField("reduceEmojiSpam", e.target.checked)
                    }
                    title="Reduce el spam de emojis: si repiten uno varias veces, lee uno; si mandan varios diferentes juntos, lee hasta tres."
                  />
                  <span title="Reduce el spam de emojis: si repiten uno varias veces, lee uno; si mandan varios diferentes juntos, lee hasta tres.">
                    Leer menos emojis
                  </span>
                </label>
              </div>

              <div className="reader-toolbar-row reader-toolbar-row-credentials">
                <div className="reader-credentials-copy">
                  <strong>
                    {summary.readerConfig.googleCredentialsConfigured
                      ? "Credencial de Google cargada"
                      : "Google TTS sin credencial"}
                  </strong>
                  <span>
                    Sube el JSON de Service Account que descargaste desde Google Cloud.
                  </span>
                </div>
                <input
                  ref={googleCredentialsInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="reader-credentials-input"
                  onChange={(e) => handleGoogleCredentialsUpload(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="button-secondary button-compact"
                  onClick={() => googleCredentialsInputRef.current?.click()}
                >
                  {summary.readerConfig.googleCredentialsConfigured ? "Cambiar JSON" : "Subir JSON de Google"}
                </button>
              </div>
            </div>

            {summary.queue.paused && (
              <article className="queue-current queue-empty">
                La reproduccion de mensajes esta pausada. Haz click en reanudar para seguir con la lectura.
              </article>
            )}

            <div className="queue-list">
              {summary.queue.current && (
                <ChatBubbleCard
                  message={summary.queue.current}
                  statusLabel="Leyendo"
                  overlayConfig={summary.overlayConfig}
                />
              )}
              {summary.queue.items.map((item) => (
                <div key={item._id} className="queue-item-wrap">
                  <ChatBubbleCard message={item} overlayConfig={summary.overlayConfig} />
                  <button
                    className="icon-button icon-button-danger"
                    aria-label="Eliminar mensaje de la cola"
                    title="Eliminar mensaje de la cola"
                    onClick={() =>
                      http(`/api/queue/${item._id}`, { method: "DELETE" }).then(
                        refreshSummary,
                      )
                    }
                  >
                    {"\u00D7"}
                  </button>
                </div>
              ))}
            </div>
          </section>

        </section>

        <section className="right-column">
          <SearchList
            title="Usuarios en el live"
            items={summary.liveUsers}
            search={search.liveUsers}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, liveUsers: value }))
            }
            renderItem={(user) => (
              <article key={user.uniqueId} className="chip-item chip-item-user">
                <span className="chip-label chip-user-label">
                  <img
                    src={user.profilePictureUrl || "https://placehold.co/64x64/png"}
                    alt={user.nickname || user.uniqueId}
                    className="chip-user-avatar"
                  />
                  <span className="chip-user-text">
                    <strong>{user.nickname || "Sin nombre"}</strong>
                    <small>@{user.uniqueId}</small>
                  </span>
                </span>
                <button
                  className={`icon-button ${user.muted ? "icon-button-success" : "icon-button-danger"}`}
                  aria-label={user.muted ? "Desilenciar usuario" : "Silenciar usuario"}
                  title={user.muted ? "Desilenciar usuario" : "Silenciar usuario"}
                  onClick={() => toggleLiveUserMute(user)}
                >
                  {user.muted ? "\u{1F50A}" : "\u{1F507}"}
                </button>
              </article>
            )}
          >
            <p className="helper-copy">
              Aqui se ven los ultimos 15 usuarios que entraron al live; si buscas, tambien puedes encontrar otros por su arroba o nombre.
            </p>
          </SearchList>

          <SearchList
            title="Usuarios silenciados"
            items={summary.mutedUsers}
            search={search.mutedUsers}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, mutedUsers: value }))
            }
            renderItem={(user) => (
              <article key={user.uniqueId} className="chip-item chip-item-user">
                <span className="chip-label chip-user-label">
                  <img
                    src={user.profilePictureUrl || "https://placehold.co/64x64/png"}
                    alt={user.nickname || user.uniqueId}
                    className="chip-user-avatar"
                  />
                  <span className="chip-user-text">
                    <strong>{user.nickname || "Sin nombre"}</strong>
                    <small>@{user.uniqueId}</small>
                  </span>
                </span>
                <button
                  className="icon-button icon-button-success"
                  aria-label="Desilenciar usuario"
                  title="Desilenciar usuario"
                  onClick={() => toggleLiveUserMute(user)}
                >
                  {"\u{1F50A}"}
                </button>
              </article>
            )}
          >
            <p className="helper-copy">
              Aqui se ven hasta 15 usuarios silenciados; usa el buscador para encontrarlos por su arroba o nombre.
            </p>
          </SearchList>

          <SearchList
            title="Palabras prohibidas"
            items={summary.forbidden.items}
            search={search.forbidden}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, forbidden: value }))
            }
            footer={
              <Pagination
                page={summary.forbidden.page}
                totalPages={summary.forbidden.totalPages}
                onChange={setForbiddenPage}
              />
            }
            renderItem={(item) => (
              <article key={item._id} className="chip-item chip-item-forbidden">
                <span className="chip-label">{item.value}</span>
                <button
                  className="icon-button icon-button-danger"
                  aria-label="Quitar palabra prohibida"
                  title="Quitar palabra prohibida"
                  onClick={() =>
                    http(`/api/moderation/forbidden-words/${item._id}`, {
                      method: "DELETE",
                    }).then(() => {
                      refreshSummary();
                      refreshForbiddenWords(forbiddenPage, search.forbidden);
                    })
                  }
                >
                  {"\u00D7"}
                </button>
              </article>
            )}
          >
            <form className="inline-form" onSubmit={addForbiddenWord}>
              <input
                value={forms.forbidden}
                onChange={(e) =>
                  setForms((current) => ({
                    ...current,
                    forbidden: e.target.value,
                  }))
                }
                placeholder="Nueva palabra"
              />
              <button type="submit">Agregar</button>
            </form>
          </SearchList>

          <SearchList
            title="Frases reemplazables"
            items={summary.replacements.items}
            search={search.replacements}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, replacements: value }))
            }
            footer={
              <Pagination
                page={summary.replacements.page}
                totalPages={summary.replacements.totalPages}
                onChange={setReplacementPage}
              />
            }
            renderItem={(item) => (
              <article key={item._id} className="chip-item chip-item-wide chip-item-replacement">
                <span className="chip-label">
                  {item.from}{" "}
                  <small>
                    {">"} {item.to}
                  </small>
                </span>
                <button
                  className="icon-button icon-button-danger"
                  aria-label="Quitar frase reemplazable"
                  title="Quitar frase reemplazable"
                  onClick={() =>
                    http(`/api/moderation/replacement-rules/${item._id}`, {
                      method: "DELETE",
                    }).then(() => {
                      refreshSummary();
                      refreshReplacementRules(replacementPage, search.replacements);
                    })
                  }
                >
                  {"\u00D7"}
                </button>
              </article>
            )}
          >
            <form className="inline-form" onSubmit={addReplacementRule}>
              <input
                value={forms.replacementFrom}
                onChange={(e) =>
                  setForms((current) => ({
                    ...current,
                    replacementFrom: e.target.value,
                  }))
                }
                placeholder="Frase"
              />
              <input
                value={forms.replacementTo}
                onChange={(e) =>
                  setForms((current) => ({
                    ...current,
                    replacementTo: e.target.value,
                  }))
                }
                placeholder="Reemplazo"
              />
              <button type="submit">Agregar</button>
            </form>
          </SearchList>

          <SearchList
            title="Stickers"
            items={summary.stickers.items}
            search={search.stickers}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, stickers: value }))
            }
            footer={
              <Pagination
                page={summary.stickers.page}
                totalPages={summary.stickers.totalPages}
                onChange={setStickerPage}
              />
            }
            renderItem={(item) => (
              <article key={item._id} className="chip-item chip-item-sticker chip-item-sticker-tone">
                <span className="chip-label">
                  <img
                    src={item.fileUrl}
                    alt={item.label}
                    className="sticker-thumb"
                  />
                  {item.keyword}
                </span>
                <button
                  className="icon-button icon-button-danger"
                  aria-label="Quitar sticker"
                  title="Quitar sticker"
                  onClick={() =>
                    http(`/api/stickers/${item._id}`, {
                      method: "DELETE",
                    }).then(() => {
                      refreshSummary();
                      refreshStickers(stickerPage, search.stickers);
                    })
                  }
                >
                  {"\u00D7"}
                </button>
              </article>
            )}
          >
            <form className="stack-form" onSubmit={addSticker}>
              <input
                value={forms.stickerKeyword}
                onChange={(e) =>
                  setForms((current) => ({
                    ...current,
                    stickerKeyword: e.target.value,
                  }))
                }
                placeholder="Palabra disparadora"
              />
              <label
                className={`dropzone ${isStickerDragActive ? "dropzone-active" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsStickerDragActive(true);
                }}
                onDragLeave={() => setIsStickerDragActive(false)}
                onDrop={handleStickerDrop}
                >
                <input
                  type="file"
                  accept="image/gif,image/webp"
                  onChange={(e) =>
                    setStickerFile(e.target.files?.[0] || null)
                  }
                />
                <span>
                  Arrastra un GIF o WEBP aqui, o haz clic para elegirlo
                </span>
                <small>
                  {forms.stickerFile
                    ? forms.stickerFile.name
                    : "Sin archivo seleccionado"}
                </small>
                {stickerPreviewUrl && (
                  <div className="sticker-preview sticker-preview-inline">
                    <img src={stickerPreviewUrl} alt="Preview del sticker" />
                  </div>
                )}
              </label>
              <button type="submit">Guardar sticker</button>
            </form>
          </SearchList>

          <section className="panel">
            <div className="panel-header">
              <h2>Personalizar overlay</h2>
              <button
                type="button"
                className="button-secondary button-compact"
                onClick={copyOverlayUrl}
              >
                {overlayUrlCopied ? "URL copiada" : "Copiar URL"}
              </button>
            </div>
            <div className="overlay-settings">
              <p className="helper-copy overlay-helper-copy">
                Tamano recomendado del overlay: 500x300.
              </p>
              <div className="overlay-color-grid">
                <label className="color-setting color-setting-compact">
                  <span>Background</span>
                  <div className="color-input-row">
                    <button
                      type="button"
                      className="color-swatch-button"
                      onClick={() => colorInputRef.current?.click()}
                      aria-label="Elegir color del overlay"
                      title="Elegir color del overlay"
                    >
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: overlayColor }}
                      />
                    </button>
                    <input
                      ref={colorInputRef}
                      className="color-picker-hidden"
                      type="color"
                      value={overlayColor}
                      onChange={(e) => updateOverlayColor(e.target.value)}
                    />
                    <code>{overlayColor}</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Etiqueta MOD</span>
                  <div className="color-input-row">
                    <button
                      type="button"
                      className="color-swatch-button"
                      onClick={() => modBadgeColorInputRef.current?.click()}
                      aria-label="Elegir color de la etiqueta MOD"
                      title="Elegir color de la etiqueta MOD"
                    >
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: overlayModBadgeColor }}
                      />
                    </button>
                    <input
                      ref={modBadgeColorInputRef}
                      className="color-picker-hidden"
                      type="color"
                      value={overlayModBadgeColor}
                      onChange={(e) => updateOverlayModBadgeColor(e.target.value)}
                    />
                    <code>{overlayModBadgeColor}</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Nombre</span>
                  <div className="color-input-row">
                    <button
                      type="button"
                      className="color-swatch-button"
                      onClick={() => nameTextColorInputRef.current?.click()}
                      aria-label="Elegir color del nombre"
                      title="Elegir color del nombre"
                    >
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: overlayNameTextColor }}
                      />
                    </button>
                    <input
                      ref={nameTextColorInputRef}
                      className="color-picker-hidden"
                      type="color"
                      value={overlayNameTextColor}
                      onChange={(e) => updateOverlayNameTextColor(e.target.value)}
                    />
                    <code>{overlayNameTextColor}</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Mensaje</span>
                  <div className="color-input-row">
                    <button
                      type="button"
                      className="color-swatch-button"
                      onClick={() => messageTextColorInputRef.current?.click()}
                      aria-label="Elegir color del mensaje"
                      title="Elegir color del mensaje"
                    >
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: overlayMessageTextColor }}
                      />
                    </button>
                    <input
                      ref={messageTextColorInputRef}
                      className="color-picker-hidden"
                      type="color"
                      value={overlayMessageTextColor}
                      onChange={(e) => updateOverlayMessageTextColor(e.target.value)}
                    />
                    <code>{overlayMessageTextColor}</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Arroba</span>
                  <div className="color-input-row">
                    <button
                      type="button"
                      className="color-swatch-button"
                      onClick={() => handleTextColorInputRef.current?.click()}
                      aria-label="Elegir color del arroba"
                      title="Elegir color del arroba"
                    >
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: overlayHandleTextColor }}
                      />
                    </button>
                    <input
                      ref={handleTextColorInputRef}
                      className="color-picker-hidden"
                      type="color"
                      value={overlayHandleTextColor}
                      onChange={(e) => updateOverlayHandleTextColor(e.target.value)}
                    />
                    <code>{overlayHandleTextColor}</code>
                  </div>
                </label>
              </div>
              <label className="color-setting">
                <span>Transparencia</span>
                <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.01"
                      value={overlayOpacity}
                      onChange={(e) => updateOverlayOpacity(Number(e.target.value))}
                    />
                  <code>{Math.round(overlayOpacity * 100)}%</code>
                </div>
              </label>
              <div className="overlay-font-grid">
                <label className="color-setting color-setting-compact">
                  <span>Tamano del nombre</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="0.76"
                      max="1.8"
                      step="0.02"
                      value={overlayNameFontSizeRem}
                      onChange={(e) => updateOverlayNameFontSizeRem(Number(e.target.value))}
                    />
                    <code>{scaleToPercent(overlayNameFontSizeRem, 0.9)}%</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Tamano del mensaje</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="0.72"
                      max="1.26"
                      step="0.02"
                      value={overlayMessageFontSizeRem}
                      onChange={(e) => updateOverlayMessageFontSizeRem(Number(e.target.value))}
                    />
                    <code>{scaleToPercent(overlayMessageFontSizeRem, 0.84)}%</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Tamano del arroba</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="0.62"
                      max="1.48"
                      step="0.02"
                      value={overlayHandleFontSizeRem}
                      onChange={(e) => updateOverlayHandleFontSizeRem(Number(e.target.value))}
                    />
                    <code>{scaleToPercent(overlayHandleFontSizeRem, 0.74)}%</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Tamano del sticker</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="31.5"
                      max="96"
                      step="0.5"
                      value={overlayStickerSizePx}
                      onChange={(e) => updateOverlayStickerSizePx(Number(e.target.value))}
                    />
                    <code>{scaleToPercent(overlayStickerSizePx, 63)}%</code>
                  </div>
                </label>
              </div>
              <label className="color-setting">
                <span>Alineacion del chat</span>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={overlayAlignment === "left" ? "segment-button segment-button-active" : "segment-button"}
                    onClick={() => updateOverlayAlignment("left")}
                  >
                    Izquierda
                  </button>
                  <button
                    type="button"
                    className={overlayAlignment === "right" ? "segment-button segment-button-active" : "segment-button"}
                    onClick={() => updateOverlayAlignment("right")}
                  >
                    Derecha
                  </button>
                  </div>
                </label>
              <label className="reader-mini-check overlay-toggle-check">
                <input
                  type="checkbox"
                  checked={overlayPerspectiveEnabled}
                  onChange={(e) => updateOverlayPerspectiveEnabled(e.target.checked)}
                />
                <span>Usar perspectiva</span>
              </label>
              <div className={`overlay-perspective-panel ${overlayPerspectiveEnabled ? "overlay-perspective-panel-open" : ""}`}>
                <div className="overlay-font-grid">
                <label className="color-setting color-setting-compact">
                  <span>Depth</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="400"
                      max="1600"
                      step="25"
                      value={overlayPerspectiveDepth}
                      onChange={(e) => updateOverlayPerspectiveDepth(Number(e.target.value))}
                    />
                    <code>{Math.round(overlayPerspectiveDepth)}px</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Vertical</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={overlayPerspectiveRotateX}
                      onChange={(e) => updateOverlayPerspectiveRotateX(Number(e.target.value))}
                    />
                    <code>{overlayPerspectiveRotateX}deg</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Horizontal</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={overlayPerspectiveRotateY}
                      onChange={(e) => updateOverlayPerspectiveRotateY(Number(e.target.value))}
                    />
                    <code>{overlayPerspectiveRotateY}deg</code>
                  </div>
                </label>
                <label className="color-setting color-setting-compact">
                  <span>Eye level</span>
                  <div className="opacity-row">
                    <input
                      className="opacity-slider"
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={overlayPerspectiveEyeLevel}
                      onChange={(e) => updateOverlayPerspectiveEyeLevel(Number(e.target.value))}
                    />
                    <code>{Math.round(overlayPerspectiveEyeLevel)}%</code>
                  </div>
                </label>
                </div>
              </div>
              <label className="reader-mini-check overlay-toggle-check">
                <input
                  type="checkbox"
                  checked={overlaySoftTopFade}
                  onChange={(e) => updateOverlaySoftTopFade(e.target.checked)}
                />
                <span>Suavizar corte superior</span>
              </label>
              <label className="reader-mini-check overlay-toggle-check">
                <input
                  type="checkbox"
                  checked={overlayFixedBubbleWidth}
                  onChange={(e) => updateOverlayFixedBubbleWidth(e.target.checked)}
                />
                <span>Tamano fijo de comentarios</span>
              </label>
              <button
                type="button"
                className="button-secondary button-compact overlay-reset-button"
                onClick={resetOverlayStyle}
              >
                Volver a estilo predeterminado
              </button>
              <OverlayPreview overlayConfig={summary.overlayConfig} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Ultimos mensajes</h2>
            </div>
            <div className="message-feed">
              {summary.recentMessages.map((message) => (
                <ChatBubbleCard
                  key={message._id}
                  message={message}
                  showOriginal
                  overlayConfig={summary.overlayConfig}
                />
              ))}
            </div>
          </section>
        </section>
      </section>

      <footer className="dashboard-footer">
        <span>Hecho con</span>
        <span className="footer-heart" aria-hidden="true">♥</span>
        <a
          href="https://gilo.mx"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          gilo.mx
        </a>
      </footer>
      <p className="dashboard-postscript">PD: cain mal</p>
    </main>
  );
}
