/**
 * Special trigger that runs when the spreadsheet is opened.
 * Adds the 'BridgeMail' custom menu to the Google Sheets UI.
 * * @return {void}
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('BridgeMail')
    .addItem('Setup System', 'setupSystem')
    .addItem('Refresh Trigger Automation', 'refreshTrigger')
    .addSeparator()
    .addItem('Run Translation Now', 'startEmailAutomation')
    .addToUi();
}

/**
 * Initializes the entire spreadsheet infrastructure with a "Smart Merge" approach.
 * Creates or updates Audit and Settings sheets while preserving existing data.
 * Applies themes, dimensions, protections, and establishes the initial email baseline.
 * * @return {void}
 */
function setupSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const themeColor = "#1155cc";
  const settingsOrange = "#e67e22";
  const auditSheetName = "Audit Log";
  const settingsSheetName = "Settings";

  // --- 1. AUDIT LOG SETUP ---
  let auditSheet = ss.getSheetByName(auditSheetName);
  if (!auditSheet) auditSheet = ss.insertSheet(auditSheetName);

  auditSheet.setTabColor(themeColor);
  const auditHeaders = ["Timestamp", "Message ID", "Subject", "Sender", "Char Count", "Status", "Processing Time (ms)", "Error Details"];

  // Ensure headers are present without clearing the entire data history
  const auditHeaderRange = auditSheet.getRange(1, 1, 1, auditHeaders.length);
  auditHeaderRange.setValues([auditHeaders])
    .setBackground(themeColor)
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12);

  // Clean columns: delete everything beyond the header count
  const currentAuditCols = auditSheet.getMaxColumns();
  if (currentAuditCols > auditHeaders.length) {
    auditSheet.deleteColumns(auditHeaders.length + 1, currentAuditCols - auditHeaders.length);
  }

  // Apply Aesthetics to Audit Log
  auditSheet.setRowHeight(1, 60);
  auditSheet.setFrozenRows(1);
  for (let i = 1; i <= auditHeaders.length; i++) {
    auditSheet.setColumnWidth(i, 150);
  }

  const auditFullRange = auditSheet.getRange(1, 1, auditSheet.getMaxRows(), auditHeaders.length);
  auditFullRange.setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  // Re-apply Banding (Remove existing first to avoid conflicts)
  const auditBandings = auditSheet.getRange(1, 1, auditSheet.getMaxRows(), auditHeaders.length).getBandings();
  auditBandings.forEach(b => b.remove());
  auditSheet.getRange(1, 1, auditSheet.getMaxRows(), auditHeaders.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.BLUE);

  // Protection logic for Audit Headers
  const auditProtections = auditSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  auditProtections.forEach(p => p.remove()); // Refresh protections
  const auditProt = auditHeaderRange.protect().setDescription('Audit Headers');
  auditProt.removeEditors(auditProt.getEditors());
  if (auditProt.canEdit()) auditProt.setWarningOnly(true);

  // --- 2. SETTINGS SETUP ---
  let settingsSheet = ss.getSheetByName(settingsSheetName);
  if (!settingsSheet) settingsSheet = ss.insertSheet(settingsSheetName);

  settingsSheet.setTabColor(settingsOrange);
  const settingsHeaders = ["Parameter", "Value", "Description"];
  const initialSettings = [
    [
      "SOURCE_LANG",
      "ja",
      "ISO 639-1 code of the incoming email language (e.g., 'ja' for Japanese)."
    ],
    [
      "TARGET_LANGS",
      "en, pt-BR",
      "Destination languages for translation. Multiple values must be separated by commas."
    ],
    [
      "RECIPIENT_LIST",
      "user@gmail.com",
      "List of email addresses that will receive the translated output, separated by commas."
    ],
    [
      "SYSTEM_ADMIN_EMAIL",
      "admin@gmail.com",
      "Email address designated for receiving critical system crash reports and execution alerts."
    ],
    [
      "SENDER_ALIAS",
      "BridgeMail",
      "The display name that will appear as the sender in the translated emails."
    ],
    [
      "AUTO_ARCHIVE",
      "TRUE",
      "If 'TRUE', the original processed thread will be automatically moved to the Gmail archive."
    ],
    [
      "MARK_AS_READ",
      "TRUE",
      "If 'TRUE', the original source message will be marked as read after successful processing."
    ],
    [
      "STAR_MESSAGE",
      "TRUE",
      "If 'TRUE', applies a Gmail star to the original source message for better visibility."
    ],
    [
      "SEARCH_QUERY",
      "is:unread to:user+ja@gmail.com",
      "Gmail search operator used to filter messages for processing (test this in Gmail first)."
    ],
    [
      "STATE_LABEL",
      "Translated",
      "Gmail label applied to threads after processing to identify them and prevent duplicates."
    ],
    [
      "SUBJECT_LABEL",
      "Translated",
      "Text prefix added to the subject line of the translated email (e.g., '[Translated]')."
    ],
    [
      "MAX_CHAR_LIMIT",
      "4200",
      "Maximum character count per API request; larger emails are automatically split into safe chunks."
    ],
    [
      "BATCH_LIMIT",
      "15",
      "Maximum number of email threads to process in a single execution to manage system resources."
    ],
    [
      "MAX_RETRIES",
      "3",
      "Maximum number of retry attempts for the translation service in case of transient API failures."
    ],
    [
      "RETRY_DELAY_MS",
      "1000",
      "Base delay in milliseconds for the exponential backoff strategy between retry attempts."
    ],
    [
      "MAX_EXECUTION_TIME_MS",
      "300000",
      "Safety timeout (ms) to terminate the script before reaching Google's internal execution limit."
    ],
    [
      "TRIGGER_MINUTES",
      "10",
      "Frequency of the automated background check. Valid Google intervals: 1, 5, 10, 15, or 30 minutes."
    ]
  ];

  // Logic to merge: check existing keys to avoid overwriting user values
  const existingData = settingsSheet.getLastRow() > 0 ? settingsSheet.getDataRange().getValues() : [];
  const existingKeys = existingData.map(row => row[0]);

  // If sheet is new/empty, set headers
  const settingsHeaderRange = settingsSheet.getRange(1, 1, 1, 3);
  settingsHeaderRange.setValues([settingsHeaders])
    .setBackground(settingsOrange)
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12);

  // Add only missing keys
  initialSettings.forEach(setting => {
    if (!existingKeys.includes(setting[0])) {
      settingsSheet.appendRow(setting);
    }
  });

  // Clean columns for Settings
  const currentSettingsCols = settingsSheet.getMaxColumns();
  if (currentSettingsCols > settingsHeaders.length) {
    settingsSheet.deleteColumns(settingsHeaders.length + 1, currentSettingsCols - settingsHeaders.length);
  }

  // Apply Aesthetics to Settings
  const finalSettingsRows = settingsSheet.getLastRow();
  settingsSheet.setRowHeight(1, 60);
  settingsSheet.setColumnWidth(1, 200);
  settingsSheet.setColumnWidth(2, 350);
  settingsSheet.setColumnWidth(3, 350);
  settingsSheet.setFrozenRows(1);

  const settingsGrid = settingsSheet.getRange(1, 1, finalSettingsRows, 3);
  settingsGrid.setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  // Re-apply Banding for Settings
  const settingsBandings = settingsGrid.getBandings();
  settingsBandings.forEach(b => b.remove());
  settingsGrid.applyRowBanding(SpreadsheetApp.BandingTheme.ORANGE);

  // Protect Config Keys in Column A
  const settingsProtections = settingsSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  settingsProtections.forEach(p => p.remove()); // Refresh protections
  const settingsProt = settingsSheet.getRange(1, 1, settingsSheet.getMaxRows(), 1).protect().setDescription('Config Keys');
  settingsProt.removeEditors(settingsProt.getEditors());
  if (settingsProt.canEdit()) settingsProt.setWarningOnly(true);

  // --- 3. BASELINE MARKER ---
  // Prevents the script from translating the entire inbox history on first run
  const config = new ConfigManager().load();
  const baselineThreads = GmailApp.search(config.SEARCH_QUERY, 0, 1);
  if (baselineThreads.length > 0) {
    const lastMsg = baselineThreads[0].getMessages().pop();
    const audit = new AuditManager();
    // Only log baseline if the audit log is empty or ID is not present
    if (!audit.isDuplicate(lastMsg.getId())) {
      audit.log({
        id: lastMsg.getId(),
        subject: lastMsg.getSubject(),
        sender: lastMsg.getFrom(),
        body: { length: 0 }
      }, "INITIAL_BASELINE", 0, "System initialized. Older emails will be ignored.");
    }
  }

  refreshTrigger();
  SpreadsheetApp.getUi().alert("Setup successful.");
}

/**
 * Syncs the time-based trigger with the TRIGGER_MINUTES setting.
 * * @return {void}
 */
function refreshTrigger() {
  const config = new ConfigManager().load();
  const functionName = 'startEmailAutomation';
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(t => {
    if (t.getHandlerFunction() === functionName) ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger(functionName)
    .timeBased()
    .everyMinutes(config.TRIGGER_MINUTES || 10)
    .create();
}

/**
 * Main entry point for the automation engine.
 * * @return {void}
 */
function startEmailAutomation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    ss.toast("Checking for new emails...", "Translator", 5);
    const config = new ConfigManager().load();
    const engine = new TranslationEngine(config);
    engine.run();
  } catch (err) {
    console.error(`Execution failed: ${err.message}`);
    SpreadsheetApp.getUi().alert("Critical Error: " + err.message);
  }
}

/**
 * Configuration handler with parsing and validation logic.
 */
class ConfigManager {
  /**
   * Initializes the ConfigManager with the Settings sheet.
   */
  constructor() {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
    this.cachedConfig = null;
  }

  /**
   * Loads and parses settings from the spreadsheet into a typed object.
   * * @return {Object} The parsed configuration.
   * @throws {Error} If Settings sheet is missing or empty.
   */
  load() {
    if (this.cachedConfig) return this.cachedConfig;
    if (!this.sheet) throw new Error("Settings sheet not found. Please run Setup.");

    const lastRow = this.sheet.getLastRow();
    if (lastRow < 2) throw new Error("Settings sheet is empty. Please run Setup.");

    const data = this.sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const config = { START_TIME: Date.now() };

    data.forEach(row => {
      let [key, val] = row;
      if (!key) return;

      // Handle specific data types for automation logic
      if (["TARGET_LANGS", "RECIPIENT_LIST"].includes(key)) {
        val = val.toString().split(",").map(i => i.trim()).filter(i => i !== "");
      } else if (["MAX_CHAR_LIMIT", "BATCH_LIMIT", "MAX_RETRIES", "RETRY_DELAY_MS", "MAX_EXECUTION_TIME_MS", "TRIGGER_MINUTES"].includes(key)) {
        val = parseInt(val, 10);
      } else if (["AUTO_ARCHIVE", "MARK_AS_READ", "STAR_MESSAGE"].includes(key)) {
        val = val.toString().toUpperCase() === "TRUE";
      }
      config[key] = val;
    });

    this.cachedConfig = config;
    return config;
  }
}

/**
 * Core orchestration engine for Gmail processing.
 */
class TranslationEngine {
  /**
   * @param {Object} config Validated configuration object.
   */
  constructor(config) {
    this.config = config;
    this.audit = new AuditManager();
    this.translator = new TranslationService(this.config);
    this.processedLabel = this.initLabel(this.config.STATE_LABEL);
  }

  /**
   * Executes the processing loop for Gmail threads.
   * * @return {void}
   */
  run() {
    try {
      const threads = GmailApp.search(this.config.SEARCH_QUERY, 0, this.config.BATCH_LIMIT);
      if (threads.length === 0) return;

      for (const thread of threads) {
        // Safe exit to prevent Google execution timeout (usually 6-30 mins)
        if (this.isTimeLimitReached()) {
          console.warn("Approaching execution time limit. Breaking loop.");
          break;
        }

        const messages = thread.getMessages();
        let threadProcessed = false;

        for (const msg of messages) {
          const msgId = msg.getId();

          // Check both label and audit log to prevent duplicate translations
          if (!this.isAlreadyProcessed(thread) && !this.audit.isDuplicate(msgId)) {
            this.processMessage(msg);
            threadProcessed = true;
          }
        }

        if (threadProcessed) this.finalizeThread(thread);
      }
    } catch (e) {
      this.handleGlobalError(e);
    }
  }

  /**
   * Translates and sends a single message.
   * * @param {GoogleAppsScript.Gmail.GmailMessage} msg The message to process.
   * @return {void}
   */
  processMessage(msg) {
    const startTime = Date.now();
    try {
      const attachments = msg.getAttachments();
      const meta = {
        id: msg.getId(),
        subject: msg.getSubject() || 'No Subject',
        body: msg.getBody(),
        plainBody: msg.getPlainBody(),
        sender: msg.getFrom(),
        attachments: this.filterValidAttachments(attachments)
      };

      // Perform translations for each target language defined in settings
      const translations = this.config.TARGET_LANGS.map(lang => ({
        target: lang,
        subject: this.translator.safeTranslate(meta.subject, lang, false),
        body: this.translator.batchTranslate(meta.body, lang, true)
      }));

      // Logic: Pick the first translated subject as the primary email subject
      // Fallback to original subject if translations array is empty
      const primarySubject = (translations.length > 0) ? translations[0].subject : meta.subject;

      const html = this.composeHtml(translations, meta);
      this.send(primarySubject, html, meta.attachments);
      this.applyRules(msg);

      this.audit.log(meta, "SUCCESS", Date.now() - startTime);
    } catch (e) {
      console.error(`Message ${msg.getId()} failed: ${e.message}`);
      this.audit.log({ id: msg.getId(), subject: msg.getSubject(), sender: msg.getFrom() }, "FAILED", Date.now() - startTime, e.message);
    }
  }

  /**
   * Filters attachments to stay under Gmail's 25MB limit (buffer at 20MB).
   * * @param {Array<GoogleAppsScript.Gmail.GmailAttachment>} attachments Original attachments.
   * @return {Array<GoogleAppsScript.Gmail.GmailAttachment>} Filtered attachments.
   */
  filterValidAttachments(attachments) {
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB safety limit
    let currentSize = 0;
    return attachments.filter(a => {
      currentSize += a.getSize();
      return currentSize < MAX_TOTAL_SIZE;
    });
  }

  /**
 * Composes a multi-language HTML template.
 * Unifies the original source language and all translations into a consistent, 
 * easy-to-read layout with clear visual separators.
 *
 * @param {Array<Object>} translations List of translation data objects.
 * @param {Object} meta Message metadata containing original subject and body.
 * @return {string} Final HTML payload.
 */
  composeHtml(translations, meta) {
    // Combine source language content with translations for unified processing
    const allContent = [
      ...translations,
      {
        target: this.config.SOURCE_LANG.toUpperCase(),
        subject: meta.subject,
        body: meta.body
      }
    ];

    // Map all languages into consistent HTML blocks
    const sections = allContent.map((item, index) => {
      // Add a separator line before every section except the first one
      const separator = index > 0 ?
        `<hr style="border: 0; border-top: 2px solid #eeeeee; margin: 40px 0;">` : '';

      return `
        ${separator}
        <div style="font-family: sans-serif; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="color: #888888; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              Language: ${item.target}
            </span>
          </div>
          <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; line-height: 1.4;">
            ${item.subject}
          </h2>
          <div>
            ${item.body}
          </div>
        </div>
      `;
    }).join('');

    // Final wrapper
    return `
      <div>
        ${sections}
        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #eeeeee; text-align: center; font-size: 13px; color: #848484; font-family: sans-serif;">
          <strong>&#127753; BridgeMail v1.0 - E-mail Translator Engine</strong> | Processing Time: ${new Date().toLocaleString()}
        </div>
      </div>`;
  }

  /**
   * Dispatches the email via GmailApp using the translated subject.
   * @param {string} subject The subject.
   * @param {string} html Composed body.
   * @param {Object} attachments The attachments.
   * @return {void}
   */
  send(subject, html, attachments) {
    GmailApp.sendEmail(this.config.RECIPIENT_LIST.join(','), `[${this.config.SUBJECT_LABEL}] ` + subject, "", {
      htmlBody: html,
      name: this.config.SENDER_ALIAS,
      attachments: attachments
    });
  }

  /**
   * Executes post-processing rules (Read, Star, Archive).
   * * @param {GoogleAppsScript.Gmail.GmailMessage} msg The Gmail message.
   */
  applyRules(msg) {
    if (this.config.MARK_AS_READ) msg.markRead();
    if (this.config.STAR_MESSAGE) msg.star();
    if (this.config.AUTO_ARCHIVE) msg.getThread().moveToArchive();
  }

  /**
   * Helper to ensure Gmail labels are available.
   * * @param {string} name Label name.
   * @return {GoogleAppsScript.Gmail.GmailLabel}
   */
  initLabel(name) {
    return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
  }

  /**
   * Checks if the thread already has the processed label.
   * * @param {GoogleAppsScript.Gmail.GmailThread} thread The thread.
   * @return {boolean}
   */
  isAlreadyProcessed(thread) {
    return thread.getLabels().some(l => l.getName() === this.config.STATE_LABEL);
  }

  /**
   * Tags the thread as processed.
   * * @param {GoogleAppsScript.Gmail.GmailThread} thread The Gmail thread.
   */
  finalizeThread(thread) {
    thread.addLabel(this.processedLabel);
  }

  /**
   * Checks for script timeout safety.
   * * @return {boolean}
   */
  isTimeLimitReached() {
    return (Date.now() - this.config.START_TIME) > this.config.MAX_EXECUTION_TIME_MS;
  }

  /**
   * Global error reporter for the engine.
   * * @param {Error} e The error object.
   */
  handleGlobalError(e) {
    console.error(`Critical Engine Crash: ${e.stack}`);
    const adminEmail = this.config.SYSTEM_ADMIN_EMAIL;
    if (adminEmail) {
      GmailApp.sendEmail(adminEmail, "CRITICAL: Translator Engine Crash", `Error Stack:\n\n${e.stack}`);
    }
    throw e;
  }
}

/**
 * Spreadsheet audit logger using high-performance Set-based deduplication.
 */
class AuditManager {
  /**
   * Initializes the manager and pre-loads IDs into a Set for O(1) lookups.
   */
  constructor() {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Audit Log");
    this.processedIds = new Set();
    this.loadIdCache();
  }

  /**
   * Loads existing Message IDs from Audit Log into a Set for rapid duplicate checking.
   * @private
   */
  loadIdCache() {
    if (!this.sheet) return;
    const lastRow = this.sheet.getLastRow();
    if (lastRow < 2) return;

    // Fetch only the ID column (Column B) to optimize memory usage
    const ids = this.sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    ids.forEach(row => {
      if (row[0]) this.processedIds.add(row[0].toString());
    });
  }

  /**
   * Logs a result row in the spreadsheet and updates the cache.
   * * @param {Object} meta Message metadata.
   * @param {string} status SUCCESS/FAILED/INITIAL_BASELINE.
   * @param {number} duration ms.
   * @param {string} error Error description.
   */
  log(meta, status, duration, error = "") {
    if (!this.sheet) return;
    this.sheet.appendRow([
      new Date(),
      meta.id,
      meta.subject,
      meta.sender,
      meta.body ? (meta.body.length || 0) : 0,
      status,
      duration,
      error
    ]);
    this.processedIds.add(meta.id.toString());
  }

  /**
   * Rapidly checks if a message ID is already registered.
   * * @param {string} id Unique Gmail message ID.
   * @return {boolean}
   */
  isDuplicate(id) {
    return this.processedIds.has(id.toString());
  }
}

/**
 * Handles text chunking and resilience logic for translations.
 */
class TranslationService {
  /**
   * @param {Object} config The config object.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Slices large content into chunks, protecting HTML tag integrity.
   * * @param {string} text Full content.
   * @param {string} target Target language code.
   * @param {boolean} isHtml Whether to translate as HTML.
   * @return {string} Fully translated content.
   */
  batchTranslate(text, target, isHtml) {
    if (!text) return "";
    if (text.length <= this.config.MAX_CHAR_LIMIT) return this.safeTranslate(text, target, isHtml);

    let result = "";
    let remainder = text;

    while (remainder.length > 0) {
      let chunkSize = this.config.MAX_CHAR_LIMIT;

      // HTML Safety: Ensure we don't cut in the middle of a tag <...chunk...>
      if (isHtml && remainder.length > chunkSize) {
        const potentialChunk = remainder.substring(0, chunkSize);
        const lastOpen = potentialChunk.lastIndexOf('<');
        const lastClose = potentialChunk.lastIndexOf('>');

        if (lastOpen > lastClose) {
          chunkSize = lastOpen;
        }
      }

      result += this.safeTranslate(remainder.substring(0, chunkSize), target, isHtml);
      remainder = remainder.substring(chunkSize);
    }
    return result;
  }

  /**
   * Executes translation with Exponential Backoff retry mechanism.
   * * @param {string} text Text fragment to translate.
   * @param {string} target Language code.
   * @param {boolean} isHtml Is HTML flag.
   * @return {string} Translated fragment.
   * @throws {Error} If all retries fail.
   */
  safeTranslate(text, target, isHtml) {
    if (!text || text.trim().length === 0) {
      return text;
    }

    let attempts = 0;
    while (attempts < this.config.MAX_RETRIES) {
      try {
        return LanguageApp.translate(text, this.config.SOURCE_LANG, target, isHtml ? { contentType: 'html' } : {});
      } catch (e) {
        attempts++;
        if (attempts >= this.config.MAX_RETRIES) throw new Error(`Translation failed after ${attempts} retries: ${e.message}`);

        // Backoff strategy: Wait 1s, 2s, 4s, etc. before next attempt
        Utilities.sleep(this.config.RETRY_DELAY_MS * Math.pow(2, attempts));
      }
    }
  }
}