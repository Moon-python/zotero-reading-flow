"use strict";
var ReadingFlowBootstrap = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/bootstrap.ts
  var bootstrap_exports = {};
  __export(bootstrap_exports, {
    install: () => install,
    onMainWindowLoad: () => onMainWindowLoad,
    onMainWindowUnload: () => onMainWindowUnload,
    shutdown: () => shutdown,
    startup: () => startup,
    uninstall: () => uninstall
  });

  // src/lruCache.ts
  var LRUCache = class {
    max;
    cache;
    constructor(max = 1e3) {
      this.max = max;
      this.cache = /* @__PURE__ */ new Map();
    }
    get(key) {
      if (!this.cache.has(key)) return void 0;
      const val = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, val);
      return val;
    }
    set(key, val) {
      if (this.cache.has(key)) this.cache.delete(key);
      else if (this.cache.size === this.max) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, val);
    }
    delete(key) {
      this.cache.delete(key);
    }
    clear() {
      this.cache.clear();
    }
  };

  // src/Logger.ts
  var Logger = class {
    static prefix = "[Reading Flow] ";
    static debugPref = "extensions.readingflow.debug";
    static log(message, level = 3) {
      if (!this.isDebugEnabled()) return;
      if (typeof Zotero !== "undefined" && Zotero.debug) {
        Zotero.debug(this.prefix + message, level);
      } else {
        console.log(this.prefix + message);
      }
    }
    static error(message, error) {
      const errorMessage = error ? `${message}: ${error.message || error}` : message;
      if (typeof Zotero !== "undefined" && Zotero.debug) {
        Zotero.debug(this.prefix + "ERROR: " + errorMessage, 1);
        if (error && Zotero.logError) {
          Zotero.logError(error);
        }
      } else {
        console.error(this.prefix + "ERROR: " + errorMessage);
      }
      if (error && error.stack) {
        this.log("Stack trace: " + error.stack, 1);
      }
    }
    static warn(message) {
      if (typeof Zotero !== "undefined" && Zotero.debug) {
        Zotero.debug(this.prefix + "WARN: " + message, 2);
      } else {
        console.warn(this.prefix + "WARN: " + message);
      }
    }
    static isDebugEnabled() {
      try {
        return Boolean(typeof Zotero !== "undefined" && Zotero.Prefs?.get(this.debugPref));
      } catch {
        return false;
      }
    }
  };

  // src/flowData.ts
  var FLOW_PREFIX = "ReadingFlow: ";
  var DEFAULT_FLOW_DATA = {
    v: 1,
    p: {},
    c: null,
    s: null,
    ts: 0,
    lastAttachmentId: null,
    lastPage: null,
    lastReadAt: null
  };
  var VALID_STATUSES = /* @__PURE__ */ new Set(["to-read", "reading", "skimmed", "read", "important"]);
  function normalizeFlowData(input) {
    const progress = {};
    if (input?.p && typeof input.p === "object") {
      for (const [key, value] of Object.entries(input.p)) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          progress[key] = value > 1 ? Math.round(value) : Math.min(1, value);
        }
      }
    }
    const lastAttachmentId = typeof input?.lastAttachmentId === "string" && input.lastAttachmentId ? input.lastAttachmentId : null;
    return {
      v: 1,
      p: progress,
      c: typeof input?.c === "string" ? input.c : null,
      s: VALID_STATUSES.has(input?.s) ? input.s : null,
      ts: finiteNumberOrZero(input?.ts),
      lastAttachmentId,
      lastPage: finitePositiveIntegerOrNull(input?.lastPage),
      lastReadAt: finiteNumberOrNull(input?.lastReadAt)
    };
  }
  function mergeFlowData(current, updates, now = Date.now()) {
    const shouldReplaceProgress = Object.prototype.hasOwnProperty.call(updates, "p") && updates.p && Object.keys(updates.p).length === 0;
    const nextWithoutTimestamp = normalizeFlowData({
      ...current,
      ...updates,
      p: shouldReplaceProgress ? {} : { ...current.p, ...updates.p || {} },
      ts: current.ts
    });
    return { ...nextWithoutTimestamp, ts: now };
  }
  function isFlowDataSame(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function getDisplayAttachmentId(data) {
    if (data.lastAttachmentId && typeof data.p[data.lastAttachmentId] === "number") {
      return data.lastAttachmentId;
    }
    let bestId = null;
    let bestProgress = 0;
    for (const [attachmentId, progress] of Object.entries(data.p)) {
      if (progress > bestProgress) {
        bestId = attachmentId;
        bestProgress = progress;
      }
    }
    return bestId;
  }
  function getDisplayProgress(data) {
    const attachmentId = getDisplayAttachmentId(data);
    return attachmentId ? data.p[attachmentId] ?? 0 : 0;
  }
  function inferStatus(data) {
    if (data.s) return data.s;
    const progress = getDisplayProgress(data);
    if (progress >= 0.95 && progress <= 1) return "read";
    if (progress > 0) return "reading";
    return "to-read";
  }
  function formatRelativeDate(timestamp, now = Date.now()) {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return "";
    const diffMs = Math.max(0, now - timestamp);
    const minute = 60 * 1e3;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return "now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
    if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d`;
    return new Date(timestamp).toISOString().slice(0, 10);
  }
  function finiteNumberOrZero(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  function finiteNumberOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  }
  function finitePositiveIntegerOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  // src/dataStore.ts
  var DataStore = class {
    cache = new LRUCache(2e3);
    closed = false;
    getData(item) {
      const id = item.id;
      const cached = this.cache.get(id);
      if (cached) return cached;
      const extra = item.getField("extra") || "";
      const match = extra.split("\n").find((line) => line.startsWith(FLOW_PREFIX));
      let data = { ...DEFAULT_FLOW_DATA };
      if (match) {
        try {
          const parsed = JSON.parse(match.substring(FLOW_PREFIX.length));
          data = normalizeFlowData(parsed);
        } catch (e) {
          Logger.error(`ReadingFlow: Failed to parse data for ${id}`, e);
        }
      }
      this.cache.set(id, data);
      return data;
    }
    async updateData(item, updates) {
      if (this.isClosedOrShuttingDown()) {
        Logger.log("ReadingFlow: write skipped during shutdown");
        return;
      }
      if (typeof item.isDirty === "function" && item.isDirty()) {
        Logger.warn("ReadingFlow: Item dirty, skipping write to prevent race condition");
        return;
      }
      const current = this.getData(item);
      if (updates.ts && updates.ts < current.ts) return;
      const nextWithoutTimestamp = mergeFlowData(current, updates, current.ts);
      if (isFlowDataSame(current, nextWithoutTimestamp)) return;
      const merged = mergeFlowData(current, updates);
      this.cache.set(item.id, merged);
      let extra = item.getField("extra") || "";
      const lines = extra.split("\n").filter((line) => !line.startsWith(FLOW_PREFIX));
      lines.push(`${FLOW_PREFIX}${JSON.stringify(merged)}`);
      if (this.isClosedOrShuttingDown()) {
        Logger.log("ReadingFlow: write skipped before saveTx during shutdown");
        return;
      }
      item.setField("extra", lines.join("\n"));
      await item.saveTx();
    }
    async setStatus(item, status) {
      await this.updateData(item, { s: status });
    }
    async resetProgress(item) {
      await this.updateData(item, {
        p: {},
        s: "to-read",
        lastAttachmentId: null,
        lastPage: null,
        lastReadAt: null
      });
    }
    clearCache(itemId) {
      this.cache.delete(itemId);
    }
    close() {
      this.closed = true;
      this.cache.clear();
    }
    isClosedOrShuttingDown() {
      const startup2 = globalThis.Services?.startup;
      return this.closed || Boolean(startup2?.shuttingDown);
    }
  };

  // src/readerTracker.ts
  var ReaderTracker = class {
    dataStore;
    notifierId = null;
    saveTimeouts = /* @__PURE__ */ new Map();
    active = false;
    generation = 0;
    constructor(dataStore) {
      this.dataStore = dataStore;
    }
    register() {
      this.generation += 1;
      this.active = true;
      this.notifierId = Zotero.Notifier.registerObserver(this, ["file"], "ReadingFlowTracker");
      Logger.log("ReaderTracker registered, notifierId=" + this.notifierId);
    }
    unregister() {
      this.active = false;
      this.generation += 1;
      if (this.notifierId) {
        Zotero.Notifier.unregisterObserver(this.notifierId);
        this.notifierId = null;
      }
      for (const timeout of this.saveTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.saveTimeouts.clear();
    }
    notify(action, type, ids) {
      Logger.log("notify: action=" + action + " type=" + type + " ids=" + JSON.stringify(ids));
      if (!this.active || this.isZoteroShuttingDown()) return;
      if (type !== "file" || action !== "pageChange") return;
      const attachmentIds = Array.isArray(ids) ? ids : [ids];
      for (const attachmentId of attachmentIds) {
        this.handlePageChange(attachmentId);
      }
    }
    handlePageChange(attachmentId) {
      Logger.log("handlePageChange: attachmentId=" + attachmentId);
      const readers = Zotero.Reader._readers;
      Logger.log("_readers count=" + (readers?.length ?? "null"));
      const reader = readers?.find((r) => r.itemID === attachmentId);
      Logger.log("reader found=" + !!reader + " type=" + reader?._type);
      const item = Zotero.Items.get(attachmentId);
      if (!item) return;
      const parentId = item.parentID;
      if (!parentId) return;
      let progress = 0;
      if (reader?._type === "pdf" || item.isPDFAttachment?.()) {
        const savedPageIndex = item.getAttachmentLastPageIndex?.();
        const pageIndex = typeof savedPageIndex === "number" ? savedPageIndex : reader?._state?.pageIndex ?? reader?._internalReader?._state?.pageIndex ?? 0;
        const numPages = this.getPDFPageCount(reader);
        Logger.log("pdf pageIndex=" + pageIndex + " numPages=" + numPages);
        if (numPages > 0) {
          progress = (pageIndex + 1) / numPages;
        } else {
          progress = pageIndex + 1;
        }
      } else if (reader?._type === "epub" || reader?._type === "snapshot") {
        const savedPosition = item.getAttachmentLastPageIndex?.();
        progress = typeof savedPosition === "number" ? savedPosition : reader?._state?.scrollYPercent || 0;
      }
      progress = this.normalizeProgress(progress);
      Logger.log("progress=" + progress);
      if (progress === 0) {
        Logger.log("progress=0, skipping save");
        return;
      }
      const lastPage = progress > 1 ? progress : this.getLastPage(reader, item);
      this.debounceSave(parentId, String(attachmentId), progress, lastPage);
    }
    debounceSave(parentId, attachmentId, progress, lastPage) {
      const key = `${parentId}:${attachmentId}`;
      const existingTimeout = this.saveTimeouts.get(key);
      if (existingTimeout) clearTimeout(existingTimeout);
      const generation = this.generation;
      const timeout = setTimeout(async () => {
        this.saveTimeouts.delete(key);
        if (this.shouldSkipSave(generation)) {
          Logger.log("save skipped: tracker inactive or Zotero shutting down");
          return;
        }
        try {
          Logger.log("saving progress=" + progress + " for parent=" + parentId);
          const parentItem = await Zotero.Items.getAsync(parentId);
          if (this.shouldSkipSave(generation)) {
            Logger.log("save skipped after getAsync: tracker inactive or Zotero shutting down");
            return;
          }
          if (parentItem) {
            const current = this.dataStore.getData(parentItem).p?.[attachmentId];
            const nextProgress = typeof current === "number" ? Math.max(current, progress) : progress;
            if (nextProgress !== progress) {
              Logger.log(`save adjusted to preserve max progress current=${current} attempted=${progress}`);
            }
            await this.dataStore.updateData(parentItem, {
              p: { [attachmentId]: nextProgress },
              lastAttachmentId: attachmentId,
              lastPage,
              lastReadAt: Date.now()
            });
            if (this.shouldSkipSave(generation)) {
              Logger.log("post-save refresh skipped: tracker inactive or Zotero shutting down");
              return;
            }
            Zotero.ItemTreeManager.refreshColumns?.();
            Zotero.Notifier.trigger("refresh", "item", [parentId]);
            Logger.log("save complete");
          }
        } catch (e) {
          Logger.error("save failed", e);
        }
      }, 5e3);
      this.saveTimeouts.set(key, timeout);
    }
    isZoteroShuttingDown() {
      const startup2 = globalThis.Services?.startup;
      return Boolean(startup2?.shuttingDown);
    }
    shouldSkipSave(generation) {
      return !this.active || generation !== this.generation || this.isZoteroShuttingDown();
    }
    normalizeProgress(progress) {
      if (!Number.isFinite(progress)) return 0;
      if (progress <= 0) return 0;
      return progress > 1 ? Math.round(progress) : Math.min(1, progress);
    }
    getLastPage(reader, item) {
      const savedPageIndex = item.getAttachmentLastPageIndex?.();
      const pageIndex = typeof savedPageIndex === "number" ? savedPageIndex : reader?._state?.pageIndex ?? reader?._internalReader?._state?.pageIndex;
      return typeof pageIndex === "number" && Number.isFinite(pageIndex) ? pageIndex + 1 : null;
    }
    getPDFPageCount(reader) {
      const primaryWindow = reader?._internalReader?._primaryView?._iframeWindow?.wrappedJSObject ?? reader?._internalReader?._primaryView?._iframeWindow;
      const readerWindow = reader?._iframeWindow?.wrappedJSObject ?? reader?._iframeWindow;
      const app = primaryWindow?.PDFViewerApplication ?? readerWindow?.PDFViewerApplication;
      return app?.pdfDocument?.numPages ?? app?.pdfViewer?.pagesCount ?? app?.pdfViewer?._pages?.length ?? app?.pagesCount ?? 0;
    }
  };

  // src/columnManager.ts
  var PLUGIN_ID = "readingflow@moon.com";
  var PROGRESS_KEY = "readingFlowProgress";
  var STATUS_KEY = "readingFlowStatus";
  var LAST_READ_KEY = "readingFlowLastRead";
  var STATUS_LABELS = {
    "to-read": "To Read",
    reading: "Reading",
    skimmed: "Skimmed",
    read: "Read",
    important: "Important"
  };
  var STATUS_COLORS = {
    "to-read": "#6b7280",
    reading: "#2563eb",
    skimmed: "#7c3aed",
    read: "#16a34a",
    important: "#dc2626"
  };
  var ColumnManager = class {
    dataStore;
    registeredDataKeys = [];
    constructor(dataStore) {
      this.dataStore = dataStore;
    }
    async register() {
      const progressKey = await Zotero.ItemTreeManager.registerColumn({
        dataKey: PROGRESS_KEY,
        label: "Progress",
        pluginID: PLUGIN_ID,
        enabledTreeIDs: ["main"],
        defaultIn: ["default"],
        width: "90",
        fixedWidth: true,
        staticWidth: true,
        zoteroPersist: ["width", "hidden", "sortDirection"],
        dataProvider: (item, _dataKey) => {
          try {
            if (!item?.isRegularItem?.()) return "";
            const flowData = this.dataStore.getData(item);
            const progress = getDisplayProgress(flowData);
            return progress > 0 ? String(progress) : "";
          } catch (e) {
            Logger.error("column dataProvider failed", e);
            return "";
          }
        },
        renderCell: (index, data, column, isFirstColumn, doc) => {
          const cell = doc.createElement("div");
          cell.style.cssText = "display:flex;align-items:center;width:100%;height:100%;padding:0 4px;box-sizing:border-box;font-size:11px;";
          const value = parseFloat(data);
          if (!data || isNaN(value) || value === 0) return cell;
          if (value > 1) {
            cell.textContent = `p. ${Math.round(value)}`;
            cell.title = `Last read page ${Math.round(value)}`;
            cell.style.justifyContent = "center";
            return cell;
          }
          cell.style.gap = "4px";
          const percent = Math.max(1, Math.min(100, Math.round(value * 100)));
          const label = doc.createElement("span");
          label.textContent = `${percent}%`;
          label.title = `${percent}% read`;
          label.style.cssText = "min-width:28px;text-align:right;color:var(--fill-secondary, #666);font-size:10px;line-height:1;";
          const track = doc.createElement("div");
          track.style.cssText = "flex:1;min-width:24px;height:6px;background:rgba(0,0,0,0.1);border-radius:3px;overflow:hidden;";
          const bar = doc.createElement("div");
          const completedColor = Zotero.Prefs.get("extensions.readingflow.color-completed") || "#4caf50";
          const readingColor = Zotero.Prefs.get("extensions.readingflow.color-reading") || "#2196f3";
          bar.style.cssText = `width:${value * 100}%;height:100%;background:${value >= 0.99 ? completedColor : readingColor};`;
          track.appendChild(bar);
          cell.appendChild(label);
          cell.appendChild(track);
          return cell;
        }
      });
      const statusKey = await Zotero.ItemTreeManager.registerColumn({
        dataKey: STATUS_KEY,
        label: "Status",
        pluginID: PLUGIN_ID,
        enabledTreeIDs: ["main"],
        width: "88",
        fixedWidth: true,
        staticWidth: true,
        zoteroPersist: ["width", "hidden", "sortDirection"],
        dataProvider: (item) => {
          try {
            if (!item?.isRegularItem?.()) return "";
            return inferStatus(this.dataStore.getData(item));
          } catch (e) {
            Logger.error("status dataProvider failed", e);
            return "";
          }
        },
        renderCell: (_index, data, _column, _isFirstColumn, doc) => {
          const cell = doc.createElement("div");
          cell.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:0 4px;box-sizing:border-box;";
          if (!data || !(data in STATUS_LABELS)) return cell;
          const status = data;
          const badge = doc.createElement("span");
          badge.textContent = STATUS_LABELS[status];
          badge.title = STATUS_LABELS[status];
          badge.style.cssText = [
            "display:inline-flex",
            "align-items:center",
            "max-width:100%",
            "height:18px",
            "padding:0 6px",
            "border-radius:9px",
            "box-sizing:border-box",
            "font-size:10px",
            "line-height:1",
            "white-space:nowrap",
            "overflow:hidden",
            "text-overflow:ellipsis",
            `color:${STATUS_COLORS[status]}`,
            `background:${STATUS_COLORS[status]}1a`
          ].join(";");
          cell.appendChild(badge);
          return cell;
        }
      });
      const lastReadKey = await Zotero.ItemTreeManager.registerColumn({
        dataKey: LAST_READ_KEY,
        label: "Last Read",
        pluginID: PLUGIN_ID,
        enabledTreeIDs: ["main"],
        width: "82",
        fixedWidth: true,
        staticWidth: true,
        zoteroPersist: ["width", "hidden", "sortDirection"],
        dataProvider: (item) => {
          try {
            if (!item?.isRegularItem?.()) return "";
            const data = this.dataStore.getData(item);
            return data.lastReadAt ? String(data.lastReadAt) : "";
          } catch (e) {
            Logger.error("last read dataProvider failed", e);
            return "";
          }
        },
        renderCell: (_index, data, _column, _isFirstColumn, doc) => {
          const cell = doc.createElement("div");
          cell.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:0 4px;box-sizing:border-box;font-size:11px;color:var(--fill-secondary, #666);";
          const timestamp = Number(data);
          if (!Number.isFinite(timestamp) || timestamp <= 0) return cell;
          const label = formatRelativeDate(timestamp);
          cell.textContent = label;
          cell.title = new Date(timestamp).toLocaleString();
          return cell;
        }
      });
      this.registeredDataKeys = [progressKey, statusKey, lastReadKey].filter(Boolean);
    }
    unregister() {
      for (const dataKey of this.registeredDataKeys) {
        Zotero.ItemTreeManager.unregisterColumn(dataKey);
      }
      this.registeredDataKeys = [];
    }
  };

  // src/styleManager.ts
  var STYLE_ID = "reading-flow-styles";
  var StyleManager = class {
    doc = null;
    injectCSS(doc) {
      this.doc = doc;
      if (doc.getElementById(STYLE_ID)) return;
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      tree-row[data-flow-color] {
        background-color: var(--reading-flow-row-color) !important;
      }
    `;
      (doc.head ?? doc.documentElement).appendChild(style);
    }
    unregister() {
      this.doc?.getElementById(STYLE_ID)?.remove();
    }
  };

  // src/notifierManager.ts
  var NotifierManager = class {
    dataStore;
    notifierId = null;
    constructor(dataStore) {
      this.dataStore = dataStore;
    }
    register() {
      this.notifierId = Zotero.Notifier.registerObserver(this, ["item"], "ReadingFlow");
    }
    unregister() {
      if (this.notifierId) {
        Zotero.Notifier.unregisterObserver(this.notifierId);
      }
    }
    notify(action, type, ids) {
      if (type === "item" && (action === "trash" || action === "delete")) {
        ids.forEach((id) => this.dataStore.clearCache(id));
      }
    }
  };

  // src/popoverManager.ts
  var PopoverManager = class {
    timeoutId = null;
    popover = null;
    currentItemId = null;
    contentElement = null;
    boundHandleMouseOver = this.handleMouseOver.bind(this);
    boundHandleMouseOut = this.handleMouseOut.bind(this);
    boundRemovePopover = this.removePopover.bind(this);
    register() {
      const pane = Zotero.getActiveZoteroPane();
      if (pane?.itemsView?.contentElement && !this.contentElement) {
        const content = pane.itemsView.contentElement;
        content.addEventListener("mouseover", this.boundHandleMouseOver);
        content.addEventListener("mouseout", this.boundHandleMouseOut);
        content.addEventListener("scroll", this.boundRemovePopover);
        this.contentElement = content;
      }
    }
    unregister() {
      if (this.contentElement) {
        this.contentElement.removeEventListener("mouseover", this.boundHandleMouseOver);
        this.contentElement.removeEventListener("mouseout", this.boundHandleMouseOut);
        this.contentElement.removeEventListener("scroll", this.boundRemovePopover);
        this.contentElement = null;
      }
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.removePopover();
    }
    handleMouseOver(event) {
      const target = event.target;
      const cell = target.closest(".cell");
      if (!cell) return;
      const isTitleCell = cell.classList.contains("primary") || cell.getAttribute("data-column-id") === "title";
      if (!isTitleCell) return;
      const row = cell.closest("tree-row");
      if (!row) return;
      const pane = Zotero.getActiveZoteroPane();
      const index = parseInt(row.getAttribute("data-index") || "-1");
      if (index === -1) return;
      const item = pane.itemsView.getRow(index).ref;
      if (!item || !item.isRegularItem()) return;
      if (this.currentItemId === item.id) return;
      this.currentItemId = item.id;
      if (this.timeoutId) clearTimeout(this.timeoutId);
      const prefDelay = Zotero.Prefs.get("extensions.readingflow.hover-debounce");
      const delay = typeof prefDelay === "number" ? prefDelay : 400;
      this.timeoutId = setTimeout(() => this.showPopover(item, event), delay);
    }
    handleMouseOut(event) {
      const relatedTarget = event.relatedTarget;
      if (this.popover && this.popover.contains(relatedTarget)) return;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.currentItemId = null;
      this.removePopover();
    }
    async showPopover(item, event) {
      try {
        const abstract = item.getField("abstractNote");
        const annotations = await Zotero.Annotations.getForItems([item.id]);
        if (!abstract && (!annotations || annotations.length === 0)) return;
        this.removePopover();
        const doc = Zotero.getMainWindow().document;
        const popover = doc.createElement("div");
        popover.id = "reading-flow-popover";
        Object.assign(popover.style, {
          position: "fixed",
          zIndex: "10000",
          backgroundColor: "white",
          color: "#333",
          border: "1px solid #ccc",
          padding: "12px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          maxWidth: "350px",
          fontSize: "12px",
          lineHeight: "1.4",
          pointerEvents: "none"
        });
        let html = "";
        if (abstract) {
          const sanitizedAbstract = this.sanitizeHTML(abstract);
          html += `<div style="margin-bottom: 8px;"><strong>Abstract:</strong><br/>${sanitizedAbstract.substring(0, 300)}${sanitizedAbstract.length > 300 ? "..." : ""}</div>`;
        }
        if (annotations && annotations.length > 0) {
          html += `<div><strong>Top Highlights:</strong><ul style="margin: 4px 0; padding-left: 16px;">`;
          const topAnnotations = annotations.slice(0, 3);
          for (const ann of topAnnotations) {
            const text = ann.annotationText || "";
            if (text) {
              html += `<li>${this.sanitizeHTML(text).substring(0, 100)}${text.length > 100 ? "..." : ""}</li>`;
            }
          }
          html += `</ul></div>`;
        }
        popover.innerHTML = html;
        doc.body.appendChild(popover);
        this.popover = popover;
        this.positionPopover(event.clientX, event.clientY);
      } catch (e) {
        Logger.error("Popover error", e);
      }
    }
    sanitizeHTML(str) {
      return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m]);
    }
    positionPopover(x, y) {
      if (!this.popover) return;
      const padding = 15;
      let left = x + padding;
      let top = y + padding;
      const width = this.popover.offsetWidth;
      const height = this.popover.offsetHeight;
      const win = Zotero.getMainWindow();
      const viewportWidth = win.innerWidth;
      const viewportHeight = win.innerHeight;
      if (left + width > viewportWidth) {
        left = x - width - padding;
      }
      if (top + height > viewportHeight) {
        top = y - height - padding;
      }
      this.popover.style.left = `${left}px`;
      this.popover.style.top = `${top}px`;
    }
    removePopover() {
      if (this.popover) {
        this.popover.remove();
        this.popover = null;
      }
    }
  };

  // src/menuManager.ts
  var PLUGIN_ID2 = "readingflow@moon.com";
  var MENU_ID = "readingflow-library-item-menu";
  var ReadingFlowMenuManager = class {
    constructor(dataStore) {
      this.dataStore = dataStore;
    }
    dataStore;
    registeredMenuID = null;
    register() {
      if (!Zotero.MenuManager?.registerMenu || this.registeredMenuID) return;
      this.registeredMenuID = Zotero.MenuManager.registerMenu({
        menuID: MENU_ID,
        pluginID: PLUGIN_ID2,
        target: "main/library/item",
        menus: [
          {
            menuType: "submenu",
            l10nID: "reading-flow-menu",
            onShowing: (_event, context) => {
              context.setEnabled(this.getSelectedRegularItems().length > 0);
            },
            menus: [
              this.statusMenu("to-read", "reading-flow-status-to-read"),
              this.statusMenu("reading", "reading-flow-status-reading"),
              this.statusMenu("skimmed", "reading-flow-status-skimmed"),
              this.statusMenu("read", "reading-flow-status-read"),
              this.statusMenu("important", "reading-flow-status-important"),
              {
                menuType: "menuitem",
                l10nID: "reading-flow-reset-progress",
                onCommand: () => this.updateSelectedItems((item) => this.dataStore.resetProgress(item))
              }
            ]
          }
        ]
      });
    }
    unregister() {
      if (this.registeredMenuID && Zotero.MenuManager?.unregisterMenu) {
        Zotero.MenuManager.unregisterMenu(this.registeredMenuID);
      }
      this.registeredMenuID = null;
    }
    statusMenu(status, l10nID) {
      return {
        menuType: "menuitem",
        l10nID,
        onCommand: () => this.updateSelectedItems((item) => this.dataStore.setStatus(item, status))
      };
    }
    async updateSelectedItems(update) {
      const items = this.getSelectedRegularItems();
      if (!items.length) return;
      for (const item of items) {
        try {
          await update(item);
        } catch (e) {
          Logger.error(`menu update failed for item ${item?.id}`, e);
        }
      }
      Zotero.ItemTreeManager.refreshColumns?.();
      Zotero.Notifier.trigger("refresh", "item", items.map((item) => item.id));
    }
    getSelectedRegularItems() {
      const pane = Zotero.getActiveZoteroPane?.();
      const items = pane?.getSelectedItems?.() ?? pane?.itemsView?.getSelectedItems?.() ?? [];
      return items.filter((item) => item?.isRegularItem?.());
    }
  };

  // src/bootstrap.ts
  var Bootstrap = class {
    dataStore;
    readerTracker;
    columnManager;
    styleManager;
    notifierManager;
    popoverManager;
    menuManager;
    popoverRetryTimer = null;
    preferencePaneID = null;
    started = false;
    constructor() {
      this.styleManager = new StyleManager();
    }
    install() {
    }
    async startup({ id, version, rootURI }) {
      await Zotero.initializationPromise;
      this.started = true;
      Logger.log("startup begin");
      try {
        this.dataStore = new DataStore();
        Logger.log("dataStore OK");
      } catch (e) {
        Logger.error("dataStore FAIL", e);
        return;
      }
      try {
        this.registerPreferencePane(id, rootURI);
      } catch (e) {
        Logger.error("preferencePane FAIL", e);
      }
      try {
        const win = Zotero.getMainWindow();
        this.styleManager.injectCSS(win.document);
        Logger.log("CSS OK");
      } catch (e) {
        Logger.error("CSS FAIL", e);
      }
      try {
        this.readerTracker = new ReaderTracker(this.dataStore);
        this.readerTracker.register();
        Logger.log("readerTracker OK");
      } catch (e) {
        Logger.error("readerTracker FAIL", e);
      }
      try {
        this.columnManager = new ColumnManager(this.dataStore);
        await this.columnManager.register();
        Logger.log("columnManager OK");
      } catch (e) {
        Logger.error("columnManager FAIL", e);
      }
      try {
        this.notifierManager = new NotifierManager(this.dataStore);
        this.notifierManager.register();
        Logger.log("notifierManager OK");
      } catch (e) {
        Logger.error("notifierManager FAIL", e);
      }
      try {
        this.menuManager = new ReadingFlowMenuManager(this.dataStore);
        this.menuManager.register();
        Logger.log("menuManager OK");
      } catch (e) {
        Logger.error("menuManager FAIL", e);
      }
      try {
        this.popoverManager = new PopoverManager();
        this.registerPopoverWhenReady();
      } catch (e) {
        Logger.error("popoverManager FAIL", e);
      }
      Logger.log("startup complete");
    }
    shutdown(reason) {
      this.started = false;
      this.dataStore?.close();
      this.clearPopoverRetry();
      this.readerTracker?.unregister();
      this.notifierManager?.unregister();
      this.popoverManager?.unregister();
      if (!this.isAppShutdown(reason)) {
        this.columnManager?.unregister();
        this.menuManager?.unregister();
        this.unregisterPreferencePane();
      }
      this.styleManager.unregister();
    }
    uninstall() {
    }
    onMainWindowLoad({ window }) {
      if (!this.started) return;
      try {
        this.styleManager.injectCSS(window.document);
        this.registerPopoverWhenReady();
      } catch (e) {
        Logger.error("onMainWindowLoad failed", e);
      }
    }
    onMainWindowUnload() {
      this.clearPopoverRetry();
      this.popoverManager?.unregister();
    }
    registerPopoverWhenReady() {
      if (!this.started || !this.popoverManager) return;
      const pane = Zotero.getActiveZoteroPane();
      if (pane?.itemsView?.contentElement) {
        this.clearPopoverRetry();
        this.popoverManager.register();
        Logger.log("popoverManager OK");
        return;
      }
      if (!this.popoverRetryTimer) {
        const win = Zotero.getMainWindow();
        this.popoverRetryTimer = win.setTimeout(() => {
          this.popoverRetryTimer = null;
          this.registerPopoverWhenReady();
        }, 1e3);
      }
    }
    clearPopoverRetry() {
      if (!this.popoverRetryTimer) return;
      clearTimeout(this.popoverRetryTimer);
      this.popoverRetryTimer = null;
    }
    registerPreferencePane(pluginID, rootURI) {
      if (!Zotero.PreferencePanes?.register) return;
      this.preferencePaneID = Zotero.PreferencePanes.register({
        pluginID,
        src: `${rootURI}prefs.xhtml`
      }) ?? null;
      Logger.log("preferencePane OK");
    }
    unregisterPreferencePane() {
      if (!this.preferencePaneID || !Zotero.PreferencePanes?.unregister) return;
      Zotero.PreferencePanes.unregister(this.preferencePaneID);
      this.preferencePaneID = null;
    }
    isAppShutdown(reason) {
      return typeof reason === "number" && typeof globalThis.APP_SHUTDOWN === "number" && reason === globalThis.APP_SHUTDOWN;
    }
  };
  var BOOTSTRAP = new Bootstrap();
  function install() {
    BOOTSTRAP.install();
  }
  async function startup(data, reason) {
    await BOOTSTRAP.startup(data);
  }
  function shutdown(data, reason) {
    BOOTSTRAP.shutdown(reason);
  }
  function uninstall() {
    BOOTSTRAP.uninstall();
  }
  function onMainWindowLoad(data) {
    BOOTSTRAP.onMainWindowLoad(data);
  }
  function onMainWindowUnload(data) {
    BOOTSTRAP.onMainWindowUnload();
  }
  return __toCommonJS(bootstrap_exports);
})();
var install = ReadingFlowBootstrap.install; var startup = ReadingFlowBootstrap.startup; var shutdown = ReadingFlowBootstrap.shutdown; var uninstall = ReadingFlowBootstrap.uninstall; var onMainWindowLoad = ReadingFlowBootstrap.onMainWindowLoad; var onMainWindowUnload = ReadingFlowBootstrap.onMainWindowUnload;
