# Vercel 部署版：下午茶訂購系統

此版本將網站部署在 Vercel，並以 Google Sheet 作為資料庫。沒有資料庫費用，也不會把 Google 金鑰放在瀏覽器。

在尚未完成 Vercel／Google Sheet 串接時，網站會自動使用瀏覽器本機暫存：可送出多品項訂單、查看本機後台與確認發送，但資料只留在該裝置。完成下列環境變數設定後，訂單才會同步寫入 Google Sheet。

## 先準備 Google Sheet

1. 建立新的 Google Sheet，複製網址中 `/d/` 與下一個 `/` 之間的 **試算表 ID**。
2. 在 Google Cloud Console 建立一個專案，啟用 **Google Sheets API**。
3. 建立「服務帳號」，建立 JSON 金鑰；記下 JSON 中的 `client_email` 與 `private_key`。
4. 將試算表分享給該 `client_email`，權限設定為「編輯者」。

## Vercel 環境變數

在 Vercel 專案的 Settings → Environment Variables 新增以下四個變數（Production、Preview、Development 都勾選）：

| 名稱 | 值 |
| --- | --- |
| `GOOGLE_SHEET_ID` | Google Sheet 的試算表 ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服務帳號 JSON 的 `client_email` |
| `GOOGLE_PRIVATE_KEY` | 服務帳號 JSON 的 `private_key`，完整貼上並保留 `-----BEGIN PRIVATE KEY-----` |
| `ADMIN_TOKEN` | 自訂且難猜的管理密鑰；僅主辦人用來標記飲料已發送 |

完成部署後，以管理密鑰呼叫一次 `POST /api?action=setup`，即可建立菜單、訂購明細、統計總覽、甜度統計、冰塊統計、店家訂單與發送核對等工作表。也可以用 API 用戶端送出下列 JSON：

```json
{}
```

並帶上 HTTP Header：`x-admin-token: 你的 ADMIN_TOKEN`。

菜單品項可直接在 Google Sheet 的 `菜單` 分頁編輯；「是否供應」填 `是` 才會顯示在網站。預設品項與中／大杯價格參考使用者提供的菜單圖片，價格可能因門市而異，請在正式下單前確認並於此分頁調整。

訂購人姓名為必填；電話為選填。每次可選購多種飲料，逐杯設定甜度、冰塊、數量與備註後加入本次訂單，再一次送出。
