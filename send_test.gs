/**
 * Send a Japanese test email to the current user.
 * This is used to validate the Translation Engine's ability to handle HTML,
 * urgency detection, and multi-chunk translation.
 * * @return {void}
 */
function sendJapaneseTestEmail() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const recipient = "rubensbrazf+translate-japanese@gmail.com";

  try {
    spreadsheet.toast("Generating Japanese test payload...", "Test Tool", 2);

    const subject = "【緊急】サーバーインフラの再起動とデータ同期の締切について";

    // Complex HTML structure to test tag protection and styling
    const htmlPayload = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d9534f; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">重大なシステム通知</h1>
        </div>
        <div style="padding: 25px; color: #333333; line-height: 1.8;">
          <p>システム運用管理担当者 各位</p>
          <p>お疲れ様です。技術部の上野です。</p>
          <p>クラウド基盤のアップグレードに伴い、<strong>本日23:00</strong>よりメインデータベースの再起動を実施いたします。</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #1155cc; padding: 15px; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold;">■ 実施作業内容:</p>
            <ul style="margin-bottom: 0;">
              <li>ストレージクラスタの最適化</li>
              <li>SSL証明書の更新手続き</li>
              <li>キャッシュレイヤーの再構築</li>
            </ul>
          </div>

          <p>データの不整合を防ぐため、作業開始の10分前までに全ての同期を完了させてください。
          この作業の<strong>最終締切は厳守</strong>でお願いいたします。</p>
          
          <p>不明点がある場合は、直ちに Slack の #infra-urgent チャンネルにて報告してください。</p>
        </div>
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 11px; color: #777;">
          Automated System Alert | Demo Environment
        </div>
      </div>
    `;

    // Execute the delivery
    sendEmailAsHtml(recipient, subject, htmlPayload);

    spreadsheet.toast("Test email dispatched!", "Test Tool", 3);
    ui.alert("✅ Test Email Sent\n\nRecipient: " + recipient +
      "\n\nYou can now run 'Run Translation Now' from the menu to test the engine.");

  } catch (error) {
    console.error("Test Delivery Failed: " + error.stack);
    ui.alert("❌ Error: " + error.message);
  }
}

/**
 * Helper to wrap GmailApp delivery with specific HTML options.
 * * @param {string} to Recipient email.
 * @param {string} subject Subject line.
 * @param {string} htmlBody HTML content.
 * @throws {Error} If GmailApp fails to send.
 */
function sendEmailAsHtml(to, subject, htmlBody) {
  // Plain text version acts as a fallback for old email clients
  const plainTextFallback = "This email requires an HTML compatible client.";

  GmailApp.sendEmail(to, subject, plainTextFallback, {
    htmlBody: htmlBody
  });
}