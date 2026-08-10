export async function notifyAdminAlert(alertType: string, message: string, readingId?: string): Promise<void> {
  // TODO: 邮件服务尚未接入，目前只记录到system_alerts表供后台查看。
  // 以后接入邮件服务（如Resend）后，在这里补上实际发送逻辑，
  // 调用方（各Edge Function的失败处理分支）不需要改动。
  console.log(`[admin-alert] ${alertType}: ${message}${readingId ? ` (reading: ${readingId})` : ''}`);
}
