import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../api/http";
import { useSocket } from "../hooks/useSocket";
import QueuePlayer from "../components/QueuePlayer";
import StickerMessage from "../components/StickerMessage";

function OverlayPreview({ overlayConfig }) {
  const previewMessage = {
    sender: {
      nickname: "gilo",
      uniqueId: "gilo.mx",
      profilePictureUrl: "https://placehold.co/96x96/6d28d9/ffffff/png?text=G"
    },
    renderedSegments: [
      { type: "text", value: "Este es un mensaje de preview para tu overlay" }
    ]
  };

  return (
    <div className="overlay-preview-shell">
      <article
        className="overlay-bubble overlay-bubble-preview"
        style={{
          "--overlay-bubble-top": overlayConfig?.theme?.bubbleTopRgba,
          "--overlay-bubble-bottom": overlayConfig?.theme?.bubbleBottomRgba,
          "--overlay-bubble-shadow": overlayConfig?.theme?.bubbleShadowColor
        }}
      >
        <img
          className="avatar"
          src={previewMessage.sender.profilePictureUrl}
          alt={previewMessage.sender.nickname}
        />
        <div className="bubble-content">
          <div className="bubble-header">
            <h3>{previewMessage.sender.nickname}</h3>
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

function ChatBubbleCard({ message, statusLabel, showOriginal = false }) {
  return (
    <article className="dashboard-chat-bubble">
      <img
        className="avatar"
        src={message.sender?.profilePictureUrl || "https://placehold.co/64x64/png"}
        alt={message.sender?.nickname || message.sender?.uniqueId || "chat"}
      />
      <div className="bubble-content">
        <div className="bubble-header">
          <h3>{message.sender?.nickname || "Invitado"}</h3>
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

function SearchList({ title, items, renderItem, search, setSearch, children }) {
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
    </section>
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

export default function DashboardPage() {
  const socket = useSocket();
  const colorInputRef = useRef(null);
  const [summary, setSummary] = useState({
    queue: { paused: false, current: null, items: [] },
    recentMessages: [],
    forbidden: [],
    replacements: [],
    stickers: [],
    readerConfig: {
      enabled: true,
      languageCode: "es-US",
      voiceName: "es-US-Standard-A",
      speakingRate: 1,
      pitch: 0,
      volumeGainDb: 0
    },
    readerVoiceOptions: [],
    liveStats: { viewerCount: 0, updatedAt: null },
    liveUsers: [],
    mutedUsers: [],
    overlayConfig: {
      bubbleBaseColor: "#9a5cff",
      bubbleOpacity: 0.98,
      theme: {
        bubbleTopColor: "#af72ff",
        bubbleBottomColor: "#7139e5",
        bubbleShadowColor: "#320f63",
        bubbleTopRgba: "rgba(175, 114, 255, 0.98)",
        bubbleBottomRgba: "rgba(113, 57, 229, 0.98)"
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
  const [overlayColor, setOverlayColor] = useState("#9a5cff");
  const [overlayOpacity, setOverlayOpacity] = useState(0.98);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState("");

  const refreshSummary = async () => {
    const data = await http("/api/dashboard/summary");
    setSummary(data);
    setOverlayColor(data.overlayConfig?.bubbleBaseColor || "#9a5cff");
    setOverlayOpacity(data.overlayConfig?.bubbleOpacity ?? 0.98);
  };

  const refreshSearch = async (key, endpoint) => {
    const data = await http(
      `/api/dashboard/${endpoint}?q=${encodeURIComponent(search[key])}`,
    );
    setSummary((current) => ({ ...current, [key]: data }));
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
      setOverlayColor(config.bubbleBaseColor);
      setOverlayOpacity(config.bubbleOpacity ?? 0.98);
    };
    const handleLiveStats = (liveStats) => {
      setSummary((current) => ({ ...current, liveStats }));
    };
    const handleLiveUsers = (liveUsers) => {
      setSummary((current) => ({ ...current, liveUsers }));
    };
    const handleMutedUsers = (mutedUsers) => {
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
    refreshLiveUsers();
  }, [search.liveUsers]);

  useEffect(() => {
    refreshMutedUsers();
  }, [search.mutedUsers]);

  useEffect(() => {
    refreshSearch("forbidden", "forbidden-words");
  }, [search.forbidden]);

  useEffect(() => {
    refreshSearch("replacements", "replacement-rules");
  }, [search.replacements]);

  useEffect(() => {
    refreshSearch("stickers", "stickers");
  }, [search.stickers]);

  const queuedTotal = useMemo(
    () => summary.queue.items.length,
    [summary.queue.items.length],
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
    setOverlayColor(config.bubbleBaseColor);
    setOverlayOpacity(config.bubbleOpacity ?? 0.98);
  };

  const updateOverlayColor = async (nextColor) => {
    setOverlayColor(nextColor);
    await saveOverlayConfig({
      bubbleBaseColor: nextColor,
      bubbleOpacity: overlayOpacity
    });
  };

  const updateOverlayOpacity = async (nextOpacity) => {
    setOverlayOpacity(nextOpacity);
    await saveOverlayConfig({
      bubbleBaseColor: overlayColor,
      bubbleOpacity: nextOpacity
    });
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
                        {voice.voiceName} - {voice.tier}
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
                      min="-6"
                      max="10"
                      step="1"
                      value={summary.readerConfig.volumeGainDb}
                      onChange={(e) =>
                        updateReaderConfigField("volumeGainDb", Number(e.target.value))
                      }
                    />
                    <code>{summary.readerConfig.volumeGainDb} dB</code>
                  </div>
                </label>
              </div>
            </div>

            {summary.queue.paused && (
              <article className="queue-current queue-empty">
                La reproduccion de mensajes esta pausada. Haz click en reanudar para seguir con la lectura.
              </article>
            )}

            <div className="queue-list">
              {summary.queue.current && (
                <ChatBubbleCard message={summary.queue.current} statusLabel="Leyendo" />
              )}
              {summary.queue.items.map((item) => (
                <div key={item._id} className="queue-item-wrap">
                  <ChatBubbleCard message={item} />
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
            items={summary.forbidden}
            search={search.forbidden}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, forbidden: value }))
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
                    }).then(refreshSummary)
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
            items={summary.replacements}
            search={search.replacements}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, replacements: value }))
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
                    }).then(refreshSummary)
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
            items={summary.stickers}
            search={search.stickers}
            setSearch={(value) =>
              setSearch((current) => ({ ...current, stickers: value }))
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
                    }).then(refreshSummary)
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
            </div>
            <div className="overlay-settings">
              <label className="color-setting">
                <span>Color base del overlay</span>
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
              <OverlayPreview overlayConfig={summary.overlayConfig} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Ultimos mensajes</h2>
            </div>
            <div className="message-feed">
              {summary.recentMessages.map((message) => (
                <ChatBubbleCard key={message._id} message={message} showOriginal />
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
